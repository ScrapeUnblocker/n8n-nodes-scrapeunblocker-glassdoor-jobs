import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { OptionField } from './GenericFunctions';
import { applyOptions, requireString, runActorAndGetItems } from './GenericFunctions';

// ScrapeUnblocker's public "Glassdoor Jobs Scraper" Actor: https://apify.com/scrapeunblocker/glassdoor-jobs-scraper
const ACTOR_ID = 'BOI0gMO3WxJGBCMLT';
const INTEGRATION_APP_ID = 'scrapeunblocker-glassdoor-jobs-scraper';

// Node option name -> Actor input key.
const OPTION_FIELDS: Record<string, OptionField> = {
	location: {
		key: 'location',
	},
	sort: {
		key: 'sort',
	},
	jobType: {
		key: 'job_type',
	},
	experience: {
		key: 'experience',
	},
	fromAge: {
		key: 'from_age',
	},
	minSalary: {
		key: 'min_salary',
	},
	remote: {
		key: 'remote',
	},
	proxyCountry: {
		key: 'proxy_country',
		kind: 'upper',
	},
};

function buildActorInput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	options: IDataObject,
	itemIndex: number,
): IDataObject {
	const input: IDataObject = {};

	switch (`${resource}:${operation}`) {
		case 'job:search': {
			input.keyword = requireString.call(this, 'keyword', 'Keyword', itemIndex);
			input.max_results = this.getNodeParameter('maxResults', itemIndex);
			break;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for resource "${resource}"`,
				{ itemIndex },
			);
	}

	applyOptions(input, options, OPTION_FIELDS);
	return input;
}

export class GlassdoorJobsScraper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Glassdoor Jobs Scraper',
		name: 'glassdoorJobsScraper',
		icon: {
			light: 'file:glassdoorJobsScraper.png',
			dark: 'file:glassdoorJobsScraper.dark.png',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search Glassdoor job listings by keyword and location with the ScrapeUnblocker Actor on Apify',
		defaults: {
			name: 'Glassdoor Jobs Scraper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'apifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'job',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['job'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search Glassdoor jobs by keyword',
						action: 'Search jobs',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'software engineer',
				description: "Job title or keywords to search for, e.g. 'software engineer'",
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 900,
				},
				default: 60,
				description: 'How many jobs to collect across pages (1-900, about 30 per page)',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['search'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Experience Level',
						name: 'experience',
						type: 'options',
						options: [
							{
								name: 'Any',
								value: '',
							},
							{
								name: 'Director',
								value: 'director',
							},
							{
								name: 'Entry Level',
								value: 'entrylevel',
							},
							{
								name: 'Executive',
								value: 'executive',
							},
							{
								name: 'Internship',
								value: 'internship',
							},
							{
								name: 'Mid-Senior Level',
								value: 'midseniorlevel',
							},
						],
						default: '',
						description: 'Only jobs for this seniority level',
					},
					{
						displayName: 'Job Type',
						name: 'jobType',
						type: 'options',
						options: [
							{
								name: 'Any',
								value: '',
							},
							{
								name: 'Apprenticeship',
								value: 'apprenticeship',
							},
							{
								name: 'Contract',
								value: 'contract',
							},
							{
								name: 'Full-Time',
								value: 'fulltime',
							},
							{
								name: 'Internship',
								value: 'internship',
							},
							{
								name: 'Part-Time',
								value: 'parttime',
							},
							{
								name: 'Temporary',
								value: 'temporary',
							},
						],
						default: '',
						description: 'Only jobs of this employment type',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
						placeholder: 'New York, NY',
						description:
							"City or state to search in, e.g. 'New York, NY'. Leave blank for all locations.",
					},
					{
						displayName: 'Min Salary',
						name: 'minSalary',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Lowest annual salary to include, in the local currency of the location. 0 means no minimum.',
					},
					{
						displayName: 'Posted Within',
						name: 'fromAge',
						type: 'options',
						options: [
							{
								name: 'Any Time',
								value: '',
							},
							{
								name: 'Last 2 Weeks',
								value: '14',
							},
							{
								name: 'Last 24 Hours',
								value: '1',
							},
							{
								name: 'Last 3 Days',
								value: '3',
							},
							{
								name: 'Last Month',
								value: '30',
							},
							{
								name: 'Last Week',
								value: '7',
							},
						],
						default: '',
						description: 'Only jobs posted within this time window',
					},
					{
						displayName: 'Proxy Country',
						name: 'proxyCountry',
						type: 'string',
						default: '',
						placeholder: 'US',
						description: 'Exit-IP country (ISO-2, e.g. US). Leave blank for a US exit.',
					},
					{
						displayName: 'Remote Only',
						name: 'remote',
						type: 'boolean',
						default: false,
						description: 'Whether to return only remote jobs',
					},
					{
						displayName: 'Sort By',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Most Recent',
								value: 'recency',
							},
							{
								name: 'Most Relevant',
								value: 'relevance',
							},
						],
						default: 'recency',
						description: 'Order the results by most recent or by relevance',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'Maximum run time of the Apify Actor run. 0 keeps the Actor default. A run that times out fails the node.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const { timeout, ...actorOptions } = options;

				const input = buildActorInput.call(this, resource, operation, actorOptions, i);
				const { items: results } = await runActorAndGetItems.call(this, {
					actorId: ACTOR_ID,
					integrationAppId: INTEGRATION_APP_ID,
					input,
					itemIndex: i,
					timeoutSecs: (timeout as number) || undefined,
				});

				for (const result of results) {
					returnData.push({ json: result, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return an error of their own class unchanged.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
