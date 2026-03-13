# Environment Configuration

Fixer expects its configuration from environment variables loaded before the server starts.

## Required Variables

### Core app

- `NODE_ENV`
- `SESSION_SECRET`

### Database and Supabase

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DATABASE_URL`

### Maps and payments

- `VITE_MAPBOX_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLIC_KEY`

## Optional Variables

- `APP_URL`
  Used by some Stripe Connect flows for callback URLs. In local development this is usually `http://localhost:5000`.
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `DATABASE_URL`
  Some older scripts and migrations still reference this legacy name. The running app uses `SUPABASE_DATABASE_URL`.

## Example `.env`

```bash
NODE_ENV=development
SESSION_SECRET=change-me

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_DATABASE_URL=

VITE_MAPBOX_ACCESS_TOKEN=

STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=

APP_URL=http://localhost:5000
SENDGRID_API_KEY=
```

## Startup Checks

The server currently validates these values at startup:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DATABASE_URL`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN`

If one of those is missing, the app exits during boot.

## Recommended Workflow

1. Copy `.env.example` to `.env`.
2. Fill in the required values.
3. Run `npm run db:push` if your schema changed.
4. Start the app with `npm run dev`.

## Security Notes

- Do not commit real secrets.
- Use test Stripe keys in development.
- Keep production values separate from local development.
- Rotate long-lived secrets such as `SESSION_SECRET` and API keys.
