# The Job - Environment Configuration Guide

This document explains how to configure the environment for The Job application, including all required environment variables, secrets, and third-party service integrations.

## Required Environment Variables

### Core Application Settings

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NODE_ENV` | Application environment | `development`, `production`, `test` |
| `PORT` | Port for the application to run on | `5000` |
| `SESSION_SECRET` | Secret for session cookie encryption | Random string (keep secure) |

### Database Configuration

These variables are used for PostgreSQL database connection:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | Full connection string for PostgreSQL | `postgresql://user:password@localhost:5432/dbname` |
| `PGHOST` | PostgreSQL host | `localhost` |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGUSER` | PostgreSQL username | `postgres` |
| `PGPASSWORD` | PostgreSQL password | (keep secure) |
| `PGDATABASE` | PostgreSQL database name | `the_job_db` |

### Authentication

#### Google OAuth

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console |

To set up Google OAuth:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add authorized JavaScript origins (your app's URL)
7. Add authorized redirect URIs (e.g., `https://your-domain.com/auth/google/callback`)
8. Copy the Client ID and Client Secret into your environment variables

### Payment Processing (Stripe)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe Secret Key | Stripe Dashboard |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe Publishable Key (client-side) | Stripe Dashboard |

To set up Stripe:

1. Create a [Stripe account](https://stripe.com/) if you don't have one
2. Navigate to the Developers > API keys section in the Stripe Dashboard
3. Retrieve your API keys
   - Use test keys for development (`sk_test_...` and `pk_test_...`)
   - Use live keys for production (`sk_live_...` and `pk_live_...`)
4. Set up webhook endpoints (for payment notifications):
   - Create a webhook endpoint in the Stripe Dashboard pointing to `https://your-domain.com/webhook/stripe`
   - Configure events to listen for (e.g., `payment_intent.succeeded`, `payment_intent.payment_failed`)

### Firebase (Optional)

If using Firebase for additional features:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Firebase Console |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Firebase Console |

## Development Environment Setup

### Using Environment Files

Create a `.env` file in the root directory with your environment variables:

```
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_session_secret_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/the_job_db
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=the_job_db

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
```

### Using Replit Secrets

When deploying on Replit, add the environment variables as Secrets:

1. Go to the "Secrets" tab in your Repl
2. Add each environment variable as a key-value pair
3. The application will automatically access these values at runtime

## Production Environment Setup

### Security Considerations

1. Always use strong, unique values for secrets
2. Never commit secrets to version control
3. Rotate secrets regularly
4. Use HTTPS in production
5. Apply the principle of least privilege for database users

### Deploying to Production

When deploying to production:

1. Use production-grade database credentials
2. Switch to live Stripe API keys
3. Update OAuth redirect URIs to production URLs
4. Set `NODE_ENV=production`
5. Configure proper CORS settings if needed

## Database Setup

### Creating the Database

1. Install PostgreSQL on your system
2. Create a new database:
   ```sql
   CREATE DATABASE the_job_db;
   ```
3. Set up database credentials and update environment variables

### Running Migrations

The application uses Drizzle ORM for database schema management:

1. Ensure your database connection variables are set
2. Run the database push command to update the schema:
   ```
   npm run db:push
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check if PostgreSQL is running
   - Verify credentials are correct
   - Ensure database exists
   - Check network connectivity and firewall settings

2. **Authentication Problems**
   - Verify OAuth credentials and redirect URIs
   - Check session configuration
   - Clear browser cookies if testing

3. **Payment Processing Issues**
   - Confirm Stripe API keys are correct
   - Use Stripe dashboard logs to debug webhook issues
   - Test with Stripe's testing card numbers

### Logging

Enable detailed logging in development:

```
NODE_ENV=development
DEBUG=the-job:*
```

## Maintenance

### Backup Procedures

1. Regularly back up the database:
   ```bash
   pg_dump -U postgres the_job_db > backup_$(date +%Y%m%d).sql
   ```

2. Store backups securely and off-site

### Monitoring

Monitor application health with:
- Server logs
- Database performance metrics
- Stripe dashboard for payment issues
- Application error tracking