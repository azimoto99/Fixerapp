# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fixer is a comprehensive gig-work platform that connects people who need help with various tasks to skilled workers. It's a full-stack application with advanced security features, location verification, and enterprise-grade functionality.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (both frontend + backend)
- `npm run build` - Build for production (Vite build + esbuild server)
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run typecheck:ci` - CI TypeScript checking (no emit, no pretty output)

### Database Operations
- `npm run db:push` - Apply database migrations using Drizzle

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth with secure cookies
- **Payments**: Stripe Connect & Payment Intents
- **File Storage**: AWS S3
- **Maps**: Mapbox API
- **Real-time**: WebSocket server
- **UI Components**: Radix UI + Lucide Icons

## Architecture

### Project Structure
- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared types and utilities
- `migrations/` - Database migration files
- `__tests__/` - Test files (Jest)

### Key Features
- **Multi-account Types**: Users can have Worker, Poster, and Enterprise accounts with the same email
- **Location Verification**: GPS-based verification with anti-spoofing measures
- **Real-time Communication**: WebSocket-based messaging and notifications
- **Payment Processing**: Stripe Connect integration with escrow system
- **Enterprise Features**: Bulk job posting, hub pins, position management

### Database Schema
The application uses Drizzle ORM with PostgreSQL. Key tables include:
- `users` - User accounts with multi-account type support
- `jobs` - Job postings with location and payment data
- `applications` - Job applications and hiring workflow
- `payments` - Payment processing and transaction history
- `messages` - Real-time messaging system
- `enterprise_businesses` - Enterprise account management
- `hub_pins` - Enterprise location markers

### Authentication & Security
- Session-based authentication using express-session
- Row Level Security (RLS) implemented for data protection
- Content filtering and moderation
- Location verification with fraud detection
- Stripe Connect for secure payment processing

## Development Guidelines

### Code Organization
- Frontend components are organized by feature in `client/src/components/`
- Backend API routes are in `server/api/`
- Shared types and schemas are in `shared/`
- Database operations use Drizzle ORM with typed schemas

### Key Patterns
- React components use TypeScript with proper typing
- API routes follow RESTful conventions
- Database queries use Drizzle's query builder
- Error handling is centralized with proper logging
- Real-time features use WebSocket connections

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- Stripe keys for payment processing
- AWS credentials for S3 storage
- Mapbox token for location services

## Testing Strategy

Tests are located in `__tests__/` and cover:
- API endpoint testing
- Integration tests for key workflows
- Location verification testing
- Payment processing edge cases
- Load testing scenarios

Use Jest with TypeScript support. Run `npm test` to execute the full test suite.