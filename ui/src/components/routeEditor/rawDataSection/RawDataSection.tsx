import * as React from 'react';
import './RawDataSection.scss';
import { Box, Label } from '@redskytech/framework/ui';

interface RawDataSectionProps {}

const RawDataSection: React.FC<RawDataSectionProps> = (props) => {
	return (
		<Box className={'rsRawDataSection'}>
			<Label variant={'h3'} weight={'semiBold'}>
				Raw Data
			</Label>
		</Box>
	);
};

export default RawDataSection;
