import sqlEngine from "./sqlEngine";

export default class CompareSchema {
    diffSchema(newSchema: Restura.Schema, originalSchema: Restura.Schema) {
        let commands = sqlEngine.generateDatabaseSchemaFromSchema(newSchema);

    }
}