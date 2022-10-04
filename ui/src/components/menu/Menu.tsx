import React, { useEffect, useState } from 'react';
import './Menu.scss';
import MenuItem from './menuItem/MenuItem';
import router from '../../utils/router';

import { Box } from '@redskytech/framework/ui';

const Menu: React.FC = () => {
	const [currentPath, setCurrentPath] = useState<string>('');

	useEffect(() => {
		let id = router.subscribeToAfterRouterNavigate((path) => {
			setCurrentPath(path);
		});
		setCurrentPath(router.getCurrentPath());
		return () => {
			router.unsubscribeFromAfterRouterNavigate(id);
		};
	}, []);

	function isSelected(pathBase: string) {
		return currentPath.startsWith(pathBase);
	}

	return (
		<Box className="rsMenu">
			<MenuItem
				isSelected={isSelected('/database')}
				name={'Database'}
				path={'/database'}
				iconName={'icon-home'}
			/>
			<MenuItem isSelected={isSelected('/endpoints')} name={'API'} path={'/endpoints'} iconName={'icon-store'} />
			<MenuItem isSelected={isSelected('/submit')} name={'Submit'} path={'/submit'} iconName={'icon-send'} />
		</Box>
	);
};

export default Menu;
