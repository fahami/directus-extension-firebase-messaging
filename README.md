# Directus Extension: Firebase Cloud Messaging

A Directus operation extension for sending push notifications via Firebase Cloud Messaging (FCM) with support for single device messaging, multicast to multiple devices, topic-based messaging, and dry run validation mode.

## Features

- **Multiple Recipient Types**: Send to single devices, multiple devices (multicast), or topics
- **Dry Run Mode**: Validate messages without actually sending them (perfect for testing)
- **Flexible Configuration**: Configure Firebase credentials via environment variables
- **Rich Messaging**: Support for notification payloads, data payloads, and platform-specific options
- **Message Priority**: Set high or normal priority for time-sensitive notifications
- **Time-to-Live**: Configure how long messages should be kept for offline devices
- **Comprehensive Error Handling**: Detailed error messages and failed token tracking

## Installation

1. Install the extension:
```bash
npm install directus-extension-firebase-messaging
```

2. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Generate a service account key (Project Settings > Service Accounts > Generate New Private Key)
   - Save the JSON file securely on your server

3. Configure environment variable:
```bash
# In your .env file
FIREBASE_CREDENTIAL_PATH=/path/to/your/firebase-service-account.json
```

## Usage

### In Directus Workflows

1. Add the "Firebase Cloud Messaging" operation to your workflow
2. Configure the operation:
   - **Credential Environment Variable**: Name of the env var containing the credential file path (default: `FIREBASE_CREDENTIAL_PATH`)
   - **Recipient Type**: Choose `token`, `tokens`, or `topic`
   - **Dry Run Mode**: Enable to validate without sending (recommended for testing)
   - **Device Token(s)**: Provide token(s) based on recipient type
   - **Notification Title/Body**: Optional notification content
   - **Data Payload**: Optional custom data as JSON
   - **Priority**: Normal or High
   - **Time to Live**: Seconds to keep message for offline devices

### Example: Welcome Notification on User Registration

```
Trigger: User Created
↓
Read Operation: Get user device token
↓
Firebase Messaging Operation:
  - Recipient Type: token
  - Device Token: {{$last.device_token}}
  - Notification Title: "Welcome!"
  - Notification Body: "Thanks for signing up, {{$trigger.first_name}}"
  - Dry Run: false
```

### Example: Multicast to Multiple Subscribers

```
Trigger: Content Published
↓
Read Operation: Get all subscriber tokens
↓
Firebase Messaging Operation:
  - Recipient Type: tokens
  - Device Tokens: {{$last}}
  - Notification Title: "New Content Available"
  - Notification Body: "{{$trigger.title}}"
  - Priority: high
  - Dry Run: false
```

### Example: Topic-Based Broadcast

```
Trigger: Scheduled (cron)
↓
Firebase Messaging Operation:
  - Recipient Type: topic
  - Topic: "daily-news"
  - Notification Title: "Daily News Digest"
  - Notification Body: "Check out today's top stories"
  - Dry Run: false
```

## Dry Run Mode

Dry run mode is excellent for:
- Testing workflow configuration without spamming users
- Validating token formats and message structure
- Debugging message construction logic
- Development and staging environments

When dry run is enabled:
- Firebase validates the entire message
- Authentication and credentials are checked
- Token format is validated
- No actual notifications are sent
- Response indicates validation success/failure

## Configuration Options

### Credential Environment Variable
Name of the environment variable that contains the path to your Firebase service account JSON file.

### Recipient Types

**Single Token (`token`)**
- Send to one specific device
- Requires: `deviceToken` field

**Multiple Tokens (`tokens`)**
- Send same message to up to 500 devices
- Requires: `deviceTokens` array
- Returns success/failure count and failed tokens

**Topic (`topic`)**
- Send to all devices subscribed to a topic
- Requires: `topic` name
- Devices must be subscribed to the topic via client SDK

### Message Configuration

**Notification Payload**
- `notificationTitle`: Visible notification title
- `notificationBody`: Visible notification message

**Data Payload**
- Custom key-value pairs sent to your app
- All values must be strings
- Available to app even when in background

**Priority**
- `normal`: Standard delivery (default)
- `high`: Immediate delivery, wakes up sleeping devices

**Time to Live**
- Seconds to keep message for offline devices
- Default: 2,419,200 (28 days)
- Maximum: 2,419,200 (28 days)

## Response Data

The operation returns:

```json
{
  "success": true,
  "messageId": "projects/my-project/messages/0:1234567890",
  "dryRun": false
}
```

For multicast operations:

```json
{
  "success": true,
  "successCount": 485,
  "failureCount": 15,
  "failedTokens": ["token1", "token2", ...],
  "dryRun": false
}
```

## Error Handling

Common errors and solutions:

**Environment variable not set**
- Ensure `FIREBASE_CREDENTIAL_PATH` is set in your `.env` file
- Verify the environment variable name matches your configuration

**Invalid credential file**
- Check that the JSON file path is correct
- Verify the service account has FCM Send permission
- Ensure the JSON file is properly formatted

**Invalid token format**
- Tokens must be valid FCM registration tokens
- Tokens are obtained from client app FCM SDK
- Use dry run mode to validate tokens

**Topic not found**
- Ensure devices are subscribed to the topic
- Topic names are case-sensitive
- Topics are created automatically when first used

## Security Considerations

- Store service account JSON files outside web-accessible directories
- Use environment variables to reference credential paths
- Never commit service account files to version control
- Restrict file system permissions on credential files
- Use dry run mode in development environments

## Requirements

- Directus ^10.10.0
- Node.js ^18.0.0 or ^20.0.0
- Firebase Admin SDK ^12.0.0
- Valid Firebase project with Cloud Messaging enabled

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.
