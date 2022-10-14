import * as React from 'react';
import './ApiDetailsSection.scss';
import { Box } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState.js';
import MethodPathInput from '../../methodPathInput/MethodPathInput';
import RouteTypeInput from '../../routeTypeInput/RouteTypeInput';
import PermissionInput from '../../permissionInput/PermissionInput';
import BaseTableInput from '../../baseTableInput/BaseTableInput';
import RequestParamInput from '../../requestParamInput/RequestParamInput';
import RouteNameInput from '../../routeNameInput/RouteNameInput';
import RouteDescriptionInput from '../../routeDescriptionInput/RouteDescriptionInput';
import JoinTableInput from '../../joinTableInput/JoinTableInput';
import WhereClauseInput from '../../whereClauseInput/WhereClauseInput';
import GroupByInput from '../../groupByInput/GroupByInput';
import OrderByInput from '../../orderByInput/OrderByInput';
import useRouteData from '../../../customHooks/useRouteData';
import { SelectedRoute } from '../../../services/schema/SchemaService';

interface ApiDetailsSectionProps {}

const ApiDetailsSection: React.FC<ApiDetailsSectionProps> = (props) => {
	const selectedRoute = useRecoilValue<SelectedRoute | undefined>(globalState.selectedRoute);
	const routeData = useRouteData();

	if (!selectedRoute || !routeData) return <></>;

	return (
		<Box className={'rsApiDetailsSection'}>
			<RouteTypeInput routeData={routeData} />
			<RouteNameInput routeData={routeData} />
			<RouteDescriptionInput routeData={routeData} />
			<PermissionInput routeData={routeData} />
			<BaseTableInput routeData={routeData} />
			<MethodPathInput routeData={routeData} />
			<RequestParamInput routeData={routeData} />
			<JoinTableInput routeData={routeData} />
			<WhereClauseInput routeData={routeData} />
			<GroupByInput routeData={routeData} />
			<OrderByInput routeData={routeData} />
		</Box>
	);
};

export default ApiDetailsSection;
