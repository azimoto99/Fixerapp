import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from './storage';
import { z } from 'zod';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// Job posting schema with payment validation
const jobPostingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(5000, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  paymentType: z.enum(['fixed', 'hourly']),
  paymentAmount: z.number().min(10, 'Minimum payment amount is $10').max(10000, 'Maximum payment amount is $10,000'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  dateNeeded: z.string().min(1, 'Date needed is required'),
  requiredSkills: z.array(z.string()).optional().default([]),
  equipmentProvided: z.boolean().optional().default(false),
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  estimatedHours: z.number().optional(),
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  tasks: z.array(z.any()).optional().default([]), // Allow tasks to be passed
  isTestJob: z.boolean().optional().default(false),
});

/**
 * CRITICAL FIX: Payment-First Job Posting
 * This endpoint ensures NO job is created until payment is successfully processed
 */
export async function createJobWithPaymentFirst(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Step 1: Validate all input data
    const validatedData = jobPostingSchema.parse(req.body);
    
    // Step 1.5: Validate job content for inappropriate material
    const { validateJobPosting, sanitizeJobContent, validateJobPayment, validateJobSkills } = await import('./utils/jobValidation');
    
    // Validate job content for inappropriate material
    const contentValidation = validateJobPosting(validatedData.title, validatedData.description, validatedData.category);
    if (!contentValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: contentValidation.reason,
        flaggedContent: contentValidation.flaggedContent
      });
    }
    
    // Validate payment amount
    const paymentValidation = validateJobPayment(
      validatedData.paymentAmount, 
      validatedData.paymentType,
      validatedData.estimatedHours
    );
    if (!paymentValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: paymentValidation.reason 
      });
    }
    
    // Validate required skills if provided
    if (validatedData.requiredSkills && validatedData.requiredSkills.length > 0) {
      const skillsValidation = validateJobSkills(validatedData.requiredSkills);
      if (!skillsValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          message: skillsValidation.reason,
          invalidSkills: skillsValidation.invalidSkills
        });
      }
    }
    
    // Sanitize content
    const sanitizedTitle = sanitizeJobContent(validatedData.title);
    const sanitizedDescription = sanitizeJobContent(validatedData.description);
    
    // Update validated data with sanitized content
    validatedData.title = sanitizedTitle;
    validatedData.description = sanitizedDescription;
    
    // Step 2: Calculate total amount (job posting fee + service fee)
    const jobPostingFee = 2.50; // $2.50 job posting fee
    const totalAmount = Math.round((validatedData.paymentAmount + jobPostingFee) * 100); // Convert to cents
    
    console.log(`Processing payment-first job posting for user ${req.user.id}`);
    console.log(`Total charge amount: $${totalAmount / 100}`);
    
    // Step 3: Get or create Stripe customer
    let customerId: string;
    try {
      const { getOrCreateStripeCustomer } = await import('./api/stripe-api');
      customerId = await getOrCreateStripeCustomer(req.user.id);
    } catch (customerError) {
      console.error('Failed to create Stripe customer:', customerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to set up payment processing',
        error: 'Customer creation failed'
      });
    }

    // Step 4: Process payment FIRST - NO job creation yet
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        customer: customerId,
        payment_method: validatedData.paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          purpose: 'job_posting_fee',
          user_id: req.user.id.toString(),
          job_title: validatedData.title,
          payment_amount: validatedData.paymentAmount.toString(),
          service_fee: '2.50',
          total_amount: (totalAmount / 100).toString()
        },
        description: `Job posting fee for: ${validatedData.title}`,
        receipt_email: req.user.email || undefined
      });

      console.log(`Payment processing initiated: ${paymentIntent.id} for user ${req.user.id}`);
      
    } catch (stripeError: any) {
      console.error('Payment failed for user', req.user.id, ':', stripeError.message);

      // Log detailed error for debugging
      console.error('Stripe error details:', {
        code: stripeError.code,
        type: stripeError.type,
        decline_code: stripeError.decline_code,
        payment_method: validatedData.paymentMethodId
      });

      // Payment failed - NO job should be created
      return res.status(400).json({
        success: false,
        message: 'Payment failed - job not posted',
        error: stripeError.message,
        code: stripeError.code,
        type: stripeError.type
      });
    }

    // Step 5: Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.error(`Payment status: ${paymentIntent.status} for payment ${paymentIntent.id} - Job not created`);

      // Handle different payment statuses
      let errorMessage = 'Payment was not successful - job not posted';
      if (paymentIntent.status === 'requires_action') {
        errorMessage = 'Payment requires additional authentication - please try again';
      } else if (paymentIntent.status === 'requires_payment_method') {
        errorMessage = 'Payment method was declined - please try a different card';
      } else if (paymentIntent.status === 'processing') {
        errorMessage = 'Payment is still processing - please wait and try again';
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
        paymentStatus: paymentIntent.status,
        paymentIntentId: paymentIntent.id
      });
    }

    console.log(`Payment successful: ${paymentIntent.id} (${totalAmount / 100} USD) - Creating job now`);

    // Step 6: Create payment record in database
    let paymentRecord;
    try {
      paymentRecord = await storage.createPayment({
        userId: req.user.id,
        amount: totalAmount / 100, // Convert back to dollars
        serviceFee: 2.5,
        type: 'job_posting_fee',
        status: 'completed',
        paymentMethod: 'card',
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        description: `Job posting fee for: ${validatedData.title}`,
        metadata: {
          purpose: 'job_posting_fee',
          job_title: validatedData.title,
          payment_amount: validatedData.paymentAmount
        }
      });

      console.log(`Payment record created: ${paymentRecord.id}`);
    } catch (paymentRecordError) {
      console.error('Failed to create payment record:', paymentRecordError);
      // Continue with job creation even if payment record fails
    }

    // Step 7: Payment successful - NOW create the job
    try {
      const jobData = {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        paymentType: validatedData.paymentType,
        paymentAmount: validatedData.paymentAmount,
        serviceFee: 2.5, // Standard service fee
        totalAmount: validatedData.paymentAmount + 2.5, // Payment amount + service fee
        location: validatedData.location,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        dateNeeded: new Date(validatedData.dateNeeded),
        requiredSkills: validatedData.requiredSkills || [],
        equipmentProvided: validatedData.equipmentProvided || false,
        estimatedHours: validatedData.estimatedHours,
        shiftStartTime: validatedData.shiftStartTime,
        shiftEndTime: validatedData.shiftEndTime,
        posterId: req.user.id,
        status: 'open' as const, // Job goes live immediately after successful payment
        datePosted: new Date()
      };

      const createdJob = await storage.createJob(jobData);
      
      if (!createdJob) {
        // Critical: Job creation failed AFTER successful payment
        // We need to refund the payment
        console.error('CRITICAL: Job creation failed after successful payment - initiating refund');

        try {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'job_creation_failed',
              user_id: req.user.id.toString(),
              original_amount: (totalAmount / 100).toString()
            }
          });

          console.log(`Refund initiated for failed job creation: ${paymentIntent.id}, refund: ${refund.id}`);

          // Update payment record to reflect refund
          if (paymentRecord) {
            try {
              await storage.updatePaymentStatus(paymentRecord.id, 'refunded', refund.id);
            } catch (updateError) {
              console.error('Failed to update payment record with refund:', updateError);
            }
          }

        } catch (refundError) {
          console.error('CRITICAL: Failed to process refund after job creation failure:', refundError);
          // This requires manual intervention - log for admin review
          console.error('MANUAL INTERVENTION REQUIRED: Payment succeeded but job creation failed and refund failed', {
            paymentIntentId: paymentIntent.id,
            userId: req.user.id,
            amount: totalAmount / 100,
            refundError: refundError.message
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Job creation failed after payment - refund initiated',
          paymentIntentId: paymentIntent.id
        });
      }

      // Link payment to job if payment record was created
      if (paymentRecord && createdJob) {
        try {
          await storage.updatePayment(paymentRecord.id, { jobId: createdJob.id });
          console.log(`Payment ${paymentRecord.id} linked to job ${createdJob.id}`);
        } catch (linkError) {
          console.error('Failed to link payment to job:', linkError);
          // Non-critical error, continue
        }
      }
      
      // Step 6: Create tasks if provided
      if (validatedData.tasks && validatedData.tasks.length > 0) {
        try {
          const taskPromises = validatedData.tasks.map(async (task: any, index: number) => {
            const taskData = {
              jobId: createdJob.id,
              description: task.description || `Task ${index + 1}`,
              position: task.position || index + 1,
              isOptional: task.isOptional || false,
              dueTime: task.dueTime ? new Date(task.dueTime) : undefined,
              location: task.location,
              latitude: task.latitude,
              longitude: task.longitude,
              bonusAmount: task.bonusAmount || 0,
              notes: task.notes
            };
            
            return await storage.createTask(taskData);
          });
          
          await Promise.all(taskPromises);
          console.log(`Created ${validatedData.tasks.length} tasks for job ${createdJob.id}`);
        } catch (taskError) {
          console.error('Error creating tasks for job:', taskError);
          // Don't fail the job creation if tasks fail
        }
      }
      
      console.log(`Job created successfully: ${createdJob.id} with payment: ${paymentIntent.id}`);

      // Step 8: Broadcast job pin update for real-time map updates
      try {
        const { webSocketService } = await import('./websocket-unified');
        if (webSocketService) {
          webSocketService.broadcastJobPinUpdate('added', createdJob);
        }
      } catch (wsError) {
        console.error('Failed to broadcast job pin update:', wsError);
        // Don't fail the job creation if WebSocket broadcast fails
      }

      // Step 9: Success - Job posted and payment processed
      res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        job: createdJob,
        payment: {
          paymentIntentId: paymentIntent.id,
          paymentRecordId: paymentRecord?.id,
          amountCharged: totalAmount / 100,
          serviceFee: 2.5,
          jobAmount: validatedData.paymentAmount,
          status: 'completed'
        },
        summary: {
          jobId: createdJob.id,
          title: createdJob.title,
          totalPaid: totalAmount / 100,
          paymentMethod: 'card',
          transactionId: paymentIntent.id
        }
      });
      
    } catch (jobCreationError) {
      console.error('Job creation failed after successful payment:', jobCreationError);
      
      // Initiate automatic refund
      try {
        await stripe.refunds.create({
          payment_intent: paymentIntent.id,
          reason: 'requested_by_customer'
        });
        console.log(`Automatic refund processed for payment: ${paymentIntent.id}`);
      } catch (refundError) {
        console.error('Failed to process automatic refund:', refundError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Job creation failed - payment refunded',
        paymentIntentId: paymentIntent.id
      });
    }
    
  } catch (validationError) {
    console.error('Job posting validation error:', validationError);
    
    return res.status(400).json({
      success: false,
      message: 'Invalid job posting data',
      errors: validationError instanceof z.ZodError ? validationError.errors : validationError
    });
  }
}

/**
 * Enhanced job update endpoint with payment verification
 */
export async function updateJobWithPaymentCheck(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const jobId = parseInt(req.params.id);
    const existingJob = await storage.getJob(jobId);
    
    if (!existingJob) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (existingJob.posterId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }
    
    // Only allow editing if job is in a valid state
    if (existingJob.status === 'completed' || existingJob.status === 'canceled') {
      return res.status(400).json({ 
        message: 'Cannot edit completed or canceled jobs',
        status: existingJob.status
      });
    }
    
    const updateData = req.body;
    const updatedJob = await storage.updateJob(jobId, updateData);
    
    res.json({
      success: true,
      job: updatedJob
    });
    
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update job' 
    });
  }
}