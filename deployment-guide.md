# Deployment Guide

## Prerequisites
1. Node.js and npm/yarn installed
2. Git installed
3. PayPal account with API credentials
4. Supabase account
5. Environment variables configured

## Environment Setup
Create a `.env` file with the following variables:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_WEBHOOK_ID=your_webhook_id

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
2. **PayPal API Errors**: Ensure your PayPal credentials are set correctly and are for the right environment (sandbox/live)
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
- [PayPal Developer Documentation](https://developer.paypal.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)