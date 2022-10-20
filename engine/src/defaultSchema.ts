const defaultSchema: Restura.Schema = {
	database: [
		{
			name: 'company',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{
					name: 'modifiedOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{
					roles: [],
					name: 'name',
					type: 'VARCHAR',
					length: 255,
					isNullable: true
				}
			],
			foreignKeys: [],
			indexes: [
				{
					name: 'PRIMARY',
					columns: ['id'],
					isUnique: true,
					isPrimaryKey: true,
					order: 'ASC'
				}
			],
			roles: []
		},
		{
			name: 'user',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGINT'
				},
				{
					name: 'createdOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{
					name: 'modifiedOn',
					isNullable: false,
					default: 'now()',
					roles: [],
					type: 'DATETIME'
				},
				{
					roles: [],
					name: 'firstName',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				},
				{
					roles: [],
					name: 'lastName',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				},
				{
					roles: [],
					name: 'companyId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to company(id)'
				},
				{
					roles: [],
					name: 'password',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				},
				{
					roles: [],
					name: 'email',
					type: 'VARCHAR',
					length: 100,
					isNullable: true
				},
				{
					roles: [],
					name: 'role',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				}
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
				{
					name: 'PRIMARY',
					columns: ['id'],
					isUnique: true,
					isPrimaryKey: true,
					order: 'ASC'
				},
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
					type: 'ARRAY',
					method: 'GET',
					name: 'user',
					description: 'Get all users with firstname filter',
					path: '/user',
					table: 'user',
					roles: [],
					request: [
						{
							name: 'firstName',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'type',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								},
								{
									type: 'ONE_OF',
									value: ['admin', 'user']
								}
							]
						}
					],
					joins: [
						{
							table: 'company',
							type: 'INNER',
							custom: 'user.companyId = company.id'
						}
					],
					response: [
						{
							name: 'id',
							selector: 'user.id'
						},
						{
							name: 'firstName',
							selector: 'user.firstName'
						},
						{
							name: 'lastName',
							selector: 'user.lastName'
						},
						{
							name: 'createdOn',
							selector: 'user.createdOn'
						},
						{
							name: 'bigBadCompanyName',
							selector: 'company.name'
						},
						{
							name: 'companyCreatedOn',
							selector: 'company.createdOn'
						}
					],
					where: [
						{
							tableName: 'user',
							columnName: 'firstName',
							operator: 'ENDS WITH',
							value: '$firstName'
						}
					]
				},
				{
					type: 'ONE',
					method: 'GET',
					name: 'get my user',
					description: 'Get my user',
					path: '/user/me',
					table: 'user',
					roles: ['admin'],
					request: [],
					joins: [],
					response: [
						{
							name: 'id',
							selector: 'user.id'
						},
						{
							name: 'firstName',
							selector: 'user.firstName'
						},
						{
							name: 'lastName',
							selector: 'user.lastName'
						}
					],
					where: [
						{
							tableName: 'user',
							columnName: 'id',
							operator: '=',
							value: '#userId'
						}
					]
				},
				{
					type: 'CUSTOM_ONE',
					method: 'GET',
					name: 'order slim details',
					description: 'Get order slim details',
					path: '/order/slim-details',
					roles: ['admin'],
					request: [
						{
							name: 'id',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						}
					],
					responseType: 'boolean'
				}
			]
		}
	],
	globalParams: ['companyId', 'userId'],
	roles: ['admin', 'user', 'anonymous'],
	customTypes: '',
	version: '0.0.0'
};

export default defaultSchema;
