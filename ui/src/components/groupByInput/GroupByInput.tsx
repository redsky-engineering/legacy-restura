import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import SchemaService from '../../services/schema/SchemaService';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface GroupByInputProps {
	routeData: Restura.RouteData | undefined;
}

type CombinedTableColumnName = { tableName: string; columnName: string };

const GroupByInput : React.FC<GroupByInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const joinedColumnList = useMemo<CombinedTableColumnName[]>(() => {
		if (!schema || !props.routeData) return [];
		if (!SchemaService.isStandardRouteData(props.routeData)) return [];

		let baseTable = schema.database.find(
			(table) => table.name === (props.routeData as Restura.StandardRouteData).table
		);
		if (!baseTable) return [];
		let columnList: CombinedTableColumnName[] = baseTable.columns.map((column) => {
			return { tableName: baseTable!.name, columnName: column.name };
		});

		if (props.routeData.joins) {
			props.routeData.joins.forEach((join) => {
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
	}, [schema, props.routeData]);


	if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;
	return (
		<Box className={'rsGroupByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Group By
			</Label>
				<Select
					value={undefined}
					options={joinedColumnList.map((table) => {
						return {
							value: `${table.tableName}.${table.columnName}`,
							label: `${table.tableName}.${table.columnName}`
						};
					})}
					onChange={(newValue) => {
						if (!newValue) return;
						// schemaService.updateRouteData({
						// 	...(props.routeData as Restura.StandardRouteData),
						// 	orderBy: {...(props.routeData as Restura.StandardRouteData).orderBy }, { colu newValue.value
						// });
					}}
				/>

		</Box>
	)
};

export default GroupByInput;
