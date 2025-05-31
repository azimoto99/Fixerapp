# Fixer - Gig Economy Platform: Updated Overview (May 2025)

## 1. Overview

Fixer is a comprehensive gig economy platform designed to connect job posters with skilled workers. It's a modern web application with mobile capabilities, featuring real-time location-based job matching, secure payment processing, and job lifecycle management.

## 2. Core Capabilities (Summary)

*   **User Management**: Dual account types (worker/poster), social authentication (Google, Facebook), profile management, location services, account verification.
*   **Job Posting & Management**: Detailed job creation, task management, multiple payment types, auto-accept options, status tracking.
*   **Location-Based Features**: Mapbox integration, proximity search, location verification, heat maps, address autocomplete.
*   **Payment Processing**: Stripe Connect integration, escrow system, worker payouts, service fees, multiple payment methods, refund system.
*   **Real-Time Features**: WebSocket messaging, push notifications, live location tracking, live status updates.
*   **Mobile Experience**: Responsive design, PWA support, Capacitor integration for native Android/iOS builds.
*   **Admin Panel**: User management, job moderation, financial oversight, support system, analytics.
*   **Support & Dispute System**: Support tickets, dispute resolution, refund processing.

## 3. Technical Architecture

### 3.1. Frontend
*   **Framework/Library**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS, Radix UI components, `index.css` for global styles.
*   **State Management**: Likely TanStack Query (React Query) based on dependencies, potentially context API/custom hooks.

### 3.2. Backend
*   **Framework**: Node.js with Express.js
*   **Language**: TypeScript (`tsx` for development, `esbuild` for production builds)
*   **API Style**: RESTful API

### 3.3. Database & Supabase Integration
*   **Primary Database**: PostgreSQL hosted on Supabase.
*   **ORM/Query Builder**: Drizzle ORM is used for backend database queries and schema management. The main data access logic is in `server/unified-storage.ts` which uses Drizzle.
*   **Schema Definition**: Database schema is defined in `shared/schema.ts` and utilized by Drizzle.
*   **Supabase JS Client**: The `@supabase/supabase-js` client is initialized in `server/db.ts`. It is likely used for Supabase-specific services such as:
    *   Authentication (Supabase Auth)
    *   Real-time features (Supabase Realtime)
    *   File Storage (Supabase Storage buckets)
*   **Session Management**: Express sessions are stored in the Supabase PostgreSQL database using `connect-pg-simple`, configured to use the Supabase connection pooler (port 6543).

### 3.4. Mobile
*   **Framework**: Capacitor is integrated for building native Android (and potentially iOS) applications from the web codebase.

### 3.5. Shared Code
*   The `shared/` directory, particularly `shared/schema.ts`, contains code (like Drizzle schema definitions and types) used by both the frontend and backend.

## 4. Key File Structure

### 4.1. Root Directory
*   `package.json`: Project dependencies and scripts.
*   `vite.config.ts`: Vite configuration for the frontend.
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `capacitor.config.ts`: Capacitor configuration for mobile builds.
*   `drizzle.config.ts`: Drizzle ORM configuration.
*   `server/`: Backend source code.
*   `client/`: Frontend source code.
*   `shared/`: Code shared between frontend and backend.
*   `public/`: Static assets served by Vite.

### 4.2. Frontend (`client/src/`)
*   `main.tsx`: Application entry point, mounts React app.
*   `App.tsx`: Main React application component, likely handles routing.
*   `pages/`: Directory for page-level components.
*   `components/`: Directory for reusable UI components.
*   `hooks/`: Custom React hooks.
*   `lib/`: Utility functions, API service calls, etc.
*   `types/`: Frontend-specific TypeScript definitions.
*   `assets/`: Static assets like images, fonts.

### 4.3. Backend (`server/`)
*   `index.ts`: Main entry point for the Express server.
*   `routes.ts`: Defines the primary API routes (a large file indicating many endpoints).
*   `api/`: Subdirectory for more specific API route handlers.
*   `db.ts`: Initializes the Drizzle ORM instance (connected to Supabase PostgreSQL) and the Supabase JS client.
*   `storage.ts`: Defines the `IStorage` interface for data operations.
*   `unified-storage.ts`: The primary implementation of `IStorage`, using Drizzle ORM for database interactions.
*   `auth.ts`: Handles authentication logic, likely integrating Passport.js and Supabase Auth.
*   `middleware/`: Custom Express middleware.
*   `websocket-service.ts`: Manages WebSocket connections.
*   `stripe-webhook-handler.ts`: Handles incoming Stripe webhooks.

### 4.4. Shared (`shared/`)
*   `schema.ts`: Contains Drizzle ORM schema definitions and TypeScript types for database tables.

## 5. Build and Development

*   **Development**: `npm run dev` (likely uses `vite` for frontend HMR and `tsx` for backend auto-reloading).
*   **Production Build**: `npm run build` (uses Vite to build the frontend and `esbuild` to compile the backend TypeScript to JavaScript for `dist/`).
*   **Start Production**: `npm run start` (runs the built backend from `dist/`).

## 6. Notes on Previous Documentation

This overview is based on a scan of the project structure and key files as of May 30, 2025. It supersedes previous architectural descriptions, particularly regarding the database setup which now clearly uses Drizzle ORM with Supabase PostgreSQL, rather than a full replacement of Drizzle with only the Supabase JS client for backend queries.

Further detailed documentation updates may be needed for specific modules (e.g., payment flows, detailed API endpoints, specific feature implementations).
