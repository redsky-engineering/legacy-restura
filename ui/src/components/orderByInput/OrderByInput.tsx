import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import SchemaService from '../../services/schema/SchemaService';
import serviceFactory from '../../services/serviceFactory';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import './OrderByInput.scss';
import useJoinedColumnList from '../../customHooks/useJoinedColumnList';

interface OrderByInputProps {
	routeData: Restura.RouteData | undefined;
}

const OrderByInput: React.FC<OrderByInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const joinedColumnList = useJoinedColumnList(schema, props.routeData);

	if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;
	if (props.routeData.type === 'ONE') return <></>;

	function getOrderByValue() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return undefined;
		if (!props.routeData.orderBy) return { value: 'not ordered', label: 'not ordered' };
		const orderBy = props.routeData.orderBy;
		return {
			value: `${orderBy.tableName}.${orderBy.columnName}`,
			label: `${orderBy.tableName}.${orderBy.columnName}`
		};
	}

	function getOrderByOptions() {
		let options: { value: string; label: string }[] = [ { value: 'not ordered', label: 'not ordered' } ];
		options = options.concat(joinedColumnList.map((column) => {
			return {
				value: `${column.tableName}.${column.columnName}`,
				label: `${column.tableName}.${column.columnName}`
			};
		}));
		return options;
	}

	return (
		<Box className={'rsOrderByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Order By
			</Label>
			<Box className={'selectContainer'}>
				<Select
					value={getOrderByValue()}
					options={getOrderByOptions()}
					onChange={(newValue) => {
						if (!newValue) return;
						if (!SchemaService.isStandardRouteData(props.routeData)) return;

						let updatedRouteData = { ...props.routeData };
						if (newValue.value === 'not ordered') {
							delete updatedRouteData.orderBy;
							schemaService.updateRouteData(updatedRouteData);
							return;
						}

						updatedRouteData.orderBy = {
							tableName: newValue.value.split('.')[0],
							columnName: newValue.value.split('.')[1],
							order: updatedRouteData.orderBy?.order || 'ASC'
						}
						schemaService.updateRouteData(updatedRouteData);
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
							if (!SchemaService.isStandardRouteData(props.routeData)) return;

							let updatedRouteData = { ...props.routeData };

							updatedRouteData.orderBy = {
								...updatedRouteData.orderBy!,
								order: newValue.value
							}
							schemaService.updateRouteData(updatedRouteData);
						}}
					/>
				)}
			</Box>
		</Box>
	);
};

export default OrderByInput;
