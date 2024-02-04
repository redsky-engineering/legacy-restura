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
				{ roles: [], name: 'phone', type: 'VARCHAR', length: 30, isNullable: true }
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
			indexes: [
				{ name: 'PRIMARY', columns: ['id'], isUnique: true, isPrimaryKey: true, order: 'ASC' },
				{
					columns: ['companyId'],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: 'user_companyId_index'
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
						{ name: 'lastName', selector: 'user.lastName' }
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
					responseType: 'LoginResponse'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'ReAuthResponse',
					request: [
						{
							name: 'token',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						},
						{
							name: 'refreshToken',
							required: true,
							validator: [{ type: 'TYPE_CHECK', value: 'string' }]
						}
					],
					method: 'POST',
					name: 'Re-Authenticates a Token',
					description: 'Refresh an old, possibly expired token and returns a new token.',
					path: '/user/re-auth',
					roles: []
				}
			]
		}
	],
	globalParams: ['companyId', 'userId'],
	roles: ['admin', 'user', 'anonymous'],
	customTypes:
		'export interface FilteredUser {\n    id: number;\n\tcompanyId: number;\n\tfirstName: string;\n\tlastName: string;\n\temail: string;\n\trole: string;\n\tphone: string;\n\tlastLoginOn: string;\n}\n\nexport interface LoginResponse {\n\ttoken: string;\n\texpiresOn: string;\n\trefreshToken: string;\n\tuser: FilteredUser;\n}\n\nexport interface ReAuthResponse {\n\ttoken: string;\n\trefreshToken?: string;\n\texpiresOn: string;\n}\n'
};

export default defaultSchema;
