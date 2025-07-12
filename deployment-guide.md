# Deployment Guide

## Prerequisites
1. Node.js and npm/yarn installed
2. Git installed
3. PostgreSQL database
4. AWS S3 account for file storage
5. Mapbox account for location services
6. Environment variables configured

## Environment Setup
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/fixer

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ...

# Application
VITE_API_URL=your-api-url
NODE_ENV=production
```

## Deployment Steps
1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Set up PostgreSQL database
5. Run database migrations
6. Build the application
7. Deploy to your hosting platform

## Troubleshooting
1. **Database Connection Issues**: Check your database credentials and connection string
2. **AWS S3 Issues**: Verify AWS credentials and bucket permissions
3. **Mapbox Issues**: Check that your Mapbox token is valid and has the right permissions
4. **Session Issues**: Check that SESSION_SECRET is set and persistent between deployments
5. **Location Service Errors**: Ensure location services are properly configured

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
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Mapbox Documentation](https://docs.mapbox.com/)
- [Node.js Documentation](https://nodejs.org/docs)