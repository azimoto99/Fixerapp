# Fixer

Fixer is a web-first gig marketplace for posting local jobs, discovering nearby work, coordinating tasks, messaging in real time, and handling payments through Stripe.

## What Is Active Today

- Frontend: Vite + React + TypeScript
- Backend: Express + TypeScript
- Data layer: Drizzle ORM against a Supabase/Postgres database
- Auth: Passport session auth
- Realtime: WebSockets for messaging and presence
- Mobile packaging: Capacitor Android project

The repo still contains Expo and React Native artifacts from earlier experiments. The maintained application path in this codebase is the React web app served by the Express server.

## Core Features

- Location-aware job discovery
- Job posting with task breakdowns
- Worker applications and poster workflows
- Stripe-backed payment and payout flows
- Realtime messaging
- Reviews, earnings, notifications, and admin tools
- Responsive UI that works on desktop and mobile browsers

## Prerequisites

- Node.js 18+
- npm
- A Postgres database exposed through the Supabase environment variables used by the app
- Stripe keys for payment flows

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Fill in the required values from [docs/environment-configuration.md](./docs/environment-configuration.md).

4. Push the schema:

```bash
npm run db:push
```

5. Start the app:

```bash
npm run dev
```

The app is served on `http://localhost:5000`.

## Verification

```bash
npm run check
npm run build
```

## Using Fixer

- Workers can browse nearby jobs, apply, message posters, and track earnings.
- Job posters can publish jobs, attach task lists, manage applicants, and complete payment steps.
- The primary mobile workflow is the responsive web app in a phone browser.
- Android packaging is available through Capacitor when needed.

## API Surface

- REST endpoints live under `/api`.
- Realtime messaging and presence use `/ws`.
- The main implementation lives in `server/routes.ts` and `server/api/`.

## Project Layout

```text
client/
  src/
    components/
    hooks/
    lib/
    pages/
server/
  api/
  routes.ts
  auth.ts
  db.ts
  database-storage.ts
shared/
  schema.ts
docs/
public/
migrations/
```

## Mobile Notes

- Capacitor is the maintained Android packaging path in this repo.
- Expo and React Native artifacts still exist, but they are not the primary development flow.

## Documentation

- [Environment Configuration](./docs/environment-configuration.md)
- [Android Build Guide](./docs/android-build-guide.md)
