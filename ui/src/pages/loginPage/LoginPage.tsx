import React, { FormEvent, useState } from 'react';
import './LoginPage.scss';
import UserService from '../../services/user/UserService.js';
import serviceFactory from '../../services/serviceFactory';
import { WebUtils } from '../../utils/utils';
import themes from '../../themes/themes.scss?export';
import {
	Label,
	Box,
	Button,
	InputText,
	RsFormControl,
	RsFormGroup,
	rsToastify,
	RsValidator,
	RsValidatorEnum
} from '@redskytech/framework/ui';
import { Page } from '@redskytech/framework/996';

enum FormKeys {
	PASSWORD = 'password',
	EMAIL = 'email'
}

const LoginPage: React.FC = () => {
	let userService = serviceFactory.get<UserService>('UserService');
	const [isAttemptingLogin, setIsAttemptingLogin] = useState<boolean>(false);
	const [loginErrorMessage, setLoginErrorMessage] = useState<string>('');
	const [loginForm, setLoginForm] = useState(
		new RsFormGroup([
			new RsFormControl(FormKeys.PASSWORD, '', [new RsValidator(RsValidatorEnum.REQ, 'Password is required')]),
			new RsFormControl(FormKeys.EMAIL, '', [
				new RsValidator(RsValidatorEnum.REQ, 'Email is required'),
				new RsValidator(RsValidatorEnum.EMAIL, 'Email is invalid')
			])
		])
	);

	async function signInUser(e: FormEvent) {
		e.preventDefault();

		if (!(await loginForm.isValid())) {
			setLoginErrorMessage('Please fix login inputs.');
			setLoginForm(loginForm.clone());
			return;
		}

		try {
			setLoginErrorMessage('');
			setIsAttemptingLogin(true);
			let loginValues = loginForm.toModel<{ email: string; password: string }>();
			await userService.loginUserByPassword(loginValues.email, loginValues.password);
		} catch (e) {
			setIsAttemptingLogin(false);
			setLoginErrorMessage('Failed logging in.');
			rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to login.'), 'Login Error');
		}
	}

	return (
		<Page className="rsLoginPage">
			<Box className="loggedOutTitleBar">
				<Label ml={8} variant={'h6'} weight={'medium'} color={themes.neutralWhite}>
					REDSKY
				</Label>
			</Box>
			<Box className="signInWrapper">
				<Box className="signInContainer">
					<Box className="titleContainer">
						<Label variant={'h4'} weight={'medium'} mb={8}>
							Sign in
						</Label>
						<Label variant={'subtitle2'} weight={'medium'} mb={24} color={themes.neutralWhite50}>
							Access Admin Site
						</Label>
					</Box>
					<form className="signInForm" action={'#'} onSubmit={signInUser}>
						<InputText
							inputMode={'text'}
							className="signInInput"
							placeholder="Email Address"
							autocompleteType={'email'}
							type={'text'}
							look={'filled'}
							control={loginForm.get(FormKeys.EMAIL)}
							updateControl={(updateControl) => setLoginForm(loginForm.clone().update(updateControl))}
						/>
						<InputText
							inputMode={'text'}
							className="signInInput"
							placeholder="Password"
							autocompleteType={'current-password'}
							type={'password'}
							look={'filled'}
							control={loginForm.get(FormKeys.PASSWORD)}
							updateControl={(updateControl) => setLoginForm(loginForm.clone().update(updateControl))}
						/>
						<Button
							className="signInButton"
							look={'containedPrimary'}
							type="submit"
							disabled={isAttemptingLogin}
						>
							{isAttemptingLogin ? 'SIGNING IN...' : 'SIGN IN'}
						</Button>
						{!!loginErrorMessage.length && (
							<Label className="errorText" weight={'medium'} variant={'body2'}>
								{loginErrorMessage}
							</Label>
						)}
						<Label className={'forgotPassword'} weight={'medium'} variant={'body1'}>
							Forgot password?
						</Label>
					</form>
				</Box>
			</Box>
		</Page>
	);
};

export default LoginPage;
