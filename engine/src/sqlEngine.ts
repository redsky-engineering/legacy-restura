import connection from '../../../../src/database/connection.js';
import { RsRequest } from '../../../../src/@types/expressCustom.js';
import { RsError } from '../../../../src/utils/errors.js';
import { ObjectUtils } from '../../../../src/utils/utils.js';

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
		let sqlParams: any[] = [];
		let sqlStatement = this.generateSqlFromRoute(req, routeData, schema, sqlParams);
		if (routeData.type === 'ONE') return await connection.queryOne(sqlStatement, sqlParams);
		else return await connection.runQuery(sqlStatement, sqlParams);
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
			for (let foreignKey of table.foreignKeys) {
				sql += `\tADD CONSTRAINT \`${foreignKey.name}\` FOREIGN KEY (\`${foreignKey.column}\`) REFERENCES \`${foreignKey.refTable}\`(\`${foreignKey.refColumn}\`)`;
				sql += ` ON DELETE ${foreignKey.onDelete}`;
				sql += ` ON UPDATE ${foreignKey.onUpdate}`;
				sql += ';\n';
			}
			sqlStatements.push(sql);
		}
		let sqlFullStatement = sqlStatements.join('\n\n');
		return sqlFullStatement;
	}

	private generateSqlFromRoute(
		req: RsRequest<any>,
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		sqlParams: any[]
	): string {
		let userRole = req.requesterDetails.role;
		let sqlStatement = 'SELECT \n';

		if (!this.doesRoleHavePermissionToTable(userRole, schema, routeData.table))
			throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');

		let selectColumns: { selector: string; aliasName: string }[] = [];
		routeData.response.forEach((item) => {
			let tableName = item.selector.split('.')[0];
			let columnName = item.selector.split('.')[1];
			if (this.doesRoleHavePermissionToColumn(userRole, schema, tableName, columnName))
				selectColumns.push({ selector: item.selector, aliasName: item.name });
		});
		if (!selectColumns.length) throw new RsError('UNAUTHORIZED', `You do not have permission to access this data.`);

		sqlStatement += `\t${selectColumns
			.map((item) => {
				return `${item.selector} AS ${item.aliasName}`;
			})
			.join(',\n\t')}\n`;
		sqlStatement += `FROM \`${routeData.table}\`\n`;
		sqlStatement += this.generateJoinStatements(routeData, schema, userRole);
		sqlStatement += this.generateWhereClause(req, routeData, sqlParams);
		sqlStatement += ';';
		return sqlStatement;
	}

	private doesRoleHavePermissionToColumn(
		role: string,
		schema: Restura.Schema,
		tableName: string,
		columnName: string
	): boolean {
		let tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		let columnSchema = tableSchema.columns.find((item) => item.name === columnName);
		if (!columnSchema) throw new RsError('SCHEMA_ERROR', `Column ${columnName} not found in table ${tableName}`);
		return !(ObjectUtils.isArrayWithData(columnSchema.roles) && !columnSchema.roles.includes(role));
	}

	private doesRoleHavePermissionToTable(userRole: string, schema: Restura.Schema, tableName: string): boolean {
		let tableSchema = this.getTableSchema(schema, tableName);
		return !(ObjectUtils.isArrayWithData(tableSchema.roles) && !tableSchema.roles.includes(userRole));
	}

	private generateJoinStatements(
		routeData: Restura.StandardRouteData,
		schema: Restura.Schema,
		userRole: string
	): string {
		let joinStatements = '';
		routeData.joins.forEach((item) => {
			if (!this.doesRoleHavePermissionToTable(userRole, schema, item.table))
				throw new RsError('UNAUTHORIZED', 'You do not have permission to access this table');
			if (item.custom) joinStatements += `\t${item.type} JOIN \`${item.table}\` ON ${item.custom}\n`;
			else
				joinStatements += `\t${item.type} JOIN \`${item.table}\` ON \`${routeData.table}\`.\`${item.localColumnName}\` = \`${item.table}.${item.foreignColumnName}\`\n`;
		});
		return joinStatements;
	}

	private getTableSchema(schema: Restura.Schema, tableName: string): Restura.TableData {
		let tableSchema = schema.database.find((item) => item.name === tableName);
		if (!tableSchema) throw new RsError('SCHEMA_ERROR', `Table ${tableName} not found in schema`);
		return tableSchema;
	}

	private generateWhereClause(req: RsRequest<any>, routeData: Restura.StandardRouteData, sqlParams: any[]): string {
		let whereClause = '';
		routeData.where.forEach((item) => {
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

			whereClause += `\t${item.conjunction || ''} WHERE \`${item.tableName}\`.\`${
				item.columnName
			}\` ${operator} ${replacedValue}\n`;
		});

		return whereClause || 'TRUE';
	}

	private replaceParamKeywords(
		value: string,
		routeData: Restura.RouteData,
		req: RsRequest<any>,
		sqlParams: any[]
	): string {
		// Match any value that starts with a $
		value.match(/\$[a-zA-Z][a-zA-Z0-9_]+/g)?.forEach((param) => {
			let requestParam = routeData.request.find((item) => {
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
