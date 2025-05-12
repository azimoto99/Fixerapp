# Fixer - Gig Economy Platform

![Fixer Logo](./public/fixer-pin-logo.svg)

**🚀 [Live Prototype Available at fixer.gg](https://fixer.gg)**

## Overview

Fixer is a cutting-edge gig economy platform that revolutionizes job matching, collaboration, and payment workflows for freelancers and employers. It focuses on intuitive user experience and seamless professional connections, featuring advanced geospatial job discovery with proximity-based recommendations, real-time updates, and secure payment processing through Stripe.

### Try the Prototype

Visit our live prototype at [fixer.gg](https://fixer.gg) to experience the platform's key features including:
- Interactive job map with location-based discovery
- Complete job posting and application workflow
- Stripe Connect payment integration
- Mobile-optimized interface

## Key Features

- **Geolocation-powered job matching**: Find jobs within a configurable radius of your location
- **Stripe Connect integration**: Complete payment system for job posters and workers
- **Task management system**: Break down jobs into tasks and track completion
- **Real-time notifications**: Get alerts for new jobs, applications, and payments
- **Mobile-first responsive design**: Optimized for all devices with intuitive touch controls
- **Dual account types**: Create both worker and job poster accounts with the same email
- **Secure payment processing**: Full payment lifecycle with escrow capabilities
- **Interactive map**: Enhanced map experience with custom controls and visual job indicators
- **Rating and review system**: Build reputation based on job performance

## Technology Stack

- **Frontend**: React Native with Expo, TypeScript, and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **Maps**: Leaflet.js for interactive maps
- **Payments**: Stripe Connect API for full payment lifecycle
- **State Management**: TanStack Query (React Query)
- **Real-time Updates**: WebSockets for notifications
- **UI Components**: Shadcn/UI components
- **OTA Updates**: Expo Updates for seamless app updates without store approvals

## Documentation

Comprehensive documentation is available in the `docs` directory:

- [User Guide](./docs/user-guide.md) - Complete instructions for end users
- [API Documentation](./docs/api-documentation.md) - Details of all API endpoints
- [Environment Configuration](./docs/environment-configuration.md) - Setup and configuration guide
- [Android Build Guide](./docs/android-build-guide.md) - Build the app for Android devices
- [Expo Android Guide](./docs/expo-android-guide.md) - Connect to Android with Expo Go
- [Expo Updates Guide](./docs/expo-updates-guide.md) - How to use OTA updates

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Stripe account for payment processing
- Android SDK (for building mobile app)

### Mobile App Builds

You can build Fixer as a native Android application using our build script:

```bash
# Make the script executable
chmod +x build-android.sh

# Run the build script
./build-android.sh
```

The script will:
1. Build the web application
2. Initialize or update the Android project
3. Build an Android APK file
4. Create a QR code for downloading the APK (optional)

The resulting APK will be available at `./fixer-app.apk` for installation on Android devices.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/the-job.git
   cd the-job
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables (see [Environment Configuration](./docs/environment-configuration.md)):
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. The application will be available at `http://localhost:5000`

## Development

- The frontend is built with Vite and React
- The backend uses Express
- Database interactions use Drizzle ORM
- The project uses a monorepo structure with shared types

### Project Structure

```
├── client/            # Frontend code
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
├── server/            # Backend code
│   ├── api/           # API module endpoints
│   ├── types/         # Server-specific types
│   ├── routes.ts      # API routes
│   ├── storage.ts     # Data storage interface
│   ├── auth.ts        # Authentication logic
│   ├── db.ts          # Database connection
│   └── database-storage.ts # Database implementation
├── shared/            # Shared code between frontend and backend
│   └── schema.ts      # Database schema and shared types
├── public/            # Static assets
├── migrations/        # Database migrations
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) for details on the process for submitting pull requests.

## Deployment

### Production Version

The production version of Fixer is deployed at [fixer.gg](https://fixer.gg). This deployment includes:

- Full production environment with optimized builds
- Integrated Stripe Connect payment processing
- PostgreSQL database with geospatial capabilities
- Mobile-optimized experience
- Secure HTTPS connections

### Deployment Options

Fixer can be deployed using several methods:

1. **Standard Web Deployment**:
   - Build using `./build-for-deploy.sh`
   - Deploy the `dist` directory to your web server
   - Configure environment variables per [deployment guide](./deployment-guide.md)

2. **Mobile App Deployment**:
   - Build Android APK using `./build-android.sh`
   - Distribute via Google Play Store or direct download
   - iOS version can be built using Expo services

3. **GitHub Integration with Expo** (recommended):
   - GitHub repository is connected to Expo for automatic builds
   - Every commit triggers a new build in the Expo Cloud
   - Use Expo's OTA update system for seamless updates
   - Users receive updates automatically without app store approvals

4. **Docker Deployment** (coming soon):
   - Build and run the Docker image
   - Configure with environment variables

See [deployment-guide.md](./deployment-guide.md), [mobile-deployment-guide.md](./mobile-deployment-guide.md), and [expo-updates-guide.md](./docs/expo-updates-guide.md) for detailed instructions.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- OpenStreetMap for map data
- Stripe for payment processing
- All open-source libraries used in this project