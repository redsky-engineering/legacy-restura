import * as React from 'react';
import './ResponseObjectArray.scss';
import { Box, Button, Icon, InputText, Label, popupController } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useState } from 'react';
import themes from '../../themes/themes.scss?export';
import ResponseProperty from '../responseProperty/ResponseProperty';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../popups/columnPickerPopup/ColumnPickerPopup';
import { StringUtils } from '../../utils/utils';
import useRouteData from '../../customHooks/useRouteData';

interface ResponseObjectArrayProps {
	responseData: Restura.ResponseData;
	parameterIndex: number;
	rootPath: string;
}

const ResponseObjectArray: React.FC<ResponseObjectArrayProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [isEditingAlias, setIsEditingAlias] = useState<boolean>(false);

	const routeData = useRouteData();

	function handleAddObjectArray() {
		schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, {
			name: 'newObjectArray_' + Math.random().toString(36).substring(2, 6).toUpperCase(),
			objectArray: []
		});
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
				schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, {
					name,
					selector: `${tableName}.${columnData.name}`
				});
			}
		});
	}

	return (
		<Box className={'rsResponseObjectArray'}>
			<Box className={'header'}>
				<Icon
					fontSize={16}
					iconImg={'icon-delete'}
					className={'deleteIcon'}
					onClick={() => {
						schemaService.removeResponseParameter(props.rootPath, props.parameterIndex);
					}}
					cursorPointer
				/>
				<Box>
					{isEditingAlias ? (
						<InputText
							inputMode={'text'}
							autoFocus
							onBlur={(event) => {
								setIsEditingAlias(false);
								schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
									...props.responseData,
									name: event.currentTarget.value
								});
							}}
							onKeyDown={(event) => {
								if (event.key === 'Escape') {
									setIsEditingAlias(false);
									return;
								} else if (event.key === 'Enter') {
									setIsEditingAlias(false);
									schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
										...props.responseData,
										name: event.currentTarget.value
									});
								}
							}}
							defaultValue={props.responseData.name}
						/>
					) : (
						<Label
							variant={'body1'}
							weight={'regular'}
							className={'responseAlias'}
							onClick={() => setIsEditingAlias(true)}
						>
							{props.responseData.name}: {`{}`}[]
						</Label>
					)}
					<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
						Object Array
					</Label>
				</Box>
				<Button look={'textPrimary'} onClick={handleAddProperty}>
					Add Property
				</Button>
				<Button look={'textPrimary'} onClick={handleAddObjectArray}>
					Add Array Of Objects
				</Button>
			</Box>
			<Box pl={40}>
				{props.responseData.objectArray?.map((item, parameterIndex) => {
					if (item.objectArray) {
						return (
							<ResponseObjectArray
								key={item.name}
								responseData={item}
								parameterIndex={parameterIndex}
								rootPath={`${props.rootPath}.${props.responseData.name}`}
							/>
						);
					} else {
						return (
							<ResponseProperty
								key={item.name}
								responseData={item}
								parameterIndex={parameterIndex}
								rootPath={`${props.rootPath}.${props.responseData.name}`}
							/>
						);
					}
				})}
			</Box>
		</Box>
	);
};

export default ResponseObjectArray;
