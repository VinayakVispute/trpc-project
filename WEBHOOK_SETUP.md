# Clerk Webhook Setup Guide

This guide will help you set up Clerk webhooks to sync user data with your database.

## What the Webhook Does

The webhook automatically syncs user data from Clerk to your PostgreSQL database:
- **user.created**: Creates a new user record when someone signs up
- **user.updated**: Updates the user's email if they change it
- **user.deleted**: Removes the user and all their data (projects, tasks) when they delete their account

## Setup Steps

### 1. Local Development with ngrok

For local development, you'll need to expose your localhost to the internet:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start your Next.js app
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### 2. Configure Webhook in Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **Webhooks** in the sidebar
4. Click **Add Endpoint**
5. Enter your webhook URL:
   - **Local**: `https://YOUR-NGROK-URL.ngrok.io/api/webhooks/clerk`
   - **Production**: `https://yourdomain.com/api/webhooks/clerk`

### 3. Subscribe to Events

In the webhook configuration, subscribe to these events:
- ✅ `user.created`
- ✅ `user.updated`
- ✅ `user.deleted`

### 4. Get the Signing Secret

1. After creating the webhook, click on it
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Add it to your `.env.local`:

```env
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

### 5. Test the Webhook

1. In Clerk Dashboard, go to your webhook
2. Click **Testing** tab
3. Send a test `user.created` event
4. Check your application logs to see if it was received

## Production Deployment

For production (Vercel, etc.):

1. Deploy your application
2. Create a new webhook endpoint in Clerk with your production URL
3. Add the webhook secret to your environment variables in your hosting platform
4. Test with a real sign-up flow

## Verifying Webhook is Working

Check your application logs for messages like:
```
User created: user_abc123
User updated: user_abc123
User deleted: user_abc123
```

## Security Features

- ✅ Webhook signature verification using Svix
- ✅ HTTPS required
- ✅ Secret key validation
- ✅ Error handling and logging

## Troubleshooting

### Webhook not receiving events
- Check ngrok is running (for local dev)
- Verify the webhook URL is correct
- Check Clerk Dashboard > Webhooks > Logs for errors

### Signature verification failed
- Ensure `CLERK_WEBHOOK_SECRET` is set correctly
- Make sure you're using the secret from the correct webhook endpoint

### Database errors
- Run Prisma migrations: `pnpm prisma migrate dev`
- Ensure database connection string is correct
- Check Prisma schema matches expected structure

## Database Schema

The webhook expects this Prisma schema:

```prisma
model User {
  id        String    @id // Clerk user ID
  email     String    @unique
  projects  Project[] @relation("UserProjects")
  tasks     Task[]    @relation("UserTasks")
  createdAt DateTime  @default(now())
}
```

When a user is deleted, all their projects and tasks are automatically deleted via CASCADE rules.
