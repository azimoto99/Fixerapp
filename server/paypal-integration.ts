import paypal from '@paypal/checkout-server-sdk';
import payouts from '@paypal/payouts-sdk';

// Environment configuration
const environment = process.env.NODE_ENV === 'production' 
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!);

// PayPal client for payments
const client = new paypal.core.PayPalHttpClient(environment);

// PayPal client for payouts
const payoutClient = new payouts.core.PayPalHttpClient(environment);

// Validate required environment variables
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  throw new Error('PayPal credentials are required: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
}

// Error handling wrapper for PayPal API calls
async function handlePayPalError<T>(operation: () => Promise<T>, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`PayPal ${context} error:`, error);
    if (error instanceof Error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
    throw new Error(`Payment system error: ${context} failed`);
  }
}

/**
 * Create a PayPal order for job payment
 */
export async function createPayPalOrder(
  amount: number,
  currency: string = 'USD',
  jobId: string,
  description?: string
): Promise<{ orderId: string; approvalUrl: string }> {
  return handlePayPalError(async () => {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        description: description || `Payment for job ${jobId}`,
        custom_id: jobId,
        reference_id: jobId
      }],
      application_context: {
        return_url: `${process.env.APP_URL}/payment-success`,
        cancel_url: `${process.env.APP_URL}/payment-cancel`,
        brand_name: 'Fixer',
        locale: 'en-US',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    });

    const response = await client.execute(request);
    const order = response.result;
    
    // Find approval URL from links
    const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new Error('No approval URL returned from PayPal');
    }

    return {
      orderId: order.id!,
      approvalUrl
    };
  }, 'Order creation');
}

/**
 * Capture a PayPal order after approval
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  captureId: string;
  status: string;
  amount: number;
  currency: string;
}> {
  return handlePayPalError(async () => {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await client.execute(request);
    const order = response.result;
    
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture) {
      throw new Error('No capture found in PayPal response');
    }

    return {
      captureId: capture.id!,
      status: capture.status!,
      amount: parseFloat(capture.amount?.value || '0'),
      currency: capture.amount?.currency_code || 'USD'
    };
  }, 'Order capture');
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(orderId: string): Promise<any> {
  return handlePayPalError(async () => {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const response = await client.execute(request);
    return response.result;
  }, 'Order details retrieval');
}

/**
 * Create a payout to worker's PayPal account
 */
export async function createPayPalPayout(
  workerEmail: string,
  amount: number,
  currency: string = 'USD',
  jobId: string,
  description?: string
): Promise<{ payoutBatchId: string; payoutItemId: string }> {
  return handlePayPalError(async () => {
    const request = new payouts.payouts.PayoutsPostRequest();
    request.requestBody({
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}_${jobId}`,
        email_subject: 'Payment for completed job',
        email_message: description || `Payment for job ${jobId}`
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: amount.toFixed(2),
          currency: currency
        },
        receiver: workerEmail,
        note: description || `Payment for job ${jobId}`,
        sender_item_id: `job_${jobId}_${Date.now()}`
      }]
    });

    const response = await payoutClient.execute(request);
    const payout = response.result;
    
    const payoutItem = payout.items?.[0];
    if (!payoutItem) {
      throw new Error('No payout item found in PayPal response');
    }

    return {
      payoutBatchId: payout.batch_header?.payout_batch_id!,
      payoutItemId: payoutItem.payout_item_id!
    };
  }, 'Payout creation');
}

/**
 * Get payout details
 */
export async function getPayPalPayout(payoutBatchId: string): Promise<any> {
  return handlePayPalError(async () => {
    const request = new payouts.payouts.PayoutsGetRequest(payoutBatchId);
    const response = await payoutClient.execute(request);
    return response.result;
  }, 'Payout details retrieval');
}

/**
 * Refund a captured payment
 */
export async function refundPayPalPayment(
  captureId: string,
  amount?: number,
  currency: string = 'USD',
  reason?: string
): Promise<{ refundId: string; status: string }> {
  return handlePayPalError(async () => {
    const request = new paypal.payments.CapturesRefundRequest(captureId);
    request.requestBody({
      amount: amount ? {
        value: amount.toFixed(2),
        currency_code: currency
      } : undefined,
      note_to_payer: reason || 'Refund for your payment'
    });

    const response = await client.execute(request);
    const refund = response.result;

    return {
      refundId: refund.id!,
      status: refund.status!
    };
  }, 'Payment refund');
}

/**
 * Process escrow payment for marketplace
 */
export async function processMarketplacePayment(
  posterId: string,
  workerId: string,
  amount: number,
  jobId: string,
  workerEmail: string,
  platformFeePercentage: number = 0.05 // 5% platform fee
): Promise<{ 
  orderId: string; 
  approvalUrl: string; 
  platformFee: number; 
  workerAmount: number; 
}> {
  const platformFee = amount * platformFeePercentage;
  const workerAmount = amount - platformFee;

  const { orderId, approvalUrl } = await createPayPalOrder(
    amount,
    'USD',
    jobId,
    `Job payment - Platform fee: $${platformFee.toFixed(2)}, Worker payment: $${workerAmount.toFixed(2)}`
  );

  return {
    orderId,
    approvalUrl,
    platformFee,
    workerAmount
  };
}

export { client as paypalClient, payoutClient as paypalPayoutClient };
export default { client, payoutClient };