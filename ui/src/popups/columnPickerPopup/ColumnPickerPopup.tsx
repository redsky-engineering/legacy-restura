import * as React from 'react';
import './ColumnPickerPopup.scss';
import { Box, Icon, InputText, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import classNames from 'classnames';
import SchemaService from '../../services/schema/SchemaService';

export interface ColumnPickerPopupProps extends PopupProps {
	baseTable: string;
	headerText: string;
	onColumnSelect: (tableName: string, columnData: Restura.ColumnData) => void;
}

const ColumnPickerPopup: React.FC<ColumnPickerPopupProps> = (props) => {
	const [filterValue, setFilterValue] = useState<string>('');

	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [selectedTable, setSelectedTable] = useState<string>('');

	const tableList = useMemo<string[]>(() => {
		if (!schema) return [props.baseTable];
		let table = schema.database.find((item) => item.name === props.baseTable);
		if (!table) return [props.baseTable];
		return [props.baseTable, ...table.foreignKeys.map((item) => item.refTable)];
	}, [schema]);

	useEffect(() => {
		if (tableList.length === 0) return;
		setSelectedTable(tableList[0]);
	}, [tableList]);

	function onReject() {
		popupController.close(ColumnPickerPopup);
	}

	function renderFilter() {
		return (
			<Box className={'filter'}>
				<InputText
					placeholder={'Search Columns'}
					inputMode={'search'}
					value={filterValue}
					onChange={(newValue) => {
						setFilterValue(newValue);
					}}
					icon={[
						{
							iconImg: 'icon-filter-list',
							fontSize: 16,
							position: 'LEFT',
							marginRight: 8,
							color: themes.neutralBeige500
						}
					]}
				/>
			</Box>
		);
	}

	function renderTableList() {
		return tableList.map((table) => {
			return (
				<Box
					key={table}
					className={classNames('tableListItem', { isSelected: table === selectedTable })}
					onClick={() => {
						if (table === selectedTable) return;
						setSelectedTable(table);
					}}
				>
					<Label variant={'caption1'} weight={'regular'}>
						{table}
					</Label>
				</Box>
			);
		});
	}

	function handleColumnClick(columnData: Restura.ColumnData) {
		props.onColumnSelect(selectedTable, columnData);
		popupController.close(ColumnPickerPopup);
	}

	function renderColumnList() {
		if (!schema) return null;
		let foundTable = schema.database.find((item) => item.name === selectedTable);
		if (!foundTable) return null;
		return foundTable.columns
			.filter((columnData) => {
				if (filterValue === '') return true;
				return columnData.name.includes(filterValue);
			})
			.map((columnData) => {
				return (
					<Box key={columnData.name} className={'columnListItem'} onClick={()=>handleColumnClick(columnData)}>
						<Label variant={'caption1'} weight={'regular'}>
							{columnData.name}
						</Label>
						<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
							{SchemaService.convertSqlTypeToTypescriptType(columnData.type)}
						</Label>
					</Box>
				);
			});
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsColumnPickerPopup'}>
				<Box className={'header'}>
					<Label variant={'h4'} color={themes.neutralWhite} weight={'medium'}>
						{props.headerText}
					</Label>
					<Icon
						iconImg={'icon-close'}
						color={themes.neutralWhite}
						onClick={onReject}
						cursorPointer
						p={4}
						fontSize={16}
					/>
				</Box>
				<Box p={24}>
					{renderFilter()}
					<Box className={'content'}>
						<Box className={'tableList'}>
							{renderTableList()}
							<Box className={'footer'} />
						</Box>
						<Box className={'columnList'}>{renderColumnList()}</Box>
					</Box>
				</Box>
			</Box>
		</Popup>
	);
};

export default ColumnPickerPopup;
