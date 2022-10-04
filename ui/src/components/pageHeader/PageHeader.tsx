import * as React from 'react';
import './PageHeader.scss';
import { Box, Label } from '@redskytech/framework/ui';

interface PageHeaderProps {
	title: string;
	rightNode?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = (props) => {
	return (
		<Box className={'rsPageHeader'}>
			<Label variant={'h2'} weight={'semiBold'}>
				{props.title}
			</Label>
			{props.rightNode}
		</Box>
	);
};

export default PageHeader;