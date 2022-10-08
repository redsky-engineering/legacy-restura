import * as React from 'react';
import './WhereClauseInput.scss';
import { Box, Button, Icon, InputText, Label, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';

interface WhereClauseInputProps {
	routeData: Restura.RouteData | undefined;
}

const WhereClauseInput: React.FC<WhereClauseInputProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	function renderWhereStatements() {
		if (!SchemaService.isStandardRouteData(props.routeData)) return <></>;
		if (props.routeData.where.length === 0)
			return (
				<Label variant={'body1'} weight={'bold'}>
					No Where Clause
				</Label>
			);

		return props.routeData.where.map((whereData: Restura.WhereData, whereIndex) => {
			return (
				<>
					{!!whereData.conjunction && (
						<Select
							value={{ label: whereData.conjunction, value: whereData.conjunction }}
							options={[
								{ label: 'AND', value: 'AND' },
								{ label: 'OR', value: 'OR' }
							]}
							className={'conjunction'}
						/>
					)}
					<Box key={whereIndex} className={'whereItem'}>
						<Icon
							iconImg={'icon-delete'}
							fontSize={16}
							className={'deleteIcon'}
							onClick={() => {
								// schemaService.removeJoin(joinIndex);
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
						/>
						<InputText inputMode={'text'} placeholder={'value'} value={whereData.value} />
					</Box>
				</>
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
			<Button look={'containedPrimary'} onClick={() => {}} mt={16}>
				Add Statement
			</Button>
		</Box>
	);
};

export default WhereClauseInput;
