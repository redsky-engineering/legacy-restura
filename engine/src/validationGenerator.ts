import fs from "fs";
import * as TJS from "typescript-json-schema";
import path, {dirname, resolve} from "path";
import {fileURLToPath} from "url";
import {Definition} from "typescript-json-schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Dictionary<T> {
    [Key: string]: T;
}

export default function validationGenerator(currentSchema: Restura.Schema): Dictionary<any> {
    const customInterfacesNameListCompile = currentSchema.customTypes.split('interface ');
    const customInterfaceNames: string[] = [];
    customInterfacesNameListCompile.forEach((item) => {
        if (item !== '') customInterfaceNames.push(item.split(' {')[0]);
    });

    fs.writeFileSync(path.join(__dirname, '../../../../dist/tmp/tempInterfaceFile.ts'), currentSchema.customTypes);

    const program = TJS.getProgramFromFiles(
        [resolve(path.join(__dirname, '../../../../dist/tmp/tempInterfaceFile.ts'))],
        {
            skipLibCheck: true
        }
    );

    let schemaObject: Dictionary<Definition | null> = {};
    customInterfaceNames.forEach((item) => {
        const ddlSchema = TJS.generateSchema(program, item,
            {
                required: false
            }
        );
        schemaObject[item] = ddlSchema;
    });

    fs.unlinkSync(path.join(__dirname, '../../../../dist/tmp/tempInterfaceFile.ts'));

    return schemaObject;
}