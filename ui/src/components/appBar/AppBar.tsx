import React, { useState } from 'react';
import './AppBar.scss';
import UserBadge from '../userBadge/UserBadge';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { Box, Button, Img } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory.js';
import SchemaService from '../../services/schema/SchemaService.js';
import adminLogo from '../../images/redsky_logo.png?webp&imagetools';
import SchemaPreview from '../schemaPreview/SchemaPreview';
import classNames from 'classnames';

const AppBar: React.FC = () => {
	const loginDetails = useRecoilValue<Restura.LoginDetails | undefined>(globalState.loginDetails);
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const [showPreview, setShowPreview] = useState<boolean>(false);

	return (
		<Box className={classNames('rsAppBar')}>
			<Box className="topName">
				<Img width={'auto'} height={32} src={adminLogo} alt="" disableImageKit />
			</Box>
			<Box display={'flex'} alignItems={'center'}>
				<Button
					look={'containedPrimary'}
					onClick={() => {
						setShowPreview(true);
					}}
					disabled={!schemaService.isSchemaChanged(schema)}
					mr={16}
				>
					Preview Schema
				</Button>
				<Box className={'dividerLine'} />
				<UserBadge userName={`${loginDetails?.user.firstName} ${loginDetails?.user.lastName}`} imageUrl={''} />
			</Box>
			<SchemaPreview onClose={() => setShowPreview(false)} open={showPreview} />
		</Box>
	);
};

export default AppBar;
