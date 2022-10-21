import connection from '../../../../src/database/connection.js';
import { RsRequest } from '../../../../src/@types/expressCustom.js';
import { RsError } from '../../../../src/utils/errors.js';
import { ObjectUtils } from '../../../../src/utils/utils.js';
import filterSqlParser from "../../../../src/utils/filterSqlParser.js";

class SqlEngine {
	async createDatabaseFromSchema(schema: Restura.Schema): Promise<string> {
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

		let sqlParams: any[] = [];
		switch(routeData.method) {
			case 'POST':
				return this.executeCreateRequest(req, routeData, schema, sqlParams);
			case 'GET':
				return this.executeGetRequest(req, routeData, schema, sqlParams);
			case 'PUT':
			case 'PATCH':
				return this.executeUpdateRequest(req, routeData, schema, sqlParams);
			case 'DELETE':
				return this.executeDeleteRequest(req, routeData, schema, sqlParams);
		}
	}

	generateDatabaseSchemaFromSchema(schema: Restura.Schema): string {
		let sqlStatements = [];
		// Setup tables and indexes first
		for (let table of schema.database) {
			let sql = `CREATE TABLE \`${table.name}\` (\n`;
			for (let column of table.columns) {
				sql += `\t\`${column.name}\` ${column.type}`;
				if (column.length) sql += `(${column.length})`;
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
			let sql = `ALTER TABLE \`${table.name}\`\n`;
			let constraints : string [] = [];
			for (let foreignKey of table.foreignKeys) {
				let constraint = `\tADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)`;
				constraint += ` ON DELETE ${foreignKey.onDelete}`;
				constraint += ` ON UPDATE ${foreignKey.onUpdate}`;
				constraints.push(constraint);
			}
			sqlStatements.push(sql + constraints.join(',\n') + ';');
		}
		let sqlFullStatement = sqlStatements.join('\n\n');
		return sqlFullStatement;
	}

	private createNestedSelect(req: RsRequest<any>, schema: Restura.Schema, item: Restura.ResponseData): string {
		if(!item.objectArray) return "";
		if(!ObjectUtils.isArrayWithData(item.objectArray.properties.filter(nestedItem => {
			return this.doesRoleHavePermissionToColumn(req.requesterDetails.role, schema, nestedItem)
		}))) {
			return "'[]'";
		}
		return `IFNULL((
						SELECT JSON_ARRAYAGG(
							JSON_OBJECT(
								${item.objectArray.properties.map(nestedItem => {
									if(!this.doesRoleHavePermissionToColumn(req.requesterDetails.role, schema, nestedItem)) {
										return;
									}
									if(nestedItem.objectArray) {
										return `"${nestedItem.name}", ${this.createNestedSelect(req, schema, nestedItem)}`
									}
									return `"${nestedItem.name}", ${nestedItem.selector}`
								}).filter(Boolean).join(",")}
							)
						) FROM
							${item.objectArray.table}
							WHERE ${item.objectArray.join}
					), '[]')`
	}

	private async executeCreateRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		sqlParams: any[]
	): Promise<any> {
		let sqlStatement = `INSERT INTO \`${routeData.table}\` SET ?;`;
		const createdItem = await connection.runQuery(sqlStatement, req.body);
		const insertId = createdItem.insertId;
		const whereData: Restura.WhereData = {tableName: routeData.table, value: `${insertId}`, columnName: "id", operator: "="};
		routeData.where = [whereData];
		req.data = {id: insertId};
		return this.executeGetRequest(req, routeData, schema, sqlParams);
	}

	private async executeGetRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		sqlParams: any[]
	): Promise<any> {
		const DEFAULT_PAGED_PAGE_NUMBER = 0;
		const DEFAULT_PAGED_PER_PAGE_NUMBER = 25;

		let userRole = req.requesterDetails.role;
		let sqlStatement = '';

		let selectColumns: Restura.ResponseData[] = [];
		routeData.response.forEach((item) => {
			if (this.doesRoleHavePermissionToColumn(userRole, schema, item) || item.objectArray)
				selectColumns.push(item);
		});
		if (!selectColumns.length) throw new RsError('UNAUTHORIZED', `You do not have permission to access this data.`);
		let selectStatement = 'SELECT \n';
		selectStatement += `\t${selectColumns
			.map((item) => {
				if(item.objectArray) {
					return `${this.createNestedSelect(req, schema, item)} AS ${item.name}`;
				}
				return `${item.selector} AS ${item.name}`;
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM \`${routeData.table}\`\n`;
		sqlStatement += this.generateJoinStatements(req, routeData, schema, userRole, sqlParams);
		sqlStatement += this.generateWhereClause(req, routeData, sqlParams);
		sqlStatement += this.generateGroupBy(routeData);
		sqlStatement += this.generateOrderBy(routeData);
		if (routeData.type === 'ONE') return await connection.queryOne(`${selectStatement}${sqlStatement};`, sqlParams);
		else if (routeData.type ==='PAGED') {
			const pageResults = await connection.runQuery(`${selectStatement}${sqlStatement} LIMIT ? OFFSET ?;SELECT COUNT(*) AS total\n${sqlStatement};`, [req.data.perPage || DEFAULT_PAGED_PER_PAGE_NUMBER, (req.data.page-1)*req.data.perPage || DEFAULT_PAGED_PAGE_NUMBER]);
			let total = 0;
			if (ObjectUtils.isArrayWithData(pageResults)) {
				total = pageResults[1][0].total;
			}
			return { data: pageResults[0], total };
		}
		else return await connection.runQuery(`${selectStatement}${sqlStatement};`, sqlParams);
	}

	private async executeUpdateRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		sqlParams: any[]
	): Promise<any> {
		let sqlStatement = `UPDATE \`${routeData.table}\` SET ? `;
		sqlStatement += this.generateWhereClause(req, routeData, sqlParams);
		sqlStatement += ';';
		await connection.runQuery(sqlStatement, [req.body, ...sqlParams]);
		return this.executeGetRequest(req, routeData, schema, sqlParams);
	}

	private async executeDeleteRequest(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		sqlParams: any[]
	): Promise<any> {
		let deleteStatement = `DELETE \n \tFROM ${routeData.table} `;
		deleteStatement += this.generateWhereClause(req, routeData, sqlParams);
		deleteStatement += ';';
		await connection.runQuery(deleteStatement, sqlParams);
		return {data: true};
	}

	private doesRoleHavePermissionToColumn(
		role: string,
		schema: Restura.Schema,
		item: Restura.ResponseData
	): boolean {
		if(item.selector) {
			let tableName = item.selector.split('.')[0];
			let columnName = item.selector.split('.')[1];
			let tableSchema = schema.database.find((item) => item.name === tableName);
			if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
			let columnSchema = tableSchema.columns.find((item) => item.name === columnName);
			if (!columnSchema) throw new RsError('SCHEMA_ERROR', `Column ${columnName} not found in table ${tableName}`);
			return !(ObjectUtils.isArrayWithData(columnSchema.roles) && !columnSchema.roles.includes(role));
		}
		if(item.objectArray) {
			return ObjectUtils.isArrayWithData(item.objectArray.properties.filter(nestedItem => {
				return this.doesRoleHavePermissionToColumn(role, schema, nestedItem)
			}));
		}
		return false;
	}

	private doesRoleHavePermissionToTable(userRole: string, schema: Restura.Schema, tableName: string): boolean {
		let tableSchema = this.getTableSchema(schema, tableName);
		return !(ObjectUtils.isArrayWithData(tableSchema.roles) && !tableSchema.roles.includes(userRole));
	}

	private generateJoinStatements(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		userRole: string,
		sqlParams: any[]
	): string {
		let joinStatements = '';
		routeData.joins.forEach((item) => {
			if (!this.doesRoleHavePermissionToTable(userRole, schema, item.table))
				throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');
			if (item.custom) {
				let customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				customReplaced = this.replaceGlobalParamKeywords(customReplaced, routeData, req, sqlParams);
				joinStatements += `\t${item.type} JOIN \`${item.table}\` ON ${customReplaced}\n`;
			} else {
				joinStatements += `\t${item.type} JOIN \`${item.table}\` ON \`${routeData.table}\`.\`${item.localColumnName}\` = \`${item.table}\`.\`${item.foreignColumnName}\`\n`;
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

	private generateOrderBy(routeData: Restura.StandardRouteData): string {
		let orderBy = '';
		if (routeData.orderBy) {
			orderBy = `ORDER BY \`${routeData.orderBy.tableName}\`.\`${routeData.orderBy.columnName}\` ${routeData.orderBy.order}\n`;
		}
		return orderBy;
	}

	private generateWhereClause(req: RsRequest<any>, routeData: Restura.StandardRouteData, sqlParams: any[]): string {
		let whereClause = '';
		routeData.where.forEach((item, index) => {
			if (index === 0) whereClause = 'WHERE ';

			if (item.custom) {
				let customReplaced = this.replaceParamKeywords(item.custom, routeData, req, sqlParams);
				customReplaced = this.replaceGlobalParamKeywords(customReplaced, routeData, req, sqlParams);
				whereClause += customReplaced;
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

			let replacedValue = this.replaceParamKeywords(item.value, routeData, req, sqlParams);
			replacedValue = this.replaceGlobalParamKeywords(replacedValue, routeData, req, sqlParams);
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

			whereClause += `\t${item.conjunction || ''} \`${item.tableName}\`.\`${
				item.columnName
			}\` ${operator} ${replacedValue}\n`;
		});
		if(routeData.type === 'PAGED' && !!req.data.filter) {
			let statement = req.data.filter.replace(/\$[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				let requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('$', '');
				})
				if (!requestParam) throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = statement.replace(/#[a-zA-Z][a-zA-Z0-9_]+/g, (value: string) => {
				let requestParam = routeData.request!.find((item) => {
					return item.name === value.replace('#', '');
				})
				if (!requestParam) throw new RsError('SCHEMA_ERROR', `Invalid route keyword in route ${routeData.name}`);
				return req.data[requestParam.name];
			});

			statement = filterSqlParser.parse(statement);
			if(whereClause.startsWith('WHERE')) {
				whereClause += ` AND ${statement}\n`
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
		sqlParams: any[]
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
		sqlParams: any[]
	): string {
		// Match any value that starts with a $
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
