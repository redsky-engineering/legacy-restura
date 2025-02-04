import { StringUtils } from '@redskytech/core-utils';
import { ObjectUtils } from '@redskytech/framework/utils/index.js';
import prettier from 'prettier';
import ResponseValidator from './responseValidator.js';
import { SqlUtils } from './utils/utils.js';

type TreeData = Restura.RouteData | Restura.EndpointData;

class ApiTree {
	readonly namespace: string | null;
	private data: TreeData[] = [];
	private children: Map<string, ApiTree>;

	private constructor(
		namespace: string | null,
		private readonly database: Array<Restura.TableData>
	) {
		this.namespace = namespace;
		this.children = new Map();
	}

	static createRootNode(database: Array<Restura.TableData>) {
		return new ApiTree(null, database);
	}

	static isRouteData(data: TreeData): data is Restura.RouteData {
		return (data as Restura.RouteData).method !== undefined;
	}

	static isEndpointData(data: TreeData): data is Restura.EndpointData {
		return (data as Restura.EndpointData).routes !== undefined;
	}

	addData(namespaces: string[], route: Restura.RouteData | Restura.EndpointData) {
		if (ObjectUtils.isEmpty(namespaces)) {
			this.data.push(route);
			return;
		}
		const childName: string = namespaces[0];
		this.children.set(childName, this.children.get(childName) || new ApiTree(childName, this.database));
		this.children.get(childName)!.addData(namespaces.slice(1), route);
	}

	createApiModels(): string {
		let result = '';
		for (const child of this.children.values()) {
			result += child.createApiModelImpl(true);
		}
		return result;
	}

	private createApiModelImpl(isBase: boolean): string {
		let result = ``;
		for (const data of this.data) {
			if (ApiTree.isEndpointData(data)) {
				result += ApiTree.generateEndpointComments(data);
			}
		}
		result += isBase
			? `
			declare namespace ${this.namespace} {`
			: `
			export namespace ${this.namespace} {`;

		for (const data of this.data) {
			if (ApiTree.isRouteData(data)) {
				result += this.generateRouteModels(data);
			}
		}

		for (const child of this.children.values()) {
			result += child.createApiModelImpl(false);
		}
		result += '}';
		return result;
	}

	static generateEndpointComments(endpoint: Restura.EndpointData): string {
		return `
		// ${endpoint.name}
		// ${endpoint.description}`;
	}

	generateRouteModels(route: Restura.RouteData): string {
		let modelString: string = ``;
		modelString += `
				// ${route.name}
				// ${route.description}
				export namespace ${StringUtils.capitalizeFirst(route.method.toLowerCase())} {
				  ${this.generateRequestParameters(route)}
				  ${this.generateResponseParameters(route)}
				}`;
		return modelString;
	}

	generateRequestParameters(route: Restura.RouteData): string {
		let modelString: string = ``;
		if (ResponseValidator.isCustomRoute(route) && route.requestType) {
			modelString += `
				export type Req = CustomTypes.${route.requestType}`;
			return modelString;
		}

		if (!route.request) return modelString;

		modelString += `
		 	export interface Req{
		 					${route.request
								.map((p) => {
									let requestType = 'any';
									const oneOfValidator = p.validator.find((v) => v.type === 'ONE_OF');
									const typeCheckValidator = p.validator.find((v) => v.type === 'TYPE_CHECK');
									if (
										oneOfValidator &&
										ObjectUtils.isArrayWithData(oneOfValidator.value as string[])
									) {
										requestType = (oneOfValidator.value as string[])
											.map((v) => `'${v}'`)
											.join(' | ');
									} else if (typeCheckValidator) {
										switch (typeCheckValidator.value) {
											case 'string':
											case 'number':
											case 'boolean':
											case 'string[]':
											case 'number[]':
											case 'any[]':
												requestType = typeCheckValidator.value;
												break;
										}
									}
									return `'${p.name}'${p.required ? '' : '?'}:${requestType}`;
								})
								.join(';\n')}${ObjectUtils.isArrayWithData(route.request) ? ';' : ''}
		 `;

		modelString += `}`;
		return modelString;
	}

	generateResponseParameters(route: Restura.RouteData): string {
		if (ResponseValidator.isCustomRoute(route)) {
			// Look for simple type for response
			if (['number', 'string', 'boolean'].includes(route.responseType))
				return `export type Res = ${route.responseType}`;
			else if (['CUSTOM_ARRAY', 'CUSTOM_PAGED'].includes(route.type))
				return `export type Res = CustomTypes.${route.responseType}[]`;
			else return `export type Res = CustomTypes.${route.responseType}`;
		}
		return `export interface Res ${this.getFields(route.response)}`;
	}

	getFields(fields: ReadonlyArray<Restura.ResponseData>): string {
		const nameFields = fields.map((f) => this.getNameAndType(f));
		const nested: string = `{
			${nameFields.join(';\n\t')}${ObjectUtils.isArrayWithData(nameFields) ? ';' : ''}
		}`;
		return nested;
	}

	getNameAndType(p: Restura.ResponseData): string {
		let responseType = 'any',
			optional = false,
			array = false;
		if (p.selector) {
			({ responseType, optional } = this.getTypeFromTable(p.selector, p.name));
		} else if (p.subquery) {
			responseType = this.getFields(p.subquery.properties);
			array = true;
		}
		return `${p.name}${optional ? '?' : ''}:${responseType}${array ? '[]' : ''}`;
	}

	getTypeFromTable(selector: string, name: string): { responseType: string; optional: boolean } {
		const path = selector.split('.');
		if (path.length === 0 || path.length > 2 || path[0] === '') return { responseType: 'any', optional: false };

		let tableName = path.length == 2 ? path[0] : name;
		const columnName = path.length == 2 ? path[1] : path[0];
		let table = this.database.find((t) => t.name == tableName);
		if (!table && tableName.includes('_')) {
			const tableAliasSplit = tableName.split('_');
			tableName = tableAliasSplit[1];
			table = this.database.find((t) => t.name == tableName);
		}

		const column = table?.columns.find((c) => c.name == columnName);
		if (!table || !column) return { responseType: 'any', optional: false };

		return {
			responseType: SqlUtils.convertDatabaseTypeToTypescript(column.type, column.value),
			optional: column.roles.length > 0 || column.isNullable
		};
	}
}

function pathToNamespaces(path: string): string[] {
	return path
		.split('/')
		.map((e) => StringUtils.toPascalCasing(e))
		.filter((e) => e);
}

export default function apiGenerator(schema: Restura.Schema, schemaHash: string): Promise<string> {
	let apiString = `/** Auto generated file from Schema Hash (${schemaHash}). DO NOT MODIFY **/`;
	const rootNamespace = ApiTree.createRootNode(schema.database);
	for (const endpoint of schema.endpoints) {
		const endpointNamespaces = pathToNamespaces(endpoint.baseUrl);
		rootNamespace.addData(endpointNamespaces, endpoint);
		for (const route of endpoint.routes) {
			const fullNamespace: string[] = [...endpointNamespaces, ...pathToNamespaces(route.path)];
			rootNamespace.addData(fullNamespace, route);
		}
	}
	apiString += rootNamespace.createApiModels();
	if (schema.customTypes.length > 0) {
		apiString += `\n
		declare namespace CustomTypes {
			${schema.customTypes}
		}`;
	}

	return prettier.format(apiString, {
		parser: 'typescript',
		...{
			trailingComma: 'none',
			tabWidth: 4,
			useTabs: true,
			endOfLine: 'lf',
			printWidth: 120,
			singleQuote: true
		}
	});
}
