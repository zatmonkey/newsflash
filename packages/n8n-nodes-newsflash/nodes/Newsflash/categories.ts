import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * Newsflash category vocabulary (mirrors the server's CATEGORIES list).
 * Alphabetized for n8n lint; '' means no category filter.
 */
export const categoryOptions: INodePropertyOptions[] = [
	{ name: 'All', value: '' },
	{ name: 'Business', value: 'business' },
	{ name: 'Crypto', value: 'crypto' },
	{ name: 'Energy', value: 'energy' },
	{ name: 'Health', value: 'health' },
	{ name: 'Politics', value: 'politics' },
	{ name: 'Science', value: 'science' },
	{ name: 'Sports', value: 'sports' },
	{ name: 'Tech', value: 'tech' },
	{ name: 'TradFi', value: 'tradfi' },
	{ name: 'World', value: 'world' },
];
