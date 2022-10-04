import React from 'react';
import './AppBar.scss';
import UserBadge from '../userBadge/UserBadge';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { Box, Button, Icon, Img } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import serviceFactory from '../../services/serviceFactory.js';
import SchemaService from '../../services/schema/SchemaService.js';
import router from '../../utils/router.js';
import { RoutePaths } from '../../routes.js';
import adminLogo from '../../images/redsky_logo.png?webp&imagetools';

const AppBar: React.FC = () => {
	const loginDetails = useRecoilValue<Restura.LoginDetails | undefined>(globalState.loginDetails);
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	return (
		<Box className="rsAppBar">
			<Box className="topName">
				<Img width={'auto'} height={32} src={adminLogo} alt="" disableImageKit />
			</Box>
			<Box display={'flex'} alignItems={'center'}>
				<Button
					look={'containedPrimary'}
					onClick={() => router.navigate<RoutePaths>('/submit')}
					disabled={!schemaService.isSchemaChanged(schema)}
					mr={16}
				>
					Preview Schema
				</Button>
				<Box className={'dividerLine'} />
				<UserBadge userName={`${loginDetails?.user.firstName} ${loginDetails?.user.lastName}`} imageUrl={''} />
			</Box>
		</Box>
	);
};

export default AppBar;
