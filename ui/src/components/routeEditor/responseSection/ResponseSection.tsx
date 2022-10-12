import * as React from 'react';
import './ResponseSection.scss';
import { Box, Button, Icon, Label, popupController } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState';
import { useMemo } from 'react';
import themes from '../../../themes/themes.scss?export';
import serviceFactory from '../../../services/serviceFactory';
import SchemaService from '../../../services/schema/SchemaService';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../../popups/columnPickerPopup/ColumnPickerPopup';
import { StringUtils } from '../../../utils/utils';

interface ResponseSectionProps {}

const ResponseSection: React.FC<ResponseSectionProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);

	const routeData = useMemo<Restura.RouteData | undefined>(() => {
		if (!schema || !selectedRoute) return undefined;
		let endpoints = schema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return undefined;
		return endpoints.routes.find((item) => item.path === selectedRoute.path);
	}, [schema, selectedRoute]);

	function getTypeForResponseProperty(selector: string): string {
		if (!schema || !routeData) return '';
		let tableName = selector.split('.')[0];
		let columnName = selector.split('.')[1];

		let table = schema.database.find((item) => item.name === tableName);
		if (!table) return '';
		let column = table.columns.find((item) => item.name === columnName);
		if (!column) return '';

		return SchemaService.convertSqlTypeToTypescriptType(column.type);
	}

	function handleAddProperty() {
		if (!routeData) return;
		if (!SchemaService.isStandardRouteData(routeData)) return;
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			baseTable: routeData.table,
			headerText: 'Select Column',
			onColumnSelect: (tableName, columnData) => {
				let name =
					tableName === routeData.table
						? columnData.name
						: `${tableName}${StringUtils.capitalizeFirst(columnData.name)}`;
				// Check for duplicate name
				if (routeData.response.find((item) => item.name === name))
					name += '_' + Math.random().toString(36).substring(2, 5).toUpperCase();
				schemaService.addResponseParameter({
					name,
					selector: `${tableName}.${columnData.name}`,
					type: getTypeForResponseProperty(`${tableName}.${columnData.name}`)
				});
			},
			onCustomSelect: () => {}
		});
	}

	function renderResponseObject() {
		if (!routeData) return <></>;
		if (!routeData.response) return <></>;
		return routeData.response.map((responseData, parameterIndex) => {
			return (
				<Box key={responseData.name} className={'responseItem'}>
					<Icon
						fontSize={16}
						iconImg={'icon-delete'}
						className={'deleteIcon'}
						onClick={() => {
							if (!routeData) return;
							schemaService.removeResponseParameter(parameterIndex);
						}}
						cursorPointer
					/>
					<Box>
						<Label variant={'body1'} weight={'regular'}>
							{responseData.name}:
						</Label>
						<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
							{responseData.selector
								? getTypeForResponseProperty(responseData.selector)
								: responseData.type}
						</Label>
					</Box>
					<Label variant={'body1'} weight={'regular'} color={themes.secondaryOrange500} p={8}>
						{responseData.selector}
					</Label>
				</Box>
			);
		});
	}

	return (
		<Box className={'rsResponseSection'}>
			<Box className={'content'}>
				<Box display={'flex'} gap={8}>
					<Button look={'textPrimary'} onClick={handleAddProperty}>
						Add Property
					</Button>
					<Button look={'textPrimary'}>Add Object</Button>
				</Box>
				{renderResponseObject()}
			</Box>
		</Box>
	);
};

export default ResponseSection;
