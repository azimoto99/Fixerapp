# The Job - Gig Economy Platform

![The Job Logo](./logo.png)

## Overview

The Job is a dynamic gig economy platform connecting local workers with job posters through intelligent matching and intuitive user experiences. The platform features advanced geospatial job discovery with proximity-based recommendations, real-time updates, and secure payment processing.

## Key Features

- **Geolocation-powered job matching**: Find jobs within a 2-mile radius
- **Dual account types**: Create both worker and job poster accounts with the same email
- **Real-time job discovery**: Search by location or keywords
- **Mobile-first responsive design**: Optimized for all devices with intuitive touch controls
- **Secure payment processing**: Integrated Stripe payments with transaction history
- **Interactive map**: Enhanced map experience with custom controls and visual job indicators

## Technology Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Local authentication and Google OAuth
- **Maps**: Leaflet.js for interactive maps
- **Payments**: Stripe API integration
- **State Management**: TanStack Query (React Query)

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
- Google Developer account (for OAuth)

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
│   ├── routes.ts      # API routes
│   ├── storage.ts     # Data storage interface
│   ├── auth.ts        # Authentication logic
│   └── db.ts          # Database connection
├── shared/            # Shared code between frontend and backend
│   └── schema.ts      # Database schema and shared types
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