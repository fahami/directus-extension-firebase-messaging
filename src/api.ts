import { defineOperationApi } from '@directus/extensions-sdk';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { MulticastMessage, BatchResponse } from 'firebase-admin/messaging';

type Options = {
	recipientType: 'token' | 'tokens' | 'topic';
	deviceToken?: string;
	deviceTokens?: string[];
	topic?: string;
	notificationTitle?: string;
	notificationBody?: string;
	dataPayload?: Record<string, string>;
	priority?: 'high' | 'normal';
	timeToLive?: number;
	dryRun?: boolean;
};

// @ts-ignore
const firebaseApp = global.firebaseApp || initializeApp({
	credential: applicationDefault(),
});

// @ts-ignore
global.firebaseApp = firebaseApp;

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(firebaseApp);

function constructMessage(
	options: Options,
	token?: string
): any {
	const message: any = {};

	// Set recipient
	if (token) {
		message.token = token;
	} else if (options.topic) {
		message.topic = options.topic;
	}

	// Set notification payload
	if (options.notificationTitle || options.notificationBody) {
		message.notification = {
			title: options.notificationTitle,
			body: options.notificationBody,
		};
	}

	// Set data payload
	if (options.dataPayload && Object.keys(options.dataPayload).length > 0) {
		message.data = options.dataPayload;
	}

	// Set Android config with priority and TTL
	if (options.priority || options.timeToLive) {
		message.android = {
			priority: options.priority === 'high' ? 'high' : 'normal',
			ttl: options.timeToLive ? options.timeToLive * 1000 : undefined,
		};
	}

	// Set APNS config with priority
	if (options.priority === 'high') {
		message.apns = {
			headers: {
				'apns-priority': '10',
			},
			payload: {
				aps: {
					contentAvailable: true,
				},
			},
		};
	}

	return message;
}

export default defineOperationApi<Options>({
	id: 'firebase-messaging',
	handler: async (options, { logger }) => {
		// Validate required fields
		if (!options.recipientType) {
			throw new Error('Recipient type is required');
		}

		// Handle different recipient types
		if (options.recipientType === 'token') {
			if (!options.deviceToken) {
				throw new Error('Device token is required for single token recipient type');
			}

			const message = constructMessage(options, options.deviceToken);
			logger.info('Firebase message constructed:', message);
			
			logger.info('Firebase message sending...');
			const messageId = await messaging.send(message, options.dryRun ?? false);

			if (options.dryRun) {
				logger.info('Firebase message validated successfully (dry run mode)');
			} else {
				logger.info(`Firebase message sent successfully: ${messageId}`);
			}

			return { messageId: options.dryRun ? undefined : messageId };
		} else if (options.recipientType === 'tokens') {
			if (!options.deviceTokens || options.deviceTokens.length === 0) {
				throw new Error('Device tokens array is required for multicast recipient type');
			}

			if (options.deviceTokens.length > 500) {
				throw new Error('Maximum 500 tokens allowed per multicast message');
			}

			// Build message without recipient (tokens will be added separately)
			const message: any = {};

			// Set notification payload
			if (options.notificationTitle || options.notificationBody) {
				message.notification = {
					title: options.notificationTitle,
					body: options.notificationBody,
				};
			}

			// Set data payload
			if (options.dataPayload && Object.keys(options.dataPayload).length > 0) {
				message.data = options.dataPayload;
			}

			// Set Android config with priority and TTL
			if (options.priority || options.timeToLive) {
				message.android = {
					priority: options.priority === 'high' ? 'high' : 'normal',
					ttl: options.timeToLive ? options.timeToLive * 1000 : undefined,
				};
			}

			// Set APNS config with priority
			if (options.priority === 'high') {
				message.apns = {
					headers: {
						'apns-priority': '10',
					},
					payload: {
						aps: {
							contentAvailable: true,
						},
					},
				};
			}

			const multicastMessage: MulticastMessage = {
				...message,
				tokens: options.deviceTokens,
			};

			const response: BatchResponse = await messaging.sendEachForMulticast(
				multicastMessage,
				options.dryRun ?? false
			);

			// Collect failed tokens
			const failedTokens: string[] = [];
			if (response.failureCount > 0 && options.deviceTokens) {
				const tokens = options.deviceTokens;
				response.responses.forEach((resp, idx) => {
					if (!resp.success && tokens[idx]) {
						failedTokens.push(tokens[idx]);
					}
				});
			}

			if (options.dryRun) {
				logger.info(
					`Firebase multicast validated (dry run): ${response.successCount} valid, ${response.failureCount} invalid`
				);
			} else {
				logger.info(
					`Firebase multicast sent: ${response.successCount} successful, ${response.failureCount} failed`
				);
			}

			return {
				successCount: response.successCount,
				failureCount: response.failureCount,
				failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
			};
		} else if (options.recipientType === 'topic') {
			if (!options.topic) {
				throw new Error('Topic name is required for topic recipient type');
			}

			const message = constructMessage(options);
			const messageId = await messaging.send(message, options.dryRun ?? false);

			if (options.dryRun) {
				logger.info(`Firebase topic message validated successfully (dry run mode): ${options.topic}`);
			} else {
				logger.info(`Firebase topic message sent successfully: ${messageId} to topic ${options.topic}`);
			}

			return { messageId: options.dryRun ? undefined : messageId };
		}

		throw new Error(`Invalid recipient type: ${options.recipientType}`);
	},
});
