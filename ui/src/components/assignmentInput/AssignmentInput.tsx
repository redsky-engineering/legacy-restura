import * as React from 'react';
import './AssignmentInput.scss';
import { Box, Button, Checkbox, Icon, InputText, Label, rsToastify, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useMemo, useState } from 'react';

import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-min-noconflict/ext-searchbox';
import { StringUtils } from '../../utils/utils.js';

interface RequestParamInputProps {
	routeData: Restura.RouteData | undefined;
}

const AssignmentInput: React.FC<RequestParamInputProps> = (props: RequestParamInputProps) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [newParameterName, setNewParameterName] = useState<string>('');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	if (SchemaService.isStandardRouteData(props.routeData) && !props.routeData.assignments) {
		schemaService.addDefaultAssignments();
	}

	function checkForDuplicateName(name: string): void {
		if (!props.routeData) return;
		if (SchemaService.isCustomRouteData(props.routeData)) return;
		if (props.routeData.assignments.find((item) => item.value === name)) {
			rsToastify.error(`Parameter ${name} name already exists`, 'Duplicate Parameter Name');
			return;
		}
	}

	function handleAddNewParameter() {
		if (SchemaService.isCustomRouteData(props.routeData)) return;
		if (!schema || !props.routeData || !props.routeData.request) return;
		if (!newParameterName) {
			rsToastify.error('Please enter a name for the new parameter', 'Missing Parameter Name');
			return;
		}

		const sanitizedName = StringUtils.sanitizeParameter(newParameterName);
		checkForDuplicateName(sanitizedName);
		if (!sanitizedName) return;
		const newParameter: Restura.AssignData = {
			name: sanitizedName,
			value: ''
		};

		schemaService.updateRouteData({
			...props.routeData,
			assignments: [...props.routeData.assignments, newParameter]
		});
		setNewParameterName('');
	}

	if (!props.routeData) return null;

	function renderForcedAssignments() {
		if (
			!props.routeData ||
			SchemaService.isCustomRouteData(props.routeData) ||
			!props.routeData.assignments ||
			props.routeData.method != 'POST'
		)
			return null;

		return (
			<>
				{props.routeData.assignments.map((assignData, index) => {
					return (
						<Box key={`${props.routeData!.path}_${assignData.name}_${index}`} className={'requestParam'}>
							<Box className={'paramNameRequired'}>
								<Icon
									iconImg={'icon-delete'}
									fontSize={16}
									className={'deleteIcon'}
									onClick={() => {
										schemaService.removeAssignment(index);
									}}
								/>
								<InputText
									inputMode={'text'}
									placeholder={'name'}
									defaultValue={assignData.value}
									onBlur={(newValue) => {
										if (newValue.target.value === assignData.value) return;
										const sanitizedName = StringUtils.sanitizeParameter(newValue.target.value);
										checkForDuplicateName(sanitizedName);
										if (!sanitizedName) return;
										schemaService.updateAssignmentParam(index, {
											...assignData,
											value: sanitizedName
										});
									}}
								/>
								<InputText
									inputMode={'text'}
									placeholder={'value'}
									defaultValue={assignData.value}
									onBlur={(newValue) => {
										if (newValue.target.value === assignData.value) return;
										schemaService.updateAssignmentParam(index, {
											...assignData,
											value: newValue.target.value
										});
									}}
								/>
							</Box>
						</Box>
					);
				})}
				<Box className={'parameterInput'}>
					<InputText
						value={newParameterName}
						onChange={(value) => setNewParameterName(value)}
						inputMode={'text'}
						placeholder={'name'}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								handleAddNewParameter();
							}
						}}
					/>
					<Button look={'outlinedPrimary'} onClick={handleAddNewParameter}>
						Add
					</Button>
				</Box>
			</>
		);
	}

	return (
		<Box className={'rsRequestParamInput'}>
			<Box display={'flex'} alignItems={'center'} justifyContent={'space-between'}>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					{!!props.routeData.request
						? `Forced Assignments (${props.routeData.request.length})`
						: 'Parameter Type'}
				</Label>
			</Box>
			{renderForcedAssignments()}
		</Box>
	);
};

export default AssignmentInput;
