import * as React from 'react';
import './EndpointsPage.scss';
import { Page } from '@redskytech/framework/996';
import { Box } from '@redskytech/framework/ui';
import EndpointListMenu from '../../components/endpointListMenu/EndpointListMenu.js';
import RouteEditor from '../../components/routeEditor/RouteEditor.js';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState.js';

interface EndpointsPageProps {}

const EndpointsPage: React.FC<EndpointsPageProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	return (
		<Page className={'rsEndpointsPage'}>
			<Box display={'flex'}>
				<EndpointListMenu />
				<RouteEditor />
			</Box>
		</Page>
	);
};

export default EndpointsPage;
