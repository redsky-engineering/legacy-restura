import { ApiMethod, RsRequest, RsResponse } from '../../../../src/@types/expressCustom.js';
import { NextFunction } from 'express';
import { ObjectUtils, StringUtils } from '../../../../src/utils/utils.js';
import logger from '../../../../src/utils/logger.js';
import { HtmlStatusCodes } from '../../../../src/utils/errors.js';
import { JsonDecoder } from 'ts.data.json/dist/cjs/index.js';

const orderByDecoder = JsonDecoder.objectStrict<Restura.OrderByData>(
	{
		columnName: JsonDecoder.string,
		order: JsonDecoder.oneOf([JsonDecoder.isExactly('ASC'), JsonDecoder.isExactly('DESC')], 'order'),
		tableName: JsonDecoder.string
	},
	'orderBy'
);

const groupByDecoder = JsonDecoder.objectStrict<Restura.GroupByData>(
	{
		columnName: JsonDecoder.string,
		tableName: JsonDecoder.string
	},
	'groupBy'
);

const whereDataDecoder = JsonDecoder.array<Restura.WhereData>(
	JsonDecoder.objectStrict<Restura.WhereData>(
		{
			tableName: JsonDecoder.optional(JsonDecoder.string),
			columnName: JsonDecoder.optional(JsonDecoder.string),
			operator: JsonDecoder.optional(
				JsonDecoder.oneOf(
					[
						JsonDecoder.isExactly('='),
						JsonDecoder.isExactly('<'),
						JsonDecoder.isExactly('>'),
						JsonDecoder.isExactly('<='),
						JsonDecoder.isExactly('>='),
						JsonDecoder.isExactly('!='),
						JsonDecoder.isExactly('LIKE'),
						JsonDecoder.isExactly('IN'),
						JsonDecoder.isExactly('NOT IN'),
						JsonDecoder.isExactly('STARTS WITH'),
						JsonDecoder.isExactly('ENDS WITH')
					],
					'operator'
				)
			),
			value: JsonDecoder.optional(JsonDecoder.string),
			custom: JsonDecoder.optional(JsonDecoder.string),
			conjunction: JsonDecoder.optional(
				JsonDecoder.oneOf([JsonDecoder.isExactly('AND'), JsonDecoder.isExactly('OR')], 'conjunction')
			)
		},
		'where'
	),
	'wheres'
);

const joinDataDecoder = JsonDecoder.array<Restura.JoinData>(
	JsonDecoder.objectStrict<Restura.JoinData>(
		{
			table: JsonDecoder.string,
			localColumnName: JsonDecoder.optional(JsonDecoder.string),
			foreignColumnName: JsonDecoder.optional(JsonDecoder.string),
			custom: JsonDecoder.optional(JsonDecoder.string),
			type: JsonDecoder.oneOf([JsonDecoder.isExactly('LEFT'), JsonDecoder.isExactly('INNER')], 'type')
		},
		'join'
	),
	'joins'
);

const requestDataDecoder = JsonDecoder.array<Restura.RequestData>(
	JsonDecoder.objectStrict<Restura.RequestData>(
		{
			name: JsonDecoder.string,
			required: JsonDecoder.boolean,
			validator: JsonDecoder.array(
				JsonDecoder.objectStrict(
					{
						type: JsonDecoder.oneOf(
							[
								JsonDecoder.isExactly('TYPE_CHECK'),
								JsonDecoder.isExactly('MIN'),
								JsonDecoder.isExactly('MAX'),
								JsonDecoder.isExactly('ONE_OF')
							],
							'type'
						),
						value: JsonDecoder.oneOf<string | string[] | number[] | number>(
							[
								JsonDecoder.string,
								JsonDecoder.array(JsonDecoder.string, 'value'),
								JsonDecoder.number,
								JsonDecoder.array(JsonDecoder.number, 'value')
							],
							'value'
						)
					},
					'validator'
				),
				'validators'
			)
		},
		'request'
	),
	'requests'
);

const standardRouteDecoder = JsonDecoder.objectStrict<Restura.StandardRouteData>(
	{
		type: JsonDecoder.oneOf(
			[JsonDecoder.isExactly('ONE'), JsonDecoder.isExactly('ARRAY'), JsonDecoder.isExactly('PAGED')],
			'type'
		),
		method: JsonDecoder.oneOf(
			[
				JsonDecoder.isExactly('GET'),
				JsonDecoder.isExactly('POST'),
				JsonDecoder.isExactly('PUT'),
				JsonDecoder.isExactly('PATCH'),
				JsonDecoder.isExactly('DELETE')
			],
			'method'
		),
		name: JsonDecoder.string,
		description: JsonDecoder.string,
		path: JsonDecoder.string,
		table: JsonDecoder.string,
		roles: JsonDecoder.array(JsonDecoder.string, 'roles'),
		request: requestDataDecoder,
		joins: joinDataDecoder,
		response: JsonDecoder.array(
			JsonDecoder.objectStrict<Restura.ResponseData>(
				{
					name: JsonDecoder.string,
					selector: JsonDecoder.optional(JsonDecoder.string),
					subquery: JsonDecoder.optional(
						JsonDecoder.objectStrict<Restura.ResponseData['subquery']>(
							{
								table: JsonDecoder.string,
								joins: joinDataDecoder,
								where: whereDataDecoder,
								properties: JsonDecoder.array(JsonDecoder.succeed, 'properties'),
								orderBy: JsonDecoder.optional(orderByDecoder),
								groupBy: JsonDecoder.optional(groupByDecoder)
							},
							'objectArray'
						)
					)
				},
				'response'
			),
			'responses'
		),
		assignments: JsonDecoder.array(
			JsonDecoder.objectStrict(
				{
					name: JsonDecoder.string,
					value: JsonDecoder.string
				},
				'assignment'
			),
			'assignments'
		),
		where: whereDataDecoder,
		orderBy: JsonDecoder.optional(orderByDecoder),
		groupBy: JsonDecoder.optional(groupByDecoder)
	},
	'route'
);

const customRouteDecoder = JsonDecoder.objectStrict<Restura.CustomRouteData>(
	{
		type: JsonDecoder.oneOf([JsonDecoder.isExactly('CUSTOM_ONE'), JsonDecoder.isExactly('CUSTOM_ARRAY')], 'type'),
		method: JsonDecoder.oneOf(
			[
				JsonDecoder.isExactly('GET'),
				JsonDecoder.isExactly('POST'),
				JsonDecoder.isExactly('PUT'),
				JsonDecoder.isExactly('PATCH'),
				JsonDecoder.isExactly('DELETE')
			],
			'method'
		),
		name: JsonDecoder.string,
		description: JsonDecoder.string,
		path: JsonDecoder.string,
		roles: JsonDecoder.array(JsonDecoder.string, 'roles'),
		request: JsonDecoder.optional(requestDataDecoder),
		responseType: JsonDecoder.oneOf(
			[
				JsonDecoder.string,
				JsonDecoder.isExactly('string'),
				JsonDecoder.isExactly('number'),
				JsonDecoder.isExactly('boolean')
			],
			'responseType'
		),
		requestType: JsonDecoder.optional(JsonDecoder.string)
	},
	'route'
);

const schemaValidationDecoder = JsonDecoder.objectStrict<Restura.Schema>(
	{
		database: JsonDecoder.array(
			JsonDecoder.objectStrict<Restura.TableData>(
				{
					name: JsonDecoder.string,
					columns: JsonDecoder.array(
						JsonDecoder.objectStrict<Restura.ColumnData>(
							{
								name: JsonDecoder.string,
								type: JsonDecoder.succeed,
								isNullable: JsonDecoder.boolean,
								roles: JsonDecoder.array(JsonDecoder.string, 'roles'),
								comment: JsonDecoder.optional(JsonDecoder.string),
								default: JsonDecoder.optional(JsonDecoder.string),
								value: JsonDecoder.optional(JsonDecoder.string),
								isPrimary: JsonDecoder.optional(JsonDecoder.boolean),
								isUnique: JsonDecoder.optional(JsonDecoder.boolean),
								hasAutoIncrement: JsonDecoder.optional(JsonDecoder.boolean),
								length: JsonDecoder.optional(JsonDecoder.number)
							},
							'Column'
						),
						'columns'
					),
					indexes: JsonDecoder.array(
						JsonDecoder.objectStrict<Restura.IndexData>(
							{
								name: JsonDecoder.string,
								columns: JsonDecoder.array(JsonDecoder.string, 'columns'),
								isUnique: JsonDecoder.boolean,
								isPrimaryKey: JsonDecoder.boolean,
								order: JsonDecoder.oneOf(
									[JsonDecoder.isExactly('ASC'), JsonDecoder.isExactly('DESC')],
									'order'
								)
							},
							'index'
						),
						'indexes'
					),
					foreignKeys: JsonDecoder.array(
						JsonDecoder.objectStrict<Restura.ForeignKeyData>(
							{
								name: JsonDecoder.string,
								column: JsonDecoder.string,
								refTable: JsonDecoder.string,
								refColumn: JsonDecoder.string,
								onDelete: JsonDecoder.oneOf(
									[
										JsonDecoder.isExactly('NO ACTION'),
										JsonDecoder.isExactly('RESTRICT'),
										JsonDecoder.isExactly('CASCADE'),
										JsonDecoder.isExactly('SET NULL'),
										JsonDecoder.isExactly('SET DEFAULT')
									],
									'onDelete'
								),
								onUpdate: JsonDecoder.oneOf(
									[
										JsonDecoder.isExactly('NO ACTION'),
										JsonDecoder.isExactly('RESTRICT'),
										JsonDecoder.isExactly('CASCADE'),
										JsonDecoder.isExactly('SET NULL'),
										JsonDecoder.isExactly('SET DEFAULT')
									],
									'onUpdate'
								)
							},
							'foreignKeys'
						),
						'foreignKeys'
					),
					roles: JsonDecoder.array(JsonDecoder.string, 'roles')
				},
				'database'
			),
			'databases'
		),
		endpoints: JsonDecoder.array(
			JsonDecoder.objectStrict<Restura.EndpointData>(
				{
					name: JsonDecoder.string,
					description: JsonDecoder.string,
					baseUrl: JsonDecoder.string,
					routes: JsonDecoder.array<Restura.RouteData>(
						JsonDecoder.oneOf<Restura.RouteData>([standardRouteDecoder, customRouteDecoder], 'routes'),
						'routes'
					)
				},
				'endpoint'
			),
			'endpoints'
		),
		globalParams: JsonDecoder.array(JsonDecoder.string, 'globalParams'),
		roles: JsonDecoder.array(JsonDecoder.string, 'roles'),
		customTypes: JsonDecoder.string,
		version: JsonDecoder.string
	},
	'schema'
);

export default async function schemaValidator(req: RsRequest<any>, res: RsResponse<any>, next: NextFunction) {
	const apiMethod = req.method as ApiMethod;
	if (apiMethod === 'OPTIONS') return next();

	req.data = getData(req);

	const methodUrl = `${apiMethod}:${req.originalUrl}`;
	if (!['POST:/restura/v1/schema', 'PUT:/restura/v1/schema', 'POST:/restura/v1/schema/preview'].includes(methodUrl))
		return next();

	schemaValidationDecoder
		.decodeToPromise(req.data)
		.then(() => {
			next();
		})
		.catch((error) => {
			logger.error(error);
			res.sendError('BAD_REQUEST', error, HtmlStatusCodes.BAD_REQUEST);
		});
}

function getData(req: RsRequest<any>) {
	let body = '';
	if (req.method == 'GET' || req.method === 'DELETE') {
		body = 'query';
		// @ts-ignore
		for (let attr in req[body]) {
			if (attr === 'token') {
				// @ts-ignore
				delete req[body][attr];
				continue;
			}
			// @ts-ignore
			if (req[body][attr] instanceof Array) {
				let attrList = [];
				// @ts-ignore
				for (let value of req[body][attr]) {
					if (isNaN(Number(value))) continue;
					attrList.push(Number(value));
				}
				if (ObjectUtils.isArrayWithData(attrList)) {
					// @ts-ignore
					req[body][attr] = attrList;
				}
			} else {
				// @ts-ignore
				req[body][attr] = ObjectUtils.safeParse(req[body][attr]);
				// @ts-ignore
				if (isNaN(Number(req[body][attr]))) continue;
				// @ts-ignore
				req[body][attr] = Number(req[body][attr]);
			}
		}
	} else {
		body = 'body';
	}
	// @ts-ignore
	return req[body];
}
