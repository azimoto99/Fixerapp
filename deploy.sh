#!/bin/bash

# Script to prepare for deployment

# Build the application
echo "Building application for deployment..."
npm run build

# Copy necessary files to the deployment directory
echo "Copying files to deployment directory..."
mkdir -p deploy
cp -r dist deploy/
cp package.json deploy/

# Create a simplified package.json for deployment that excludes Expo dependencies
cat > deploy/package.json << EOF
{
  "name": "rest-express-deploy",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@react-google-maps/api": "^2.20.6",
    "@stripe/react-stripe-js": "^3.7.0",
    "@stripe/stripe-js": "^7.3.0",
    "@tailwindcss/vite": "^4.1.3",
    "@tanstack/react-query": "^5.60.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.18.2",
    "input-otp": "^1.4.2",
    "jspdf": "^3.0.1",
    "leaflet": "^1.9.4",
    "leaflet.heat": "^0.2.0",
    "lucide-react": "^0.453.0",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.6",
    "passport": "^0.7.0",
    "passport-facebook": "^3.0.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-local": "^1.0.0",
    "qrcode": "^1.5.4",
    "react": "19.0.0",
    "react-day-picker": "^8.10.1",
    "react-dom": "19.0.0",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-leaflet": "^4.2.1",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "remixicon": "^4.6.0",
    "stripe": "^18.1.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  }
}
EOF

echo "Deployment preparation complete. The 'deploy' directory is ready for deployment."