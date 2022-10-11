import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import SchemaService from '../../services/schema/SchemaService';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import './OrderByInput.scss';

interface OrderByInputProps {
	routeData: Restura.RouteData | undefined;
}

type CombinedTableColumnName = { tableName: string; columnName: string };

const OrderByInput: React.FC<OrderByInputProps> = (props) => {
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
	if (props.routeData.type === 'ONE') return <></>;

	function getCurrentOrderByValue() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return undefined;
		if (!props.routeData.orderBy) return undefined;
		const orderBy = props.routeData.orderBy;
		return {
			value: `${orderBy.tableName}.${orderBy.columnName}`,
			label: `${orderBy.tableName}.${orderBy.columnName}`
		};
	}

	return (
		<Box className={'rsOrderByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Order By
			</Label>
			<Box className={'selectContainer'}>
				<Select
					value={getCurrentOrderByValue()}
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
				{!!props.routeData.orderBy && (
					<Select
						value={{ label: props.routeData.orderBy?.order, value: props.routeData.orderBy?.order }}
						options={[
							{ value: 'ASC', label: 'ASC' },
							{ value: 'DESC', label: 'DESC' }
						]}
						onChange={(newValue) => {
							if (!newValue) return;
						}}
					/>
				)}
			</Box>
		</Box>
	);
};

export default OrderByInput;
