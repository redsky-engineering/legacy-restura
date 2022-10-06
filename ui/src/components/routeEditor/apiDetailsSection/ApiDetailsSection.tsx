import * as React from 'react';
import './ApiDetailsSection.scss';
import { Box } from '@redskytech/framework/ui';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../../state/globalState.js';
import MethodPathInput from '../../methodPathInput/MethodPathInput';
import RouteTypeInput from '../../routeTypeInput/RouteTypeInput';
import PermissionInput from '../../permissionInput/PermissionInput';
import BaseTableInput from '../../baseTableInput/BaseTableInput';
import RequestParamInput from '../../requestParamInput/RequestParamInput';
import RouteNameInput from '../../routeNameInput/RouteNameInput';
import RouteDescriptionInput from '../../routeDescriptionInput/RouteDescriptionInput';
import JoinTableInput from "../../joinTableInput/JoinTableInput";

interface ApiDetailsSectionProps {}

const ApiDetailsSection: React.FC<ApiDetailsSectionProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(globalState.selectedRoute);

	const routeData = useMemo<Restura.RouteData | undefined>(() => {
		if (!schema || !selectedRoute) return undefined;
		let endpoints = schema.endpoints.find((item) => item.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return undefined;
		return endpoints.routes.find((item) => item.path === selectedRoute.path);
	}, [schema, selectedRoute]);

	if (!selectedRoute) return <></>;

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
		</Box>
	);
};

export default ApiDetailsSection;
