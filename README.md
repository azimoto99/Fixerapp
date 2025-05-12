# Fixer - Gig Economy Platform

![Fixer Logo](./public/fixer-pin-logo.svg)

## Overview

Fixer is a cutting-edge gig economy platform that revolutionizes job matching, collaboration, and payment workflows for freelancers and employers. It focuses on intuitive user experience and seamless professional connections, featuring advanced geospatial job discovery with proximity-based recommendations, real-time updates, and secure payment processing through Stripe.

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

## Documentation

Comprehensive documentation is available in the `docs` directory:

- [User Guide](./docs/user-guide.md) - Complete instructions for end users
- [API Documentation](./docs/api-documentation.md) - Details of all API endpoints
- [Environment Configuration](./docs/environment-configuration.md) - Setup and configuration guide

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

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- OpenStreetMap for map data
- Stripe for payment processing
- All open-source libraries used in this project