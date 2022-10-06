import * as React from 'react';
import './JoinTableInput.scss';
import { Box, Button, Icon, InputText, Label, popupController, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import JoinSelectorPopup, { JoinSelectorPopupProps } from '../../popups/joinSelectorPopup/JoinSelectorPopup';

interface JoinTableInputProps {
	routeData: Restura.RouteData | undefined;
}

const JoinTableInput: React.FC<JoinTableInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);

	function handleAddJoin() {
		if (!props.routeData || !selectedRoute) return;
		if (props.routeData.type === 'CUSTOM') return;
		popupController.open<JoinSelectorPopupProps>(JoinSelectorPopup, {
			baseTable: props.routeData.table
		});
		// let newJoin: Restura.JoinData = {
		// 	type: 'INNER',
		// 	table: 'customer',
		// 	localColumnName: 'customerId',
		// 	foreignColumnName: 'id'
		// };
		// schemaService.addJoin(newJoin, selectedRoute.path, selectedRoute.baseUrl);
	}

	function renderJoins() {
		if (!props.routeData || !selectedRoute) return <></>;

		if (!props.routeData || props.routeData.type === 'CUSTOM') return <></>;
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
							schemaService.removeJoin(joinIndex, selectedRoute.path, selectedRoute.baseUrl);
						}}
					/>
					<Box className={'tableName'}>
						<Label variant={'body1'} weight={'regular'}>
							{joinData.table}
						</Label>
					</Box>
					{!joinData.custom ? (
						<Box className={'standardJoin'}>
							<Label variant={'body1'} weight={'regular'} className={'clickable'}>
								{(props.routeData as Restura.StandardRouteData).table}.{joinData.localColumnName}
							</Label>
							<Label variant={'body1'} weight={'regular'}>
								on
							</Label>
							<Label variant={'body1'} weight={'regular'} className={'clickable'}>
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
									schemaService.updateJoinData(
										joinIndex,
										updatedJoinData,
										selectedRoute.path,
										selectedRoute.baseUrl
									);
								}}
							/>
						</Box>
					) : (
						<Box className={'customJoin'}>
							<InputText
								inputMode={'text'}
								value={joinData.custom}
								onChange={(newValue) => {
									if (!newValue) return;
									schemaService.updateJoinData(
										joinIndex,
										{ ...joinData, custom: newValue },
										selectedRoute.path,
										selectedRoute.baseUrl
									);
								}}
							/>
						</Box>
					)}
					<Select
						value={{ value: joinData.type, label: joinData.type }}
						options={[
							{ value: 'INNER', label: 'INNER' },
							{ value: 'LEFT', label: 'LEFT' }
						]}
						onChange={(newValue) => {
							if (!newValue) return;
							schemaService.updateJoinData(
								joinIndex,
								{ ...joinData, type: newValue.value },
								selectedRoute.path,
								selectedRoute.baseUrl
							);
						}}
					/>
				</Box>
			);
		});
	}

	if (!props.routeData || props.routeData.type === 'CUSTOM') return <></>;

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
