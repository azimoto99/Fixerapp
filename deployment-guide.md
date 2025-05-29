# Deployment Guide

## Prerequisites
1. Node.js and npm/yarn installed
2. Git installed
3. Stripe account with API keys
4. Supabase account
5. Environment variables configured

## Environment Setup
Create a `.env` file with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_WEBHOOK_SECRET=your_webhook_signing_secret

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# Add other required environment variables
```

## Deployment Steps
1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Build the application
5. Deploy to your hosting platform

## Troubleshooting
1. **Database Connection Issues**: Check your database credentials and connection string
2. **Stripe API Errors**: Ensure your Stripe keys are set correctly and are for the right environment (test/live)
3. **Session Issues**: Check that SESSION_SECRET is set and persistent between deployments
4. **Webhook Failures**: Verify the webhook endpoint is accessible and the secret is correct

## Security Best Practices
1. Never commit sensitive information to version control
2. Use environment variables for all secrets
3. Regularly update dependencies
4. Regularly rotate session secrets
5. Review and rotate API keys periodically
6. Use HTTPS for all connections
7. Implement proper error handling
8. Set up monitoring and logging

## Additional Resources
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)