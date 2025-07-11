# PayPal Integration Setup Guide

This guide will help you set up PayPal payment processing for the Fixer application.

## Prerequisites

1. PayPal Developer Account
2. PayPal Business Account (for live payments)
3. Node.js environment with the updated dependencies

## Step 1: PayPal Developer Account Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Sign in or create a PayPal Developer account
3. Create a new app:
   - Go to "My Apps & Credentials"
   - Click "Create App"
   - Choose "Default Application" 
   - Select "Merchant" features
   - Choose Sandbox for testing, Live for production

## Step 2: Get PayPal Credentials

After creating your app, you'll get:
- **Client ID**: Used for frontend PayPal SDK
- **Client Secret**: Used for server-side API calls
- **Webhook ID**: Used for webhook verification (optional)

## Step 3: Environment Variables

Add these to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id

# Frontend PayPal
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
```

## Step 4: Install Dependencies

The PayPal SDKs are already added to package.json:

```bash
npm install
```

## Step 5: Database Migration

Run the PayPal migration to update your database schema. The migration will:

1. ✅ Add PayPal fields to all tables
2. ✅ Migrate existing Square data to PayPal fields  
3. ✅ Update payment methods from "square" to "paypal"
4. ✅ Remove Square fields from database
5. ✅ Create indexes for better performance
6. ✅ Log migration completion

### Option 1: Using the Migration Script (Recommended)
```bash
node run-migration.js
```

### Option 2: Manual SQL Execution
```bash
psql -d your_database_name -f migrations/replace-stripe-with-paypal.sql
```

### Option 3: Using Drizzle Kit
```bash
npm run db:push
```

**Note**: The migration safely handles existing Square data by migrating it to PayPal fields before removing the Square columns.

## Step 6: PayPal Features

### Payment Flow
1. **Create Order**: Customer initiates payment
2. **Approve Order**: Customer approves payment via PayPal
3. **Capture Order**: Server captures the approved payment
4. **Payout**: Platform pays worker via PayPal payout

### Supported Operations
- ✅ Create and capture payments
- ✅ Marketplace payouts to workers
- ✅ Refunds
- ✅ Order tracking
- ✅ Escrow functionality

## Step 7: Testing

### Sandbox Testing
1. Use sandbox credentials from PayPal Developer Dashboard
2. Use PayPal sandbox test accounts for testing payments
3. Test payment flow end-to-end

### Test Accounts
PayPal provides test accounts for sandbox testing:
- Personal accounts (buyers)
- Business accounts (sellers)
- You can create custom test accounts in the Developer Dashboard

## Step 8: Production Deployment

1. Switch to Live credentials in PayPal Developer Dashboard
2. Update environment variables with Live credentials
3. Ensure your domain is added to PayPal app configuration
4. Test with small amounts first

## API Endpoints

### Payment Endpoints
- `POST /api/payments/create-order` - Create PayPal order
- `POST /api/payments/capture` - Capture approved order
- `POST /api/payments/refund` - Refund a payment
- `POST /api/payments/release` - Release escrow to worker

### Webhook Endpoints (Optional)
- `POST /api/paypal/webhook` - Handle PayPal webhooks

## Frontend Integration

The PayPal JavaScript SDK is loaded dynamically in the frontend:

```typescript
// PayPal button renders automatically
<PayPalPaymentForm 
  job={job} 
  onSuccess={handleSuccess} 
  onCancel={handleCancel} 
/>
```

## Security Considerations

1. **Never expose Client Secret**: Only use on server-side
2. **Webhook Verification**: Verify webhook signatures (if using webhooks)
3. **HTTPS Required**: PayPal requires HTTPS for production
4. **Input Validation**: Validate all payment amounts and parameters

## Troubleshooting

### Common Issues

1. **PayPal SDK not loading**
   - Check VITE_PAYPAL_CLIENT_ID is set
   - Verify network connectivity
   - Check browser console for errors

2. **Payment fails**
   - Verify PayPal credentials
   - Check PayPal Developer Dashboard for errors
   - Ensure amounts are valid (> 0)

3. **Payouts failing**
   - Verify recipient email is valid PayPal account
   - Check payout limits on your PayPal account
   - Ensure sufficient funds in your PayPal account

### Debug Mode
Set `NODE_ENV=development` to see detailed error logs.

## PayPal vs Stripe Differences

| Feature | PayPal | Stripe |
|---------|---------|---------|
| Setup Complexity | Medium | High |
| User Experience | Redirects to PayPal | Inline forms |
| Global Reach | 200+ countries | 40+ countries |
| Fees | 2.9% + $0.30 | 2.9% + $0.30 |
| Payouts | Built-in | Requires Connect |
| Refunds | Instant | Instant |

## Support

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal API Reference](https://developer.paypal.com/docs/api/)
- [PayPal Community](https://www.paypal-community.com/)

## Migration Notes

This setup replaces the previous Stripe/Square integration. Key changes:
- ✅ **Database schema**: All Square fields migrated to PayPal equivalents
- ✅ **Frontend components**: PayPal SDK integration with PayPalPaymentForm
- ✅ **Backend API**: PayPal REST API integration (server/paypal-integration.ts)
- ✅ **Environment variables**: Changed from Stripe/Square to PayPal
- ✅ **Code cleanup**: All Stripe/Square references removed from codebase
- ✅ **Test files**: Updated to use PayPal mocks instead of Stripe/Square

### Migration Path
1. **Original**: Stripe integration
2. **Intermediate**: Square integration (replaced Stripe)
3. **Current**: PayPal integration (replaced Square)

The migration properly handles data preservation during the Square → PayPal transition.