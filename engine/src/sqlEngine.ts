import mainConnection, { createCustomPool } from '../../../../src/database/connection.js';
import { RsRequest } from '../../../../src/@types/expressCustom.js';
import { RsError } from '../../../../src/utils/errors.js';
import { ObjectUtils } from '../../../../src/utils/utils.js';
import filterSqlParser from '../../../../src/utils/filterSqlParser.js';
import config, { IMysqlDatabase } from '../../../../src/utils/config.js';
import { CustomPool } from '../../../../src/@types/mysqlCustom.js';
import DbDiff from 'dbdiff';
import { DateUtils } from '@redskytech/framework/utils/index.js';

class SqlEngine {
	async createDatabaseFromSchema(schema: Restura.Schema, connection: CustomPool): Promise<string> {
		let sqlFullStatement = this.generateDatabaseSchemaFromSchema(schema);
		await connection.runQuery(sqlFullStatement);
		return sqlFullStatement;
	}

	async runQueryForRoute(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<any> {
		if (!this.doesRoleHavePermissionToTable(req.requesterDetails.role, schema, routeData.table))
			throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');

		switch (routeData.method) {
			case 'POST':
				return this.executeCreateRequest(req, routeData, schema);
			case 'GET':
				return this.executeGetRequest(req, routeData, schema);
			case 'PUT':
			case 'PATCH':
				return this.executeUpdateRequest(req, routeData, schema);
			case 'DELETE':
				return this.executeDeleteRequest(req, routeData, schema);
		}
	}

	generateDatabaseSchemaFromSchema(schema: Restura.Schema): string {
		let sqlStatements = [];
		// Setup tables and indexes first
		for (let table of schema.database) {
			let sql = `CREATE TABLE \`${table.name}\`
                       (  `;
			for (let column of table.columns) {
				sql += `\t\`${column.name}\` ${column.type}`;
				if (column.value) sql += `(${column.value})`;
				else if (column.length) sql += `(${column.length})`;
				if (column.isPrimary) sql += ' PRIMARY KEY';
				if (column.isUnique) sql += ' UNIQUE';
				if (column.isNullable) sql += ' NULL';
				else sql += ' NOT NULL';
				if (column.hasAutoIncrement) sql += ' AUTO_INCREMENT';
				if (column.default) sql += ` DEFAULT ${column.default}`;
				sql += ', \n';
			}
			for (let index of table.indexes) {
				if (index.isPrimaryKey) {
					sql += `\tPRIMARY KEY (\`${index.columns.join('`, `')}\`)`;
				} else {
					if (index.isUnique) sql += ' UNIQUE';
					sql += `\tINDEX \`${index.name}\` (${index.columns
						.map((item) => {
							return `\`${item}\` ${index.order}`;
						})
						.join(', ')})`;
				}
				sql += ', \n';
			}
			sql = sql.slice(0, -3);
			sql += '\n);';
			sqlStatements.push(sql);
		}

		// Now setup foreign keys
		for (let table of schema.database) {
			if (!table.foreignKeys.length) continue;
			let sql = `ALTER TABLE \`${table.name}\`  `;
			let constraints: string[] = [];
			for (let foreignKey of table.foreignKeys) {
				let constraint = `\tADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)`;
				constraint += ` ON DELETE ${foreignKey.onDelete}`;
				constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}
		return sqlStatements.join('\n\n');
	}

	async diffDatabaseToSchema(schema: Restura.Schema): Promise<string> {
		let dbConfig: IMysqlDatabase = config.database[0];

		let scratchConnection: CustomPool = createCustomPool([
			{
				host: dbConfig.host,
				user: dbConfig.user,
				password: dbConfig.password,
				port: dbConfig.port
			}
		]);
		await scratchConnection.runQuery(`DROP DATABASE IF EXISTS ${config.database[0].database}_scratch;
										 CREATE DATABASE ${config.database[0].database}_scratch;
										 USE ${config.database[0].database}_scratch;`);

		scratchConnection.end();
		scratchConnection = createCustomPool([
			{
				host: dbConfig.host,
				user: dbConfig.user,
				password: dbConfig.password,
				port: dbConfig.port,
				database: `${config.database[0].database}_scratch`
			}
		]);

		await this.createDatabaseFromSchema(schema, scratchConnection);
		const diff = new DbDiff.DbDiff();
		const conn1 = `mysql://${dbConfig.user}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${
			dbConfig.port
		}/${dbConfig.database}`;
		const conn2 = `mysql://${dbConfig.user}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${
			dbConfig.port
		}/${dbConfig.database}_scratch`;
		await diff.compare(conn1, conn2);
		return diff.commands('');
	}

	private createNestedSelect(
		req: RsRequest<any>,
		schema: Restura.Schema,
		item: Restura.ResponseData,
		routeData: Restura.StandardRouteData,
		userRole: string,
		sqlParams: string[]
	): string {
		if (!item.subquery) return '';
		if (
			!ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.doesRoleHavePermissionToColumn(req.requesterDetails.role, schema, nestedItem, [
						...routeData.joins,
						...item.subquery!.joins
					]);
				})
			)
		) {
			return "'[]'";
		}

		return `IFNULL((
						SELECT JSON_ARRAYAGG(
							JSON_OBJECT(
								${item.subquery.properties
									.map((nestedItem) => {
										if (
											!this.doesRoleHavePermissionToColumn(
												req.requesterDetails.role,
												schema,
												nestedItem,
												[...routeData.joins, ...item.subquery!.joins]
											)
										) {
											return;
										}
										if (nestedItem.subquery) {
											return `"${nestedItem.name}", ${this.createNestedSelect(
												req,
												schema,
												nestedItem,
												routeData,
												userRole,
												sqlParams
											)}`;
										}
										return `"${nestedItem.name}", ${nestedItem.selector}`;
									})
									.filter(Boolean)
									.join(',')}
							)
						) 
						FROM
							${item.subquery.table}
							${this.generateJoinStatements(req, item.subquery.joins, item.subquery.table, routeData, schema, userRole, sqlParams)}
							${this.generateWhereClause(req, item.subquery.where, routeData, sqlParams)}
					), '[]')`;
	}

	private async executeCreateRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<any> {
		const sqlParams: string[] = [];
		let parameterString = '';
		parameterString = (routeData.assignments || [])
			.map((assignment) => {
				return `${assignment.name} = ${this.replaceParamKeywords(assignment.value, routeData, req, sqlParams)}`;
			})
			.join(', ');
		const createdItem = await mainConnection.runQuery(
			`INSERT INTO \`${routeData.table}\`
             SET ? ${parameterString ? `, ${parameterString}` : ''};`,
			[{ ...req.data }, ...sqlParams]
		);
		const insertId = createdItem.insertId;
		const whereData: Restura.WhereData[] = [
			...routeData.where,
			{
				...(routeData.where.length ? { conjunction: 'AND' } : {}),
				tableName: routeData.table,
				value: `${insertId}`,
				columnName: 'id',
				operator: '='
			}
		];
		req.data = { id: insertId };
		return this.executeGetRequest(req, { ...routeData, where: whereData }, schema);
	}

	private async executeGetRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<any> {
		const DEFAULT_PAGED_PAGE_NUMBER = 0;
		const DEFAULT_PAGED_PER_PAGE_NUMBER = 25;
		const sqlParams: string[] = [];

		let userRole = req.requesterDetails.role;
		let sqlStatement = '';

		let selectColumns: Restura.ResponseData[] = [];
		routeData.response.forEach((item) => {
			// For a subquery, we will check the permission when generating the subquery statement, so pass it through
			if (item.subquery || this.doesRoleHavePermissionToColumn(userRole, schema, item, routeData.joins))
				selectColumns.push(item);
		});
		if (!selectColumns.length) throw new RsError('UNAUTHORIZED', `You do not have permission to access this data.`);
		let selectStatement = 'SELECT \n';
		selectStatement += `\t${selectColumns
			.map((item) => {
				if (item.subquery) {
					return `${this.createNestedSelect(req, schema, item, routeData, userRole, sqlParams)} AS ${
						item.name
					}`;
				}
				return `${item.selector} AS ${item.name}`;
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM \`${routeData.table}\`\n`;
		sqlStatement += this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			userRole,
			sqlParams
		);
		sqlStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		let groupByOrderByStatement = this.generateGroupBy(routeData);
		groupByOrderByStatement += this.generateOrderBy(req, routeData);
		if (routeData.type === 'ONE') {
			return await mainConnection.queryOne(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams
			);
		} else if (routeData.type === 'ARRAY') {
			// Array
			return await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams
			);
		} else if (routeData.type === 'PAGED') {
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pageResults = await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement} LIMIT ? OFFSET ?;SELECT COUNT(${
					routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
				}) AS total\n${sqlStatement};`,
				[
					...sqlParams,
					req.data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER,
					(req.data.page - 1) * req.data.perPage || DEFAULT_PAGED_PAGE_NUMBER,
					...sqlParams
				]
			);
			let total = 0;
			if (ObjectUtils.isArrayWithData(pageResults)) {
				total = pageResults[1][0].total;
			}
			return { data: pageResults[0], total };
		} else {
			throw new RsError('UNKNOWN_ERROR', 'Unknown route type.');
		}
	}

	private async executeUpdateRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<any> {
		const sqlParams: string[] = [];
		const { id, ...bodyNoId } = req.body;

		// See if table has a modifiedOn column, if so set it to now
		// Find the database table
		const table = schema.database.find((item) => {
			return item.name === routeData.table;
		});
		if (!table) throw new RsError('UNKNOWN_ERROR', 'Unknown table.');
		if (table.columns.find((column) => column.name === 'modifiedOn')) {
			bodyNoId.modifiedOn = DateUtils.dbNow();
		}

		// In order remove ambiguity, we need to add the table name to the column names when the table is joined
		for (let i in bodyNoId) {
			if (i.includes('.')) continue;
			bodyNoId[`${routeData.table}.${i}`] = bodyNoId[i];
			delete bodyNoId[i];
		}

		let joinStatement = this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			req.requesterDetails.role,
			sqlParams
		);
		let sqlStatement = `UPDATE \`${routeData.table}\` ${joinStatement}
                            SET ? `;
		sqlStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		sqlStatement += ';';
		await mainConnection.runQuery(sqlStatement, [bodyNoId, ...sqlParams]);
		return this.executeGetRequest(req, routeData, schema);
	}

	private async executeDeleteRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<any> {
		const sqlParams: string[] = [];

		let joinStatement = this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			req.requesterDetails.role,
			sqlParams
		);

		let deleteStatement = `DELETE
        ${routeData.table} \tFROM
        ${routeData.table}
        ${joinStatement}`;
		deleteStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		deleteStatement += ';';
		await mainConnection.runQuery(deleteStatement, sqlParams);
		return { data: true };
	}

	private doesRoleHavePermissionToColumn(
		role: string,
		schema: Restura.Schema,
		item: Restura.ResponseData,
		joins: Restura.JoinData[]
	): boolean {
		if (item.selector) {
			let tableName = item.selector.split('.')[0];
			let columnName = item.selector.split('.')[1];
			let tableSchema = schema.database.find((item) => item.name === tableName);
			if (!tableSchema) {
				// check to see if this is an alias join table
				let join = joins.find((join) => join.alias === tableName);
				if (!join) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
				tableName = join.table;
				tableSchema = schema.database.find((item) => item.name === tableName);
			}
			if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
			let columnSchema = tableSchema.columns.find((item) => item.name === columnName);
			if (!columnSchema)
				throw new RsError('SCHEMA_ERROR', `Column ${columnName} not found in table ${tableName}`);
			return !(ObjectUtils.isArrayWithData(columnSchema.roles) && !columnSchema.roles.includes(role));
		}
		if (item.subquery) {
			return ObjectUtils.isArrayWithData(
				item.subquery.properties.filter((nestedItem) => {
					return this.doesRoleHavePermissionToColumn(role, schema, nestedItem, joins);
				})
			);
		}
		return false;
	}

	private doesRoleHavePermissionToTable(userRole: string, schema: Restura.Schema, tableName: string): boolean {
		let tableSchema = this.getTableSchema(schema, tableName);
		return !(ObjectUtils.isArrayWithData(tableSchema.roles) && !tableSchema.roles.includes(userRole));
	}

	private generateJoinStatements(
		req: RsRequest<any>,
		joins: Restura.JoinData[],
		baseTable: string,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		userRole: string,
		sqlParams: string[]
	): string {
		let joinStatements = '';
		joins.forEach((item) => {
			if (!this.doesRoleHavePermissionToTable(userRole, schema, item.table))
				throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');
			if (item.custom) {
				const customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				joinStatements += `\t${item.type} JOIN \`${item.table}\` ON ${customReplaced}\n`;
			} else {
				joinStatements += `\t${item.type} JOIN \`${item.table}\`${
					item.alias ? `AS ${item.alias}` : ''
				} ON \`${baseTable}\`.\`${item.localColumnName}\` = \`${item.alias ? item.alias : item.table}\`.\`${
					item.foreignColumnName
				}\`\n`;
			}
		});
		return joinStatements;
	}

	private getTableSchema(schema: Restura.Schema, tableName: string): Restura.TableData {
		let tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		return tableSchema;
	}

	private generateGroupBy(routeData: Restura.StandardRouteData): string {
		let groupBy = '';
		if (routeData.groupBy) {
			groupBy = `GROUP BY \`${routeData.groupBy.tableName}\`.\`${routeData.groupBy.columnName}\`\n`;
		}
		return groupBy;
	}

	private generateOrderBy(req: RsRequest<any>, routeData: Restura.StandardRouteData): string {
		let orderBy = '';
		if (routeData.type === 'PAGED' && 'sortBy' in req.data) {
			let sortOrder = 'sortOrder' in req.data ? req.data.sortOrder : 'ASC';
			orderBy = `ORDER BY ${req.data.sortBy} ${sortOrder}\n`;
		} else if (routeData.orderBy) {
			orderBy = `ORDER BY \`${routeData.orderBy.tableName}\`.\`${routeData.orderBy.columnName}\` ${routeData.orderBy.order}\n`;
		}
		return orderBy;
	}

	private generateWhereClause(
		req: RsRequest<any>,
		where: Restura.WhereData[],
		routeData: Restura.StandardRouteData,
		sqlParams: string[]
	): string {
		let whereClause = '';
		where.forEach((item, index) => {
			if (index === 0) whereClause = 'WHERE ';

			if (item.custom) {
				whereClause += this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				return;
			}

			if (
				item.operator === undefined ||
				item.value === undefined ||
				item.columnName === undefined ||
				item.tableName === undefined
			)
				throw new RsError(
					'SCHEMA_ERROR',
					`Invalid where clause in route ${routeData.name}, missing required fields if not custom`
				);

			let operator = item.operator;
			if (operator === 'LIKE') {
				sqlParams[sqlParams.length - 1] = `%${sqlParams[sqlParams.length - 1]}%`;
			} else if (operator === 'STARTS WITH') {
				operator = 'LIKE';
				sqlParams[sqlParams.length - 1] = `${sqlParams[sqlParams.length - 1]}%`;
			} else if (operator === 'ENDS WITH') {
				operator = 'LIKE';
				sqlParams[sqlParams.length - 1] = `%${sqlParams[sqlParams.length - 1]}`;
			}

			const replacedValue = this.replaceParamKeywords(item.value, routeData, req, sqlParams);
			whereClause += `\t${item.conjunction || ''} \`${item.tableName}\`.\`${item.columnName}\` ${operator} ${
				operator === 'IN' || operator === 'NOT IN' ? `(${replacedValue})` : replacedValue
			}\n`;
		});
		if (routeData.type === 'PAGED' && !!req.data.filter) {
			let statement = req.data.filter.replace(/\$[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				let requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('$', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = statement.replace(/#[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				let requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('#', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = filterSqlParser.parse(statement);
			if (whereClause.startsWith('WHERE')) {
				whereClause += ` AND (${statement})\n`;
			} else {
				whereClause += `WHERE ${statement}\n`;
			}
		}

		return whereClause;
	}

	private replaceParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string {
		let returnValue = value;
		returnValue = this.replaceLocalParamKeywords(returnValue, routeData, req, sqlParams);
		returnValue = this.replaceGlobalParamKeywords(returnValue, routeData, req, sqlParams);
		return returnValue;
	}

	private replaceLocalParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string {
		if (!routeData.request) return value;

		// Match any value that starts with a $
		value.match(/\$[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
			let requestParam = routeData.request!.find((item) => {
				return item.name === param.replace('$', '');
			});
			if (!requestParam) throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
			sqlParams.push(req.data[requestParam.name]);
		});
		return value.replace(new RegExp(/\$[a-zA-Z][a-zA-Z0-9_]+/g), '?');
	}

	private replaceGlobalParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<any>,
		sqlParams: string[]
	): string {
		// Match any value that starts with a #
		value.match(/#[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
			param = param.replace('#', '');
			let globalParamValue = (req.requesterDetails as any)[param];
			if (!globalParamValue)
				throw new RsError('SCHEMA_ERROR', `Invalid global keyword clause in route ${routeData.name}`);
			sqlParams.push(globalParamValue);
		});
		return value.replace(new RegExp(/#[a-zA-Z][a-zA-Z0-9_]+/g), '?');
	}
}

const sqlEngine = new SqlEngine();
export default sqlEngine;
