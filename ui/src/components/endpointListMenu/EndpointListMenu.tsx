import * as React from 'react';
import './EndpointListMenu.scss';
import { Box, Button, InputText, Label } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useRecoilState, useRecoilValue } from 'recoil';
import globalState from '../../state/globalState.js';
import { useEffect, useState } from 'react';
import classNames from 'classnames';

interface EndpointListMenuProps {}

const EndpointListMenu: React.FC<EndpointListMenuProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [selectedRoute, setSelectedRoute] = useRecoilState<{ baseUrl: string; path: string } | undefined>(
		globalState.selectedRoute
	);
	const [filterValue, setFilterValue] = useState<string>('');

	useEffect(() => {
		// Auto select first route if none selected
		if (!schema || selectedRoute) return;
		if (schema.endpoints.length > 0 && schema.endpoints[0].routes.length > 0) {
			setSelectedRoute({ baseUrl: schema.endpoints[0].baseUrl, path: schema.endpoints[0].routes[0].path });
		}
	}, [schema]);

	function renderHeader() {
		return (
			<Box className={'header'}>
				<Label variant={'subheader2'} weight={'semiBold'}>
					Endpoints
				</Label>
				<Button look={'containedPrimary'} small>
					New
				</Button>
			</Box>
		);
	}

	function renderFilter() {
		return (
			<Box className={'filter'}>
				<InputText
					placeholder={'Search'}
					inputMode={'search'}
					value={filterValue}
					onChange={(newValue) => {
						setFilterValue(newValue);
					}}
					icon={[
						{
							iconImg: 'icon-filter-list',
							fontSize: 16,
							position: 'RIGHT',
							color: themes.neutralBeige500,
							onClick: (event) => {
								event.stopPropagation();
								console.log('filter');
							},
							cursorPointer: true
						}
					]}
				/>
			</Box>
		);
	}

	function renderEndpoints() {
		if (!schema || !selectedRoute) return <></>;
		let endpoints = schema.endpoints.find((endpoint) => endpoint.baseUrl === selectedRoute.baseUrl);
		if (!endpoints) return <></>;
		return endpoints.routes
			.filter((route) => {
				if (filterValue === '') return true;
				return route.path.includes(filterValue);
			})
			.map((route) => {
				let isPublic = route.roles.length === 0 || route.roles.includes('anonymous');
				return (
					<Box
						key={route.path}
						className={classNames('endpoint', { isSelected: route.path === selectedRoute.path })}
						onClick={() => setSelectedRoute({ baseUrl: endpoints!.baseUrl, path: route.path })}
					>
						<Box className={'container'}>
							<Box>
								<Label variant={'caption1'} weight={'regular'} className={'path'}>
									{route.path}
								</Label>
								{isPublic && (
									<Label variant={'caption2'} weight={'regular'} className={'public'}>
										PUBLIC
									</Label>
								)}
							</Box>
							<Label variant={'caption1'} weight={'regular'} className={'method'}>
								{route.method}
							</Label>
						</Box>
					</Box>
				);
			});
	}

	return (
		<Box className={'rsEndpointListMenu'}>
			{renderHeader()}
			{renderFilter()}
			{renderEndpoints()}
			<Box className={'footer'} />
		</Box>
	);
};

export default EndpointListMenu;
