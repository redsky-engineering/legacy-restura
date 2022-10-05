import * as React from 'react';
import './RequestParamInput.scss';
import { Box, Button, Checkbox, Icon, InputText, Label, rsToastify, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useMemo, useState } from 'react';

interface RequestParamInputProps {
	routeData: Restura.RouteData | undefined;
}

const RequestParamInput: React.FC<RequestParamInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);
	const [newParameterName, setNewParameterName] = useState<string>('');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const paramValidatorOptions = useMemo(() => {
		return [
			{ label: 'Type Check', value: 'TYPE_CHECK' },
			{ label: 'Minimum', value: 'MIN' },
			{ label: 'Maximum', value: 'MAX' },
			{ label: 'One Of', value: 'ONE_OF' }
		];
	}, []);

	function sanitizeCheckForDuplicateName(newName: string): string {
		if (!props.routeData) return '';
		let sanitizedName = newName.replace(/[$#]/g, '');
		if (props.routeData.request.find((item) => item.name === sanitizedName)) {
			rsToastify.error('Parameter name already exists', 'Duplicate Parameter Name');
			return '';
		}
		return sanitizedName;
	}

	function handleAddNewParameter() {
		if (!schema || !props.routeData || !selectedRoute) return;
		if (!newParameterName) {
			rsToastify.error('Please enter a name for the new parameter', 'Missing Parameter Name');
			return;
		}

		let sanitizedName = sanitizeCheckForDuplicateName(newParameterName);
		if (!sanitizedName) return;
		let newParameter: Restura.RequestData = {
			name: sanitizedName,
			required: false,
			validator: [
				{
					type: 'TYPE_CHECK',
					value: 'string'
				}
			]
		};

		schemaService.updateRouteData(
			{ ...props.routeData, request: [...props.routeData.request, newParameter] },
			selectedRoute.path,
			selectedRoute.baseUrl
		);
		setNewParameterName('');
	}

	if (!selectedRoute || !props.routeData) return null;

	function isValidValueFromType(validatorType: Restura.ValidatorData['type'], value: string): boolean {
		switch (validatorType) {
			case 'TYPE_CHECK':
				return ['string', 'number', 'boolean', 'object', 'array'].includes(value);
			case 'MIN':
			case 'MAX':
				return !isNaN(parseInt(value));
			default:
				return true;
		}
	}

	function parseValueFromType(
		validatorType: Restura.ValidatorData['type'],
		value: string
	): string | number | string[] | number[] {
		switch (validatorType) {
			case 'TYPE_CHECK':
				return ['string', 'number', 'boolean', 'object', 'array'].includes(value) ? value : 'string';
			case 'MIN':
			case 'MAX':
				return parseInt(value) || 0;
			case 'ONE_OF':
				return value.split(',');
			default:
				return value;
		}
	}

	return (
		<Box className={'rsRequestParamInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Parameters ({props.routeData.request.length})
			</Label>
			{props.routeData.request.map((requestParam, paramIndex) => {
				return (
					<Box key={`${requestParam.name}_${paramIndex}`} mb={24} className={'requestParam'}>
						<Box className={'paramNameRequired'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									schemaService.removeRequestParam(
										paramIndex,
										selectedRoute.path,
										selectedRoute.baseUrl
									);
								}}
							/>
							<InputText
								inputMode={'text'}
								placeholder={'name'}
								defaultValue={requestParam.name}
								onBlur={(newValue) => {
									if (newValue.target.value === requestParam.name) return;
									let sanitizedName = sanitizeCheckForDuplicateName(newValue.target.value);
									if (!sanitizedName) return;
									schemaService.updateRequestParam(
										paramIndex,
										{ ...requestParam, name: sanitizedName },
										selectedRoute.path,
										selectedRoute.baseUrl
									);
								}}
							/>
							<Checkbox
								labelText={'Required'}
								look={'containedPrimary'}
								checked={requestParam.required}
								onChange={(newValue) => {
									schemaService.updateRequestParam(
										paramIndex,
										{ ...requestParam, required: newValue.target.checked },
										selectedRoute.path,
										selectedRoute.baseUrl
									);
								}}
							/>
						</Box>
						<Box className={'paramValidators'}>
							{requestParam.validator.map((validator, validatorIndex) => {
								return (
									<Box
										display={'flex'}
										gap={8}
										key={`${validator.type}_${validatorIndex}`}
										mb={16}
										position={'relative'}
									>
										<Icon
											iconImg={'icon-delete'}
											fontSize={16}
											className={'deleteIcon'}
											onClick={() => {
												schemaService.removeValidator(
													paramIndex,
													validatorIndex,
													selectedRoute.path,
													selectedRoute.baseUrl
												);
											}}
										/>
										<Select
											value={paramValidatorOptions.find((item) => item.value === validator.type)}
											options={paramValidatorOptions}
											onChange={(newValue) => {
												if (!newValue) return;
												let newValidatorType = newValue.value as Restura.ValidatorData['type'];
												let sanitizedValue = parseValueFromType(
													newValidatorType,
													validator.value.toString()
												);
												schemaService.updateValidator(
													paramIndex,
													validatorIndex,
													{
														...validator,
														type: newValidatorType,
														value: sanitizedValue
													},
													selectedRoute.path,
													selectedRoute.baseUrl
												);
											}}
										/>
										<InputText
											inputMode={'text'}
											placeholder={'value'}
											defaultValue={
												Array.isArray(validator.value)
													? validator.value.join(',')
													: validator.value
											}
											onBlur={(event) => {
												if (!isValidValueFromType(validator.type, event.target.value)) {
													rsToastify.error(
														'Invalid value for given validator type.',
														'Invalid value'
													);
													return;
												}
												let sanitizedValue = parseValueFromType(
													validator.type,
													event.target.value
												);
												schemaService.updateValidator(
													paramIndex,
													validatorIndex,
													{ ...validator, value: sanitizedValue },
													selectedRoute.path,
													selectedRoute.baseUrl
												);
											}}
										/>
									</Box>
								);
							})}
						</Box>
						<Button
							look={'containedPrimary'}
							className={'circleButton'}
							onClick={() => {
								schemaService.addValidator(paramIndex, selectedRoute.path, selectedRoute.baseUrl);
							}}
						>
							<Icon iconImg={'icon-plus'} fontSize={16} mr={8} />
							Validator
						</Button>
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
		</Box>
	);
};

export default RequestParamInput;
