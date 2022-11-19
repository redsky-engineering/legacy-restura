import * as React from 'react';
import './ResponseObjectArray.scss';
import { Box, Button, Icon, InputText, Label, popupController } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useState } from 'react';
import themes from '../../themes/themes.scss?export';
import ResponseProperty from '../responseProperty/ResponseProperty';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../popups/columnPickerPopup/ColumnPickerPopup';
import NestedObjectSelectorPopup, {
	NestedObjectSelectorPopupProps
} from '../../popups/nestedObjectSelectorPopup/NestedObjectSelectorPopup';
import EditSubqueryPopup, { EditSubqueryPopupProps } from '../../popups/editSubqueryPopup/EditSubqueryPopup.js';

interface ResponseObjectArrayProps {
	responseData: Restura.ResponseData;
	parameterIndex: number;
	rootPath: string;
}

const ResponseObjectArray: React.FC<ResponseObjectArrayProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [isEditingAlias, setIsEditingAlias] = useState<boolean>(false);

	function handleAddSubquery() {
		if (!props.responseData.subquery) return;
		popupController.open<NestedObjectSelectorPopupProps>(NestedObjectSelectorPopup, {
			baseTable: props.responseData.subquery.table,
			onSelect: (localTable: string, localColumn: string, foreignTable: string, foreignColumn: string) => {
				schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, {
					name: foreignTable,
					subquery: {
						table: foreignTable,
						joins: [],
						where: [],
						properties: []
					}
				});
			}
		});
	}

	function handleAddProperty() {
		if (!props.responseData.subquery) return;
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			baseTable: props.responseData.subquery.table,
			headerText: 'Select Column',
			onColumnSelect: (tableName, columnData) => {
				schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, {
					name: columnData.name,
					selector: `${tableName}.${columnData.name}`
				});
			}
		});
	}

	function handleEditSubquery() {
		if (!props.responseData.subquery) return;
		popupController.open<EditSubqueryPopupProps>(EditSubqueryPopup, {
			response: props.responseData,
			onSave: (response) => {
				schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, response);
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
				<Button look={'textPrimary'} onClick={handleAddSubquery}>
					Add Subquery
				</Button>
				<Icon
					iconImg={'icon-edit'}
					fontSize={20}
					color={themes.neutralBeige600}
					cursorPointer
					onClick={handleEditSubquery}
				/>
			</Box>
			<Box pl={40}>
				{props.responseData.subquery?.properties.map((item, parameterIndex) => {
					if (item.subquery) {
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
