import { StringUtils } from '../../../../src/utils/utils.js';
import { ObjectUtils } from '@redskytech/framework/utils/index.js';

type TreeData = Restura.RouteData | Restura.EndpointData;

function isRouteData(data: TreeData): data is Restura.RouteData {
	return (data as Restura.RouteData).method !== undefined;
}

function isEndpointData(data: TreeData): data is Restura.EndpointData {
	return (data as Restura.EndpointData).routes !== undefined;
}

class NamespaceTree {
	readonly namespace: string | null;
	private data: TreeData[] = [];
	private children: Map<string, NamespaceTree>;
	static createRootNode() {
		return new NamespaceTree(null);
	}
	private constructor(namespace: string | null) {
		this.namespace = namespace;
		this.children = new Map();
	}

	addData(namespaces: string[], route: Restura.RouteData | Restura.EndpointData) {
		if (ObjectUtils.isEmpty(namespaces)) {
			this.data.push(route);
			return;
		}
		const childName: string = namespaces[0];
		this.children.set(childName, this.children.get(childName) || new NamespaceTree(childName));
		this.children.get(childName)!.addData(namespaces.slice(1), route);
	}

	createApi(): string {
		let result = '';
		for (const child of this.children.values()) {
			result += child.createApiImpl(true);
		}
		return result;
	}

	private createApiImpl(isBase: boolean): string {
		let result = ``;
		for (const data of this.data) {
			if (isEndpointData(data)) {
				result += generateEndpointComments(data);
			}
		}
		result += isBase
			? `
			declare namespace ${this.namespace} {`
			: `
			export namespace ${this.namespace} {`;

		for (const data of this.data) {
			if (isRouteData(data)) {
				result += generateRouteModels(data);
			}
		}

		for (const child of this.children.values()) {
			result += child.createApiImpl(false);
		}
		result += '}';
		return result;
	}
}

export default function generateSchemaModel(schema: Restura.Schema): string {
	let modelString = '';
	const rootNamespace = NamespaceTree.createRootNode();
	for (let endpoint of schema.endpoints) {
		const endpointNamespaces = pathToNamespaces(endpoint.baseUrl);
		rootNamespace.addData(endpointNamespaces, endpoint);
		for (let route of endpoint.routes) {
			const fullNamespace: string[] = [...endpointNamespaces, ...pathToNamespaces(route.path)];
			rootNamespace.addData(fullNamespace, route);
		}
	}
	modelString += rootNamespace.createApi();
	return modelString;
}

function generateEndpointComments(endpoint: Restura.EndpointData): string {
	return `
		// ${endpoint.name}
		// ${endpoint.description}`;
}

function generateRouteModels(route: Restura.RouteData): string {
	let modelString: string = ``;
	const routeNamespaces = route.path.split('/').filter((e) => e);
	modelString += `
				// ${route.name}
				// ${route.description}
				export namespace ${StringUtils.capitalizeFirst(route.method.toLowerCase())} {
				  ${generateRequestParameters(route)}
				  ${generateResponseParameters(route)}
				}
				`;
	return modelString;
}

function generateRequestParameters(route: Restura.RouteData): string {
	let modelString: string = ``;
	if (!route.request) return modelString;

	modelString += `
		 	export interface Req{
		 					${route.request.map((p) => `${p.name}:any`).join(';\n')}
		 `;

	modelString += `}`;
	return modelString;
}

function generateResponseParameters(route: Restura.RouteData): string {
	let modelString: string = ``;
	if (!('response' in route)) return modelString;

	modelString += `
		 	export interface Res{
		 					${route.response.map((p) => `${p.name}:any`).join(';\n')}
		 `;

	modelString += `}`;
	return modelString;
}

function pathToNamespaces(path: string): string[] {
	return path
		.split('/')
		.map((e) => StringUtils.toPascalCasing(e))
		.filter((e) => e);
}
