import { ObjectUtils } from '@redskytech/core-utils';
import { DateUtils } from '@redskytech/framework/utils/index.js';
import DbDiff from 'dbdiff';
import { RsRequest, systemUserRequesterDetails, type DynamicObject } from '../../../../src/@types/expressCustom.js';
import { CustomPool } from '../../../../src/@types/mysqlCustom.js';
import mainConnection, { createCustomPool } from '../../../../src/database/connection.js';
import config, { IMysqlDatabase } from '../../../../src/utils/config.js';
import { RsError } from '../../../../src/utils/errors.js';
import filterSqlParser from '../../../../src/utils/filterSqlParser.js';
import { SqlUtils } from './utils/utils.js';

class SqlEngine {
	async createDatabaseFromSchema(schema: Restura.Schema, connection: CustomPool): Promise<string> {
		const sqlFullStatement = this.generateDatabaseSchemaFromSchema(schema);
		await connection.runQuery(sqlFullStatement, [], systemUserRequesterDetails);
		return sqlFullStatement;
	}

	async runQueryForRoute(
		req: RsRequest<DynamicObject>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<unknown> {
		if (!this.doesRoleHavePermissionToTable(req.requesterDetails.role, schema, routeData.table))
			throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');

		switch (routeData.method) {
			case 'POST':
				return this.executeCreateRequest(req as RsRequest<DynamicObject>, routeData, schema);
			case 'GET':
				return this.executeGetRequest(req as RsRequest<DynamicObject>, routeData, schema);
			case 'PUT':
			case 'PATCH':
				return this.executeUpdateRequest(req, routeData, schema);
			case 'DELETE':
				return this.executeDeleteRequest(req, routeData, schema);
		}
	}

	generateDatabaseSchemaFromSchema(schema: Restura.Schema): string {
		const sqlStatements = [];
		// Setup tables and indexes first
		for (const table of schema.database) {
			let sql = `CREATE TABLE \`${table.name}\`
                       (  `;
			for (const column of table.columns) {
				sql += `\t\`${column.name}\` ${column.type}`;
				let value = column.value;
				// JSON's value is used only for typescript not for the database
				if (column.type === 'JSON') value = '';
				if (column.type === 'DECIMAL' && value) {
					// replace the character '-' with comma since we use it to separate the values in restura for decimals
					// also remove single and double quotes
					value = value.replace('-', ',').replace(/['"]/g, '');
				}
				if (value) sql += `(${value})`;
				else if (column.length) sql += `(${column.length})`;
				if (column.isPrimary) sql += ' PRIMARY KEY';
				if (column.isUnique) sql += ' UNIQUE';
				if (column.isNullable) sql += ' NULL';
				else sql += ' NOT NULL';
				if (column.hasAutoIncrement) sql += ' AUTO_INCREMENT';
				if (column.default) sql += ` DEFAULT ${column.default}`;
				sql += ', \n';
			}
			for (const index of table.indexes) {
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
		for (const table of schema.database) {
			if (!table.foreignKeys.length) continue;
			const sql = `ALTER TABLE \`${table.name}\`  `;
			const constraints: string[] = [];
			for (const foreignKey of table.foreignKeys) {
				let constraint = `\tADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)`;
				constraint += ` ON DELETE ${foreignKey.onDelete}`;
				constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		// Now setup check constraints
		for (const table of schema.database) {
			if (!table.checkConstraints.length) continue;
			const sql = `ALTER TABLE \`${table.name}\`  `;
			const constraints: string[] = [];
			for (const check of table.checkConstraints) {
				const constraint = `ADD CONSTRAINT \`${check.name}\` CHECK (${check.check})`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}

		return sqlStatements.join('\n\n');
	}

	async diffDatabaseToSchema(schema: Restura.Schema): Promise<string> {
		const dbConfig: IMysqlDatabase = config.database[0];

		let scratchConnection: CustomPool = createCustomPool([
			{
				host: dbConfig.host,
				user: dbConfig.user,
				password: dbConfig.password,
				port: dbConfig.port
			}
		]);
		await scratchConnection.runQuery(
			`DROP DATABASE IF EXISTS ${config.database[0].database}_scratch;
										 CREATE DATABASE ${config.database[0].database}_scratch;
										 USE ${config.database[0].database}_scratch;`,
			[],
			systemUserRequesterDetails
		);

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
		req: RsRequest<DynamicObject>,
		schema: Restura.Schema,
		item: Restura.ResponseData,
		routeData: Restura.StandardRouteData,
		userRole: string | undefined,
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
		req: RsRequest<DynamicObject>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<unknown> {
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
			[{ ...req.data }, ...sqlParams],
			req.requesterDetails
		);
		const insertId = (createdItem as { insertId: number }).insertId;
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
		req: RsRequest<DynamicObject>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<object | void> {
		const DEFAULT_PAGED_PAGE_NUMBER = 0;
		const DEFAULT_PAGED_PER_PAGE_NUMBER = 25;
		const sqlParams: string[] = [];

		const userRole = req.requesterDetails.role;
		let sqlStatement = '';

		const selectColumns: Restura.ResponseData[] = [];
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
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'ARRAY') {
			// Array
			return await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement};`,
				sqlParams,
				req.requesterDetails
			);
		} else if (routeData.type === 'PAGED') {
			const paginationData = req.data as RedSky.PageQuery;
			// The COUNT() does not work with group by and order by, so we need to catch that case and act accordingly
			const pageResults = await mainConnection.runQuery(
				`${selectStatement}${sqlStatement}${groupByOrderByStatement} LIMIT ? OFFSET ?;SELECT COUNT(${
					routeData.groupBy ? `DISTINCT ${routeData.groupBy.tableName}.${routeData.groupBy.columnName}` : '*'
				}) AS total\n${sqlStatement};`,
				[
					...sqlParams,
					paginationData.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER,
					((paginationData.page || DEFAULT_PAGED_PAGE_NUMBER) - 1) *
						(paginationData.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER),
					...sqlParams
				],
				req.requesterDetails
			);
			let total = 0;
			if (ObjectUtils.isArrayWithData(pageResults as unknown[])) {
				total = (pageResults as { total: number }[][])[1][0].total;
			}
			return { data: (pageResults as object[])[0] as object, total };
		} else {
			throw new RsError('UNKNOWN_ERROR', 'Unknown route type.');
		}
	}

	private async executeUpdateRequest(
		req: RsRequest<DynamicObject>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<object> {
		const sqlParams: string[] = [];
		const { id: _id, ...bodyNoId } = req.body;

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
		for (const i in bodyNoId) {
			if (i.includes('.')) continue;
			bodyNoId[`${routeData.table}.${i}`] = bodyNoId[i];
			delete bodyNoId[i];
		}

		for (const assignment of routeData.assignments) {
			const column = table.columns.find((column) => column.name === assignment.name);
			if (!column) continue;

			const assignmentWithPrefix = `${routeData.table}.${assignment.name}`;

			if (SqlUtils.convertDatabaseTypeToTypescript(column.type) === 'boolean')
				bodyNoId[assignmentWithPrefix] = assignment.value.toLowerCase() === 'false' ? 0 : 1;
			else if (SqlUtils.convertDatabaseTypeToTypescript(column.type) === 'number')
				bodyNoId[assignmentWithPrefix] = Number(assignment.value);
			else bodyNoId[assignmentWithPrefix] = assignment.value;
		}

		const joinStatement = this.generateJoinStatements(
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
		await mainConnection.runQuery(sqlStatement, [bodyNoId, ...sqlParams], req.requesterDetails);
		return this.executeGetRequest(req, routeData, schema) as object;
	}

	private async executeDeleteRequest(
		req: RsRequest<DynamicObject>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema
	): Promise<true> {
		const sqlParams: string[] = [];

		const joinStatement = this.generateJoinStatements(
			req,
			routeData.joins,
			routeData.table,
			routeData,
			schema,
			req.requesterDetails.role,
			sqlParams
		);

		let deleteStatement = `DELETE FROM
        ${routeData.table}
        ${joinStatement}`;
		deleteStatement += this.generateWhereClause(req, routeData.where, routeData, sqlParams);
		deleteStatement += ';';
		await mainConnection.runQuery(deleteStatement, sqlParams, req.requesterDetails);
		return true;
	}

	private doesRoleHavePermissionToColumn(
		role: string | undefined,
		schema: Restura.Schema,
		item: Restura.ResponseData,
		joins: Restura.JoinData[]
	): boolean {
		if (item.selector) {
			let tableName = item.selector.split('.')[0];
			const columnName = item.selector.split('.')[1];
			let tableSchema = schema.database.find((item) => item.name === tableName);
			if (!tableSchema) {
				// check to see if this is an alias join table
				const join = joins.find((join) => join.alias === tableName);
				if (!join) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
				tableName = join.table;
				tableSchema = schema.database.find((item) => item.name === tableName);
			}
			if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
			const columnSchema = tableSchema.columns.find((item) => item.name === columnName);
			if (!columnSchema)
				throw new RsError('SCHEMA_ERROR', `Column ${columnName} not found in table ${tableName}`);

			const doesColumnHaveRoles = ObjectUtils.isArrayWithData(columnSchema.roles);
			if (!doesColumnHaveRoles) return true; // Public column, any role can access

			if (!role) return false; // Column has roles, but no role provided (no access)

			return columnSchema.roles.includes(role);
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

	private doesRoleHavePermissionToTable(
		userRole: string | undefined,
		schema: Restura.Schema,
		tableName: string
	): boolean {
		const tableSchema = this.getTableSchema(schema, tableName);
		const doesTableHaveRoles = ObjectUtils.isArrayWithData(tableSchema.roles);
		if (!doesTableHaveRoles) return true; // Public table, any role can access

		if (!userRole) return false; // Table has roles, but no role provided (no access)

		return tableSchema.roles.includes(userRole);
	}

	private generateJoinStatements(
		req: RsRequest<DynamicObject>,
		joins: Restura.JoinData[],
		baseTable: string,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		userRole: string | undefined,
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
		const tableSchema = schema.database.find((item) => item.name === tableName);
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

	private generateOrderBy(req: RsRequest<DynamicObject>, routeData: Restura.StandardRouteData): string {
		let orderBy = '';
		if (routeData.type === 'PAGED' && 'sortBy' in req.data) {
			const sortOrder = 'sortOrder' in req.data ? req.data.sortOrder : 'ASC';
			orderBy = `ORDER BY ${req.data.sortBy} ${sortOrder}\n`;
		} else if (routeData.orderBy) {
			orderBy = `ORDER BY \`${routeData.orderBy.tableName}\`.\`${routeData.orderBy.columnName}\` ${routeData.orderBy.order}\n`;
		}
		return orderBy;
	}

	private generateWhereClause(
		req: RsRequest<DynamicObject>,
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
		if (routeData.type === 'PAGED' && !!(req.data as RedSky.PageQuery).filter) {
			let statement = (req.data as { filter: string }).filter.replace(
				/\$[a-zA-Z][a-zA-Z0-9_]+/g,
				(value: string) => {
					const requestParam = routeData.request!.find((item) => {
						return item.name === value.replace('$', '');
					});
					if (!requestParam)
						throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
					return req.data[requestParam.name] as string;
				}
			);

			statement = statement.replace(/#[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				const requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('#', '');
				});
				if (!requestParam)
					throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name] as string;
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
		req: RsRequest<DynamicObject>,
		sqlParams: string[]
	): string {
		let returnValue = value;
		returnValue = this.replaceLocalParamKeywords(
			returnValue,
			routeData,
			req as RsRequest<{ data: string }>,
			sqlParams
		);
		returnValue = this.replaceGlobalParamKeywords(returnValue, routeData, req, sqlParams);
		return returnValue;
	}

	private replaceLocalParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<{ data: string }>,
		sqlParams: string[]
	): string {
		if (!routeData.request) return value;

		// Match any value that starts with a $
		value.match(/\$[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
			const requestParam = routeData.request!.find((item) => {
				return item.name === param.replace('$', '');
			});
			if (!requestParam) throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
			sqlParams.push(req.data[requestParam.name as keyof typeof req.data]);
		});
		return value.replace(new RegExp(/\$[a-zA-Z][a-zA-Z0-9_]+/g), '?');
	}

	private replaceGlobalParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<unknown>,
		sqlParams: string[]
	): string {
		// Match any value that starts with a #
		value.match(/#[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
			param = param.replace('#', '');
			const globalParamValue = req.requesterDetails[param as keyof typeof req.requesterDetails];
			if (!globalParamValue)
				throw new RsError('SCHEMA_ERROR', `Invalid global keyword clause in route ${routeData.name}`);
			sqlParams.push(globalParamValue.toString());
		});
		return value.replace(new RegExp(/#[a-zA-Z][a-zA-Z0-9_]+/g), '?');
	}
}

const sqlEngine = new SqlEngine();
export default sqlEngine;
