import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

/**
 * Maps each selectable event value to the Track-POD Metadata.Event strings
 * it should respond to. Mirrors the Workato `webhook_keys` routing lambda.
 */
const EVENT_MAP: Record<string, string[]> = {
	newUpdatedRoute: ['RouteCreated', 'RouteUpdated'],
	deletedRoute: ['RouteDeleted'],
	newUpdatedOrder: ['OrderCreated', 'OrderUpdated'],
	deletedOrder: ['OrderDeleted'],
};


export class TrackPodTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Track-POD Trigger',
		name: 'trackPodTrigger',
		icon: 'file:trackpod.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Track-POD fires a webhook event',
		defaults: { name: 'Track-POD Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				noDataExpression: true,
				options: [
					{
						name: 'Deleted Order',
						value: 'deletedOrder',
						description: 'Fires when an order is deleted in Track-POD',
					},
					{
						name: 'Deleted Route',
						value: 'deletedRoute',
						description: 'Fires when a route is deleted in Track-POD',
					},
					{
						name: 'New / Updated Order',
						value: 'newUpdatedOrder',
						description: 'Fires when an order is created or updated in Track-POD',
					},
					{
						name: 'New / Updated Route',
						value: 'newUpdatedRoute',
						description: 'Fires when a route is created or updated in Track-POD',
					},
				],
				default: 'newUpdatedOrder',
			},
			// ── Per-event setup notices ──────────────────────────────────────────
			{
				displayName:
					'Register a <a href="https://web.track-pod.com/en/settings/integrations/webhooks" target="_blank">webhook</a> in Track-POD using the Webhook URL shown above, and enable the events: <b>Route created</b> and <b>Route updated</b>.',
				name: 'noticeNewUpdatedRoute',
				type: 'notice',
				default: '',
				displayOptions: { show: { event: ['newUpdatedRoute'] } },
			},
			{
				displayName:
					'Register a <a href="https://web.track-pod.com/en/settings/integrations/webhooks" target="_blank">webhook</a> in Track-POD using the Webhook URL shown above, and enable the event: <b>Route deleted</b>.',
				name: 'noticeDeletedRoute',
				type: 'notice',
				default: '',
				displayOptions: { show: { event: ['deletedRoute'] } },
			},
			{
				displayName:
					'Register a <a href="https://web.track-pod.com/en/settings/integrations/webhooks" target="_blank">webhook</a> in Track-POD using the Webhook URL shown above, and enable the events: <b>Order created</b> and <b>Order updated</b>.',
				name: 'noticeNewUpdatedOrder',
				type: 'notice',
				default: '',
				displayOptions: { show: { event: ['newUpdatedOrder'] } },
			},
			{
				displayName:
					'Register a <a href="https://web.track-pod.com/en/settings/integrations/webhooks" target="_blank">webhook</a> in Track-POD using the Webhook URL shown above, and enable the event: <b>Order deleted</b>.',
				name: 'noticeDeletedOrder',
				type: 'notice',
				default: '',
				displayOptions: { show: { event: ['deletedOrder'] } },
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const event = this.getNodeParameter('event') as string;
		const body = this.getBodyData() as IDataObject;

		// Validate payload shape
		const metadata = body?.Metadata as IDataObject | undefined;
		const incomingEvent = metadata?.Event as string | undefined;

		if (!incomingEvent) {
			// Respond 200 so Track-POD does not retry; skip workflow execution.
			return { webhookResponse: { received: true }, workflowData: [[]] };
		}

		// Mirror Workato's webhook_keys routing: only pass through if the
		// incoming event matches what this node is configured to listen for.
		const expectedEvents = EVENT_MAP[event] ?? [];
		if (!expectedEvents.includes(incomingEvent)) {
			return { webhookResponse: { received: true }, workflowData: [[]] };
		}

		// Pass the full raw payload through — mirrors Workato's
		// `webhook_notification: lambda { payload }`.
		return {
			webhookResponse: { received: true },
			workflowData: [[{ json: body }]],
		};
	}
}
