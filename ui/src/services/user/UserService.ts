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

	async loginUserByPassword(username: string, password: string) {
		// password = SparkMD5.hash(password);
		// try {
		// 	let axiosResponse = await http.post<RedSky.RsResponseData<Api.User.Res.Login>, Api.User.Req.Login>(
		// 		'user/login',
		// 		{
		// 			username,
		// 			password
		// 		}
		// 	);
		// 	await this.onAfterLogin(axiosResponse.data.data);
		// } catch (e) {
		await this.onAfterLogin(fakeUser); // TODO: DELETE TRY CATCH AND THIS CODE WHEN CLONING;
		// }
	}

	async onAfterLogin(user: Restura.LoginDetails) {
		let axiosConfig = http.currentConfig();
		axiosConfig.headers = {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			Accept: 'application/json, text/plain, */*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT',
			'x-auth-token': '123'
		};
		http.changeConfig(axiosConfig);

		setRecoilExternalValue<Restura.LoginDetails | undefined>(globalState.loginDetails, user);
		this.schemaService.getCurrentSchema().catch((e) => {
			rsToastify.error('Failed to get current schema', 'Schema Read Error');
			console.error(e);
		});
	}
}
