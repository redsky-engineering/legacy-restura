import { RsError } from '../../../../src/utils/errors.js';

var _maps: Restura.ResponseTypeMap;

export function saveResponseTypeMaps(typeMap: Restura.ResponseTypeMap) {
	_maps = typeMap;
}

export default function validateResponseParams(data: any, baseUrl: string, routeName: string) {
	if (!_maps) {
		throw new RsError('METHOD_UNALLOWED', 'Cannot validate response without type maps');
	}
	const map = (_maps[baseUrl].validator as Restura.ResponseTypeMap)[routeName];
	validateMap('_base', data, map);
}

function validateMap(
	name: string,
	value: any,
	{ isOptional: optional, isArray: array, validator }: Restura.ResponseTypeMap[string]
) {
	const valueType = typeof value;
	if (!optional && value == null) {
		throw new RsError('DATABASE_ERROR', `Response param (${name}) is required`);
	}
	if (array) {
		if (!Array.isArray(value)) {
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is a/an ${valueType} instead of an array`);
		}
		value.forEach((v, i) => validateMap(`${name}[${i}]`, v, { validator }));
	} else if (typeof validator === 'string') {
		if (valueType === validator) return;
		else throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
	} else {
		if (valueType !== 'object') {
			throw new RsError('DATABASE_ERROR', `Response param (${name}) is of the wrong type (${valueType})`);
		}
		for (const prop in value) {
			if (!validator[prop])
				throw new RsError('DATABASE_ERROR', `Response param (${name}.${prop}) is not allowed`);
		}
		for (let prop in validator) {
			validateMap(`${name}.${prop}`, value[prop], validator[prop]);
		}
	}
}
