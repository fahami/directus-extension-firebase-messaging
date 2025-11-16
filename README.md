# Directus Extension: Firebase Cloud Messaging

Send push notifications from your Directus workflows using Firebase Cloud Messaging.

## Features

- Send to one device, many devices, or topic subscribers
- Test mode (dry run) to validate without sending
- Set notification priority and expiration
- Custom data payloads
- Track failed deliveries

## Installation

### 1. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create or select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** and save the JSON file

### 2. Install Extension

```bash
npm install directus-extension-firebase-messaging
```

### 3. Configure Directus

Add to your Directus `.env` file:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-credentials.json
```

### 4. Restart Directus

Restart your Directus instance to load the extension.

## Usage

1. Go to **Settings → Flows** in Directus
2. Create or edit a flow
3. Add the **Firebase Cloud Messaging** operation
4. Configure:

   - **Recipient Type**: Who receives the notification
     - Single Device Token
     - Multiple Device Tokens (up to 500)
     - Topic
   
   - **Dry Run Mode**: Test without sending (recommended for first setup)
   
   - **Notification Title & Body**: Your message
   
   - **Priority**: Normal or High
   
   - **Data Payload** (optional): Custom data as JSON

## Examples

### Welcome Message

**Trigger:** When user is created  
**Action:** Send welcome notification

- Recipient Type: `Single Device Token`
- Device Token: `{{$trigger.device_token}}`
- Title: `"Welcome!"`
- Body: `"Thanks for signing up!"`

### Broadcast to Multiple Users

**Trigger:** When content is published  
**Action:** Notify all subscribers

- Recipient Type: `Multiple Device Tokens`
- Device Tokens: `{{$last.map(s => s.device_token)}}`
- Title: `"New Content Available"`
- Priority: `High`

### Daily Notification

**Trigger:** Scheduled (daily at 9 AM)  
**Action:** Send to topic subscribers

- Recipient Type: `Topic`
- Topic Name: `daily-news`
- Title: `"Daily Digest"`

## Testing (Dry Run Mode)

Enable **Dry Run Mode** to test your setup without sending real notifications:

- ✅ Validates your message format
- ✅ Checks Firebase credentials
- ✅ Verifies device tokens
- ❌ Does NOT send actual notifications

Perfect for development and testing!

## Options Explained

### Recipient Types

- **Single Device Token**: Send to one user's device
- **Multiple Device Tokens**: Send to many users (max 500 at once)
- **Topic**: Broadcast to everyone subscribed to a topic (e.g., "news")

### Priority

- **Normal**: Standard delivery
- **High**: Urgent delivery (wakes up sleeping devices)

### Time to Live

How long to keep the notification if the device is offline (default: 28 days)

### Data Payload

Send custom data to your app:
```json
{"orderId": "12345", "action": "view"}
```
Note: All values must be strings

## What You Get Back

**Single Device or Topic:**
- Message ID (undefined in dry run mode)

**Multiple Devices:**
- Success count
- Failure count
- List of failed tokens (if any)

## Troubleshooting

**"Could not load credentials" error**
- Check `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file
- Make sure the path to your Firebase JSON file is correct
- Restart Directus

**"Invalid token" error**
- Device tokens expire or become invalid
- Use dry run mode to test tokens first

**Messages not received**
- Check your Firebase Console for delivery status
- Verify the app has FCM properly configured
- Make sure notifications aren't blocked on the device

## Requirements

- Directus 10.10.0 or higher
- Firebase project with Cloud Messaging enabled

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.
