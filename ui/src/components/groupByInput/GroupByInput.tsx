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


	function getGroupByValue() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return undefined;
		if (!props.routeData.groupBy) return { value: 'not grouped', label: 'not grouped' };
		const groupBy = props.routeData.groupBy;
		return {
			value: `${groupBy.tableName}.${groupBy.columnName}`,
			label: `${groupBy.tableName}.${groupBy.columnName}`
		};
	}

	function getGroupByOptions() {
		let options: { value: string; label: string }[] = [ { value: 'not grouped', label: 'not grouped' } ];
		options = options.concat(joinedColumnList.map((column) => {
			return {
				value: `${column.tableName}.${column.columnName}`,
				label: `${column.tableName}.${column.columnName}`
			};
		}));
		return options;
	}

	if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;

	return (
		<Box className={'rsGroupByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Group By
			</Label>
				<Select
					value={getGroupByValue()}
					options={getGroupByOptions()}
					onChange={(newValue) => {
						if (!newValue) return;
						if (!SchemaService.isStandardRouteData(props.routeData)) return;

						let updatedRouteData = { ...props.routeData };
						if (newValue.value === 'not grouped') {
							delete updatedRouteData.groupBy;
							schemaService.updateRouteData(updatedRouteData);
							return;
						}

						updatedRouteData.groupBy = {
							tableName: newValue.value.split('.')[0],
							columnName: newValue.value.split('.')[1]
						}
						schemaService.updateRouteData(updatedRouteData);
					}}
				/>

		</Box>
	)
};

export default GroupByInput;
