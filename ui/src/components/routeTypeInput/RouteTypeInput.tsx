import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';

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
						if (newValue.value === 'ONE') {
							delete (updatedRouteData as Restura.StandardRouteData).orderBy;
						} else if (newValue.value === 'CUSTOM_ONE' || newValue.value === 'CUSTOM_ARRAY') {
							if (SchemaService.isStandardRouteData(updatedRouteData)) {
								updatedRouteData = {
									description: updatedRouteData.description,
									method: updatedRouteData.method,
									name: updatedRouteData.name,
									path: updatedRouteData.path,
									request: updatedRouteData.request,
									roles: updatedRouteData.roles,
									type: newValue.value,
									responseType: 'boolean'
								};
							}
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
