import * as React from 'react';
import './ApiDetailsSection.scss';
import { Box, Button, Checkbox, Icon, InputText, Label, rsToastify, Select } from '@redskytech/framework/ui';
import { useEffect, useMemo, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState.js';
import themes from '../../../themes/themes.scss?export';
import serviceFactory from '../../../services/serviceFactory.js';
import SchemaService from '../../../services/schema/SchemaService.js';
import cloneDeep from 'lodash.clonedeep';

interface ApiDetailsSectionProps {}

const ApiDetailsSection: React.FC<ApiDetailsSectionProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [selectedRoute, setSelectedRoute] = useRecoilState<{ baseUrl: string; path: string } | undefined>(
		globalState.selectedRoute
	);
	const [routePath, setRoutePath] = useState<string>('');
	const [newParameterName, setNewParameterName] = useState<string>('');

	useEffect(() => {
		if (!selectedRoute) return;
		setRoutePath(selectedRoute.path);
	}, [selectedRoute]);

	const routeData = useMemo<Restura.RouteData | undefined>(() => {
		if (!schema || !selectedRoute) return undefined;
		let endpoints = schema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return undefined;
		return endpoints.routes.find((item) => item.path === selectedRoute.path);
	}, [schema, selectedRoute]);

	const routeTypeOptions = useMemo(() => {
		return [
			{ label: 'One Item', value: 'ONE' },
			{ label: 'Array of Items', value: 'ARRAY' },
			{ label: 'Paginated List', value: 'PAGE' },
			{ label: 'Custom', value: 'CUSTOM' }
		];
	}, []);

	const paramValidatorOptions = useMemo(() => {
		return [
			{ label: 'Type Check', value: 'TYPE_CHECK' },
			{ label: 'Minimum', value: 'MIN' },
			{ label: 'Maximum', value: 'MAX' },
			{ label: 'One Of', value: 'ONE_OF' }
		];
	}, []);

	const tableList = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.database.map((table) => {
			return table.name;
		});
	}, [schema]);

	const roles = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.roles;
	}, [schema]);

	function handleAddNewParameter() {
		if (!schema || !routeData || !selectedRoute) return;
		if (!newParameterName) {
			rsToastify.error('Please enter a name for the new parameter', 'Missing Parameter Name');
			return;
		}

		let sanitizedName = newParameterName.replace(/[$#]/g, '');
		if (routeData.request.find((item) => item.name === sanitizedName)) {
			rsToastify.error('Parameter name already exists', 'Duplicate Parameter Name');
			return;
		}

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
			{ ...routeData, request: [...routeData.request, newParameter] },
			selectedRoute.path,
			selectedRoute.baseUrl
		);
		setNewParameterName('');
	}

	function renderTypeInput() {
		if (!selectedRoute || !routeData) return null;
		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Type
				</Label>
				<Select
					value={routeTypeOptions.find((item) => item.value === routeData.type)}
					options={routeTypeOptions}
					onChange={(newValue) => {
						if (!newValue) return;
						schemaService.updateRouteData(
							{
								...routeData,
								type: newValue.value as Restura.StandardRouteData['type']
							} as Restura.StandardRouteData,
							selectedRoute.path,
							selectedRoute!.baseUrl
						);
					}}
				/>
			</Box>
		);
	}

	function renderPermissionInput() {
		if (!selectedRoute || !routeData) return null;
		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Permissions (empty for all)
				</Label>
				<Select
					isMulti={true}
					value={routeData.roles.map((item) => {
						return { label: item, value: item };
					})}
					options={roles.map((role) => {
						return { label: role, value: role };
					})}
					onChange={(newValue) => {
						if (!newValue) return;
						schemaService.updateRouteData(
							{ ...routeData, roles: newValue.map((item) => item.value) },
							selectedRoute.path,
							selectedRoute!.baseUrl
						);
					}}
				/>
			</Box>
		);
	}

	function renderBaseTableInput() {
		if (!selectedRoute || !routeData) return null;
		if (routeData.type === 'CUSTOM') return null;
		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Base Table
				</Label>
				<Select
					value={{ value: routeData.table, label: routeData.table }}
					options={tableList.map((table) => {
						return { value: table, label: table };
					})}
					onChange={(newValue) => {
						if (!newValue) return;
						schemaService.updateRouteData(
							{ ...routeData, table: newValue.value },
							selectedRoute.path,
							selectedRoute!.baseUrl
						);
					}}
				/>
			</Box>
		);
	}

	function renderMethodPathInput() {
		if (!selectedRoute || !routeData) return null;
		return (
			<Box display={'flex'} gap={8}>
				<Box>
					<Label variant={'body1'} weight={'regular'} mb={4}>
						Method
					</Label>
					<Select
						value={{ label: routeData.method, value: routeData.method }}
						options={[
							{
								label: 'GET',
								value: 'GET'
							},
							{
								label: 'POST',
								value: 'POST'
							},
							{
								label: 'PUT',
								value: 'PUT'
							},
							{
								label: 'PATCH',
								value: 'PATCH'
							},
							{
								label: 'DELETE',
								value: 'DELETE'
							}
						]}
						onChange={(newValue) => {
							if (!newValue) return;
							schemaService.updateRouteData(
								{ ...routeData, method: newValue.value },
								selectedRoute.path,
								selectedRoute!.baseUrl
							);
						}}
					/>
				</Box>
				<Box flexGrow={1}>
					<Label variant={'body1'} weight={'regular'} mb={4}>
						Path <span style={{ color: themes.neutralBeige600 }}>(/api/v1)</span>
					</Label>
					<InputText
						inputMode={'url'}
						placeholder={'/path'}
						value={routePath}
						onChange={(value) => {
							setRoutePath(value);
						}}
						onBlur={(event) => {
							let newPath = event.target.value;
							if (!newPath.startsWith('/')) newPath = '/' + newPath;
							if (newPath.endsWith('/')) newPath = newPath.slice(0, -1);

							// Check if they didn't change anything
							if (newPath === selectedRoute.path) return;

							// Check for duplicates
							let endpointIndex = schema!.endpoints.findIndex(
								(item) => item.baseUrl === selectedRoute.baseUrl
							);
							if (endpointIndex === -1) {
								rsToastify.error(
									`Endpoints with base url ${selectedRoute.baseUrl} not found`,
									'Invalid Base Url'
								);
								return;
							}
							let routeIndex = schema!.endpoints[endpointIndex].routes.findIndex(
								(item) => item.path === newPath
							);
							if (routeIndex !== -1) {
								rsToastify.error(`Route with path ${newPath} already exists`, 'Duplicate Route');
								return;
							}
							schemaService.updateRouteData(
								{ ...routeData, path: newPath },
								selectedRoute.path,
								selectedRoute!.baseUrl
							);
							setSelectedRoute({ ...selectedRoute, path: newPath });
						}}
					/>
				</Box>
			</Box>
		);
	}

	function renderParametersInput() {
		if (!selectedRoute || !routeData) return null;
		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Parameters ({routeData.request.length})
				</Label>
				{routeData.request.map((item) => {
					return (
						<Box key={item.name} mb={24} className={'requestParam'}>
							<Box className={'paramNameRequired'}>
								<Icon
									iconImg={'icon-delete'}
									fontSize={16}
									className={'deleteIcon'}
									onClick={() => {
										schemaService.removeRequestParam(
											item.name,
											selectedRoute.path,
											selectedRoute.baseUrl
										);
									}}
								/>
								<InputText inputMode={'text'} placeholder={'name'} value={item.name} onChange={(newValue) => {
									
								}} />
								<Checkbox labelText={'Required'} look={'containedPrimary'} checked={item.required} />
							</Box>
							<Box className={'paramValidators'}>
								{item.validator.map((validator, index) => {
									return (
										<Box
											display={'flex'}
											gap={8}
											key={`${validator.type}_${index}`}
											mb={16}
											position={'relative'}
										>
											<Icon
												iconImg={'icon-delete'}
												fontSize={16}
												className={'deleteIcon'}
												onClick={() => {
													schemaService.removeValidator(
														item.name,
														index,
														selectedRoute.path,
														selectedRoute.baseUrl
													);
												}}
											/>
											<Select
												value={paramValidatorOptions.find(
													(item) => item.value === validator.type
												)}
												options={paramValidatorOptions}
											/>
											<InputText
												inputMode={'text'}
												placeholder={'value'}
												value={validator.value as string}
											/>
										</Box>
									);
								})}
							</Box>
							<Button look={'containedPrimary'} className={'circleButton'} onClick={() => {
							   
							}}>
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
	}

	if (!selectedRoute) return <></>;

	return (
		<Box className={'rsApiDetailsSection'}>
			{renderTypeInput()}
			{renderPermissionInput()}
			{renderBaseTableInput()}
			{renderMethodPathInput()}
			{renderParametersInput()}
		</Box>
	);
};

export default ApiDetailsSection;
