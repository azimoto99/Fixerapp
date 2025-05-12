# Fixer App Deployment Guide

This guide provides instructions for deploying the Fixer app to production.

## Prerequisites

Before deploying, ensure you have:

1. Node.js 18+ installed
2. A PostgreSQL database provisioned
3. Stripe account with API keys
4. Stripe Connect configured for your platform

## Environment Variables

The following environment variables must be set in your production environment:

```
# Database
DATABASE_URL=your_postgres_connection_string

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Server
PORT=5000
NODE_ENV=production
SESSION_SECRET=your_secure_session_secret
```

## Deployment Steps

### 1. Build the Application

Run the build script to generate production-ready files:

```bash
chmod +x build-for-deploy.sh && ./build-for-deploy.sh
```

This will:
- Build the frontend with Vite
- Compile the backend with esbuild
- Output all files to the `dist` directory

### 2. Set Up Stripe Webhooks

In your Stripe Dashboard:

1. Go to Developers → Webhooks
2. Add an endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Subscribe to the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
   - `payout.created`
   - `payout.paid`
4. Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET`

### 3. Start the Production Server

Run the application using:

```bash
node run-production.js
```

Or with a process manager like PM2:

```bash
pm2 start run-production.js --name fixer-app
```

### 4. Configure Stripe Connect (One-time Setup)

Ensure your Stripe Connect settings are configured:

1. Verify your platform in the Stripe Dashboard
2. Configure the redirect URLs for Connect onboarding:
   - Success URL: `https://your-domain.com/stripe/connect/success`
   - Failure URL: `https://your-domain.com/stripe/connect/failure`

### 5. Database Migrations

The application handles database migrations automatically on startup.

### 6. Monitoring and Logs

Monitor application health and logs using:

```bash
pm2 logs fixer-app
```

## Post-Deployment Verification

After deploying, verify:

1. User authentication works
2. Job posting and payment flow function correctly
3. Stripe Connect account creation works for workers
4. Stripe webhooks are being received properly
5. Job application and hiring process works
6. Payment distribution to workers functions properly

## Troubleshooting

Common issues:

1. **Database Connection Errors**: Verify your DATABASE_URL is correct and the database is accessible
2. **Stripe API Errors**: Ensure your Stripe keys are set correctly and are for the right environment (test/live)
3. **Session Issues**: Check that SESSION_SECRET is set and persistent between deployments
4. **Webhook Failures**: Verify the webhook endpoint is accessible and the secret is correct

## Scaling Considerations

For handling increased load:

1. Consider using a load balancer
2. Scale database resources as needed
3. Implement caching for frequently accessed data
4. Use connection pooling for database connections
5. Consider serverless deployment options for automatic scaling

## Security Recommendations

1. Enable HTTPS for all traffic
2. Use secure cookie settings in production
3. Implement rate limiting for API endpoints
4. Regularly rotate session secrets
5. Set up IP restrictions for admin access
6. Configure appropriate CORS settings

## Mobile App Distribution

For the mobile application:

1. Build the Android APK using the provided script: `./build-android.sh`
2. Distribute the APK file to testers or upload to the Google Play Store
3. For iOS, use the Expo build service and TestFlight for distribution

## Maintenance

Regular maintenance tasks:

1. Update Node.js dependencies regularly
2. Apply security patches promptly
3. Monitor Stripe API version changes
4. Backup the database regularly
5. Review and rotate API keys periodically