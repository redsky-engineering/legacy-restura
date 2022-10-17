import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { ObjectUtils } from '../../utils/utils.js';

interface RouteTypeInputProps {
	routeData: Restura.RouteData | undefined;
}

const RouteTypeInput: React.FC<RouteTypeInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	const routeTypeOptions = useMemo(() => {
		return [
			{ label: 'One Item', value: 'ONE' },
			{ label: 'Array of Items', value: 'ARRAY' },
			{ label: 'Paginated List', value: 'PAGED' },
			{ label: 'Custom One Item', value: 'CUSTOM_ONE' },
			{ label: 'Custom Array', value: 'CUSTOM_ARRAY' }
		];
	}, []);

	if (!props.routeData) return null;

	return (
		<Box className={'rsRouteTypeInput'}>
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Type
				</Label>
				<Select
					value={routeTypeOptions.find((item) => item.value === props.routeData!.type)}
					options={routeTypeOptions}
					onChange={(newValue) => {
						if (!newValue) return;
						let updatedRouteData = { ...props.routeData! };
						if (newValue.value !== 'PAGED') {
							updatedRouteData.request = updatedRouteData.request?.filter(
								(request) => !['page', 'perPage', 'filter'].includes(request.name)
							);
						}
						if (newValue.value === 'ONE') {
							delete (updatedRouteData as Restura.StandardRouteData).orderBy;
						} else if (newValue.value === 'CUSTOM_ONE' || newValue.value === 'CUSTOM_ARRAY') {
							if (SchemaService.isStandardRouteData(updatedRouteData)) {
								updatedRouteData = {
									...updatedRouteData,
									type: newValue.value,
									responseType: 'boolean'
								};
							}
						} else if (newValue.value === 'PAGED') {
							const pagedParams: Restura.RequestData[] = [
								{ name: 'page', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] },
								{
									name: 'perPage',
									required: true,
									validator: [{ type: 'TYPE_CHECK', value: 'number' }]
								},
								{ name: 'filter', required: true, validator: [{ type: 'TYPE_CHECK', value: 'string' }] }
							];
							updatedRouteData = {
								...updatedRouteData,
								table: (updatedRouteData as Restura.StandardRouteData).table,
								type: newValue.value,
								request: ObjectUtils.isArrayWithData(updatedRouteData.request)
									? [...pagedParams, ...updatedRouteData.request]
									: pagedParams,
								response: (updatedRouteData as Restura.StandardRouteData).response,
								where: (updatedRouteData as Restura.StandardRouteData).where,
								joins: (updatedRouteData as Restura.StandardRouteData).joins,
								orderBy: {
									tableName: (updatedRouteData as Restura.StandardRouteData).table,
									columnName: 'id',
									order: 'ASC'
								},
								roles: updatedRouteData.roles
							};
						}

						schemaService.updateRouteData({
							...updatedRouteData,
							type: newValue.value as Restura.StandardRouteData['type']
						} as Restura.StandardRouteData);
					}}
				/>
			</Box>
		</Box>
	);
};

export default RouteTypeInput;
