import * as React from 'react';
import './ResponseSection.scss';
import { Box, Button, Label, popupController, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState';
import { useMemo } from 'react';
import serviceFactory from '../../../services/serviceFactory';
import SchemaService from '../../../services/schema/SchemaService';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../../popups/columnPickerPopup/ColumnPickerPopup';
import { StringUtils } from '../../../utils/utils';
import useRouteData from '../../../customHooks/useRouteData';

import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-min-noconflict/ext-searchbox';
import ResponseProperty from '../../responseProperty/ResponseProperty';
import ResponseObjectArray from '../../responseObjectArray/ResponseObjectArray';
import NestedObjectSelectorPopup, {
	NestedObjectSelectorPopupProps
} from '../../../popups/nestedObjectSelectorPopup/NestedObjectSelectorPopup';

interface ResponseSectionProps {}

const ResponseSection: React.FC<ResponseSectionProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	const routeData = useRouteData();

	const customResponseOptions = useMemo<{ label: string; value: string }[]>(() => {
		let options = [
			{ label: 'boolean', value: 'boolean' },
			{ label: 'string', value: 'string' },
			{ label: 'number', value: 'number' }
		];

		if (!schema) return options;

		let matches = schema.customTypes.match(/(?<=\binterface\s)(\w+)/g);
		if (!matches) return options;
		return [...options, ...matches.map((item) => ({ label: item, value: item }))];
	}, [schema]);

	function handleAddObjectArray() {
		if (!routeData) return;
		if (!SchemaService.isStandardRouteData(routeData)) return;
		popupController.open<NestedObjectSelectorPopupProps>(NestedObjectSelectorPopup, {
			baseTable: routeData.table,
			onSelect: (localTable: string, localColumn: string, foreignTable: string, foreignColumn: string) => {
				schemaService.addResponseParameter('root', {
					name: foreignTable,
					objectArray: {
						table: foreignTable,
						join: `${localTable}.${localColumn} = ${foreignTable}.${foreignColumn}`,
						properties: []
					}
				});
			}
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
				schemaService.addResponseParameter('root', {
					name,
					selector: `${tableName}.${columnData.name}`
				});
			}
		});
	}

	function renderResponseObject(standardRouteData: Restura.StandardRouteData) {
		return standardRouteData.response.map((responseData, parameterIndex) => {
			{
				return responseData.objectArray ? (
					<ResponseObjectArray
						key={responseData.name}
						responseData={responseData}
						parameterIndex={parameterIndex}
						rootPath={'root'}
					/>
				) : (
					<ResponseProperty
						key={responseData.name}
						responseData={responseData}
						parameterIndex={parameterIndex}
						rootPath={'root'}
					/>
				);
			}
		});
	}

	function renderStandardResponse(standardRouteData: Restura.StandardRouteData) {
		if (standardRouteData.method === 'DELETE')
			return (
				<Label variant={'body1'} weight={'regular'}>
					Returns {'{'}data: true{'}'} on success otherwise an HTML failure code with appropriate error
					response object.
				</Label>
			);

		return (
			<>
				<Box display={'flex'} gap={8}>
					<Button look={'textPrimary'} onClick={handleAddProperty}>
						Add Property
					</Button>
					<Button look={'textPrimary'} onClick={handleAddObjectArray}>
						Add Array of Objects
					</Button>
				</Box>
				{renderResponseObject(standardRouteData)}
			</>
		);
	}

	function renderCustomResponse(customRouteData: Restura.CustomRouteData) {
		if (!schema) return <></>;
		let responsePreviewText = customRouteData.responseType;
		if (!['boolean', 'string', 'number'].includes(customRouteData.responseType))
			responsePreviewText = SchemaService.getInterfaceFromCustomTypes(
				customRouteData.requestType || '',
				schema.customTypes
			);

		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Response Type
				</Label>
				<Select
					mb={32}
					value={{ label: customRouteData.responseType, value: customRouteData.responseType }}
					options={customResponseOptions}
					onChange={(option) => {
						if (!option) return;
						schemaService.updateRouteData({
							...customRouteData,
							responseType: option.value
						});
					}}
				/>
				<AceEditor
					width={'100%'}
					fontSize={14}
					height={'calc(100vh - 500px)'}
					mode="typescript"
					theme="terminal"
					name="CustomType"
					editorProps={{ $blockScrolling: true }}
					value={responsePreviewText}
					readOnly
					highlightActiveLine={false}
				/>
			</Box>
		);
	}

	return (
		<Box className={'rsResponseSection'}>
			<Box className={'content'}>
				{SchemaService.isStandardRouteData(routeData) && renderStandardResponse(routeData)}
				{SchemaService.isCustomRouteData(routeData) && renderCustomResponse(routeData)}
			</Box>
		</Box>
	);
};

export default ResponseSection;
