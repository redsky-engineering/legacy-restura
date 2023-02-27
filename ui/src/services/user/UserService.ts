import http from '../../utils/http';
import SparkMD5 from 'spark-md5';
import { Service } from '../Service';
import globalState, { setRecoilExternalValue } from '../../state/globalState';
import SchemaService from '../schema/SchemaService.js';
import serviceFactory from '../serviceFactory';
import { rsToastify } from '@redskytech/framework/ui';

const fakeUser: Restura.LoginDetails = {
	token: 'fakeToken',
	refreshToken: 'fakeRefreshToken',
	expiresOn: 'never',
	user: {
		firstName: 'John',
		lastName: 'Doe',
		email: 'john@does.com'
	}
};

export default class UserService extends Service {
	schemaService!: SchemaService;

	start() {
		this.schemaService = serviceFactory.get<SchemaService>('SchemaService');
	}

	async loginUserByToken(authToken: string) {
		let axiosConfig = http.currentConfig();
		axiosConfig.headers = {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			Accept: 'application/json, text/plain, */*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT',
			'x-auth-token': authToken
		};
		http.changeConfig(axiosConfig);
		await this.schemaService.getCurrentSchema();
		setRecoilExternalValue(globalState.authToken, authToken);
	}

	logout() {
		setRecoilExternalValue(globalState.authToken, undefined);
	}
}
