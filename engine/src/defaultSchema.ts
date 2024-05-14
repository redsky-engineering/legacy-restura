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
			foreignKeys: [],
			checkConstraints: [],
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
				{ roles: [], name: 'email', type: 'VARCHAR', length: 100, isNullable: true },
				{ roles: [], name: 'role', type: 'ENUM', isNullable: false, value: "'admin','technician'" },
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
				{ roles: [], name: 'passwordResetGuid', type: 'VARCHAR', length: 100, isNullable: true }
			],
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
			checkConstraints: [],
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
							validator: [{ type: 'ONE_OF', value: ['admin', 'technician'] }]
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
	roles: ['admin', 'user'],
	customTypes:
		'export interface FilteredUser {\n    id: number;\n\tcompanyId: number;\n\tfirstName: string;\n\tlastName: string;\n\temail: string;\n\trole: string;\n\tphone: string;\n\tlastLoginOn: string;\n}\n\nexport interface AuthResponse {\n    token: string;\n    tokenExp: string;\n    refresh: string;\n    refreshExp: string;\n}\n'
};
export default defaultSchema;
