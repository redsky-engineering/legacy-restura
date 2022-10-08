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
					<Button look={'outlinedPrimary'} onClick={onAccept}>
						{props.acceptLabel}
					</Button>
					{!!props.rejectLabel && (
						<Button look={'containedPrimary'} onClick={onReject}>
							{props.rejectLabel}
						</Button>
					)}
				</>
			);
		}
		return (
			<>
				{!!props.rejectLabel && (
					<Button look={'outlinedPrimary'} onClick={onReject} >
						{props.rejectLabel}
					</Button>
				)}
				<Button look={'containedPrimary'} onClick={onAccept} >
					{props.acceptLabel}
				</Button>
			</>
		);
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsConfirmationPopup'}>
				<Box height={36} bgColor={themes.neutralBeige700} p={'6px 8px'}>
					<Label variant={'h6'} color={themes.neutralWhite} weight={'medium'}>
						{props.headerLabel}
					</Label>
				</Box>
				<Box p={'16px 24px 24px 24px'}>
					<Label variant={'subheader2'} mb={24} weight={'medium'}>
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
