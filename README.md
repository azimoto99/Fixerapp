# Fixer 🛠️

Fixer is a comprehensive gig-work platform that connects people who need help with various tasks to skilled individuals ready to assist. Whether it's a quick repair, a complex project, or just an extra pair of hands, Fixer makes finding and offering help straightforward, secure, and location-verified.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Local Development](#local-development)
7. [Available Scripts](#available-scripts)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [API Documentation](#api-documentation)
12. [Contributing](#contributing)
13. [License](#license)

---

## Overview

Fixer is a production-ready gig economy platform with advanced security features, comprehensive user management, and enterprise-grade functionality. The platform supports multiple account types and provides robust location verification to ensure job authenticity.

## Key Features

### 🔐 **Security & Verification**
- **Location Verification System** – GPS-based verification with anti-spoofing measures
- **Multi-layer Fraud Detection** – Speed analysis, device fingerprinting, pattern recognition
- **Real-time Monitoring** – Continuous location tracking during job execution
- **Content Filtering** – Automated content moderation and safety measures

### 👥 **User Management**
- **Multiple Account Types** – Worker, Poster, Enterprise accounts with same email
- **Account Type Switching** – Seamless transition between different roles
- **Rich User Profiles** – Skills, portfolios, reviews, and verification status
- **Enterprise Features** – Bulk job posting, team management, advanced analytics

### 💼 **Job Management**
- **Advanced Job Posting** – Multi-step wizard with location, skills, and payment setup
- **Smart Job Discovery** – Location-based search with advanced filtering
- **Application Management** – Comprehensive hiring workflow
- **Job Lifecycle Tracking** – From posting to completion with status updates

### 💳 **Payment Coordination**
- **Payment Amount Display** – Clear payment expectations for jobs
- **User-Controlled Payments** – Direct coordination between users without platform processing
- **Payment Communication** – Built-in messaging for payment arrangements
- **Enterprise Features** – Advanced job management and coordination

### 📊 **Analytics & Reporting**
- **Poster Dashboard** – Job performance, application analytics, worker management
- **Admin Dashboard** – Platform-wide analytics, user management, content moderation
- **Real-time Metrics** – Live job status, payment tracking, user activity

### 🗺️ **Location Services**
- **Mapbox Integration** – Advanced mapping and geocoding
- **Geofencing** – Location-based job boundaries and verification
- **Distance Calculations** – Accurate job proximity and travel estimates

## Tech Stack

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Frontend         | React 18, TypeScript, Vite, Tailwind CSS        |
| Backend          | Node.js, Express, TypeScript                    |
| Database         | PostgreSQL, Drizzle ORM                         |
| Authentication   | Session-based auth with secure cookies          |
| Payment Display  | User-controlled payment coordination             |
| File Storage     | AWS S3                                           |
| Maps & Location  | Mapbox API                                       |
| Real-time        | WebSocket server                                 |
| UI Components    | Radix UI, Lucide Icons                          |

## Project Structure

```
Fixerapp/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
├── server/                 # Express backend API
│   ├── api/                # API route handlers
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── utils/              # Server utilities
│   └── db/                 # Database configuration
├── shared/                 # Shared types and utilities
├── migrations/             # Database migration files
└── docs/                   # Documentation
```

## Prerequisites

- Node.js ≥ 18 & npm
- PostgreSQL database
- AWS account (for S3 storage)
- Mapbox account (for location services)

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-org/fixer-app.git
cd fixer-app

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your configuration values

# 4. Set up the database
npm run db:push

# 5. Start the development server
npm run dev
# Application runs on http://localhost:5173
```

## Available Scripts

| Script                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start development server (frontend + backend) |
| `npm run build`         | Build for production                           |
| `npm start`             | Start production server                        |
| `npm test`              | Run test suite                                 |
| `npm run test:watch`    | Run tests in watch mode                        |
| `npm run test:coverage` | Generate test coverage report                  |
| `npm run db:push`       | Apply database migrations                      |
| `npm run db:studio`     | Open database studio                           |

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/fixer

# Session
SESSION_SECRET=your-super-secret-session-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ...

# Application
VITE_API_URL=http://localhost:5173/api
NODE_ENV=development
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Tests are located in `__tests__/` and use Jest with TypeScript support.

## Deployment

The application is designed to be deployed on platforms like Render, Fly.io, or similar services.

```bash
# Build for production
npm run build

# Start production server
npm start
```

Ensure all production environment variables are configured and the database is accessible.

## API Documentation

The API provides comprehensive endpoints for:

- **Authentication** - User registration, login, session management
- **User Management** - Profile management, account type switching
- **Job Management** - CRUD operations, search, filtering
- **Applications** - Job applications and hiring workflow
- **Payment Coordination** - User-controlled payment arrangements
- **Location Services** - GPS verification and geofencing
- **Admin Functions** - Platform management and analytics

For detailed API documentation, see `/docs/api-documentation.md`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and conventions
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

MIT © 2024 The Fixer Team