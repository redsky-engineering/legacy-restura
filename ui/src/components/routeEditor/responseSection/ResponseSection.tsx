import * as React from 'react';
import './ResponseSection.scss';
import { Box, Label } from '@redskytech/framework/ui';

interface ResponseSectionProps {}

const ResponseSection: React.FC<ResponseSectionProps> = (props) => {
	return (
		<Box className={'rsResponseSection'}>
			<Label variant={'h3'} weight={'semiBold'}>
				Response
			</Label>
		</Box>
	);
};

export default ResponseSection;
