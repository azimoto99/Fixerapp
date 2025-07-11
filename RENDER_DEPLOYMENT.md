# Render Deployment Guide

This guide explains how to deploy the Fixer app to Render with proper database migration.

## Render Configuration

### Build Command
Use one of these build commands in your Render service:

**Option 1: Separate predeploy step**
```bash
npm run predeploy
```

**Option 2: Combined build and migrate**
```bash
npm run build-and-migrate
```

**Option 3: Manual command**
```bash
npm ci && npm run db:push && npm run build
```

### Start Command
```bash
npm start
```

### Environment Variables
Make sure these environment variables are set in your Render service:

#### Required Variables
- `SUPABASE_DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SESSION_SECRET` - Session encryption secret
- `NODE_ENV=production`

#### PayPal Configuration
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_CLIENT_SECRET` - PayPal client secret
- `PAYPAL_WEBHOOK_ID` - PayPal webhook ID (optional)
- `VITE_PAYPAL_CLIENT_ID` - PayPal client ID for frontend

#### Other Services
- `MAPBOX_ACCESS_TOKEN` - Mapbox API token
- `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox token for frontend
- `AWS_ACCESS_KEY_ID` - AWS S3 access key
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key
- `AWS_REGION` - AWS region
- `S3_BUCKET_NAME` - S3 bucket name

#### Email Configuration
- `SMTP_HOST` - SMTP server host
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From email address

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Render
2. **Configure Service**: Set up a new Web Service
3. **Set Environment Variables**: Add all required environment variables
4. **Configure Build**: Set the build command to `npm run build-and-migrate`
5. **Configure Start**: Set the start command to `npm start`
6. **Deploy**: Trigger the deployment

## Database Migration

The predeploy script will:
1. ✅ Check environment variables
2. ✅ Install dependencies
3. ✅ Run database migrations (`npm run db:push`)
4. ✅ Test the build process
5. ✅ Confirm successful setup

## Troubleshooting

### Database Connection Issues
If you encounter database connection issues:
1. Check that `SUPABASE_DATABASE_URL` is correctly set
2. Verify that the Supabase instance is running
3. Check Render's logs for specific error messages

### Build Failures
If the build fails:
1. Check that all environment variables are set
2. Verify that the PayPal configuration is correct
3. Check for missing dependencies

### SSL Certificate Issues
If you encounter SSL issues:
- The drizzle config is set to use `rejectUnauthorized: false` for Supabase
- This is normal for Supabase's self-signed certificates

## Success Indicators

You should see these messages in the Render build logs:
- `✅ Environment variables check passed`
- `✅ Database setup completed`
- `✅ Build test passed`
- `🎉 Predeploy script completed successfully!`

## Production Considerations

1. **Environment Variables**: Double-check all production environment variables
2. **Database Access**: Ensure Supabase allows connections from Render
3. **SSL/TLS**: Verify that all external services use HTTPS
4. **Error Monitoring**: Consider adding error monitoring for production

## Alternative Deployment Methods

If the predeploy script doesn't work, you can:
1. Use the Render Dashboard to run `npm run db:push` manually
2. Set up a separate migration job that runs before deployment
3. Use Render's Build Command with the combined script