# Deployment Guide

This document provides information about deploying the application and handling health checks for autoscaling.

## Health Check Configuration

The application is configured with multiple health check mechanisms to ensure maximum uptime:

1. **Primary Health Check**: The application exposes a `/health` endpoint that returns a 200 OK response with server status information.

2. **Fallback Health Check**: If the main application fails, a fallback health check server will start automatically to keep the deployment healthy.

3. **Health Monitoring**: A background process continuously monitors the health check endpoint and takes corrective action if it stops responding.

## Deployment Configuration

- **Build Process**: The application uses `build-server-only.sh` to build only the server component for production.

- **Start Command**: The application uses `start.sh` as the entry point for production deployment.

- **Health Check Path**: The health check is configured at `/health` with a timeout of 10 seconds.

- **Autoscaling**: The application is configured for autoscaling with proper health checks.

## Files Relevant for Deployment

- `.replit.deployment`: Contains configuration for Replit Deployments including health check settings.

- `Procfile`: Specifies the command to run for deployment platforms that use Procfiles.

- `start.sh`: The main entry script that starts the application and health monitoring.

- `health-monitor.sh`: Background script that monitors the health endpoint and takes corrective action if needed.

- `dist/health-check.js`: Fallback health check server that ensures the health endpoint always responds.

## Deployment Process

1. Build the server: `./build-server-only.sh`
2. Copy static assets to dist/public if needed
3. Start the application: `./start.sh`

When deployed, the application will automatically handle health checks and maintain availability for autoscaling.

## Troubleshooting

If the application is failing health checks during autoscaling:

1. Check the logs for errors in the main application
2. Verify the `/health` endpoint is responding correctly
3. Ensure `health-monitor.sh` is running in the background
4. Verify the PORT environment variable is set correctly

The health monitoring system should automatically recover from most failures.