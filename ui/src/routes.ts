import { I996 } from '@redskytech/framework/common/Interfaces';

import NotFoundPage from './pages/notFoundPage/notFoundPage.js';
import LoginPage from './pages/loginPage/LoginPage.js';
import LoadingPage from './pages/loadingPage/LoadingPage.js';
import DatabasePage from './pages/databasePage/DatabasePage.js';
import EndpointsPage from './pages/endpointsPage/EndpointsPage.js';
import SubmitPage from './pages/submitPage/SubmitPage.js';

export type RoutePaths = '/' | '/database' | '/endpoints' | '/submit' | '*' | '/search';

const routes: I996.RouteDetails<RoutePaths>[] = [
	{
		path: '/',
		page: LoginPage,
		options: {
			view: 'login'
		}
	},
	{
		path: '/database',
		page: DatabasePage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '/endpoints',
		page: EndpointsPage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '/submit',
		page: SubmitPage,
		options: {
			view: 'admin'
		}
	},
	{
		path: '*',
		page: NotFoundPage
	},
	{
		path: '/search',
		page: LoadingPage
	}
];

export default routes;
(window as any).routes = routes;
