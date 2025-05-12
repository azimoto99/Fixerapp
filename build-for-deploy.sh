#!/bin/bash

# Build the frontend with Vite
echo "Building frontend with Vite..."
npx vite build

# Build the backend with esbuild in CommonJS format
echo "Building backend with esbuild in CommonJS format..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=cjs --outdir=dist

echo "Build complete! Files are in the dist directory."