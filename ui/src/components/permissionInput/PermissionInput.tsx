import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface PermissionInputProps {
	routeData: Restura.RouteData | undefined;
}

const PermissionInput: React.FC<PermissionInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const roles = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.roles;
	}, [schema]);

	if (!selectedRoute || !props.routeData) return null;
	return (
		<Box className={'rsPermissionInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Permissions (empty for all)
			</Label>
			<Select
				isMulti={true}
				value={props.routeData.roles.map((item) => {
					return { label: item, value: item };
				})}
				options={roles.map((role) => {
					return { label: role, value: role };
				})}
				onChange={(newValue) => {
					if (!newValue) return;
					schemaService.updateRouteData(
						{ ...props.routeData!, roles: newValue.map((item) => item.value) },
						selectedRoute.path,
						selectedRoute!.baseUrl
					);
				}}
			/>
		</Box>
	);
};

export default PermissionInput;
