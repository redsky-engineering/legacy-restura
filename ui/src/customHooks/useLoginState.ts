import { useEffect, useState } from 'react';
import globalState, { clearPersistentState } from '../state/globalState';
import serviceFactory from '../services/serviceFactory';
import UserService from '../services/user/UserService.js';
import { useRecoilState, useRecoilValue } from 'recoil';

export enum LoginStatus {
	UNKNOWN,
	LOGGED_OUT,
	LOGGED_IN
}

export default function useLoginState() {
	const [loginStatus, setLoginStatus] = useState<LoginStatus>(LoginStatus.UNKNOWN);
	const userService = serviceFactory.get<UserService>('UserService');
	const loginDetails = useRecoilValue<Restura.LoginDetails | undefined>(globalState.loginDetails);

	useEffect(() => {
		// Determine if our token is valid or not
		if (loginStatus === LoginStatus.UNKNOWN) return;

		if (!loginDetails) {
			setLoginStatus(LoginStatus.LOGGED_OUT);
		} else {
			setLoginStatus(LoginStatus.LOGGED_IN);
		}
	}, [loginStatus, loginDetails]);

	useEffect(() => {
		async function initialStartup() {
			if (!loginDetails) {
				setLoginStatus(LoginStatus.LOGGED_OUT);
				return;
			}

			try {
				//				await userService.loginUserByToken(adminToken);
				await userService.onAfterLogin(loginDetails);
				setLoginStatus(LoginStatus.LOGGED_IN);
			} catch (e) {
				clearPersistentState();
				setLoginStatus(LoginStatus.LOGGED_OUT);
			}
		}
		initialStartup().catch(console.error);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return loginStatus;
}
