import * as React from 'react';
import './JoinTableInput.scss';
import { Box, Icon, InputText, Label, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface JoinTableInputProps {
	routeData: Restura.RouteData | undefined;
}

const JoinTableInput: React.FC<JoinTableInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);

	function renderJoins() {
		if (!props.routeData || !selectedRoute) return <></>;

		if (!props.routeData || props.routeData.type === 'CUSTOM') return <></>;
		return props.routeData.joins.map((joinData: Restura.JoinData, joinIndex) => {
			return (
				<Box key={joinIndex} className={'joinItem'}>
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
									console.log('edit');
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
		</Box>
	);
};

export default JoinTableInput;
