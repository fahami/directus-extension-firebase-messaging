import { defineOperationApi } from '@directus/extensions-sdk';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import type { MulticastMessage, BatchResponse } from 'firebase-admin/messaging';

type Options = {
	credentialEnvVar: string;
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

type OperationResult = {
	success: boolean;
	messageId?: string | null;
	successCount?: number;
	failureCount?: number;
	failedTokens?: string[];
	dryRun: boolean;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
};

let firebaseApp: admin.app.App | null = null;

function initializeFirebase(credentialPath: string): admin.app.App {
	if (firebaseApp) {
		return firebaseApp;
	}

	try {
		const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
		firebaseApp = admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
		});
		return firebaseApp;
	} catch (error) {
		throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

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
	handler: async (options, { env, logger }) => {
		const result: OperationResult = {
			success: false,
			dryRun: options.dryRun ?? false,
		};

		try {
			// Validate required fields
			if (!options.credentialEnvVar) {
				throw new Error('Credential environment variable name is required');
			}

			if (!options.recipientType) {
				throw new Error('Recipient type is required');
			}

			// Get credential path from environment variable
			const credentialPath = env[options.credentialEnvVar];
			if (!credentialPath) {
				throw new Error(`Environment variable ${options.credentialEnvVar} is not set`);
			}

			// Initialize Firebase
			const app = initializeFirebase(credentialPath);
			const messaging = admin.messaging(app);

			// Handle different recipient types
			if (options.recipientType === 'token') {
				if (!options.deviceToken) {
					throw new Error('Device token is required for single token recipient type');
				}

				const message = constructMessage(options, options.deviceToken);
				const messageId = await messaging.send(message, options.dryRun ?? false);

				result.success = true;
				result.messageId = options.dryRun ? null : messageId;

				if (options.dryRun) {
					logger.info('Firebase message validated successfully (dry run mode)');
				} else {
					logger.info(`Firebase message sent successfully: ${messageId}`);
				}
			} else if (options.recipientType === 'tokens') {
				if (!options.deviceTokens || options.deviceTokens.length === 0) {
					throw new Error('Device tokens array is required for multicast recipient type');
				}

				if (options.deviceTokens.length > 500) {
					throw new Error('Maximum 500 tokens allowed per multicast message');
				}

				const baseMessage = constructMessage(options);
				const multicastMessage: MulticastMessage = {
					...baseMessage,
					tokens: options.deviceTokens,
				};

				const response: BatchResponse = await messaging.sendEachForMulticast(
					multicastMessage,
					options.dryRun ?? false
				);

				result.success = true;
				result.successCount = response.successCount;
				result.failureCount = response.failureCount;

				// Collect failed tokens
				if (response.failureCount > 0 && options.deviceTokens) {
					const failedTokens: string[] = [];
					const tokens = options.deviceTokens;
					response.responses.forEach((resp, idx) => {
						if (!resp.success && tokens[idx]) {
							failedTokens.push(tokens[idx]);
						}
					});
					result.failedTokens = failedTokens;
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
			} else if (options.recipientType === 'topic') {
				if (!options.topic) {
					throw new Error('Topic name is required for topic recipient type');
				}

				const message = constructMessage(options);
				const messageId = await messaging.send(message, options.dryRun ?? false);

				result.success = true;
				result.messageId = options.dryRun ? null : messageId;

				if (options.dryRun) {
					logger.info(`Firebase topic message validated successfully (dry run mode): ${options.topic}`);
				} else {
					logger.info(`Firebase topic message sent successfully: ${messageId} to topic ${options.topic}`);
				}
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const errorCode = (error as any)?.code || 'UNKNOWN_ERROR';

			logger.error(`Firebase messaging error: ${errorMessage}`);

			result.error = {
				code: errorCode,
				message: errorMessage,
				details: error,
			};

			return result;
		}
	},
});
