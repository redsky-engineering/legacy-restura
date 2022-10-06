import * as React from 'react';
import './JoinSelectorPopup.scss';
import { Box, Button, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';

export interface JoinSelectorPopupProps extends PopupProps {
	baseTable: string;
	// onSelect: (table: number, type: 'CUSTOM' | 'STANDARD', localColumn: string, foreignColumn: string) => void;
}

const JoinSelectorPopup: React.FC<JoinSelectorPopupProps> = (props) => {
	function onAccept() {
		popupController.close(JoinSelectorPopup);
		// props.onAccept();
	}

	function onReject() {
		popupController.close(JoinSelectorPopup);
		// if (props.onReject) props.onReject();
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsJoinSelectorPopup'}>
				<Label variant={'h6'} color={themes.neutralWhite} weight={'medium'}>
					{props.baseTable}
				</Label>
				<Button look={'containedPrimary'} onClick={onAccept} small>Accept</Button>
				<Button look={'containedPrimary'} onClick={onReject} small>Cancel</Button>
			</Box>
		</Popup>
	);
};

export default JoinSelectorPopup;
