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
					assignments: [],
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
					assignments: [],
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
					method: 'POST',
					name: 'Login',
					description: 'User login endpoint',
					path: '/user/login',
					roles: [],
					request: [
						{
							name: 'username',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'password',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						}
					],
					responseType: 'CustomTypes.LoginResponse'
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
	customTypes: `
		interface LoginResponse {
		token: string;
		expiresOn: string;
		refreshToken: string;
		user: IUserService.FilteredUser;
	}
	`,
	version: '0.0.0'
};

export default defaultSchema;

const secondSchema: Restura.Schema = {
	database: [
		{
			name: 'testTable',
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
					name: 'testValue',
					type: 'ENUM',
					isNullable: true,
					value: "'ET','THIS','AND THIS'",
					default: "'ET'"
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
			name: 'address',
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGINT'
				},
				{
					roles: [],
					name: 'address1',
					type: 'VARCHAR',
					length: 30,
					isNullable: true
				},
				{
					roles: [],
					name: 'city',
					type: 'VARCHAR',
					length: 255,
					isNullable: true
				},
				{
					roles: [],
					name: 'userId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to user(id)'
				},
				{
					roles: [],
					name: 'companyId',
					type: 'BIGINT',
					isNullable: false,
					comment: 'Foreign key to company(id)'
				}
			],
			foreignKeys: [
				{
					name: 'address_userId_user_id_fk',
					onDelete: 'NO ACTION',
					onUpdate: 'NO ACTION',
					column: 'userId',
					refTable: 'user',
					refColumn: 'id'
				},
				{
					name: 'address_companyId_company_id_fk',
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
					columns: ['userId'],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: 'address_userId_index'
				},
				{
					columns: ['companyId'],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: 'address_companyId_index'
				}
			],
			roles: []
		},
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
					roles: ['superAdmin'],
					name: 'password',
					type: 'VARCHAR',
					length: 255,
					isNullable: true
				},
				{
					roles: [],
					name: 'role',
					type: 'ENUM',
					length: 255,
					isNullable: true,
					value: "'ADMIN', 'USER'"
				},
				{
					roles: [],
					name: 'email',
					type: 'VARCHAR',
					length: 255,
					isNullable: false
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
					name: 'Get Users',
					path: '/user',
					table: 'user',
					roles: [],
					request: [
						{
							name: 'nameSearch',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
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
							name: 'modifiedOn',
							selector: 'user.modifiedOn'
						},
						{
							name: 'email',
							selector: 'user.email'
						},
						{
							name: 'companyCreatedOn',
							selector: 'company.createdOn'
						},
						{
							name: 'company',
							objectArray: {
								table: 'company',
								join: 'user.companyId = company.id',
								properties: [
									{
										name: 'id',
										selector: 'company.id'
									},
									{
										name: 'createdOn',
										selector: 'company.createdOn'
									},
									{
										name: 'modifiedOn',
										selector: 'company.modifiedOn'
									},
									{
										name: 'name',
										selector: 'company.name'
									},
									{
										name: 'address',
										objectArray: {
											table: 'address',
											join: 'address.companyId = company.id',
											properties: [
												{
													name: 'id',
													selector: 'address.id'
												},
												{
													name: 'address1',
													selector: 'address.address1'
												}
											]
										}
									}
								]
							}
						},
						{
							name: 'role',
							selector: 'user.role'
						}
					],
					where: [
						{
							tableName: 'user',
							columnName: 'lastName',
							operator: 'LIKE',
							value: '$nameSearch'
						}
					],
					description: 'Get all Users with filter for firstname',
					assignments: []
				},
				{
					type: 'ONE',
					method: 'POST',
					name: 'get my user',
					path: '/user/mine',
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
					],
					description: 'get my user',
					assignments: []
				},
				{
					method: 'GET',
					name: 'Get All Companies',
					description: 'Gets all companies from the databasess',
					path: '/company',
					roles: ['admin'],
					request: [
						{
							name: 'name',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						}
					],
					response: [
						{
							name: 'id',
							selector: 'company.id'
						},
						{
							name: 'name',
							selector: 'company.name'
						},
						{
							name: 'address',
							objectArray: {
								table: 'address',
								join: 'company.id = address.companyId',
								properties: [
									{
										name: 'id',
										selector: 'address.id'
									},
									{
										name: 'addressLine1',
										selector: 'address.address1'
									},
									{
										name: 'city',
										selector: 'address.city'
									},
									{
										name: 'userId',
										selector: 'address.userId'
									}
								]
							}
						},
						{
							name: 'user',
							objectArray: {
								table: 'user',
								join: 'company.id = user.companyId',
								properties: [
									{
										name: 'id',
										selector: 'user.id'
									},
									{
										name: 'createdOn',
										selector: 'user.createdOn'
									},
									{
										name: 'modifiedOn',
										selector: 'user.modifiedOn'
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
										name: 'companyId',
										selector: 'user.companyId'
									},
									{
										name: 'password',
										selector: 'user.password'
									},
									{
										name: 'role',
										selector: 'user.role'
									},
									{
										name: 'email',
										selector: 'user.email'
									}
								]
							}
						}
					],
					type: 'ARRAY',
					table: 'company',
					joins: [],
					where: [
						{
							tableName: 'company',
							columnName: 'name',
							operator: 'LIKE',
							value: '$name'
						}
					],
					assignments: []
				},
				{
					method: 'POST',
					name: 'Create User',
					description: 'Creates a new user',
					path: '/user',
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
							name: 'lastName',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'email',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'companyId',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						}
					],
					response: [
						{
							name: 'id',
							selector: 'user.id'
						},
						{
							name: 'createdOn',
							selector: 'user.createdOn'
						},
						{
							name: 'modifiedOn',
							selector: 'user.modifiedOn'
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
							name: 'address',
							objectArray: {
								table: 'address',
								join: 'user.id = address.userId',
								properties: []
							}
						}
					],
					type: 'ONE',
					table: 'user',
					joins: [],
					where: [],
					assignments: []
				},
				{
					method: 'GET',
					name: 'My company',
					description: '',
					path: '/company/mine',
					roles: [],
					request: [],
					response: [
						{
							name: 'id',
							selector: 'company.id'
						},
						{
							name: 'createdOn',
							selector: 'company.createdOn'
						},
						{
							name: 'modifiedOn',
							selector: 'company.modifiedOn'
						},
						{
							name: 'name',
							selector: 'company.name'
						}
					],
					type: 'ARRAY',
					table: 'company',
					joins: [],
					where: [
						{
							tableName: 'company',
							columnName: 'id',
							operator: '=',
							value: '#companyId'
						}
					],
					assignments: []
				},
				{
					description: '',
					method: 'GET',
					name: 'Custom one',
					path: '/custom/one',
					roles: [],
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'name',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						}
					]
				},
				{
					method: 'PATCH',
					name: 'update user',
					description: 'update user',
					path: '/user',
					roles: [],
					request: [
						{
							name: 'firstName',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'lastName',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
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
						}
					],
					type: 'ONE',
					table: 'user',
					joins: [],
					where: [
						{
							tableName: 'user',
							columnName: 'id',
							operator: '=',
							value: '#userId'
						}
					],
					assignments: []
				},
				{
					method: 'DELETE',
					name: 'delete user',
					description: 'delete user',
					path: '/user',
					roles: [],
					request: [
						{
							name: 'id',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						}
					],
					response: [],
					type: 'ONE',
					table: 'user',
					joins: [],
					where: [
						{
							tableName: 'user',
							columnName: 'id',
							operator: '=',
							value: '$id'
						}
					],
					assignments: []
				},
				{
					method: 'GET',
					name: 'paged users',
					description: 'get paged users',
					path: '/user/paged',
					roles: [],
					request: [
						{
							name: 'page',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						},
						{
							name: 'perPage',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						},
						{
							name: 'filter',
							required: true,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'firstName',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
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
							name: 'company',
							objectArray: {
								table: 'company',
								join: 'user.companyId = company.id',
								properties: [
									{
										name: 'id',
										selector: 'company.id'
									},
									{
										name: 'createdOn',
										selector: 'company.createdOn'
									},
									{
										name: 'modifiedOn',
										selector: 'company.modifiedOn'
									},
									{
										name: 'name',
										selector: 'company.name'
									},
									{
										name: 'address',
										objectArray: {
											table: 'address',
											join: 'company.id = address.companyId',
											properties: [
												{
													name: 'id',
													selector: 'address.id'
												},
												{
													name: 'address1',
													selector: 'address.address1'
												},
												{
													name: 'city',
													selector: 'address.city'
												},
												{
													name: 'userId',
													selector: 'address.userId'
												},
												{
													name: 'companyId',
													selector: 'address.companyId'
												}
											]
										}
									},
									{
										name: 'user',
										objectArray: {
											table: 'user',
											join: 'company.id = user.companyId',
											properties: [
												{
													name: 'firstName',
													selector: 'user.firstName'
												},
												{
													name: 'lastName',
													selector: 'user.lastName'
												},
												{
													name: 'id',
													selector: 'user.id'
												}
											]
										}
									}
								]
							}
						}
					],
					type: 'PAGED',
					table: 'user',
					joins: [],
					where: [],
					orderBy: {
						tableName: 'user',
						columnName: 'firstName',
						order: 'DESC'
					},
					assignments: []
				},
				{
					method: 'GET',
					name: 'My company',
					description: '',
					path: '/company/yours',
					roles: [],
					request: [],
					response: [
						{
							name: 'id',
							selector: 'company.id'
						},
						{
							name: 'createdOn',
							selector: 'company.createdOn'
						},
						{
							name: 'modifiedOn',
							selector: 'company.modifiedOn'
						},
						{
							name: 'name',
							selector: 'company.name'
						}
					],
					type: 'ARRAY',
					table: 'company',
					joins: [],
					where: [
						{
							tableName: 'company',
							columnName: 'id',
							operator: '=',
							value: '#companyId'
						}
					],
					assignments: []
				},
				{
					method: 'GET',
					name: 'New Route',
					description: 'paginated optional values',
					path: '/user/paged/optionalvalues',
					roles: [],
					request: [
						{
							name: 'page',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						},
						{
							name: 'perPage',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						},
						{
							name: 'filter',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						},
						{
							name: 'firstName',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'string'
								}
							]
						}
					],
					response: [
						{
							name: 'id',
							selector: 'user.id'
						},
						{
							name: 'createdOn',
							selector: 'user.createdOn'
						},
						{
							name: 'modifiedOn',
							selector: 'user.modifiedOn'
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
							name: 'companyId',
							selector: 'user.companyId'
						},
						{
							name: 'password',
							selector: 'user.password'
						},
						{
							name: 'role',
							selector: 'user.role'
						},
						{
							name: 'email',
							selector: 'user.email'
						}
					],
					type: 'PAGED',
					table: 'user',
					joins: [],
					where: [],
					orderBy: {
						tableName: '',
						columnName: 'id',
						order: 'ASC'
					},
					assignments: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					method: 'POST',
					name: 'Get Custom User Info',
					description: "Get all the user's custom info.",
					path: '/user/custom/withParam',
					roles: [],
					requestType: 'GetCustomTest'
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					request: [
						{
							name: 'id',
							required: false,
							validator: [
								{
									type: 'TYPE_CHECK',
									value: 'number'
								}
							]
						}
					],
					method: 'GET',
					name: 'Get user by id custom',
					description: 'Custom route test',
					path: '/user/idCustom',
					roles: []
				},
				{
					type: 'CUSTOM_ONE',
					responseType: 'boolean',
					method: 'POST',
					name: 'Get Custom User Info',
					description: "Get all the user's custom info.",
					path: '/user/custom/withParam2',
					roles: [],
					requestType: 'NestedSchemaTest'
				}
			]
		}
	],
	globalParams: ['companyId', 'userId', 'bob', 'role'],
	roles: ['admin', 'user', 'anonymous', 'pm', 'superAdmin'],
	customTypes:
		'interface Test {\n    value1: boolean;\n    value2: string;\n}\n\ninterface CustomOne {\n    value3: string;\n    value4: number;\n}\n\ninterface CustomTwo {\n    value3: string;\n    value4: number;\n    hello: {\n        tim: boolean;\n    }\n}\n\ninterface CustomBig {\n    value5: {\n        test: boolean\n    }\n}\n\ninterface PostNewUser {\n    firstName: string;\n    lastName: string;\n    address: string[];\n    phone: number;\n}\n\ninterface GetCustomTest {\n    aNumber?: number;\n    aString: string;\n    aObject: {\n        innerString: string;\n        innerArray: number[];\n    }\n    aArrayOfArray: string[][];\n}\n\ninterface NestedSchemaTest {\n    fullName: string;\n    isValid: boolean;\n    nested: PostNewUser[];\n}',
	version: '0.0.34'
};
