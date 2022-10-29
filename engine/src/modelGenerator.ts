import { StringUtils } from '../../../../src/utils/utils.js';
import prettier from 'prettier';

export default function modelGenerator(schema: Restura.Schema): string {
	let modelString = `/** Auto generated file from Schema Version (${schema.version}). DO NOT MODIFY **/\n`;
	modelString += `declare namespace Model {\n`;
	for (let table of schema.database) {
		modelString += convertTable(table);
	}
	modelString += `}`;
	return prettier.format(modelString, {
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

function convertTable(table: Restura.TableData): string {
	let modelString = `\texport interface ${StringUtils.capitalizeFirst(table.name)} {\n`;
	for (let column of table.columns) {
		modelString += `\t\t${column.name}: ${StringUtils.convertDatabaseTypeToTypescript(
			column.type,
			column.value
		)};\n`;
	}
	modelString += `\t}\n`;
	return modelString;
}
