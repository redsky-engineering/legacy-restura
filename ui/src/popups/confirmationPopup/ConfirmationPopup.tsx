import * as React from 'react';
import './ConfirmationPopup.scss';
import { Box, Button, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';

export interface ConfirmationPopupProps extends PopupProps {
	headerLabel: string;
	label: string;
	reverseOrder?: boolean;
	acceptLabel: string;
	rejectLabel?: string;
	onAccept: () => void;
	onReject?: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = (props) => {
	function onAccept() {
		popupController.close(ConfirmationPopup);
		props.onAccept();
	}

	function onReject() {
		popupController.close(ConfirmationPopup);
		if (props.onReject) props.onReject();
	}

	function renderButtons() {
		if (props.reverseOrder) {
			return (
				<>
					<Button look={'outlinedPrimary'} onClick={onAccept} className={'small'}>
						{props.acceptLabel}
					</Button>
					{!!props.rejectLabel && (
						<Button look={'containedPrimary'} onClick={onReject} className={'small'}>
							{props.rejectLabel}
						</Button>
					)}
				</>
			);
		}
		return (
			<>
				{!!props.rejectLabel && (
					<Button look={'outlinedPrimary'} onClick={onReject} className={'small'}>
						{props.rejectLabel}
					</Button>
				)}
				<Button look={'containedPrimary'} onClick={onAccept} className={'small'}>
					{props.acceptLabel}
				</Button>
			</>
		);
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsConfirmationPopup'}>
				<Box height={36} bgColor={themes.neutralBeige900} p={'6px 8px'}>
					<Label variant={'h6'} color={themes.neutralWhite} weight={'medium'}>
						{props.headerLabel}
					</Label>
				</Box>
				<Box p={'16px 24px 24px 24px'}>
					<Label variant={'subheader1'} mb={24} weight={'medium'}>
						{props.label}
					</Label>
					<Box display={'flex'} alignItems={'center'} justifyContent={'space-around'} gap={24}>
						{renderButtons()}
					</Box>
				</Box>
			</Box>
		</Popup>
	);
};

export default ConfirmationPopup;
