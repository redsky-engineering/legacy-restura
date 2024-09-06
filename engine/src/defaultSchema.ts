const defaultSchema: Restura.Schema = {
	database: [
		{
			name: 'company',
			columns: [
				{ name: 'id', hasAutoIncrement: true, isNullable: false, roles: [], type: 'BIGINT' },
				{ name: 'createdOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ roles: [], name: 'name', type: 'VARCHAR', length: 255, isNullable: true }
			],
			checkConstraints: [],
			foreignKeys: [],
			indexes: [{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' }],
			roles: []
		},
		{
			name: 'user',
			columns: [
				{ name: 'id', hasAutoIncrement: true, isNullable: false, roles: [], type: 'BIGINT' },
				{ name: 'createdOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ roles: [], name: 'firstName', type: 'VARCHAR', length: 30, isNullable: false },
				{ roles: [], name: 'lastName', type: 'VARCHAR', length: 30, isNullable: false },
				{
					roles: [],
					name: 'companyId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to company(id)'
				},
				{ roles: [], name: 'password', type: 'VARCHAR', length: 70, isNullable: false },
				{ roles: [], name: 'email', type: 'VARCHAR', length: 100, isNullable: false },
				{ roles: [], name: 'role', type: 'ENUM', isNullable: false, value: "'admin','user'" },
				{ roles: [], name: 'permissionLogin', type: 'BOOLEAN', isNullable: false, default: '1' },
				{ roles: [], name: 'lastLoginOn', type: 'DATETIME', isNullable: true },
				{ roles: [], name: 'phone', type: 'VARCHAR', length: 30, isNullable: true },
				{
					roles: [],
					name: 'loginDisabledOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When user was disabled'
				},
				{ roles: [], name: 'passwordResetGuid', type: 'VARCHAR', length: 100, isNullable: true },
				{ roles: [], name: 'verifyEmailPin', type: 'MEDIUMINT', isNullable: true },
				{ roles: [], name: 'verifyEmailPinExpiresOn', type: 'DATETIME', isNullable: true },
				{
					roles: [],
					name: 'accountStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'banned','view_only','active'",
					default: '"view_only"'
				},
				{
					roles: [],
					name: 'passwordResetExpiresOn',
					type: 'DATETIME',
					isNullable: true,
					comment: 'When guid is no longer valid'
				},
				{
					roles: [],
					name: 'onboardingStatus',
					type: 'ENUM',
					isNullable: false,
					value: "'verify_email','complete'",
					default: '"verify_email"'
				},
				{ roles: [], name: 'pendingEmail', type: 'VARCHAR', length: 100, isNullable: true }
			],
			checkConstraints: [],
			foreignKeys: [
				{
					name: 'user_companyId_company_id_fk',
					onDelete: 'NO ACTION',
					onUpdate: 'NO ACTION',
					column: 'companyId',
					refTable: 'company',
					refColumn: 'id'
				}
			],
			indexes: [
				{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' },
				{
					columns: ['companyId'],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: 'user_companyId_index'
				},
				{
					name: 'user_email_unique_index',
					columns: ['email'],
					order: 'ASC',
					isPrimaryKey: false,
					isUnique: true
				},
				{
					name: 'user_passwordResetGuid_index',
					isUnique: false,
					order: 'ASC',
					columns: ['passwordResetGuid'],
					isPrimaryKey: false
				}
			],
			roles: []
		}
	],
	endpoints: [
		{
			name: 'V1',
			description: 'V1 Endpoints',
			baseUrl: '/api/v1',
			routes: [
				{
					type: 'ONE',
					method: 'GET',
					name: 'get my user',
					description: 'Get my user',
					path: '/user/me',
					table: 'user',
					roles: ['user', 'admin'],
					request: [],
					joins: [],
					response: [
						{ name: 'id', selector: 'user.id' },
						{ name: 'firstName', selector: 'user.firstName' },
						{ name: 'lastName', selector: 'user.lastName' },
						{ name: 'email', selector: 'user.email' }
					],
					assignments: [],
					where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
				},
				{
					type: 'CUSTOM_ONE',
					method: 'POST',
					name: 'Login',
					description: 'User login endpoint',
					path: '/user/login',
					roles: [],
					request: [
						{
							name: 'username',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'password',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					responseType: 'AuthResponse'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'AuthResponse',
					request: [],
					method: 'POST',
					name: 'Refreshes a Token',
					description: 'Refresh an old, possibly expired token and returns a new token.',
					path: '/user/refresh-token',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'newEmail',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Change Email Request',
					description: 'Request to change email. Sends a verification email with pin',
					path: '/user/change-email',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'PATCH',
					name: 'Commit Email Change',
					description: 'Commits an email change with a pin',
					path: '/user/change-email/commit',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'FilteredUser',
					request: [
						{
							name: 'firstName',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'email',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'role',
							required: true,
							validator: [{ type: 'ONE_OF', value: ['admin', 'user'] }]
						},
						{
							name: 'password',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'phone',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Create User',
					description: 'Creates a user',
					path: '/user',
					roles: ['admin']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'FilteredUser',
					request: [
						{ name: 'id', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] },
						{
							name: 'firstName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'email',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'role',
							required: false,
							validator: [{ type: 'ONE_OF', value: ['admin', 'user'] }]
						},
						{
							name: 'password',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'PATCH',
					name: 'Update User',
					description: 'Update an existing user.',
					path: '/user',
					roles: ['admin']
				},
				{
					type: 'CUSTOM_ONE',
					method: 'POST',
					name: 'Logout',
					description: 'User logout endpoint',
					path: '/user/logout',
					roles: ['admin', 'user'],
					request: [],
					responseType: 'boolean'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'username',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'email',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Check Available',
					description: 'Checks if a given username or email or both are available or not',
					path: '/user/check-available',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'password',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Verify User Password',
					description: 'Verifies a user password to get past security checkpoints',
					path: '/user/verify-password',
					roles: ['admin', 'athlete', 'fan', 'recruiter']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [],
					method: 'POST',
					name: 'Resend Verify Email Pin',
					description: 'Resend the email that sends out the verify email pin',
					path: '/user/resend-verify-email',
					roles: ['admin', 'athlete', 'fan', 'recruiter']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'email',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Forgot Password',
					description: 'Sends a forgot password request',
					path: '/user/forgot-password',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'oldPassword',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'newPassword',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Change Password',
					description: 'Changes a password of the user',
					path: '/user/change-password',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'guid',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'newPassword',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Reset Password',
					description: 'Resets a password using a reset password guid',
					path: '/user/reset-password',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [{ name: 'pin', required: true, validator: [{ type: 'TYPE_CHECK', value: 'number' }] }],
					method: 'POST',
					name: 'Verify Email',
					description: 'Verifies an email given a pin',
					path: '/user/verify-email',
					roles: ['admin', 'user']
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'password',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Delete Me',
					description: "Deletes the user that calls this. This is a post so we don't show password on url.",
					path: '/user/delete/me',
					roles: ['admin', 'user']
				},
				{
					type: 'ONE',
					method: 'PATCH',
					name: 'Update my user',
					description: 'Update my user',
					path: '/user/me',
					table: 'user',
					roles: ['user', 'admin'],
					request: [
						{
							name: 'firstName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'lastName',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'email',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'phone',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'password',
							required: false,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					joins: [],
					response: [
						{ name: 'id', selector: 'user.id' },
						{ name: 'firstName', selector: 'user.firstName' },
						{ name: 'lastName', selector: 'user.lastName' },
						{ name: 'email', selector: 'user.email' }
					],
					assignments: [],
					where: [{ tableName: 'user', columnName: 'id', operator: '=', value: '#userId' }]
				}
			]
		}
	],
	globalParams: ['companyId', 'userId'],
	roles: ['admin', 'user', 'anonymous'],
	customTypes:
		'export interface FilteredUser {\n    id: number;\n\tcompanyId: number;\n\tfirstName: string;\n\tlastName: string;\n\temail: string;\n\trole: string;\n\tphone: string;\n\tlastLoginOn: string;\n}\n\nexport interface AuthResponse {\n    token: string;\n    tokenExp: string;\n    refreshToken: string;\n    refreshTokenExp: string;\n}\n'
};
export default defaultSchema;
