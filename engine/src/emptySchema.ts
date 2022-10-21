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
	customTypes: '',
	version: '0.0.0'
};

console.log(JSON.stringify(emptySchema));
