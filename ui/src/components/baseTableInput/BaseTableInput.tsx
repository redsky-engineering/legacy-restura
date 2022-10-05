import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { useMemo } from 'react';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';

interface BaseTableInputProps {
	routeData: Restura.RouteData | undefined;
}

const BaseTableInput: React.FC<BaseTableInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const tableList = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.database.map((table) => {
			return table.name;
		});
	}, [schema]);

	if (!selectedRoute || !props.routeData) return null;
	if (props.routeData.type === 'CUSTOM') return null;

	return (
		<Box className={'rsBaseTableInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Base Table
			</Label>
			<Select
				value={{ value: props.routeData.table, label: props.routeData.table }}
				options={tableList.map((table) => {
					return { value: table, label: table };
				})}
				onChange={(newValue) => {
					if (!newValue) return;
					schemaService.updateRouteData(
						{ ...(props.routeData as Restura.StandardRouteData), table: newValue.value },
						selectedRoute.path,
						selectedRoute!.baseUrl
					);
				}}
			/>
		</Box>
	);
};

export default BaseTableInput;
