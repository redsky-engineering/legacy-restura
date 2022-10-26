import { StringUtils } from '../../../../src/utils/utils.js';
import { ObjectUtils } from '@redskytech/framework/utils/index.js';
import prettier from 'prettier';

type TreeData = Restura.RouteData | Restura.EndpointData;

class ApiTree {
	readonly namespace: string | null;
	private data: TreeData[] = [];
	private children: Map<string, ApiTree>;

	private constructor(namespace: string | null, private readonly database: Array<Restura.TableData>) {
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
		const routeNamespaces = route.path.split('/').filter((e) => e);
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
		if (!route.request) return modelString;

		modelString += `
		 	export interface Req{
		 					${route.request
								.map((p) => {
									let requestType = 'any';
									let typeCheckValidator = p.validator.find((v) => v.type === 'TYPE_CHECK');
									if (typeCheckValidator) {
										switch (typeCheckValidator.value) {
											case 'string':
											case 'number':
											case 'boolean':
												requestType = typeCheckValidator.value;
												break;
										}
									}
									return `${p.name}:${requestType}`;
								})
								.join(';\n')}
		 `;

		modelString += `}`;
		return modelString;
	}

	generateResponseParameters(route: Restura.RouteData): string {
		if (!('response' in route)) return '';

		let modelString = 'export interface Res ';
		if (route.type === 'ARRAY') modelString += `extends Array<${this.getFields(route.response)}>{}`;
		else modelString += this.getFields(route.response);
		return modelString;
	}

	getFields(fields: ReadonlyArray<Restura.ResponseData>): string {
		let nested: string = `{
		${fields.map((f) => this.getNameAndType(f)).join(';')}
	}`;
		return nested;
	}

	getNameAndType(p: Restura.ResponseData): string {
		let responseType = 'any',
			optional = false,
			array = false;
		if (p.selector) {
			({ responseType, optional } = this.getTypeFromTable(p.selector, p.name));
		} else if (p.objectArray) {
			responseType = this.getFields(p.objectArray.properties);
			array = true;
		}
		return `${p.name}${optional ? '?' : ''}:${array ? 'Array<' : ''}${responseType}${array ? '>' : ''}`;
	}

	getTypeFromTable(selector: string, name: string): { responseType: string; optional: boolean } {
		const path = selector.split('.');
		if (path.length === 0 || path.length > 2 || path[0] === '') return { responseType: 'any', optional: false };

		const tableName = path.length == 2 ? path[0] : name,
			columnName = path.length == 2 ? path[1] : path[0];
		const table = this.database.find((t) => t.name == tableName);
		const column = table?.columns.find((c) => c.name == columnName);
		if (!table || !column) return { responseType: 'any', optional: false };

		return {
			responseType: StringUtils.convertDatabaseTypeToTypescript(column.type),
			optional: column.roles.length > 0
		};
	}
}

function pathToNamespaces(path: string): string[] {
	return path
		.split('/')
		.map((e) => StringUtils.toPascalCasing(e))
		.filter((e) => e);
}

export default function apiGenerator(schema: Restura.Schema): string {
	let apiString = `/** Auto generated file from Schema Version (${schema.version}). DO NOT MODIFY **/`;
	const rootNamespace = ApiTree.createRootNode(schema.database);
	for (let endpoint of schema.endpoints) {
		const endpointNamespaces = pathToNamespaces(endpoint.baseUrl);
		rootNamespace.addData(endpointNamespaces, endpoint);
		for (let route of endpoint.routes) {
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
