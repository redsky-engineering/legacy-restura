import fs from 'fs';
import * as TJS from 'typescript-json-schema';
import { resolve } from 'path';
import { Definition } from 'typescript-json-schema';
import tmp from 'tmp';

export interface ValidationDictionary {
	[Key: string]: Definition;
}

export default function validationGenerator(currentSchema: Restura.Schema): ValidationDictionary {
	let schemaObject: ValidationDictionary = {};
	let customInterfaceNames = currentSchema.customTypes.match(/(?<=\binterface\s+)(\w+)/g);
	if (!customInterfaceNames) return {};

	const temporaryFile = tmp.fileSync({ mode: 0o644, prefix: 'prefix-', postfix: '.ts' });
	fs.writeFileSync(temporaryFile.name, currentSchema.customTypes);

	const program = TJS.getProgramFromFiles([resolve(temporaryFile.name)], {
		skipLibCheck: true
	});
	customInterfaceNames.forEach((item) => {
		const ddlSchema = TJS.generateSchema(program, item, {
			required: false
		});
		schemaObject[item] = ddlSchema || {};
	});

	temporaryFile.removeCallback();

	return schemaObject;
}
