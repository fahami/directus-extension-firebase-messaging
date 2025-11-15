# Setup Guide for Firebase Cloud Messaging Extension

## Prerequisites

1. **Firebase Project**: Create a Firebase project at https://console.firebase.google.com
2. **Directus Instance**: Running Directus v10.10.0 or higher
3. **Node.js**: Version 18.0.0 or 20.0.0 or higher

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 1.2 Enable Cloud Messaging
1. In your Firebase project console
2. Navigate to **Build → Cloud Messaging**
3. Cloud Messaging is enabled by default

### 1.3 Generate Service Account Key
1. Go to **Project Settings** (gear icon) → **Service Accounts**
2. Click **Generate New Private Key**
3. Click **Generate Key** to download the JSON file
4. Save this file securely - it contains sensitive credentials!

**Important Security Notes:**
- Never commit this file to version control
- Store it outside web-accessible directories
- Restrict file permissions (e.g., `chmod 600 firebase-key.json`)
- Use different keys for development and production

## Step 2: Install the Extension

### Option A: From npm (if published)
```bash
cd /path/to/your/directus/project
npm install directus-extension-firebase-messaging
```

### Option B: Local Installation
```bash
# Build the extension
cd /path/to/directus-extension-firebase-messaging
pnpm build

# Copy to your Directus extensions folder
cp -r dist /path/to/your/directus/extensions/directus-extension-firebase-messaging
```

### Option C: Using pnpm link (for development)
```bash
# In the extension directory
pnpm link

# In your Directus directory
pnpm link directus-extension-firebase-messaging
```

## Step 3: Configure Environment Variables

### 3.1 Locate Your Directus .env File
Usually at `/path/to/directus/.env`

### 3.2 Add Firebase Configuration
Add the following to your `.env` file:

```bash
# Firebase Cloud Messaging Configuration
FIREBASE_CREDENTIAL_PATH=/absolute/path/to/firebase-service-account.json
```

**Examples:**

For development (relative path):
```bash
FIREBASE_CREDENTIAL_PATH=./config/firebase-credentials.json
```

For production (absolute path):
```bash
FIREBASE_CREDENTIAL_PATH=/var/directus/config/firebase-credentials.json
```

### 3.3 Place Your Credential File
Copy the Firebase service account JSON file to the path specified in your environment variable:

```bash
mkdir -p /path/to/directus/config
cp ~/Downloads/firebase-adminsdk-xxxxx.json /path/to/directus/config/firebase-credentials.json
chmod 600 /path/to/directus/config/firebase-credentials.json
```

## Step 4: Restart Directus

```bash
# If using PM2
pm2 restart directus

# If using systemd
sudo systemctl restart directus

# If running manually
# Stop the current process and start again
npm start
```

## Step 5: Verify Installation

1. Log into your Directus admin panel
2. Navigate to **Settings → Flows**
3. Create a new flow or edit an existing one
4. Click **+** to add a new operation
5. Look for **"Firebase Cloud Messaging"** in the operations list
6. If you see it, the extension is installed correctly!

## Step 6: Create Your First Workflow

### Example: Send Welcome Notification on User Registration

#### 6.1 Create a New Flow
1. Go to **Settings → Flows**
2. Click **Create Flow**
3. Name: "Welcome Notification"
4. Status: Active

#### 6.2 Add Event Trigger
1. Click **+** under Triggers
2. Type: **Event Hook**
3. Scope: **items.create**
4. Collections: Select your users collection

#### 6.3 Add Firebase Messaging Operation
1. Click **+** under Operations
2. Select **Firebase Cloud Messaging**
3. Configure:
   - **Credential Environment Variable**: `FIREBASE_CREDENTIAL_PATH`
   - **Recipient Type**: `token`
   - **Device Token**: `{{$trigger.device_token}}` (or your field name)
   - **Notification Title**: `Welcome!`
   - **Notification Body**: `Thanks for joining, {{$trigger.first_name}}`
   - **Dry Run Mode**: ☑️ (enabled for testing)

#### 6.4 Test with Dry Run
1. Save the flow
2. Create a test user with a device token
3. Check the Directus logs - you should see:
   ```
   Firebase message validated successfully (dry run mode)
   ```

#### 6.5 Go Live
1. Edit the Firebase operation
2. Uncheck **Dry Run Mode**
3. Save the flow
4. Create a new user - they should receive a notification!

## Step 7: Get Device Tokens (Client Setup)

To receive notifications, client apps need to provide device tokens.

### For Web Apps
```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  // Your web app's Firebase configuration
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' })
  .then((token) => {
    console.log('Device token:', token);
    // Send this token to your Directus API
    // Store it in a user field
  });
```

### For Android Apps
```kotlin
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send token to Directus
    }
}
```

### For iOS Apps
```swift
import FirebaseMessaging

Messaging.messaging().token { token, error in
    if let token = token {
        // Send token to Directus
    }
}
```

## Common Use Cases

### Use Case 1: Multicast Notification
Send the same notification to multiple users:

```
Trigger: Content Published
↓
Read Operation: Get all subscriber device tokens
  Collection: subscriptions
  Fields: device_token
↓
Firebase Messaging:
  Recipient Type: tokens
  Device Tokens: {{$last.map(s => s.device_token)}}
  Title: "New Content Available"
  Body: "{{$trigger.title}}"
```

### Use Case 2: Topic-Based Broadcasting
Send to all subscribers of a topic:

```
Firebase Messaging:
  Recipient Type: topic
  Topic: "news"
  Title: "Breaking News"
  Body: "Check out the latest updates"
```

**Note**: Devices must subscribe to topics using the client SDK:
```javascript
import { getMessaging } from 'firebase/messaging';
import { getToken } from 'firebase/messaging';

const messaging = getMessaging();
// Subscribe to topic
fetch('https://iid.googleapis.com/iid/v1/' + token + '/rel/topics/news', {
  method: 'POST',
  headers: new Headers({
    'Authorization': 'key=YOUR_SERVER_KEY'
  })
});
```

### Use Case 3: Scheduled Notifications
```
Trigger: Schedule (CRON)
  Interval: 0 9 * * * (Daily at 9 AM)
↓
Read Operation: Get daily content
↓
Firebase Messaging:
  Recipient Type: topic
  Topic: "daily-digest"
  Title: "Your Daily Digest"
  Body: "{{$last.summary}}"
```

## Troubleshooting

### Extension Not Appearing in Operations List
- Restart Directus after installation
- Check that the extension is in the correct directory
- Verify `package.json` has correct `directus:extension` configuration

### "Environment variable not set" Error
- Check `.env` file has `FIREBASE_CREDENTIAL_PATH`
- Ensure Directus has read access to the file
- Restart Directus after changing `.env`

### "Failed to initialize Firebase" Error
- Verify the JSON file path is correct
- Check the JSON file is valid (not corrupted)
- Ensure the service account has FCM permissions

### "Invalid token" Error
- Verify the device token is current and valid
- Tokens can expire or become invalid
- Use dry run mode to validate tokens

### Messages Not Being Received
- Check that the client app has FCM properly configured
- Verify the device has network connectivity
- Check Firebase console for delivery reports
- Ensure notifications aren't blocked by device settings

## Best Practices

### Development
1. Always use **Dry Run Mode** when developing workflows
2. Test with a small set of test tokens first
3. Use separate Firebase projects for dev/staging/production
4. Monitor the Directus logs for errors

### Production
1. Disable dry run mode only after thorough testing
2. Implement retry logic for failed tokens
3. Clean up invalid/expired tokens regularly
4. Monitor quota usage in Firebase console
5. Set up proper error handling in workflows

### Security
1. Never expose service account keys
2. Use environment variables for all credentials
3. Restrict file permissions on credential files
4. Rotate service account keys periodically
5. Use different keys per environment

## Next Steps

1. ✅ Review the [README.md](./README.md) for more examples
2. ✅ Check the design document for advanced features
3. ✅ Explore platform-specific configuration options
4. ✅ Set up monitoring and analytics
5. ✅ Plan your notification strategy

## Support

For issues, questions, or feature requests:
- Check existing GitHub issues
- Review the Directus documentation
- Review Firebase Cloud Messaging documentation

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Directus Flows Documentation](https://docs.directus.io/configuration/flows)
- [Directus Extensions SDK](https://docs.directus.io/extensions/introduction)
