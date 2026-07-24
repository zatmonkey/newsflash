import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import { categoryOptions } from './categories';

export class Newsflash implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Newsflash',
		name: 'newsflash',
		icon: 'file:newsflash.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Real-time corroborated news events + 5-year archive, for agents. Free tier, no key.',
		defaults: {
			name: 'Newsflash',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'newsflashApi',
				required: false,
			},
		],
		requestDefaults: {
			baseURL: 'https://newsflash.sh',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get Event',
						value: 'getEvent',
						action: 'Get a single event with its corroborating articles',
						description: 'Fetch one event by ID, including the underlying source articles',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/events/{{$parameter.eventId}}',
							},
						},
					},
					{
						name: 'Get Events',
						value: 'getEvents',
						action: 'Get deduplicated news events',
						description:
							'Query deduplicated news events with corroboration counts and confidence scores',
						routing: {
							request: {
								method: 'GET',
								url: '/api/events',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'events',
										},
									},
								],
							},
						},
					},
					{
						name: 'Get Stats',
						value: 'getStats',
						action: 'Get corpus statistics',
						description: 'Fetch corpus-wide statistics (events, articles, sources)',
						routing: {
							request: {
								method: 'GET',
								url: '/api/stats',
							},
						},
					},
					{
						name: 'List Sources',
						value: 'listSources',
						action: 'List crawled sources',
						description: 'List the sources Newsflash crawls',
						routing: {
							request: {
								method: 'GET',
								url: '/api/sources',
							},
						},
					},
					{
						name: 'Search Articles',
						value: 'searchArticles',
						action: 'Search raw articles',
						description: 'Search the raw article layer beneath the event graph',
						routing: {
							request: {
								method: 'GET',
								url: '/api/articles',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'articles',
										},
									},
								],
							},
						},
					},
				],
				default: 'getEvents',
			},
			{
				displayName: 'Event ID',
				name: 'eventId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. 12345',
				description: 'Numeric ID of the event to fetch',
				displayOptions: {
					show: {
						operation: ['getEvent'],
					},
				},
			},
			{
				displayName: 'Search Query',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'e.g. bitcoin etf approval',
				description: 'Full-text search query over event titles and summaries',
				displayOptions: {
					show: {
						operation: ['getEvents', 'searchArticles'],
					},
				},
				routing: {
					send: {
						type: 'query',
						property: 'q',
					},
				},
			},
			{
				displayName: 'Semantic Search',
				name: 'semantic',
				type: 'boolean',
				default: false,
				description:
					'Whether to rank events by semantic similarity to the search query instead of keyword match (requires a search query)',
				displayOptions: {
					show: {
						operation: ['getEvents'],
					},
				},
				routing: {
					send: {
						type: 'query',
						property: 'semantic',
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						operation: ['getEvents', 'searchArticles'],
					},
				},
				routing: {
					send: {
						type: 'query',
						property: 'limit',
					},
				},
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['getEvents', 'searchArticles'],
					},
				},
				options: [
					{
						displayName: 'Category',
						name: 'category',
						type: 'options',
						options: categoryOptions,
						default: '',
						description: 'Only return results in this category',
						routing: {
							send: {
								type: 'query',
								property: 'category',
							},
						},
					},
					{
						displayName: 'From',
						name: 'from',
						type: 'dateTime',
						default: '',
						description:
							'Only return results seen after this time (history depth is tier-gated: 24h keyless, 30d free, unlimited premium)',
						routing: {
							send: {
								type: 'query',
								property: 'from',
							},
						},
					},
					{
						displayName: 'Source',
						name: 'source',
						type: 'string',
						default: '',
						placeholder: 'e.g. coindesk',
						description: 'Only return results corroborated by this source slug',
						routing: {
							send: {
								type: 'query',
								property: 'source',
							},
						},
					},
					{
						displayName: 'To',
						name: 'to',
						type: 'dateTime',
						default: '',
						description: 'Only return results seen before this time',
						routing: {
							send: {
								type: 'query',
								property: 'to',
							},
						},
					},
				],
			},
		],
	};
}
