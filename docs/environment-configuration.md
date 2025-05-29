# Environment Configuration Guide

## Overview
This guide explains how to configure environment variables for the Fixer App.

## Required Environment Variables

### Server Configuration
- `NODE_ENV`: Set to 'development' or 'production'
- `PORT`: The port number for the server (default: 5000)

### Database Configuration
- `DATABASE_URL`: Your database connection string

### Stripe Configuration
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret

### Session Configuration
- `SESSION_SECRET`: A secure random string for session encryption

### Google OAuth Configuration
- `GOOGLE_OAUTH_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET`: Your Google OAuth client secret

### OpenAI Configuration
- `OPENAI_API_KEY`: Your OpenAI API key

## Security Best Practices

1. **Never commit sensitive information to version control**
   - Keep all secrets in `.env` files
   - Use `.env.example` as a template
   - Add `.env` to `.gitignore`

2. **Key Management**
   - Use test keys for development
   - Use live keys for production
   - Rotate keys regularly
   - Use different keys for different environments

3. **Environment Separation**
   - Maintain separate configurations for development and production
   - Use different database instances
   - Use different API keys

4. **Access Control**
   - Limit access to production credentials
   - Use secure storage for secrets
   - Implement proper authentication

## Setting Up Development Environment

1. Copy `.env.example` to `.env`
2. Fill in the required values
3. Use test API keys for development
4. Never commit the `.env` file

## Setting Up Production Environment

1. Create a new `.env` file on the production server
2. Use production API keys
3. Set `NODE_ENV=production`
4. Configure secure session settings
5. Set up proper logging

## Troubleshooting

If you encounter issues:
1. Verify all required variables are set
2. Check for typos in variable names
3. Ensure proper permissions
4. Validate API keys are active
5. Check environment-specific settings