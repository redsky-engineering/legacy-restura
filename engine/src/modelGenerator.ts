import { StringUtils } from '@redskytech/core-utils';
import prettier from 'prettier';
import { SqlUtils } from './utils/utils.js';

export default function modelGenerator(schema: Restura.Schema, schemaHash: string): Promise<string> {
	let modelString = `/** Auto generated file from Schema Hash (${schemaHash}). DO NOT MODIFY **/\n`;
	modelString += `declare namespace Model {\n`;
	for (const table of schema.database) {
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
	for (const column of table.columns) {
		modelString += `\t\t${column.name}${column.isNullable ? '?' : ''}: ${SqlUtils.convertDatabaseTypeToTypescript(column.type, column.value)};\n`;
	}
	modelString += `\t}\n`;
	return modelString;
}
