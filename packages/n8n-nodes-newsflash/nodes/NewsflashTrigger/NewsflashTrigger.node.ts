import type {
	IDataObject,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

import { categoryOptions } from '../Newsflash/categories';

interface NewsflashEvent extends IDataObject {
	id: number;
	corroboration: number;
}

/**
 * Polling trigger over GET /api/events. Newsflash also exposes a real-time
 * SSE stream (GET /api/stream) for push delivery, but n8n community polling
 * triggers cannot hold long-lived SSE connections — use the stream from a
 * long-running consumer (CLI, MCP, custom service) when you need sub-poll
 * latency.
 */
export class NewsflashTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Newsflash Trigger',
		name: 'newsflashTrigger',
		icon: 'file:newsflash.svg',
		group: ['trigger'],
		version: 1,
		description: 'Emits new and newly corroborated Newsflash news events',
		subtitle: '={{$parameter["category"] || "all categories"}}',
		defaults: {
			name: 'Newsflash Trigger',
		},
		polling: true,
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'newsflashApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: categoryOptions,
				default: '',
				description: 'Only watch events in this category',
			},
			{
				displayName: 'Minimum Corroboration',
				name: 'minCorroboration',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description:
					'Only emit events corroborated by at least this many distinct sources (confidence = min(1, sources/3))',
			},
			{
				displayName: 'Emit Corroboration Updates',
				name: 'emitUpdates',
				type: 'boolean',
				default: true,
				description:
					'Whether to emit an event again when it gains additional corroborating sources (eventType "event.corroborated")',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const category = this.getNodeParameter('category') as string;
		const minCorroboration = this.getNodeParameter('minCorroboration') as number;
		const emitUpdates = this.getNodeParameter('emitUpdates') as boolean;

		const qs: IDataObject = { limit: 100 };
		if (category) qs.category = category;

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://newsflash.sh/api/events',
			qs,
			json: true,
		};

		// The credential is optional: without it the request runs on the
		// keyless test tier.
		let hasCredentials = true;
		try {
			await this.getCredentials('newsflashApi');
		} catch {
			hasCredentials = false;
		}
		const response = hasCredentials
			? await this.helpers.httpRequestWithAuthentication.call(this, 'newsflashApi', options)
			: await this.helpers.httpRequest(options);

		const events = ((response as IDataObject).events ?? []) as NewsflashEvent[];
		const matching = events.filter((event) => Number(event.corroboration) >= minCorroboration);

		if (this.getMode() === 'manual') {
			// Manual executions return the current matching batch so the
			// workflow can be tested without waiting for fresh events.
			return [this.helpers.returnJsonArray(matching as IDataObject[])];
		}

		const staticData = this.getWorkflowStaticData('node') as {
			seen?: Record<string, number>;
		};
		const firstRun = staticData.seen === undefined;
		const seen = staticData.seen ?? {};

		const fresh: IDataObject[] = [];
		for (const event of matching) {
			const id = String(event.id);
			const corroboration = Number(event.corroboration);
			const previous = seen[id];
			if (previous === undefined) {
				if (!firstRun) fresh.push({ ...event, eventType: 'event.new' });
			} else if (corroboration > previous) {
				if (emitUpdates) fresh.push({ ...event, eventType: 'event.corroborated' });
			} else {
				continue;
			}
			seen[id] = corroboration;
		}

		// Bound the dedupe store: event IDs are monotonically increasing, so
		// keeping the highest IDs keeps the most recent events.
		const ids = Object.keys(seen);
		if (ids.length > 2000) {
			ids
				.map(Number)
				.sort((a, b) => a - b)
				.slice(0, ids.length - 2000)
				.forEach((id) => delete seen[String(id)]);
		}
		staticData.seen = seen;

		if (fresh.length === 0) return null;
		return [this.helpers.returnJsonArray(fresh)];
	}
}
