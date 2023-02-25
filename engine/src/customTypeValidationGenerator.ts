import fs from 'fs';
import * as TJS from 'typescript-json-schema';
import path, { resolve } from 'path';
import { Definition } from 'typescript-json-schema';
import tmp from 'tmp';
import * as process from 'process';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

export default function customTypeValidationGenerator(currentSchema: Restura.Schema): ValidationDictionary {
	let schemaObject: ValidationDictionary = {};
	let customInterfaceNames = currentSchema.customTypes.match(/(?<=\binterface\s+)(\w+)/g);
	if (!customInterfaceNames) return {};

	const temporaryFile = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.ts' });
	fs.writeFileSync(temporaryFile.name, currentSchema.customTypes);

	const program = TJS.getProgramFromFiles(
		[resolve(temporaryFile.name), path.join(process.cwd(), 'src/@types/models.d.ts')],
		{
			skipLibCheck: true
		}
	);
	customInterfaceNames.forEach((item) => {
		const ddlSchema = TJS.generateSchema(program, item, {
			required: true
		});
		schemaObject[item] = ddlSchema || {};
	});

	temporaryFile.removeCallback();

	return schemaObject;
}
