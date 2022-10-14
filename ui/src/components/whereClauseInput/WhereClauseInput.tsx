import * as React from 'react';
import './WhereClauseInput.scss';
import { Box, Button, Icon, Label, popupController, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../popups/columnPickerPopup/ColumnPickerPopup';
import AutoComplete from '../autoComplete/AutoComplete';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface WhereClauseInputProps {
	routeData: Restura.RouteData | undefined;
}

const WhereClauseInput: React.FC<WhereClauseInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	function handleAddStatement() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return;
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			headerText: 'Select Column',
			baseTable: props.routeData.table,
			onColumnSelect: (tableName, columnData) => {
				if (!SchemaService.isStandardRouteData(props.routeData)) return;
				let whereClauseLength = props.routeData.where.length;

				schemaService.addWhereClause({
					tableName,
					columnName: columnData.name,
					operator: '=',
					value: 'TRUE',
					...(whereClauseLength > 0 && { conjunction: 'AND' })
				});
			},
			onCustomSelect: () => {
				schemaService.addWhereClause({
					custom: 'TRUE',
					conjunction: 'AND'
				});
			}
		});
	}

	function renderWhereStatements() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;
		if (props.routeData.where.length === 0)
			return (
				<Label variant={'body1'} weight={'bold'}>
					No Where Clause
				</Label>
			);

		return props.routeData.where.map((whereData: Restura.WhereData, whereIndex) => {
			if (!schema) return <></>;
			return (
				<React.Fragment key={whereIndex}>
					{!!whereData.conjunction && (
						<Select
							value={{ label: whereData.conjunction, value: whereData.conjunction }}
							options={[
								{ label: 'AND', value: 'AND' },
								{ label: 'OR', value: 'OR' }
							]}
							className={'conjunction'}
							onChange={(newValue) => {
								if (!newValue) return;
								schemaService.updateWhereData(whereIndex, {
									...whereData,
									conjunction: newValue.value
								});
							}}
						/>
					)}
					{whereData.custom ? (
						<Box className={'whereItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									schemaService.removeWhereClause(whereIndex);
								}}
							/>
							<AutoComplete
								options={[
									...schema.globalParams.map((param) => `#${param}`),
									...props.routeData!.request!.map((request) => `$${request.name}`)
								]}
								startSymbols={['$', '#']}
								value={whereData.custom}
								onChange={(newValue) => {
									if (!newValue) return;
									schemaService.updateWhereData(whereIndex, { ...whereData, custom: newValue });
								}}
							/>
						</Box>
					) : (
						<Box className={'whereItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									schemaService.removeWhereClause(whereIndex);
								}}
							/>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{whereData.tableName}.{whereData.columnName}
							</Label>
							<Select
								value={{ label: whereData.operator, value: whereData.operator }}
								options={[
									{ label: '=', value: '=' },
									{ label: '<', value: '<' },
									{ label: '>', value: '>' },
									{ label: '<=', value: '<=' },
									{ label: '>=', value: '>=' },
									{ label: '!=', value: '!=' },
									{ label: 'LIKE', value: 'LIKE' },
									{ label: 'IN', value: 'IN' },
									{ label: 'NOT IN', value: 'NOT IN' },
									{ label: 'STARTS WITH', value: 'STARTS WITH' },
									{ label: 'ENDS WITH', value: 'ENDS WITH' }
								]}
								onChange={(newValue) => {
									if (!newValue) return;
									schemaService.updateWhereData(whereIndex, {
										...whereData,
										operator: newValue.value
									});
								}}
							/>
							<AutoComplete
								options={[
									...schema.globalParams.map((param) => `#${param}`),
									...props.routeData!.request!.map((request) => `$${request.name}`)
								]}
								startSymbols={['$', '#']}
								value={whereData.value || ''}
								onChange={(newValue) => {
									if (!newValue) return;
									schemaService.updateWhereData(whereIndex, { ...whereData, value: newValue });
								}}
							/>
						</Box>
					)}
				</React.Fragment>
			);
		});
	}

	if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;

	return (
		<Box className={'rsWhereClauseInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Where Query
			</Label>
			{renderWhereStatements()}
			<Button look={'containedPrimary'} onClick={handleAddStatement} mt={16}>
				Add Statement
			</Button>
		</Box>
	);
};

export default WhereClauseInput;
