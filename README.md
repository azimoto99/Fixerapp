# Fixer - Gig Economy Platform

![Fixer Logo](./logo.png)

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

### Frontend
*   **Framework/Library**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS, Radix UI components, `index.css` for global styles.
*   **State Management**: TanStack Query (React Query) (based on dependencies), potentially context API/custom hooks.

### Backend
*   **Framework**: Node.js with Express.js
*   **Language**: TypeScript (`tsx` for development, `esbuild` for production builds)
*   **API Style**: RESTful API

### Database & Supabase Integration
*   **Primary Database**: PostgreSQL hosted on Supabase.
*   **ORM/Query Builder**: Drizzle ORM is used for backend database queries and schema management. The main data access logic is in `server/unified-storage.ts` which uses Drizzle.
*   **Schema Definition**: Database schema is defined in `shared/schema.ts` and utilized by Drizzle.
*   **Supabase JS Client**: The `@supabase/supabase-js` client is initialized in `server/db.ts`. It is likely used for Supabase-specific services such as:
    *   Authentication (Supabase Auth)
    *   Real-time features (Supabase Realtime)
    *   File Storage (Supabase Storage buckets)
*   **Session Management**: Express sessions are stored in the Supabase PostgreSQL database using `connect-pg-simple`, configured to use the Supabase connection pooler (port 6543).

### Mobile
*   **Framework**: Capacitor is integrated for building native Android (and potentially iOS) applications from the web codebase.

### Shared Code
*   The `shared/` directory, particularly `shared/schema.ts`, contains code (like Drizzle schema definitions and types) used by both the frontend and backend.

## Documentation

Comprehensive documentation is available in the `docs` directory:

- [User Guide](./docs/user-guide.md) - Complete instructions for end users
- [API Documentation](./docs/api-documentation.md) - Details of all API endpoints
- [Environment Configuration](./docs/environment-configuration.md) - Setup and configuration guide
- [Android Build Guide](./docs/android-build-guide.md) - Build the app for Android devices
- [Expo Android Guide](./docs/expo-android-guide.md) - Connect to Android with Expo Go

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

*   **Frontend**: Built with Vite and React (TypeScript, Tailwind CSS).
*   **Backend**: Node.js with Express (TypeScript).
*   **Database**: Interactions via Drizzle ORM connected to Supabase PostgreSQL.
*   **Shared Code**: Types and schema are shared between frontend and backend via the `shared/` directory.
*   **Development Server**: `npm run dev` starts Vite for the frontend and `tsx` for the backend.
*   **Production Build**: `npm run build` uses Vite for frontend and `esbuild` for backend.

### Project Structure

Key directories and files:

*   **`client/src/`**: Frontend (React, TypeScript, Vite)
    *   `main.tsx`: Application entry point.
    *   `App.tsx`: Main React application component.
    *   `pages/`: Page-level components.
    *   `components/`: Reusable UI components.
    *   `hooks/`: Custom React hooks.
    *   `lib/`: Utility functions, API service calls.
*   **`server/`**: Backend (Node.js, Express, TypeScript)
    *   `index.ts`: Main server entry point.
    *   `routes.ts`: Primary API routes.
    *   `api/`: Specific API route handlers.
    *   `db.ts`: Initializes Drizzle ORM (for Supabase PostgreSQL) and Supabase JS client.
    *   `storage.ts`: Defines the `IStorage` interface.
    *   `unified-storage.ts`: Implements `IStorage` using Drizzle ORM.
    *   `auth.ts`: Authentication logic.
*   **`shared/`**: Code shared between frontend and backend.
    *   `schema.ts`: Drizzle ORM schema definitions and shared types.
*   **`public/`**: Static assets served by Vite.
*   **`docs/`**: Detailed documentation and guides.
*   `package.json`, `vite.config.ts`, `tailwind.config.ts`, `capacitor.config.ts`, `drizzle.config.ts`: Key configuration files.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) for details on the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- OpenStreetMap for map data
- Stripe for payment processing
- All open-source libraries used in this project