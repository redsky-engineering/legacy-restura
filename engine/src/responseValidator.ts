import { StringUtils } from '../../../../src/utils/utils.js';
import { RsError } from '../../../../src/utils/errors.js';

export default class ResponseValidator {
	private readonly rootMap: Restura.ResponseTypeMap;
	private readonly database: ReadonlyArray<Restura.TableData>;

	constructor(schema: Restura.Schema) {
		this.database = schema.database;
		this.rootMap = {};
		for (const endpoint of schema.endpoints) {
			const endpointMap: Restura.ResponseTypeMap = {};
			for (let route of endpoint.routes) {
				if (ResponseValidator.isCustomRoute(route)) {
					endpointMap[route.name] = { validator: 'any' };
					continue;
				}
				endpointMap[route.name] = this.getRouteResponseType(route);
			}
			const endpointUrl = endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl.slice(0, -1) : endpoint.baseUrl;
			this.rootMap[endpointUrl] = { validator: endpointMap };
		}
	}

	public validateResponseParams(data: any, endpointUrl: string, routeName: string) {
		if (!this.rootMap) {
			throw new RsError('BAD_REQUEST', 'Cannot validate response without type maps');
		}

		const routeMap = (this.rootMap[endpointUrl].validator as Restura.ResponseTypeMap)[routeName];
		this.validateMap('_base', data, routeMap);
	}

	private getRouteResponseType(route: Restura.StandardRouteData): Restura.ResponseType {
		const map: Restura.ResponseTypeMap = {};
		for (const field of route.response) {
			map[field.name] = this.getFieldResponseType(field, route.table);
		}
		return { validator: map, isArray: route.type === 'ARRAY' };
	}

	private getFieldResponseType(field: Restura.ResponseData, tableName: string): Restura.ResponseType {
		if (field.selector) {
			return this.getTypeFromTable(field.selector, tableName);
		} else if (field.objectArray) {
			const table = this.database.find((t) => t.name == tableName);
			if (!table) return { isArray: true, validator: 'any' };
			const isOptional = table.roles.length > 0;
			const validator: Restura.ResponseTypeMap = {};
			for (const prop of field.objectArray.properties) {
				validator[prop.name] = this.getFieldResponseType(prop, field.objectArray.table);
			}
			return {
				isArray: true,
				isOptional,
				validator
			};
		}
		return { validator: 'any' };
	}

	private getTypeFromTable(selector: string, name: string): Restura.ResponseType {
		const path = selector.split('.');
		if (path.length === 0 || path.length > 2 || path[0] === '') return { validator: 'any', isOptional: false };

		const tableName = path.length == 2 ? path[0] : name,
			columnName = path.length == 2 ? path[1] : path[0];
		const table = this.database.find((t) => t.name == tableName);
		const column = table?.columns.find((c) => c.name == columnName);
		if (!table || !column) return { validator: 'any', isOptional: false };

		let validator: Restura.ValidatorString | string | string[] = StringUtils.convertDatabaseTypeToTypescript(
			column.type,
			column.value
		);
		if (!ResponseValidator.validatorIsValidString(validator)) validator = this.parseValidationEnum(validator);

		return {
			validator,
			isOptional: column.roles.length > 0 || column.isNullable
		};
	}

	private parseValidationEnum(validator: string): string[] {
		let terms = validator.split('|');
		terms = terms.map((v) => v.replace(/'/g, '').trim());
		return terms;
	}

	private validateMap(name: string, value: any, { isOptional, isArray, validator }: Restura.ResponseTypeMap[string]) {
		if (validator === 'any') return;
		const valueType = typeof value;
		if (value == null) {
			if (isOptional) return;
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is required`);
		}
		if (isArray) {
			if (!Array.isArray(value)) {
				throw new RsError(
					'DATABASE_ERROR',
					`Response param (${name}) is a/an ${valueType} instead of an array`
				);
			}
			value.forEach((v, i) => this.validateMap(`${name}[${i}]`, v, { validator }));
			return;
		}
		if (typeof validator === 'string') {
			if (valueType === validator) return;
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
		}
		if (Array.isArray(validator)) {
			if (validator.includes(value)) return;
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is not one of the enum options (${value})`);
		}
		if (valueType !== 'object') {
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
		}
		for (const prop in value) {
			if (!validator[prop])
				throw new RsError('DATABASE_ERROR', `Response param (${name}.${prop}) is not allowed`);
		}
		for (let prop in validator) {
			this.validateMap(`${name}.${prop}`, value[prop], validator[prop]);
		}
	}

	private static isCustomRoute(route: Restura.RouteData): route is Restura.CustomRouteData {
		return route.type === 'CUSTOM_ONE' || route.type === 'CUSTOM_ARRAY';
	}

	private static validatorIsValidString(validator: string): validator is Restura.ValidatorString {
		return !validator.includes('|');
	}
}
