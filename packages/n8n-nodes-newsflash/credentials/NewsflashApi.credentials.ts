import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NewsflashApi implements ICredentialType {
	name = 'newsflashApi';

	displayName = 'Newsflash API';

	documentationUrl = 'https://newsflash.sh/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional — leave empty to use the keyless test tier (24h history, per-IP limits). Get a free key at newsflash.sh/docs.',
		},
	];

	// An empty key resolves to "Bearer " which the API treats as keyless (test tier).
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://newsflash.sh',
			url: '/api/events',
			qs: { limit: 1 },
		},
	};
}
