import { Service } from '../Service';
import globalState, { getRecoilExternalValue, setRecoilExternalValue } from '../../state/globalState';
import defaultSchema from '../../../../engine/defaultSchema.js';
import http from '../../utils/http.js';
import cloneDeep from 'lodash.clonedeep';

export default class SchemaService extends Service {
	private lastSchema: Restura.Schema | undefined = undefined;

	constructor() {
		console.log(defaultSchema);
		super();
	}

	async getCurrentSchema(): Promise<Restura.Schema> {
		let res = await http.get<RedSky.RsResponseData<Restura.Schema>, void>('/schema');
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, res.data.data);
		this.lastSchema = res.data.data;
		return this.lastSchema;
	}

	async getSchemaPreview(schema: Restura.Schema): Promise<string> {
		let res = await http.post<RedSky.RsResponseData<string>, Restura.Schema>('/schema/preview', schema);
		return res.data.data;
	}

	async uploadSchema(schema: Restura.Schema) {
		await http.post<RedSky.RsResponseData<string>, Restura.Schema>('/schema', schema);
		await this.getCurrentSchema();
	}

	async updateSchema(schema: Restura.Schema) {
		await http.put<RedSky.RsResponseData<string>, Restura.Schema>('/schema', schema);
		await this.getCurrentSchema();
	}

	isSchemaChanged(currentSchema: Restura.Schema | undefined): boolean {
		return JSON.stringify(currentSchema) !== JSON.stringify(this.lastSchema);
	}

	updateRouteData(routeData: Restura.RouteData, routePath: string, baseUrl: string) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToKeyPoints(schema, baseUrl, routePath);
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex] = routeData;
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeValidator(requestParamName: string, validatorIndex: number, routePath: string, baseUrl: string) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToKeyPoints(schema, baseUrl, routePath, requestParamName);
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request[
			indices.paramIndex!
		].validator.splice(validatorIndex, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	removeRequestParam(requestParamName: string, routePath: string, baseUrl: string) {
		let schema = getRecoilExternalValue<Restura.Schema | undefined>(globalState.schema);
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let indices = SchemaService.getIndexesToKeyPoints(schema, baseUrl, routePath, requestParamName);
		updatedSchema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request.splice(indices.paramIndex!, 1);
		setRecoilExternalValue<Restura.Schema | undefined>(globalState.schema, updatedSchema);
	}

	static getIndexesToKeyPoints(
		schema: Restura.Schema,
		baseUrl: string,
		routePath: string,
		paramName?: string
	): { endpointIndex: number; routeIndex: number; paramIndex?: number } {
		let indices = {
			endpointIndex: -1,
			routeIndex: -1,
			paramIndex: -1
		};
		indices.endpointIndex = schema.endpoints.findIndex((r) => r.baseUrl === baseUrl);
		if (indices.endpointIndex === -1) throw new Error('Endpoint not found');
		indices.routeIndex = schema.endpoints[indices.endpointIndex].routes.findIndex((r) => r.path === routePath);
		if (indices.routeIndex === -1) throw new Error('Route not found');
		if (paramName) {
			indices.paramIndex = schema.endpoints[indices.endpointIndex].routes[indices.routeIndex].request.findIndex(
				(r) => r.name === paramName
			);
			if (indices.paramIndex === -1) throw new Error('Param not found');
		}
		return indices;
	}

	static generateForeignKeyName(tableName: string, column: string, refTableName: string, refColumn: string) {
		return `${tableName}_${column}_${refTableName}_${refColumn}_fk`;
	}

	static generateIndexName(tableName: string, columns: string[], isUnique: boolean) {
		return `${tableName}_${columns.join('_')}${isUnique ? '_unique' : ''}_index`;
	}

	static getTableData(schemaData: Restura.Schema, tableName: string): Restura.TableData {
		return schemaData.database.find((item) => item.name === tableName)!;
	}

	static getColumnData(schemaData: Restura.Schema, tableName: string, columnName: string): Restura.ColumnData {
		return schemaData.database
			.find((item) => item.name === tableName)!
			.columns.find((item) => item.name === columnName)!;
	}

	static validateDatabaseSchema(schema: Restura.Schema): string[] {
		// Check for duplicate table names
		const tableNames = schema.database.map((table) => table.name);
		const duplicateTableNames = tableNames.filter((item, index) => tableNames.indexOf(item) !== index);
		let errors: string[] = [];
		if (duplicateTableNames.length > 0) {
			errors.push(`Duplicate table names: ${duplicateTableNames.join(', ')}`);
		}

		// Check for a primary key per table
		const tablesWithoutPrimaryKey = schema.database.filter(
			(table) => !table.indexes.find((index) => index.isPrimaryKey)
		);
		if (tablesWithoutPrimaryKey.length > 0) {
			errors.push(`Tables without primary key: ${tablesWithoutPrimaryKey.map((table) => table.name).join(', ')}`);
		}

		// TODO: Look for any indexes that have MISSING! in their name

		// TODO: Look for any foreign keys that have MISSING! in their name

		return errors;
	}
}
