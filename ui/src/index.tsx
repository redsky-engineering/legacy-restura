import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './routes';
import { RecoilRoot } from 'recoil';
import { GlobalStateObserver, GlobalStateInfluencer } from './state/globalState';
import router from './utils/router';
import routes from './routes';
import serviceFactory from './services/serviceFactory';

// Load our static routes in during startup
router.loadStaticRoutes(routes);

// Run our factory creation at the start
serviceFactory.create();

ReactDOM.render(
	<RecoilRoot>
		<App />
		<GlobalStateObserver />
		<GlobalStateInfluencer />
	</RecoilRoot>,
	document.getElementById('root')
);
