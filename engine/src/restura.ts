import * as express from 'express';

import { RsRequest, RsResponse } from '../../../../src/@types/expressCustom.js';
import { boundMethod } from 'autobind-decorator';
import config from '../../../../src/utils/config.js';
import { Router } from 'express';
import logger from '../../../../src/utils/logger.js';
import { RsError } from '../../../../src/utils/errors.js';
import validateRequestParams from './validateRequestParams.js';
import sqlEngine from './sqlEngine.js';
import compareSchema from './compareSchema.js';
import apiFactory from '../../../../src/api/apiFactory.js';
import { StringUtils } from '../../../../src/utils/utils.js';
import apiGenerator from './apiGenerator.js';
import fs from 'fs';

import modelGenerator from './modelGenerator.js';
import { createHash } from 'crypto';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import ResponseValidator from './responseValidator.js';

import customTypeValidationGenerator, { ValidationDictionary } from './customTypeValidationGenerator.js';
import schemaValidator, { isSchemaValid } from './schemaValidator.js';
import { ObjectUtils } from '@redskytech/framework/utils/index.js';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ResturaEngine {
	private resturaRouter!: Router;
	private publicEndpoints: { GET: string[]; POST: string[]; PUT: string[]; PATCH: string[]; DELETE: string[] } = {
		GET: [],
		POST: [],
		PUT: [],
		PATCH: [],
		DELETE: []
	};
	private expressApp!: express.Application;
	private schema!: Restura.Schema;
	private schemaFilePath!: string;
	private responseValidator!: ResponseValidator;
	private customTypeValidation!: ValidationDictionary;

	async init(app: express.Application): Promise<void> {
		// Middleware
		app.use('/restura', this.resturaAuthentication);
		app.use('/restura', (schemaValidator as unknown) as express.RequestHandler);

		// Routes
		app.put('/restura/v1/schema', (this.updateSchema as unknown) as express.RequestHandler);
		app.post('/restura/v1/schema/preview', (this.previewCreateSchema as unknown) as express.RequestHandler);
		app.get('/restura/v1/schema', this.getSchema);
		app.get('/restura/v1/schema/types', this.getSchemaAndTypes);

		this.expressApp = app;

		await this.reloadEndpoints();
	}

	isEndpointPublic(method: string, fullUrl: string): boolean {
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
		return this.publicEndpoints[method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'].includes(fullUrl);
	}

	async generateApiFromSchema(outputFile: string, providedSchema: Restura.Schema): Promise<void> {
		fs.writeFileSync(outputFile, apiGenerator(providedSchema, this.generateHashForSchema(providedSchema)));
	}

	async generateModelFromSchema(outputFile: string, providedSchema: Restura.Schema): Promise<void> {
		fs.writeFileSync(outputFile, modelGenerator(providedSchema, this.generateHashForSchema(providedSchema)));
	}

	async getLatestFileSystemSchema(): Promise<Restura.Schema> {
		this.schemaFilePath = this.findSchemaFilePath();
		let schemaFileData = fs.readFileSync(this.schemaFilePath, 'utf8');
		let schema: Restura.Schema = ObjectUtils.safeParse(schemaFileData);
		let isValid = await isSchemaValid(schema);
		if (!isValid) throw new Error('Schema is not valid');
		return schema;
	}

	getHashes(
		providedSchema: Restura.Schema
	): {
		schemaHash: string;
		apiCreatedSchemaHash: string;
		modelCreatedSchemaHash: string;
	} {
		const schemaHash = this.generateHashForSchema(providedSchema);
		const apiFile = fs.readFileSync(path.join(__dirname, '../../../../../src/@types/api.d.ts'));
		const apiCreatedSchemaHash = apiFile.toString().match(/\((.*)\)/)?.[1] ?? '';
		const modelFile = fs.readFileSync(path.join(__dirname, '../../../../../src/@types/models.d.ts'));
		const modelCreatedSchemaHash = modelFile.toString().match(/\((.*)\)/)?.[1] ?? '';
		return {
			schemaHash,
			apiCreatedSchemaHash,
			modelCreatedSchemaHash
		};
	}

	@boundMethod
	private async reloadEndpoints() {
		this.schema = await this.getLatestFileSystemSchema();
		this.customTypeValidation = customTypeValidationGenerator(this.schema);
		this.resturaRouter = express.Router();
		this.resetPublicEndpoints();

		let routeCount = 0;
		for (let endpoint of this.schema.endpoints) {
			const baseUrl = endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl.slice(0, -1) : endpoint.baseUrl;
			this.expressApp.use(baseUrl, (req, res, next) => {
				// When you do an express use the baseUrl is stripped from the url, so we need to add to the router each baseUrl usage.
				this.resturaRouter(req, res, next);
			});
			for (let route of endpoint.routes) {
				route.path = route.path.startsWith('/') ? route.path : `/${route.path}`;
				route.path = route.path.endsWith('/') ? route.path.slice(0, -1) : route.path;
				const fullUrl = `${baseUrl}${route.path}`;

				if (route.roles.includes('anonymous') || route.roles.length === 0)
					this.publicEndpoints[route.method].push(fullUrl);

				this.resturaRouter[route.method.toLowerCase() as Lowercase<typeof route.method>](
					route.path, // <-- Notice we only use path here since the baseUrl is already added to the router.
					(this.executeRouteLogic as unknown) as express.RequestHandler
				);
				routeCount++;
			}
		}
		this.responseValidator = new ResponseValidator(this.schema);

		logger.info(`Restura loaded (${routeCount}) endpoint${routeCount > 1 ? 's' : ''}`);
	}

	private findSchemaFilePath(): string {
		let basePath: string[] = ['..', '..', '..', '..', '..'];
		let missingFiles: string[] = [];
		do {
			const fileName = path.join(__dirname, ...basePath, 'restura.schema.json');
			if (fs.existsSync(fileName)) {
				console.info(`Using restura file: ${fileName}`);
				return fileName;
			}
			missingFiles.push(fileName);
			basePath.pop();
		} while (basePath.length > 0);
		throw new Error(`Could not find config file in ${missingFiles.join(',')} `);
	}

	@boundMethod
	private resturaAuthentication(req: express.Request, res: express.Response, next: express.NextFunction) {
		if (req.headers['x-auth-token'] !== config.application.resturaAuthToken) res.status(401).send('Unauthorized');
		else next();
	}

	@boundMethod
	private async previewCreateSchema(req: RsRequest<Restura.Schema>, res: express.Response) {
		try {
			const schemaDiff = await compareSchema.diffSchema(req.data, this.schema);
			res.send({ data: schemaDiff });
		} catch (err) {
			res.status(400).send(err);
		}
	}

	@boundMethod
	private async updateSchema(req: RsRequest<Restura.Schema>, res: express.Response) {
		try {
			this.schema = req.data;
			this.storeFileSystemSchema();
			await this.reloadEndpoints();
			await this.updateTypes();
			res.send({ data: 'success' });
		} catch (err: any) {
			res.status(400).send(err.message);
		}
	}

	private async updateTypes() {
		// Since we are in the dist folder in execution we have to go up one extra
		await this.generateApiFromSchema(path.join(__dirname, '../../../../../src/@types/api.d.ts'), this.schema);
		await this.generateModelFromSchema(path.join(__dirname, '../../../../../src/@types/models.d.ts'), this.schema);
	}

	@boundMethod
	private async getSchema(req: express.Request, res: express.Response) {
		res.send({ data: this.schema });
	}

	@boundMethod
	private async getSchemaAndTypes(req: express.Request, res: express.Response) {
		try {
			let schema = await this.getLatestFileSystemSchema();
			let schemaHash = this.generateHashForSchema(schema);
			const apiText = apiGenerator(schema, schemaHash);
			const modelsText = modelGenerator(schema, schemaHash);
			res.send({ schema, api: apiText, models: modelsText });
		} catch (err) {
			res.status(400).send({ error: err });
		}
	}

	@boundMethod
	private async executeRouteLogic(req: RsRequest<any>, res: RsResponse<any>, next: express.NextFunction) {
		try {
			// Locate the route in the schema
			let routeData = this.getRouteData(req.method, req.baseUrl, req.path);

			// Validate the user has access to the endpoint
			this.validateAuthorization(req, routeData);

			// Validate the request
			validateRequestParams(req, routeData, this.customTypeValidation);

			// Check for custom logic
			if (this.isCustomRoute(routeData)) {
				await this.runCustomRouteLogic(req, res, routeData);
				return;
			}

			// Run SQL query
			let data = await sqlEngine.runQueryForRoute(req, routeData, this.schema);

			// Validate the response
			this.responseValidator.validateResponseParams(data, req.baseUrl, routeData);

			// Send response
			if (routeData.type === 'PAGED') res.sendNoWrap(data);
			else res.sendData(data);
		} catch (e: any) {
			next(e);
		}
	}

	@boundMethod
	private isCustomRoute(route: Restura.RouteData): route is Restura.CustomRouteData {
		return route.type === 'CUSTOM_ONE' || route.type === 'CUSTOM_ARRAY';
	}

	@boundMethod
	private async runCustomRouteLogic(req: RsRequest<any>, res: RsResponse<any>, routeData: Restura.RouteData) {
		let version = req.baseUrl.split('/')[2];
		let domain = routeData.path.split('/')[1];
		let customApiName = `${StringUtils.capitalizeFirst(domain)}Api${StringUtils.capitalizeFirst(version)}`;

		let customApi = apiFactory.getCustomApi(customApiName) as any;
		if (!customApi) throw new RsError('NOT_FOUND', `API domain ${domain}-${version} not found`);

		let functionName = `${routeData.method.toLowerCase()}${routeData.path
			.replace(new RegExp('-', 'g'), '/')
			.split('/')
			.reduce((acc, cur) => {
				if (cur === '') return acc;
				return acc + StringUtils.capitalizeFirst(cur);
			}, '')}`;
		let customFunction = customApi[functionName];
		if (!customFunction) throw new RsError('NOT_FOUND', `API path ${routeData.path} not implemented`);
		await customFunction(req, res, routeData);
	}

	private generateHashForSchema(providedSchema: Restura.Schema): string {
		const schemaPrettyStr = prettier.format(JSON.stringify(providedSchema), {
			parser: 'json',
			...{
				trailingComma: 'none',
				tabWidth: 4,
				useTabs: true,
				endOfLine: 'lf',
				printWidth: 120,
				singleQuote: true
			}
		});
		return createHash('sha256').update(schemaPrettyStr).digest('hex');
	}

	private storeFileSystemSchema() {
		const schemaPrettyStr = prettier.format(JSON.stringify(this.schema), {
			parser: 'json',
			...{
				trailingComma: 'none',
				tabWidth: 4,
				useTabs: true,
				endOfLine: 'lf',
				printWidth: 120,
				singleQuote: true
			}
		});
		fs.writeFileSync(this.schemaFilePath, schemaPrettyStr);
	}

	private resetPublicEndpoints() {
		this.publicEndpoints = {
			GET: [],
			POST: [],
			PUT: [],
			PATCH: [],
			DELETE: []
		};
	}

	private validateAuthorization(req: RsRequest<any>, routeData: Restura.RouteData) {
		let role = req.requesterDetails.role;
		if (routeData.roles.length === 0) return;
		if (!routeData.roles.includes(role))
			throw new RsError('UNAUTHORIZED', 'Not authorized to access this endpoint');
	}

	private getRouteData(method: string, baseUrl: string, path: string): Restura.RouteData {
		let endpoint = this.schema.endpoints.find((item) => {
			return item.baseUrl === baseUrl;
		});
		if (!endpoint) throw new RsError('NOT_FOUND', 'Route not found');
		let route = endpoint.routes.find((item) => {
			return item.method === method && item.path === path;
		});
		if (!route) throw new RsError('NOT_FOUND', 'Route not found');
		return route;
	}
}

const restura = new ResturaEngine();
export default restura;
