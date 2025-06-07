#!/bin/bash

echo "Testing Stripe Connect health endpoint..."
curl -v http://localhost:5000/api/stripe/connect/health

echo -e "\n\nTesting Stripe Connect create-account endpoint..."
curl -v -X POST http://localhost:5000/api/stripe/connect/create-account \
  -H "Content-Type: application/json" \
  -d '{}'
