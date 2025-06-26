# Fixer 🛠️

Fixer is a gig-work platform that connects people who need help with various tasks to skilled individuals ready to assist. Whether it's a quick repair, a complex project, or just an extra pair of hands, Fixer makes finding and offering help straightforward and secure.

## Table of Contents

1. Overview
2. Tech Stack
3. Project Structure
4. Prerequisites
5. Local Development
6. Available Scripts
7. Environment Variables
8. Testing
9. Deployment
10. API Documentation
11. Contributing
12. License

---

## 1. Overview

Fixer provides:

- **User Profiles** – rich profiles with avatars, skills & reviews
- **Job Marketplace** – post jobs or apply to local gigs in seconds
- **Secure Payments** – powered by Stripe Connect & Payment Intents
- **Real-Time Messaging** – WebSocket-based in-app chat
- **Location Services** – Mapbox integration for geo-search & navigation
- **Admin Dashboard** – user, job & payment management with analytics

## 2. Tech Stack

| Layer            | Tech                                             |
| ---------------- | ------------------------------------------------ |
| Front-End (Web)  | React 18, Vite 5, TypeScript, Tailwind CSS       |
| Mobile           | React Native 0.72, Capacitor 7                   |
| Back-End         | Node.js 20, Express 4, Drizzle ORM, PostgreSQL   |
| Auth & Sessions  | NextAuth.js, Passport, Express-Session           |
| Payments         | Stripe SDK & Webhooks                            |
| Realtime         | `ws` (WebSocket server)                          |
| Storage          | AWS S3 (via @aws-sdk)                            |

## 3. Project Structure

```
Fixerapp/
├── client/        # React & shared RN components
├── server/        # Express API & business logic
├── android/       # Native Android (Capacitor wrapper)
├── docs/          # Additional documentation
├── migrations/    # Drizzle migration files
├── tests/         # Jest & integration tests
└── ...
```

## 4. Prerequisites

- Node.js ≥ 18 & npm (or yarn/pnpm)
- PostgreSQL database (local or cloud)
- Stripe & Supabase accounts (free tiers work)
- Android SDK / Xcode for mobile builds (optional)

## 5. Local Development

```bash
# 1. Clone the repo
$ git clone https://github.com/your-org/fixer-app.git
$ cd fixer-app

# 2. Install dependencies
$ npm install   # or yarn / pnpm

# 3. Configure env vars
$ cp .env.example .env
# fill in the required values (see Environment Variables section)

# 4. Run database migrations (optional for SQLite/Supabase)
$ npm run db:push

# 5. Start the dev server (web + API)
$ npm run dev
# Vite runs on http://localhost:5173 (configurable)
```

The Express server and Vite development server are started together through `tsx` and Vite's middleware, providing HMR and API routing in a single process.

## 6. Available Scripts

| Script             | Description                                    |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Start the development server (Vite + API)      |
| `npm run build`    | Production build (client + server bundle)      |
| `npm start`        | Start the compiled production server           |
| `npm test`         | Run the Jest test suite                        |
| `npm run test:watch` | Run tests in watch mode                      |
| `npm run test:coverage` | Generate coverage report                  |
| `npm run db:push`  | Apply Drizzle migrations                       |

## 7. Environment Variables

The application depends on several environment variables for third-party services and internal configuration. An `.env.example` file is provided as a template.

Key variables include (non-exhaustive):

- `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- `DATABASE_URL` (PostgreSQL connection string)
- `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLIC_KEY` / `STRIPE_WEBHOOK_SECRET`
- `SESSION_SECRET`
- `VITE_MAPBOX_ACCESS_TOKEN`

For a full list and detailed explanations, see `docs/environment-configuration.md`.

## 8. Testing

```bash
# Unit & integration tests
$ npm test

# Watch mode
$ npm run test:watch

# Coverage report (HTML in coverage/lcov-report)
$ npm run test:coverage
```

Tests are located in `__tests__/` and `tests/`. Jest is configured with TypeScript support and mocks for external services.

## 9. Deployment

A step-by-step deployment guide (Render / Fly.io / Docker) is available in `deployment-guide.md`. In short:

```bash
# Build production assets
$ npm run build

# Start server (uses dist/)
$ npm start
```

Ensure all production environment variables are set and the database is reachable. For Android/iOS builds, refer to `docs/android-build-guide.md`.

## 10. API Documentation

Comprehensive REST API docs (endpoints, examples, auth flows) live in `docs/api-documentation.md`.

## 11. Contributing

We welcome contributions! To get started:

1. Fork the repository & create a feature branch.
2. Follow the coding standards outlined in `.eslintrc` & project docs.
3. Write tests for new functionality and ensure `npm test` passes.
4. Submit a PR following the pull request template.

### Commit Style

We use Conventional Commits. Example:

```
feat(payments): add dispute handling endpoint
```

### Code Style & Linting

```bash
# Run eslint & prettier
$ npm run lint   # configure in package.json if not present
```

## 12. License

MIT © 2024 The Fixer Team