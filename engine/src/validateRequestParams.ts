import jsonschema, { Schema } from 'jsonschema';
import { RsRequest } from '../../../../src/@types/expressCustom.js';
import { ObjectUtils } from '../../../../src/utils/utils.js';
import { RsError } from '../../../../src/utils/errors.js';
import { ValidationDictionary } from './validationGenerator.js';

export default function validateRequestParams(
	req: RsRequest<any>,
	routeData: Restura.RouteData,
	validationSchema: ValidationDictionary
) {
	let requestData = getRequestData(req);
	req.data = requestData;

	if (routeData.request === undefined) {
		if (routeData.type !== 'CUSTOM_ONE' && routeData.type !== 'CUSTOM_ARRAY')
			throw new RsError('BAD_REQUEST', `No request parameters provided for standard request.`);

		if (!routeData.responseType) throw new RsError('BAD_REQUEST', `No response type defined for custom request.`);

		if (!routeData.requestType) throw new RsError('BAD_REQUEST', `No request type defined for custom request.`);

		const currentInterface = validationSchema[routeData.requestType];
		const validator = new jsonschema.Validator();
		const executeValidation = validator.validate(req.data, currentInterface as Schema);
		if (!executeValidation.valid) {
			throw new RsError(
				'BAD_REQUEST',
				`Request custom setup has failed the following check: (${executeValidation.errors})`
			);
		}
		return;
	}

	// Make sure all passed in params are defined in the schema
	Object.keys(req.data).forEach((requestParamName) => {
		let requestParam = routeData.request!.find((param) => param.name === requestParamName);
		if (!requestParam) {
			throw new RsError('BAD_REQUEST', `Request param (${requestParamName}) is not allowed`);
		}
	});

	routeData.request.forEach((requestParam) => {
		// Find the request param in the request data
		let requestValue = requestData[requestParam.name];
		// If the request param is required and not found in the request data, throw an error
		if (requestParam.required && requestValue === undefined)
			throw new RsError('BAD_REQUEST', `Request param (${requestParam.name}) is required but missing`);
		else if (!requestParam.required && requestValue === undefined) return;

		validateRequestSingleParam(requestValue, requestParam);
	});
}

function validateRequestSingleParam(requestValue: any, requestParam: Restura.RequestData) {
	requestParam.validator.forEach((validator) => {
		switch (validator.type) {
			case 'TYPE_CHECK':
				performTypeCheck(requestValue, validator, requestParam.name);
				break;
			case 'MIN':
				performMinCheck(requestValue, validator, requestParam.name);
				break;
			case 'MAX':
				performMaxCheck(requestValue, validator, requestParam.name);
				break;
			case 'ONE_OF':
				performOneOfCheck(requestValue, validator, requestParam.name);
				break;
		}
	});
}

function performTypeCheck(requestValue: any, validator: Restura.ValidatorData, requestParamName: string) {
	if (validator.value === 'number' || validator.value === 'string' || validator.value === 'boolean') {
		if (typeof requestValue !== validator.value) {
			throw new RsError(
				'BAD_REQUEST',
				`Request param (${requestParamName}) with value (${requestValue}) is not of type (${validator.value})`
			);
		}
	} else if (validator.value === 'string[]' || validator.value === 'number[]' || validator.value === 'any[]') {
		if (!Array.isArray(requestValue)) {
			throw new RsError(
				'BAD_REQUEST',
				`Request param (${requestParamName}) with value (${requestValue}) is not of type (${validator.value})`
			);
		}
		if (validator.value === 'any[]') return;
		requestValue.forEach((value: any) => {
			if (typeof value !== (validator.value as string).replace('[]', '')) {
				throw new RsError(
					'BAD_REQUEST',
					`Request param (${requestParamName}) with value (${requestValue}) is not of type (${validator.value})`
				);
			}
		});
	} else if (validator.value === 'object') {
		if (typeof requestValue !== 'object') {
			throw new RsError(
				'BAD_REQUEST',
				`Request param (${requestParamName}) with value (${requestValue}) is not of type (${validator.value})`
			);
		}
	} else {
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validator.value}) is not a valid type`);
	}
}

function performMinCheck(requestValue: any, validator: Restura.ValidatorData, requestParamName: string) {
	validateBothAreNumbers(requestValue, validator.value, requestParamName);

	if (requestValue < validator.value)
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is less than (${validator.value})`
		);
}

function performMaxCheck(requestValue: any, validator: Restura.ValidatorData, requestParamName: string) {
	validateBothAreNumbers(requestValue, validator.value, requestParamName);

	if (requestValue > validator.value)
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is more than (${validator.value})`
		);
}

function performOneOfCheck(requestValue: any, validator: Restura.ValidatorData, requestParamName: string) {
	if (!ObjectUtils.isArrayWithData(validator.value as any[]))
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validator.value}) is not of type array`);
	if (typeof requestValue === 'object')
		throw new RsError('BAD_REQUEST', `Request param (${requestParamName}) is not of type string or number`);

	if (!(validator.value as any[]).includes(requestValue as string | number))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is not one of (${(validator.value as any[]).join(
				', '
			)})`
		);
}

function validateBothAreNumbers(requestValue: any, validatorValue: any, requestParamName: string) {
	if (!isValueNumber(requestValue))
		throw new RsError(
			'BAD_REQUEST',
			`Request param (${requestParamName}) with value (${requestValue}) is not of type number`
		);

	if (!isValueNumber(validatorValue))
		throw new RsError('SCHEMA_ERROR', `Schema validator value (${validatorValue} is not of type number`);
}

function isValueNumber(value: any): value is number {
	return !isNaN(Number(value));
}

function getRequestData(req: RsRequest<any>): any {
	if (req.method !== 'GET' && req.method !== 'DELETE') {
		return req['body'];
	}
	let returnValue: any = {};
	for (let attr in req['query']) {
		if (req['query'][attr] instanceof Array) {
			let attrList = [];
			for (let value of req['query'][attr] as any[]) {
				if (isNaN(Number(value))) continue;
				attrList.push(Number(value));
			}
			if (ObjectUtils.isArrayWithData(attrList)) {
				returnValue[attr] = attrList;
			}
		} else {
			returnValue[attr] = ObjectUtils.safeParse(req['query'][attr]);
			if (isNaN(Number(req['query'][attr]))) continue;
			returnValue[attr] = Number(req['query'][attr]);
		}
	}
	return returnValue;
}
