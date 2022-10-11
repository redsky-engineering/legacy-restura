import * as React from 'react';
import './JoinTableInput.scss';
import { Box, Button, Icon, InputText, Label, popupController, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import JoinSelectorPopup, { JoinSelectorPopupProps } from '../../popups/joinSelectorPopup/JoinSelectorPopup';
import AutoComplete from '../autoComplete/AutoComplete';

interface JoinTableInputProps {
	routeData: Restura.RouteData | undefined;
}

const JoinTableInput: React.FC<JoinTableInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	function handleAddJoin() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return;
		popupController.open<JoinSelectorPopupProps>(JoinSelectorPopup, {
			baseTable: props.routeData.table,
			onSelect: (type, localColumn, foreignTable, foreignColumn) => {
				if (!SchemaService.isStandardRouteData(props.routeData)) return;
				let newJoin: Restura.JoinData = {
					type: 'INNER',
					table: foreignTable,
					...(type === 'STANDARD' && {
						foreignColumnName: foreignColumn,
						localColumnName: localColumn
					}),
					...(type === 'CUSTOM' && {
						custom: `${props.routeData.table}.${localColumn} = ${foreignTable}.${foreignColumn}`
					})
				};
				schemaService.addJoin(newJoin);
			}
		});
	}

	function renderJoins() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;
		if (props.routeData.joins.length === 0)
			return (
				<Label variant={'body1'} weight={'bold'}>
					No Joins
				</Label>
			);
		return props.routeData.joins.map((joinData: Restura.JoinData, joinIndex) => {
			return (
				<Box key={joinIndex} className={'joinItem'}>
					<Icon
						iconImg={'icon-delete'}
						fontSize={16}
						className={'deleteIcon'}
						onClick={() => {
							schemaService.removeJoin(joinIndex);
						}}
					/>
					<Box className={'tableName'}>
						<Label variant={'body1'} weight={'regular'}>
							{joinData.table}
						</Label>
					</Box>
					{!joinData.custom ? (
						<Box className={'standardJoin'}>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{(props.routeData as Restura.StandardRouteData).table}.{joinData.localColumnName}
							</Label>
							<Label variant={'body1'} weight={'regular'}>
								on
							</Label>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{joinData.table}.{joinData.foreignColumnName}
							</Label>
							<Icon
								padding={4}
								iconImg={'icon-edit'}
								fontSize={16}
								cursorPointer
								onClick={() => {
									let updatedJoinData = { ...joinData };
									updatedJoinData.custom = `${(props.routeData as Restura.StandardRouteData).table}.${
										joinData.localColumnName
									} = ${joinData.table}.${joinData.foreignColumnName}`;
									delete updatedJoinData.localColumnName;
									delete updatedJoinData.foreignColumnName;
									schemaService.updateJoinData(joinIndex, updatedJoinData);
								}}
							/>
						</Box>
					) : (
						<AutoComplete
							options={props.routeData?.request.map((request) => `$${request.name}`) || []}
							startSymbol={'$'}
							value={joinData.custom || ''}
							onChange={(newValue) => {
								schemaService.updateJoinData(joinIndex, { ...joinData, custom: newValue });
							}}
						/>
					)}
					<Select
						value={{ value: joinData.type, label: joinData.type }}
						options={[
							{ value: 'INNER', label: 'INNER' },
							{ value: 'LEFT', label: 'LEFT' }
						]}
						onChange={(newValue) => {
							if (!newValue) return;
							schemaService.updateJoinData(joinIndex, { ...joinData, type: newValue.value });
						}}
					/>
				</Box>
			);
		});
	}

	if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;

	return (
		<Box className={'rsJoinTableInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Joins
			</Label>
			{renderJoins()}
			<Button look={'containedPrimary'} onClick={handleAddJoin} mt={16}>
				Add Join
			</Button>
		</Box>
	);
};

export default JoinTableInput;
