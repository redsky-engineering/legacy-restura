import { StringUtils } from '../../../../src/utils/utils.js';

export default function modelGenerator(schema: Restura.Schema): string {
	let modelString = `/** Auto generated file from Schema Version (${schema.version}). DO NOT MODIFY **/\n`;
	modelString += `declare namespace Model {\n`;
	for (let table of schema.database) {
		modelString += convertTable(table);
	}
	modelString += `}`;
	return modelString;
}

function convertTable(table: Restura.TableData): string {
	let modelString = `\texport interface ${StringUtils.capitalizeFirst(table.name)} {\n`;
	for (let column of table.columns) {
		modelString += `\t\t${column.name}: ${convertType(column.type.toLowerCase())};\n`;
	}
	modelString += `\t}\n`;
	return modelString;
}

function convertType(type: string): string {
	if (type.startsWith('tinyint') || type.startsWith('boolean')) return 'boolean';
	if (type.indexOf('int') > -1 || type.startsWith('decimal') || type.startsWith('double') || type.startsWith('float'))
		return 'number';
	if (
		type.startsWith('varchar') ||
		type.indexOf('text') > -1 ||
		type.startsWith('char') ||
		type.indexOf('blob') > -1 ||
		type.startsWith('binary')
	)
		return 'string';
	if (type.startsWith('date') || type.startsWith('time')) return 'string';
	if (type.startsWith('enum')) return convertEnum(type);
	return 'any';
}

function convertEnum(type: string): string {
	return type
		.replace(/enum\(|\)/g, '')
		.split(',')
		.map((value) => {
			return `'${value.replace(/'/g, '')}'`;
		})
		.join(' | ');
}
