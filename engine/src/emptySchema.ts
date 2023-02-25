const emptySchema: Restura.Schema = {
	database: [],
	endpoints: [
		{
			name: 'Api v1',
			description: 'Api v1 Endpoints',
			baseUrl: '/api/v1',
			routes: []
		}
	],
	globalParams: [],
	roles: [],
	customTypes: ''
};

console.log(JSON.stringify(emptySchema));
