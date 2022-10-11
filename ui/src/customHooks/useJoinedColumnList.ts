import { useMemo } from 'react';
import SchemaService from '../services/schema/SchemaService';

export type CombinedTableColumnName = { tableName: string; columnName: string };

export default function useJoinedColumnList(schema: Restura.Schema | undefined, routeData: Restura.RouteData | undefined) : CombinedTableColumnName[]{
	const joinedColumnList = useMemo<CombinedTableColumnName[]>(() => {
		if (!schema || !routeData) return [];
		if (!SchemaService.isStandardRouteData(routeData)) return [];

		let baseTable = schema.database.find(
			(table) => table.name === (routeData as Restura.StandardRouteData).table
		);
		if (!baseTable) return [];
		let columnList: CombinedTableColumnName[] = baseTable.columns.map((column) => {
			return { tableName: baseTable!.name, columnName: column.name };
		});

		if (routeData.joins) {
			routeData.joins.forEach((join) => {
				let joinTable = schema.database.find((table) => table.name === join.table);
				if (!joinTable) return;
				columnList = columnList.concat(
					joinTable.columns.map((column) => {
						return { tableName: joinTable!.name, columnName: column.name };
					})
				);
			});
		}

		return columnList;
	}, [schema, routeData]);
	return joinedColumnList;
}
