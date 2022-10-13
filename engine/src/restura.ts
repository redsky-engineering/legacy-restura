import * as express from 'express';

import endpointValidation from '../../../../src/middleware/apiValidation/apiValidation.js';
import { RsRequest, RsResponse } from '../../../../src/@types/expressCustom.js';
import { boundMethod } from 'autobind-decorator';
import config from '../../../../src/utils/config.js';
import mysql, { Connection } from 'mysql';
import { Router } from 'express';
import logger from '../../../../src/utils/logger.js';
import { RsError } from '../../../../src/utils/errors.js';
import validateRequestParams from './validateRequestParams.js';
import sqlEngine from './sqlEngine.js';
import compareSchema from "./compareSchema.js";
import apiFactory from '../../../../src/api/apiFactory.js';
import { StringUtils } from '../../../../src/utils/utils.js';
import apiGenerator from './apiGenerator.js';
import fs from 'fs';

class ResturaEngine {
	private metaDbConnection: Connection;
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

	constructor() {
		this.metaDbConnection = mysql.createConnection({
			host: config.database[0].host,
			user: config.database[0].user,
			password: config.database[0].password,
			database: `${config.database[0].database}_meta`
		});
	}

	init(app: express.Application): Promise<void> {
		app.use('/restura', this.resturaAuthentication);
		app.use('/restura', (endpointValidation as unknown) as express.RequestHandler);
		app.post('/restura/v1/schema', (this.createSchema as unknown) as express.RequestHandler);
		app.put('/restura/v1/schema', (this.updateSchema as unknown) as express.RequestHandler);
		app.post('/restura/v1/schema/preview', (this.previewCreateSchema as unknown) as express.RequestHandler);
		app.post('/restura/v1/schema/reload', (this.reloadSchema as unknown) as express.RequestHandler);
		app.get('/restura/v1/schema', this.getSchema);
		this.expressApp = app;

		this.metaDbConnection.on('error', (err) => {
			logger.error(`Meta database connection error ${JSON.stringify(err)}`);
		});

		return new Promise((resolve) => {
			this.metaDbConnection.connect(async (err) => {
				if (err) {
					logger.error(err);
					// Hard kill the process with error. This is a critical error.
					process.exit(1);
				}
				this.reloadEndpoints()
					.then(() => {
						resolve();
					})
					.catch((error) => {
						logger.error(`Could not start restura ${error} ${error.message} ${error.stack}`);
						// Hard kill the process with error. This is a critical error.
						process.exit(1);
					});
			});
		});
	}

	isEndpointPublic(method: string, fullUrl: string): boolean {
		if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
		return this.publicEndpoints[method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'].includes(fullUrl);
	}

	@boundMethod
	async reloadEndpoints() {
		this.schema = await this.getLatestDatabaseSchema();
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

				this.resturaRouter[route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](
					route.path, // <-- Notice we only use path here since the baseUrl is already added to the router.
					(this.executeRouteLogic as unknown) as express.RequestHandler
				);
				routeCount++;
			}
		}

		logger.info(`Restura loaded (${routeCount}) endpoint${routeCount > 1 ? 's' : ''}`);
	}

	async seedDatabase(schema: Restura.Schema) {
		await this.storeDatabaseSchema(schema);
		await sqlEngine.createDatabaseFromSchema(schema);
	}

	async generateApiFromDatabase(outputFile: string): Promise<void> {
		const schema = await this.getLatestDatabaseSchema();
		await fs.writeFileSync(outputFile, apiGenerator(schema));
	}

	@boundMethod
	private resturaAuthentication(req: express.Request, res: express.Response, next: express.NextFunction) {
		if (req.headers['x-auth-token'] !== '123') res.status(401).send('Unauthorized');
		else next();
	}



	@boundMethod
	private async previewCreateSchema(req: RsRequest<Restura.Schema>, res: express.Response) {
		try {
			const schemaDiff = await compareSchema.diffSchema(req.data);
			res.send({ data: schemaDiff });
		} catch (err) {
			res.status(400).send(err);
		}
	}

	@boundMethod
	private async createSchema(req: RsRequest<Restura.Schema>, res: express.Response) {
		try {
			let commands = sqlEngine.generateDatabaseSchemaFromSchema(req.data);
			await this.storeDatabaseSchema(req.data);
			res.send({ data: commands });
		} catch (err) {
			res.status(400).send(err);
		}
	}

	@boundMethod
	private async updateSchema(req: RsRequest<Restura.Schema>, res: express.Response) {
		try {
			// Here is where we would need to update database structure, but for now we just update the meta database.
			await this.storeDatabaseSchema(req.data);
			await this.reloadEndpoints();
			res.send({ data: 'success' });
		} catch (err) {
			res.status(400).send(err);
		}
	}

	@boundMethod
	private async reloadSchema(req: express.Request, res: express.Response) {
		await this.reloadEndpoints();
		res.send({ data: 'Schema reloaded' });
	}

	@boundMethod
	private async getSchema(req: express.Request, res: express.Response) {
		try {
			let schema = await this.getLatestDatabaseSchema();
			res.send({ data: schema });
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
			validateRequestParams(req, routeData);

			// Check for custom logic
			if (this.isCustomRoute(routeData)) {
				this.runCustomRouteLogic(req, res, routeData);
				return;
			}

			// Run SQL query
			let data = await sqlEngine.runQueryForRoute(req, routeData, this.schema);

			// Send response
			res.sendData(data);
		} catch (e: any) {
			next(e);
		}
	}

	@boundMethod
	private isCustomRoute(route: Restura.RouteData): route is Restura.CustomRouteData {
		return route.type === 'CUSTOM_ONE' || route.type === 'CUSTOM_ARRAY';
	}

	@boundMethod
	private runCustomRouteLogic(req: RsRequest<any>, res: RsResponse<any>, routeData: Restura.RouteData) {
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
		customFunction(req, res, routeData);
	}

	@boundMethod
	async getLatestDatabaseSchema(): Promise<Restura.Schema> {
		return new Promise((resolve, reject) => {
			this.metaDbConnection.query('select * from meta order by id desc limit 1;', (err, results) => {
				if (err) reject(err);
				try {
					let schema: Restura.Schema = JSON.parse(results[0].schema);
					resolve(schema);
				} catch (e) {
					reject('Invalid schema, JSON malformed');
				}
			});
		});
	}

	@boundMethod
	private async storeDatabaseSchema(schema: Restura.Schema): Promise<void> {
		return new Promise((resolve, reject) => {
			this.metaDbConnection.query(
				'INSERT INTO meta set ?;',
				[{ schema: JSON.stringify(schema) }],
				(err, results) => {
					if (err) reject(err);
					resolve();
				}
			);
		});
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
