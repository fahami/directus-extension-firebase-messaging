import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'firebase-messaging',
	name: 'Firebase Cloud Messaging',
	icon: 'send',
	description: 'Send push notifications via Firebase Cloud Messaging',
	overview: ({
		recipientType,
		deviceToken,
		deviceTokens,
		topic,
		notificationTitle,
		notificationBody,
		dryRun,
	}) => [
		{
			label: 'Recipient Type',
			text: recipientType || 'Not configured',
		},
		{
			label: 'Target',
			text:
				recipientType === 'token'
					? deviceToken || 'Not set'
					: recipientType === 'tokens'
						? `${deviceTokens?.length || 0} tokens`
						: topic || 'Not set',
		},
		{
			label: 'Message',
			text: notificationTitle
				? `${notificationTitle}${notificationBody ? ': ' + notificationBody : ''}`
				: 'Data only',
		},
		{
			label: 'Mode',
			text: dryRun ? 'Dry Run (Validation Only)' : 'Production',
		},
	],
	options: [
		{
			field: 'recipientType',
			name: 'Recipient Type',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'Single Device Token', value: 'token' },
						{ text: 'Multiple Device Tokens', value: 'tokens' },
						{ text: 'Topic', value: 'topic' },
					],
				},
			},
			schema: {
				default_value: 'token',
			},
		},
		{
			field: 'dryRun',
			name: 'Dry Run Mode',
			type: 'boolean',
			meta: {
				width: 'half',
				interface: 'boolean',
				options: {
					label: 'Enable validation-only mode (no actual delivery)',
				},
			},
			schema: {
				default_value: false,
			},
		},
		{
			field: 'deviceToken',
			name: 'Device Token',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				options: {
					placeholder: 'Enter device registration token',
				},
				hidden: true,
				conditions: [
					{
						rule: {
							_and: [
								{
									recipientType: {
										_eq: 'token',
									},
								},
							],
						},
						hidden: false,
					},
				],
			},
		},
		{
			field: 'deviceTokens',
			name: 'Device Tokens',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'input-code',
				options: {
					placeholder: '["token1", "token2", "token3"]',
					language: 'json',
				},
				hidden: true,
				conditions: [
					{
						rule: {
							_and: [
								{
									recipientType: {
										_eq: 'tokens',
									},
								},
							],
						},
						hidden: false,
					},
				],
			},
		},
		{
			field: 'topic',
			name: 'Topic Name',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				options: {
					placeholder: 'Enter topic name (e.g., news, updates)',
				},
				hidden: true,
				conditions: [
					{
						rule: {
							_and: [
								{
									recipientType: {
										_eq: 'topic',
									},
								},
							],
						},
						hidden: false,
					},
				],
			},
		},
		{
			field: 'notificationTitle',
			name: 'Notification Title',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: 'Enter notification title',
				},
			},
		},
		{
			field: 'notificationBody',
			name: 'Notification Body',
			type: 'text',
			meta: {
				width: 'half',
				interface: 'input-multiline',
				options: {
					placeholder: 'Enter notification body text',
				},
			},
		},
		{
			field: 'dataPayload',
			name: 'Data Payload',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'input-code',
				options: {
					placeholder: '{"key1": "value1", "key2": "value2"}',
					language: 'json',
				},
				note: 'Custom data payload as key-value pairs (all values must be strings)',
			},
		},
		{
			field: 'priority',
			name: 'Priority',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'Normal', value: 'normal' },
						{ text: 'High', value: 'high' },
					],
				},
			},
			schema: {
				default_value: 'normal',
			},
		},
		{
			field: 'timeToLive',
			name: 'Time to Live (seconds)',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: '2419200',
				},
				note: 'How long the message should be kept if the device is offline (default: 28 days)',
			},
			schema: {
				default_value: 2419200,
			},
		},
	],
});
