import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import { filterJobContent, validatePaymentAmount } from "./content-filter";
import { 
  insertUserSchema, 
  insertJobSchema, 
  insertApplicationSchema, 
  insertReviewSchema,
  insertTaskSchema,
  insertEarningSchema,
  insertPaymentSchema,
  insertBadgeSchema,
  insertUserBadgeSchema,
  JOB_CATEGORIES,
  SKILLS,
  BADGE_CATEGORIES
} from "@shared/schema";
import { setupAuth } from "./auth";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any, // Using a valid API version, casting to any to bypass typechecking
});

// Helper function to validate location parameters
const locationParamsSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius: z.coerce.number().default(2)
});

// Check if user is authenticated middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  // First, ensure session is properly loaded
  if (!req.session) {
    console.error("No session object found on request");
    return res.status(401).json({ message: "Session unavailable" });
  }
  
  // Enhanced session/cookie check
  const hasCookieExpired = req.session.cookie && req.session.cookie.maxAge <= 0;
  
  // Then check authentication status
  if (req.isAuthenticated() && req.user && !hasCookieExpired) {
    console.log(`User authenticated: ${req.user.id} (${req.user.username})`);
    return next();
  }
  
  // Log the authentication failure with detailed info
  console.log(`Authentication failed: isAuthenticated=${req.isAuthenticated()}, has session=${!!req.session}, has user=${!!req.user}, sessionID=${req.sessionID}`);
  
  // Add comprehensive debugging information
  if (req.session) {
    console.log(`Session data:`, {
      id: req.sessionID,
      cookie: req.session.cookie ? {
        maxAge: req.session.cookie.maxAge,
        originalMaxAge: req.session.cookie.originalMaxAge,
        expired: hasCookieExpired,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path
      } : null,
      passport: (req.session as any).passport || 'not set'
    });
  }
  
  // Always return a clear error message for authentication failures
  if (hasCookieExpired) {
    return res.status(401).json({ message: "Session expired, please login again" });
  }
  return res.status(401).json({ message: "Unauthorized - Please login again" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Create API router
  const apiRouter = express.Router();

  // Handle account type setting (always worker now)
  apiRouter.post("/set-account-type", async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.number(),
      provider: z.string().optional()
    });

    try {
      // Parse only userId (ignore accountType if provided, always use "worker")
      const { userId } = schema.parse(req.body);
      const accountType = "worker"; // Always set to worker
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let accountUser = user;
      
      // Check if the user already has worker account type
      if (user.accountType === accountType) {
        // Already has worker account type, just return the user
        console.log(`User ${userId} already has account type worker`);
      }
      // If user has any other account type (pending or poster), update it to worker
      else {
        try {
          // Update the user to worker account type
          const updatedUser = await storage.updateUser(userId, { accountType });
          
          if (!updatedUser) {
            return res.status(500).json({ message: "Failed to update user" });
          }
          
          accountUser = updatedUser;
          console.log(`Updated user ${userId} to worker account type`);
        } catch (error) {
          console.error("Error updating account type:", error);
          return res.status(500).json({ message: "Failed to update account type" });
        }
      }
      
      // If a user is not currently logged in, log them in
      if (!req.isAuthenticated()) {
        // Log the user in
        req.login(accountUser, (err) => {
          if (err) {
            return res.status(500).json({ message: "Failed to log in user" });
          }
          return res.status(200).json(accountUser);
        });
      } else {
        // Update session user
        if (req.user?.id !== accountUser.id) {
          req.login(accountUser, (err) => {
            if (err) {
              return res.status(500).json({ message: "Failed to update user session" });
            }
            return res.status(200).json(accountUser);
          });
        } else {
          return res.status(200).json(accountUser);
        }
      }
    } catch (error) {
      console.error("Error setting account type:", error);
      return res.status(400).json({ message: "Invalid input data" });
    }
  });

  // Categories and skills endpoints
  apiRouter.get("/categories", (_req: Request, res: Response) => {
    res.json(JOB_CATEGORIES);
  });
  
  // Get available skills
  apiRouter.get("/skills", (_req: Request, res: Response) => {
    res.json(SKILLS);
  });

  // User endpoints
  apiRouter.get("/users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't return passwords in response
      const safeUsers = users.map(user => {
        const { password, ...userData } = user;
        return userData;
      });
      
      res.json(safeUsers);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Only enforce authentication check if user is not completing their profile from social login
      if (req.isAuthenticated()) {
        // Ensure authenticated users can only update their own profile
        if (req.user.id !== id) {
          return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
        }
      }
      
      // Parse the user data, but allow the requiresProfileCompletion flag
      const { requiresProfileCompletion, ...standardFields } = req.body;
      const userData = insertUserSchema.partial().parse(standardFields);
      
      // Merge back the profileCompletion flag if it exists
      const dataToUpdate = requiresProfileCompletion !== undefined 
        ? { ...userData, requiresProfileCompletion } 
        : userData;
      
      const updatedUser = await storage.updateUser(id, dataToUpdate);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // User profile image endpoint
  apiRouter.post("/users/:id/profile-image", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is uploading their own profile image
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only upload your own profile image" 
        });
      }
      
      // Validate that imageData exists in request body
      const schema = z.object({
        imageData: z.string()
      });
      
      const { imageData } = schema.parse(req.body);
      
      const updatedUser = await storage.uploadProfileImage(id, imageData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // User skills endpoints
  apiRouter.post("/users/:id/skills", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is updating their own skills
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own skills" 
        });
      }
      
      // Validate that skills array exists in request body
      const schema = z.object({
        skills: z.array(z.string())
      });
      
      const { skills } = schema.parse(req.body);
      
      // Validate that all skills are in the predefined SKILLS list
      const invalidSkills = skills.filter(skill => !SKILLS.includes(skill));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ 
          message: `Invalid skills: ${invalidSkills.join(', ')}` 
        });
      }
      
      const updatedUser = await storage.updateUserSkills(id, skills);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Verify a user's skill (admin or job poster who has verified the skill)
  apiRouter.post("/users/:id/skills/:skill/verify", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const skill = req.params.skill;
      
      // Validate that the skill is in the predefined SKILLS list
      if (!SKILLS.includes(skill)) {
        return res.status(400).json({ message: `Invalid skill: ${skill}` });
      }
      
      // For now, only allow users to verify their own skills
      // In a production app, we would have an admin role or a job poster to verify skills
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only verify your own skills at this time" 
        });
      }
      
      // Get verification flag from request body, default to true
      const { verified = true } = req.body;
      
      const updatedUser = await storage.verifyUserSkill(id, skill, verified);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Get users with specific skills
  apiRouter.get("/users/with-skills", async (req: Request, res: Response) => {
    try {
      // Parse skills from query string, which could be a single skill or multiple skills
      const querySkills = req.query.skills;
      let skills: string[] = [];
      
      if (typeof querySkills === 'string') {
        skills = [querySkills];
      } else if (Array.isArray(querySkills)) {
        skills = querySkills.map(s => s.toString());
      }
      
      // Validate that all skills are in the predefined SKILLS list
      const invalidSkills = skills.filter(skill => !SKILLS.includes(skill));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ 
          message: `Invalid skills: ${invalidSkills.join(', ')}` 
        });
      }
      
      const users = await storage.getUsersWithSkills(skills);
      
      // Don't return passwords in response
      const safeUsers = users.map(user => {
        const { password, ...userData } = user;
        return userData;
      });
      
      res.json(safeUsers);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Stripe terms of service and representative endpoint
  apiRouter.post("/users/:id/stripe-terms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Stripe terms acceptance endpoint called');
      console.log('User in session:', req.user);
      console.log('isAuthenticated:', req.isAuthenticated());
      console.log('Session ID:', req.sessionID);
      
      const id = parseInt(req.params.id);
      console.log(`User ID from params: ${id}`);
      
      // Ensure the authenticated user is updating their own Stripe terms
      if (req.user && req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own Stripe terms" 
        });
      }
      
      // Validate request with all the representative information fields
      const schema = z.object({
        acceptTerms: z.boolean().optional(),
        representativeName: z.string().min(2).optional(),
        representativeTitle: z.string().min(2).optional(),
        // Additional fields for Stripe representative
        dateOfBirth: z.string().min(10).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).optional(),
        ssnLast4: z.string().length(4).optional(),
        streetAddress: z.string().min(3).optional(),
        aptUnit: z.string().optional(),
        city: z.string().min(2).optional(),
        state: z.string().min(2).optional(),
        zip: z.string().min(5).optional(),
        country: z.string().min(2).optional(),
        // Bank account information
        accountType: z.enum(["checking", "savings"]).optional(),
        accountNumber: z.string().min(4).optional(),
        routingNumber: z.string().length(9).optional(),
        accountHolderName: z.string().min(2).optional(),
      });
      
      const { 
        acceptTerms, 
        representativeName, 
        representativeTitle,
        dateOfBirth,
        email,
        phone,
        ssnLast4,
        streetAddress,
        aptUnit,
        city,
        state,
        zip,
        country,
        // Bank account information
        accountType,
        accountNumber,
        routingNumber,
        accountHolderName
      } = schema.parse(req.body);
      
      // Build the update object
      const updateData: any = {};
      
      if (acceptTerms) {
        updateData.stripeTermsAccepted = true;
        updateData.stripeTermsAcceptedAt = new Date();
      }
      
      if (representativeName) {
        updateData.stripeRepresentativeName = representativeName;
      }
      
      if (representativeTitle) {
        updateData.stripeRepresentativeTitle = representativeTitle;
      }
      
      // Store all the additional representative information
      // In a real application, you would send this directly to Stripe's API
      // Here we'll store it in user metadata to track that it was provided
      
      // Create a representative metadata object to store additional info
      const representativeMetadata: any = {};
      
      if (dateOfBirth) representativeMetadata.dateOfBirth = dateOfBirth;
      if (email) representativeMetadata.email = email;
      if (phone) representativeMetadata.phone = phone;
      if (ssnLast4) representativeMetadata.ssnLast4 = ssnLast4;
      
      // Create an address metadata object
      if (streetAddress || city || state || zip || country) {
        representativeMetadata.address = {
          line1: streetAddress,
          line2: aptUnit || '',
          city: city,
          state: state,
          postal_code: zip,
          country: country
        };
      }
      
      // Create bank account metadata if we have the required information
      const bankAccountMetadata: any = {};
      
      if (accountType && accountNumber && routingNumber && accountHolderName) {
        bankAccountMetadata.accountType = accountType;
        bankAccountMetadata.accountNumber = accountNumber;
        bankAccountMetadata.routingNumber = routingNumber;
        bankAccountMetadata.accountHolderName = accountHolderName;
        
        // Mark banking details as complete in our system
        updateData.stripeBankingDetailsComplete = true;
      }
      
      // If we collected representative metadata, store it and mark requirements as complete
      if (Object.keys(representativeMetadata).length > 0) {
        // This would be sent to Stripe in a real implementation
        console.log('Representative information to send to Stripe:', representativeMetadata);
        
        // Mark representative requirements as complete in our system
        updateData.stripeRepresentativeRequirementsComplete = true;
        
        // In a real implementation, you would call the Stripe API here to update
        // the representative information on the Connect account
        try {
          // This is where we would call Stripe API
          // const stripeAccount = await updateStripeAccountRepresentative(req.user.stripeConnectAccountId, representativeMetadata);
          
          // Update the local storage with Stripe's response
          updateData.stripeAccountUpdatedAt = new Date();
        } catch (stripeError) {
          console.error('Error updating Stripe account representative:', stripeError);
          // Continue with local updates even if Stripe update fails
          // In production, you might want to handle this differently
        }
      }
      
      // If we collected bank account information, log it and mark requirements as complete
      if (Object.keys(bankAccountMetadata).length > 0) {
        // This would be sent to Stripe in a real implementation
        console.log('Bank account information to send to Stripe:', {
          ...bankAccountMetadata,
          accountNumber: '******' + bankAccountMetadata.accountNumber.slice(-4) // Hide full account number in logs
        });
      }
      
      // Only proceed if we have something to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid data provided to update" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update Stripe Connect account with representative information if we have an account ID
      if (updatedUser.stripeConnectAccountId && stripe) {
        try {
          console.log(`Updating Stripe Connect account ${updatedUser.stripeConnectAccountId} with representative information`);
          
          // This is a simplified version. In a real app, you'd need to format the data
          // according to Stripe's API requirements
          if (representativeMetadata.address) {
            await stripe.accounts.update(updatedUser.stripeConnectAccountId, {
              individual: {
                first_name: representativeName?.split(' ')[0] || '',
                last_name: representativeName?.split(' ').slice(1).join(' ') || '',
                email: representativeMetadata.email,
                phone: representativeMetadata.phone,
                dob: {
                  day: new Date(representativeMetadata.dateOfBirth).getDate(),
                  month: new Date(representativeMetadata.dateOfBirth).getMonth() + 1,
                  year: new Date(representativeMetadata.dateOfBirth).getFullYear(),
                },
                ssn_last_4: representativeMetadata.ssnLast4,
                address: {
                  line1: representativeMetadata.address.line1,
                  line2: representativeMetadata.address.line2,
                  city: representativeMetadata.address.city,
                  state: representativeMetadata.address.state,
                  postal_code: representativeMetadata.address.postal_code,
                  country: representativeMetadata.address.country,
                },
              }
            });
          }
          
          // Add bank account if the information was provided
          if (Object.keys(bankAccountMetadata).length > 0) {
            try {
              // In a real implementation, this would call the Stripe API to create an external account
              // This is a simplification for educational purposes
              console.log(`Adding bank account to Stripe Connect account ${updatedUser.stripeConnectAccountId}`);
              
              // Create bank account token
              // NOTE: In production, you'd use Stripe.js to securely collect and tokenize bank account details
              // This is a server-side example for demonstration only
              const bankAccount = await stripe.tokens.create({
                bank_account: {
                  country: 'US',
                  currency: 'usd',
                  account_holder_name: bankAccountMetadata.accountHolderName,
                  account_holder_type: 'individual',
                  routing_number: bankAccountMetadata.routingNumber,
                  account_number: bankAccountMetadata.accountNumber,
                  account_type: bankAccountMetadata.accountType,
                },
              });
              
              // Attach the bank account to the Connect account
              if (bankAccount && bankAccount.id) {
                await stripe.accounts.createExternalAccount(
                  updatedUser.stripeConnectAccountId,
                  {
                    external_account: bankAccount.id,
                    default_for_currency: true,
                  }
                );
                console.log(`Bank account added successfully to Connect account ${updatedUser.stripeConnectAccountId}`);
              }
            } catch (bankError) {
              console.error('Error adding bank account to Stripe:', bankError);
              // Continue with response even if bank account creation fails
              // In production, you would want to handle this differently
            }
          }
        } catch (stripeError) {
          console.error('Error updating Stripe account:', stripeError);
          // Continue with response even if Stripe update fails
          // In production, you might want to handle this differently
        }
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      console.error("Error updating Stripe terms:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Update user metrics endpoint
  apiRouter.patch("/users/:id/metrics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the authenticated user is updating their own metrics
      // In a production app, this would be an admin-only or system update
      if (req.user.id !== id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own metrics" 
        });
      }
      
      // Validate metrics data
      const schema = z.object({
        completedJobs: z.number().optional(),
        successRate: z.number().min(0).max(100).optional(),
        responseTime: z.number().min(0).optional()
      });
      
      const metrics = schema.parse(req.body);
      
      const updatedUser = await storage.updateUserMetrics(id, metrics);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...updatedUserData } = updatedUser;
      res.json(updatedUserData);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Badge category endpoint
  apiRouter.get("/badge-categories", (_req: Request, res: Response) => {
    res.json(BADGE_CATEGORIES);
  });
  
  // Badge endpoints
  apiRouter.get("/badges", async (_req: Request, res: Response) => {
    try {
      const badges = await storage.getAllBadges();
      res.json(badges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.get("/badges/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      
      // Validate that the category is in the predefined BADGE_CATEGORIES
      if (!BADGE_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Invalid badge category: ${category}` });
      }
      
      const badges = await storage.getBadgesByCategory(category);
      res.json(badges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.get("/badges/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const badge = await storage.getBadge(id);
      
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      
      res.json(badge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/badges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // In a production app, this would be admin-only
      // For now, allow any authenticated user to create badges
      const badgeData = insertBadgeSchema.parse(req.body);
      
      const newBadge = await storage.createBadge(badgeData);
      res.status(201).json(newBadge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // User badge endpoints
  apiRouter.get("/users/:id/badges", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userBadges = await storage.getUserBadges(id);
      res.json(userBadges);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/users/:id/badges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // In a production app, this would be admin-only or based on achievements
      // For now, allow any authenticated user to award badges to themselves
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          message: "Forbidden: You can only award badges to yourself at this time" 
        });
      }
      
      // Validate badge data
      const schema = z.object({
        badgeId: z.number(),
        metadata: z.any().optional()
      });
      
      const { badgeId, metadata } = schema.parse(req.body);
      
      // Verify that the badge exists
      const badge = await storage.getBadge(badgeId);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }
      
      const userBadge = await storage.awardBadge({
        userId,
        badgeId,
        metadata: metadata || null
      });
      
      res.status(201).json(userBadge);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.delete("/users/:userId/badges/:badgeId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const badgeId = parseInt(req.params.badgeId);
      
      // In a production app, this would be admin-only
      // For now, allow any authenticated user to revoke their own badges
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          message: "Forbidden: You can only revoke badges from yourself at this time" 
        });
      }
      
      const success = await storage.revokeBadge(userId, badgeId);
      
      if (!success) {
        return res.status(404).json({ message: "Badge not found or already revoked" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Add extended schema for job with payment method
  const jobWithPaymentSchema = insertJobSchema.extend({
    paymentMethodId: z.string().optional()
  });

  // Job endpoints
  apiRouter.post("/jobs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Parse the request with the extended schema that includes paymentMethodId
      const { paymentMethodId, ...jobData } = jobWithPaymentSchema.parse(req.body);
      
      // Ensure the job poster ID matches the authenticated user
      if (jobData.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create jobs with your own user ID" 
        });
      }
      
      // Filter for prohibited or spammy content
      const contentFilterResult = filterJobContent(jobData.title, jobData.description);
      if (!contentFilterResult.isApproved) {
        return res.status(400).json({ 
          message: contentFilterResult.reason || "Your job post contains prohibited content."
        });
      }
      
      // Validate payment amount
      const paymentValidation = validatePaymentAmount(jobData.paymentAmount);
      if (!paymentValidation.isApproved) {
        return res.status(400).json({ 
          message: paymentValidation.reason || "The payment amount is invalid."
        });
      }
      
      // Allow any user to post jobs regardless of their account type (both workers and posters)
      // Service fee and total amount are calculated in storage.createJob
      const newJob = await storage.createJob(jobData);
      
      // For fixed price jobs with payment method ID, process payment upfront
      if (jobData.paymentType === 'fixed' && paymentMethodId) {
        try {
          // Calculate the total amount including the service fee
          const amountInCents = Math.round((jobData.paymentAmount + 2.50) * 100);
          
          // Create a payment intent with the payment method
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true, // Confirm the payment immediately
            confirmation_method: 'manual',
            metadata: {
              jobId: newJob.id.toString(),
              posterId: newJob.posterId.toString(),
              jobTitle: newJob.title,
              paymentAmount: newJob.paymentAmount.toString(),
              serviceFee: newJob.serviceFee.toString(),
              platform: "Fixer"
            },
            receipt_email: req.user.email,
            description: `Upfront payment for job: ${newJob.title}`
          });
          
          // Create a payment record
          await storage.createPayment({
            type: "job_payment_upfront",
            status: paymentIntent.status === "succeeded" ? "completed" : "pending",
            description: `Upfront payment for job: ${newJob.title}`,
            jobId: newJob.id,
            amount: newJob.totalAmount,
            userId: req.user.id,
            paymentMethod: "stripe",
            transactionId: paymentIntent.id,
            metadata: {
              clientSecret: paymentIntent.client_secret
            }
          });
          
          // Update the job with payment status if payment succeeded
          if (paymentIntent.status === "succeeded") {
            await storage.updateJob(newJob.id, { 
              paymentStatus: "paid"
            });
          }
        } catch (paymentError) {
          console.error("Error processing job payment:", paymentError);
          // We still return the created job even if payment processing fails
          // The payment can be handled separately later
        }
      }
      
      res.status(201).json(newJob);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/jobs", async (req: Request, res: Response) => {
    try {
      const { category, status, posterId, workerId, search } = req.query;
      
      const filters: {
        category?: string;
        status?: string;
        posterId?: number;
        workerId?: number;
        search?: string;
      } = {};
      
      if (category) filters.category = category.toString();
      if (status) filters.status = status.toString();
      if (posterId) filters.posterId = parseInt(posterId.toString());
      if (workerId) filters.workerId = parseInt(workerId.toString());
      if (search) filters.search = search.toString();
      
      const jobs = await storage.getJobs(filters);
      res.json(jobs);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/jobs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/jobs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first to check ownership
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Ensure the authenticated user is the job poster
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update jobs you posted" 
        });
      }
      
      const jobData = insertJobSchema.partial().parse(req.body);
      
      // Service fee and total amount are recalculated in storage.updateJob
      const updatedJob = await storage.updateJob(id, jobData);
      
      res.json(updatedJob);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.delete("/jobs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first to check ownership
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Ensure the authenticated user is the job poster
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only delete jobs you posted" 
        });
      }
      
      const success = await storage.deleteJob(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Nearby jobs endpoint
  apiRouter.get("/jobs/nearby/location", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius } = locationParamsSchema.parse(req.query);
      const jobs = await storage.getJobsNearLocation(latitude, longitude, radius);
      res.json(jobs);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Job completion endpoint for workers
  apiRouter.post("/jobs/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the job first
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only assigned workers can mark jobs as complete
      if (job.workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the assigned worker can mark a job as complete" 
        });
      }
      
      // Check if all tasks are complete
      const tasks = await storage.getTasksForJob(id);
      const allTasksComplete = tasks.length > 0 && tasks.every(task => task.isCompleted);
      
      if (!allTasksComplete) {
        return res.status(400).json({ 
          message: "All tasks must be completed before marking the job as complete" 
        });
      }
      
      // Update job status to completed
      const updatedJob = await storage.updateJob(id, { 
        status: "completed",
        completedAt: new Date()
      });
      
      // Check if payment has already been processed for this job
      const existingEarnings = await storage.getEarningsForJob(id);
      
      // Only create earnings if none exist yet
      if (existingEarnings.length === 0) {
        // Calculate earnings (minus service fee)
        const netAmount = job.paymentAmount - job.serviceFee;
        
        // Create earning record for the worker
        const earning = await storage.createEarning({
          jobId: job.id,
          workerId: job.workerId,
          amount: job.paymentAmount,
          serviceFee: job.serviceFee,
          netAmount: netAmount,
          status: "pending"
        });
        
        // If the worker has a Stripe Connect account, initiate transfer
        const worker = await storage.getUser(job.workerId);
        if (worker && worker.stripeConnectAccountId) {
          try {
            // Find the payment record for this job
            const payments = await storage.getPaymentsForUser(job.posterId);
            const jobPayment = payments.find(p => p.jobId === job.id && p.status === "completed");
            
            if (jobPayment) {
              // Create a transfer to the worker's Connect account
              const transfer = await stripe.transfers.create({
                amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                currency: 'usd',
                destination: worker.stripeConnectAccountId,
                transfer_group: `job-${job.id}`,
                metadata: {
                  jobId: job.id.toString(),
                  workerId: job.workerId.toString(),
                  earningId: earning.id.toString(),
                  paymentId: jobPayment.id.toString()
                },
                description: `Payment for job: ${job.title}`
              });
              
              console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
              
              // Update the earning record to mark it as paid
              await storage.updateEarningStatus(earning.id, 'paid', new Date());
            }
          } catch (transferError) {
            console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
            // We don't want to fail the job completion if payment transfer fails
            // The admin can manually transfer later
          }
        }
      }
      
      res.json(updatedJob);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Application endpoints
  apiRouter.post("/applications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const applicationData = insertApplicationSchema.parse(req.body);
      
      // Ensure the worker ID matches the authenticated user
      if (applicationData.workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only apply with your own user ID" 
        });
      }
      
      const newApplication = await storage.createApplication(applicationData);
      res.status(201).json(newApplication);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/applications/job/:jobId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Get the job to check if the user is the poster
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can see applications for their jobs
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view applications for jobs you posted" 
        });
      }
      
      const applications = await storage.getApplicationsForJob(jobId);
      res.json(applications);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/applications/worker/:workerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      
      // Users can only see their own applications
      if (workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own applications" 
        });
      }
      
      const applications = await storage.getApplicationsForWorker(workerId);
      res.json(applications);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/applications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get the related job
      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if the user is either the worker who applied or the job poster
      const isWorker = application.workerId === req.user.id;
      const isJobPoster = job.posterId === req.user.id;
      
      if (!isWorker && !isJobPoster) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update applications you created or received" 
        });
      }
      
      const applicationData = insertApplicationSchema.partial().parse(req.body);
      
      // Only job posters can change the status
      if (applicationData.status && !isJobPoster) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can change application status" 
        });
      }
      
      const updatedApplication = await storage.updateApplication(id, applicationData);
      res.json(updatedApplication);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Review endpoints
  apiRouter.post("/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      
      // Ensure the reviewer ID matches the authenticated user
      if (reviewData.reviewerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create reviews with your own user ID" 
        });
      }
      
      const newReview = await storage.createReview(reviewData);
      res.status(201).json(newReview);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const reviews = await storage.getReviewsForUser(userId);
      res.json(reviews);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/reviews/job/:jobId", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const reviews = await storage.getReviewsForJob(jobId);
      res.json(reviews);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Task endpoints
  apiRouter.get("/tasks/job/:jobId", async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const tasks = await storage.getTasksForJob(jobId);
      res.json(tasks);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      
      // Get the job to verify that the user is the job poster
      const job = await storage.getJob(taskData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can add tasks
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can add tasks" 
        });
      }
      
      const newTask = await storage.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get the related job
      const job = await storage.getJob(task.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user is the job poster or worker
      const isPoster = job.posterId === req.user.id;
      const isWorker = job.workerId === req.user.id;
      
      if (!isPoster && !isWorker) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster or worker can update tasks" 
        });
      }
      
      // Handle the update based on the user's role
      if (isPoster) {
        // Job posters can update any task details
        const taskData = insertTaskSchema.partial().parse(req.body);
        const updatedTask = await storage.updateTask(id, taskData);
        return res.json(updatedTask);
      } else {
        // Workers can only mark tasks as complete
        if (req.body.isCompleted === true) {
          const completedTask = await storage.completeTask(id, req.user.id);
          return res.json(completedTask);
        } else {
          return res.status(403).json({ 
            message: "Forbidden: Workers can only mark tasks as complete" 
          });
        }
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/tasks/reorder", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId, taskIds } = req.body;
      
      if (!jobId || !Array.isArray(taskIds)) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      // Get the job to verify that the user is the job poster
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters can reorder tasks
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only job posters can reorder tasks" 
        });
      }
      
      const reorderedTasks = await storage.reorderTasks(jobId, taskIds);
      res.json(reorderedTasks);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Earnings endpoints
  apiRouter.get("/earnings/worker/:workerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const workerId = parseInt(req.params.workerId);
      
      // Users can only access their own earnings
      if (workerId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own earnings" 
        });
      }
      
      const earnings = await storage.getEarningsForWorker(workerId);
      res.json(earnings);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.get("/earnings/job/:jobId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Get the job to check if the user is related to this job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only job posters or the assigned worker can see job earnings
      const isJobPoster = job.posterId === req.user.id;
      const isWorker = job.workerId === req.user.id;
      
      if (!isJobPoster && !isWorker) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster or assigned worker can view job earnings" 
        });
      }
      
      const earnings = await storage.getEarningsForJob(jobId);
      res.json(earnings);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/earnings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const earningData = insertEarningSchema.parse(req.body);
      
      // Get the job to check permission
      const job = await storage.getJob(earningData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job poster can create an earning record
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster can create earnings" 
        });
      }
      
      // Ensure the correct worker ID is used
      if (earningData.workerId !== job.workerId) {
        return res.status(400).json({ 
          message: "Worker ID does not match the worker assigned to this job" 
        });
      }
      
      const newEarning = await storage.createEarning(earningData);
      res.status(201).json(newEarning);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/earnings/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be 'pending', 'paid', or 'cancelled'." 
        });
      }
      
      // Only admin can update earning status (for future implementation)
      // For now, assume job poster can update status
      const earning = await storage.getEarning(id);
      if (!earning) {
        return res.status(404).json({ message: "Earning not found" });
      }
      
      const job = await storage.getJob(earning.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job poster can update earning status
      if (job.posterId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the job poster can update earning status" 
        });
      }
      
      let datePaid = undefined;
      let updatedEarning;
      
      if (status === 'paid') {
        datePaid = new Date();
        
        // Check if the worker has a Stripe Connect account for direct payment
        const worker = await storage.getUser(earning.workerId);
        if (!worker) {
          return res.status(404).json({ message: "Worker not found" });
        }
        
        if (worker.stripeConnectAccountId) {
          try {
            // Create a transfer to the worker's connected account
            const transfer = await stripe.transfers.create({
              amount: Math.round(earning.netAmount * 100), // Convert to cents
              currency: 'usd',
              destination: worker.stripeConnectAccountId,
              description: `Payment for job #${earning.jobId}: ${job.title}`,
              metadata: {
                earningId: earning.id.toString(),
                workerId: earning.workerId.toString(),
                jobId: earning.jobId.toString(),
                platform: "Fixer"
              }
            });
            
            // Create a payment record for the transfer
            await storage.createPayment({
              userId: earning.workerId,
              amount: earning.netAmount,
              type: "payout",
              status: "completed",
              paymentMethod: "stripe",
              transactionId: transfer.id,
              jobId: earning.jobId,
              description: `Payment for job #${earning.jobId}: ${job.title}`,
              metadata: { transferId: transfer.id }
            });
            
            // Update the earning with the payment date
            updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
            
            return res.json({
              earning: updatedEarning,
              transfer: {
                id: transfer.id,
                amount: earning.netAmount,
                status: 'paid'
              },
              message: "Payment successfully transferred to worker's account."
            });
          } catch (error) {
            console.error("Error processing Stripe transfer:", error);
            return res.status(400).json({ 
              message: `Failed to process payment: ${(error as Error).message}` 
            });
          }
        } else {
          // If worker doesn't have a Connect account, just mark as paid but include a message
          updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
          return res.json({
            earning: updatedEarning,
            message: "Payment marked as paid, but worker needs to set up a Stripe Connect account to receive funds automatically."
          });
        }
      } else {
        // For non-paid status updates, just update the status
        updatedEarning = await storage.updateEarningStatus(id, status, datePaid);
        return res.json(updatedEarning);
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Payment endpoints
  apiRouter.get("/payments/user/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own payments
      if (userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only view your own payments" 
        });
      }
      
      const payments = await storage.getPaymentsForUser(userId);
      res.json(payments);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Get individual payment details
  apiRouter.get("/payments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Users can only view payments they've made or received
      if (payment.userId !== req.user.id) {
        // Check if the payment is for a job and the user is the worker for that job
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (!job || job.workerId !== req.user.id) {
            return res.status(403).json({
              message: "Forbidden: You can only view payments you made or received"
            });
          }
        } else {
          return res.status(403).json({
            message: "Forbidden: You can only view payments you made or received"
          });
        }
      }
      
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.post("/payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      
      // Ensure the user ID matches the authenticated user
      if (paymentData.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only create payments with your own user ID" 
        });
      }
      
      // If job-related payment, validate permissions
      if (paymentData.jobId) {
        const job = await storage.getJob(paymentData.jobId);
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        // Check if user is related to the job
        const isJobPoster = job.posterId === req.user.id;
        const isWorker = job.workerId === req.user.id;
        
        if (!isJobPoster && !isWorker) {
          return res.status(403).json({ 
            message: "Forbidden: You must be related to the job to create this payment" 
          });
        }
      }
      
      const newPayment = await storage.createPayment(paymentData);
      res.status(201).json(newPayment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  apiRouter.patch("/payments/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, transactionId } = req.body;
      
      if (!status || !['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be 'pending', 'completed', or 'failed'." 
        });
      }
      
      // Get the payment to check ownership
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Users can only update their own payments
      if (payment.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only update your own payments" 
        });
      }
      
      const updatedPayment = await storage.updatePaymentStatus(id, status, transactionId);
      res.json(updatedPayment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Stripe payment processing endpoints
  apiRouter.post("/stripe/create-payment-intent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { jobId, amount } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      // Get the job to calculate payment amount if not provided
      const job = await storage.getJob(parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Allow any authenticated user to create payment intents for simplicity
      // In a production app, we would have stricter checks
      
      // Use the provided amount, or fall back to the job's payment amount
      const paymentAmount = amount || job.paymentAmount;
      
      // Calculate the amount in cents
      const amountInCents = Math.round(paymentAmount * 100);
      
      // Create a new payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        metadata: {
          jobId: job.id.toString(),
          userId: req.user.id.toString()
        }
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Stripe Connect endpoints for all users (both workers and job posters)
  apiRouter.post("/stripe/connect/create-account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Verify the user has a valid session - this is a safety fallback as isAuthenticated should already check
      if (!req.isAuthenticated() || !req.user) {
        console.error("User not authenticated in stripe/connect/create-account");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log("Creating Stripe Connect account for user ID:", req.user.id);
      
      // Fetch user directly from storage to ensure we have the latest data
      const storedUser = await storage.getUser(req.user.id);
      if (!storedUser) {
        console.error(`User ${req.user.id} not found in database`);
        return res.status(404).json({ message: "User not found in database" });
      }
      
      // Both workers and job posters can create Connect accounts
      // This allows users to both pay and receive payments
      
      // Check if the user already has a Connect account
      if (storedUser.stripeConnectAccountId) {
        console.log(`User ${req.user.id} already has Connect account: ${storedUser.stripeConnectAccountId}`);
        return res.status(400).json({ 
          message: "User already has a Stripe Connect account" 
        });
      }
      
      if (!storedUser.email) {
        console.error(`User ${req.user.id} has no email address`);
        return res.status(400).json({
          message: "User must have an email address to create a Stripe Connect account"
        });
      }
      
      console.log(`Creating Connect account for user ${req.user.id} with email: ${storedUser.email}`);
      
      // Test Stripe API connectivity before proceeding
      try {
        await stripe.balance.retrieve();
        console.log("Successfully connected to Stripe API");
      } catch (stripeError) {
        console.error("Stripe API connection test failed:", stripeError);
        return res.status(500).json({ 
          message: "Could not connect to Stripe API. Please check your credentials." 
        });
      }
      
      // Create a Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: storedUser.email,
        metadata: {
          userId: storedUser.id.toString(),
          platform: "Fixer"
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        },
        business_type: 'individual',
        business_profile: {
          url: `${process.env.APP_URL || 'https://fixer.replit.app'}/user/${storedUser.id}`,
          mcc: '7299', // Personal Services
          product_description: 'Gig economy services provided through Fixer platform'
        }
      });
      
      console.log("Stripe Connect account created:", account.id);
      
      // Update the user with the Connect account ID
      const updatedUser = await storage.updateUser(storedUser.id, {
        stripeConnectAccountId: account.id,
        stripeConnectAccountStatus: 'pending'
      });
      
      if (!updatedUser) {
        console.error("Failed to update user with Stripe Connect account ID");
        return res.status(500).json({ message: "Failed to update user with Connect account ID" });
      }
      
      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?refresh=true`,
        return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?success=true`,
        type: 'account_onboarding',
      });
      
      // Don't return the user's password
      const { password, ...userData } = updatedUser;
      
      // Return the account link URL and account details
      res.json({
        user: userData,
        account: {
          id: account.id,
        },
        accountLinkUrl: accountLink.url
      });
      
      console.log("Successfully created Stripe Connect account:", {
        accountId: account.id,
        accountLinkUrl: accountLink.url
      });
    } catch (error) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.get("/stripe/connect/account-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Both workers and job posters can access Connect account status
      // This allows all users to manage their Stripe Connect account
      
      // Check if the user has a Connect account
      if (!req.user.stripeConnectAccountId) {
        return res.status(404).json({ 
          message: "User does not have a Stripe Connect account" 
        });
      }
      
      // Retrieve the account details
      const account = await stripe.accounts.retrieve(req.user.stripeConnectAccountId);
      
      // Check if account needs more details for onboarding
      let accountLinkUrl = null;
      if (!account.details_submitted || !account.payouts_enabled) {
        // Create a new account link
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?refresh=true`,
          return_url: `${process.env.APP_URL || 'https://fixer.replit.app'}/profile?success=true`,
          type: 'account_onboarding',
        });
        accountLinkUrl = accountLink.url;
      }
      
      // Return sanitized account details
      res.json({
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        accountLinkUrl: accountLinkUrl,
        defaultCurrency: account.default_currency,
        country: account.country,
        accountStatus: account.details_submitted 
          ? (account.payouts_enabled ? 'active' : 'restricted') 
          : 'incomplete'
      });
    } catch (error) {
      console.error("Error retrieving Stripe Connect account:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/stripe/connect/create-login-link", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Both workers and job posters can access their Connect dashboard
      // This provides a unified experience for all users
      
      // Check if the user has a Connect account
      if (!req.user.stripeConnectAccountId) {
        return res.status(404).json({ 
          message: "User does not have a Stripe Connect account" 
        });
      }
      
      // Create a login link to access the Connect dashboard
      const loginLink = await stripe.accounts.createLoginLink(
        req.user.stripeConnectAccountId
      );
      
      res.json({ 
        url: loginLink.url,
        accountLinkUrl: loginLink.url  // For consistent field naming with other endpoints
      });
    } catch (error) {
      console.error("Error creating Stripe Connect login link:", error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  apiRouter.post("/stripe/confirm-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { paymentId, paymentIntentId } = req.body;
      
      if (!paymentId || !paymentIntentId) {
        return res.status(400).json({ 
          message: "Payment ID and payment intent ID are required" 
        });
      }
      
      // Retrieve the payment from our database
      const payment = await storage.getPayment(parseInt(paymentId));
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Check if the user is authorized to confirm this payment
      if (payment.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only confirm your own payments" 
        });
      }
      
      // Verify the payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === "succeeded") {
        // Update our payment record to completed
        const updatedPayment = await storage.updatePaymentStatus(
          payment.id, 
          "completed", 
          paymentIntent.id
        );
        
        // If this is a job payment, also create an earning record for the worker
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (job && job.workerId) {
            // Create an earning record for the worker
            // Calculate the net amount (payment amount minus service fee)
            const netAmount = job.paymentAmount - job.serviceFee;
            
            await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount, // Base amount without service fee
              serviceFee: job.serviceFee, // Service fee amount
              netAmount: netAmount, // Net amount after service fee
              description: `Payment for job: ${job.title}`
            });
          }
        }
        
        res.json({ success: true, payment: updatedPayment });
      } else {
        // Payment intent is not succeeded
        res.status(400).json({ 
          message: `Payment not successful. Status: ${paymentIntent.status}` 
        });
      }
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Webhook endpoint to handle Stripe events
  app.post("/webhook/stripe", express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      // Parse the event - with or without webhook secret
      let event;
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // If we have a webhook secret, verify the signature
        event = stripe.webhooks.constructEvent(
          req.body, 
          sig as string, 
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Without webhook secret, just parse the event
        event = JSON.parse(req.body.toString());
      }
      
      // Handle different payment events
      if (event.type === 'payment_intent.succeeded') {
        await handleSuccessfulPayment(event.data.object);
      } 
      else if (event.type === 'payment_intent.payment_failed') {
        await handleFailedPayment(event.data.object);
      }
      else if (event.type === 'payment_intent.canceled') {
        await handleCanceledPayment(event.data.object);
      }
      // Connect account events 
      else if (event.type === 'account.updated') {
        await handleConnectAccountUpdate(event.data.object);
      }
      else if (event.type === 'account.application.authorized') {
        await handleConnectAccountAuthorized(event.data.object);
      }
      else if (event.type === 'account.application.deauthorized') {
        await handleConnectAccountDeauthorized(event.data.object);
      }
      else if (event.type === 'transfer.created' || event.type === 'transfer.paid') {
        await handleTransferEvent(event.data.object, event.type);
      }
      
      // Return success response
      res.json({received: true});
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
  });
  
  // Helper function to handle successful payments
  async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId, metadata } = paymentIntent;
    
    try {
      // Find the payment in our database by transaction ID
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Payment record exists, update its status
        await storage.updatePaymentStatus(payment.id, 'completed', paymentIntentId);
        console.log(`Payment ${payment.id} marked as completed via webhook`);
        
        // If this is a job payment, also create an earning record for the worker
        if (payment.jobId) {
          const job = await storage.getJob(payment.jobId);
          if (job && job.workerId) {
            // Check if we already have an earning record
            const existingEarnings = await storage.getEarningsForJob(job.id);
            const hasEarning = existingEarnings.some(e => e.workerId === job.workerId);
            
            if (!hasEarning) {
              // Calculate the net amount (payment amount minus service fee)
              const netAmount = job.paymentAmount - job.serviceFee;
              
              const earning = await storage.createEarning({
                jobId: job.id,
                workerId: job.workerId,
                amount: job.paymentAmount,
                serviceFee: job.serviceFee,
                netAmount: netAmount
              });
              
              console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
              
              // Get the worker to check if they have a Stripe Connect account
              const worker = await storage.getUser(job.workerId);
              
              // If the worker has a Stripe Connect account, transfer the payment to them
              if (worker && worker.stripeConnectAccountId) {
                try {
                  // Create a transfer to the worker's Connect account
                  const transfer = await stripe.transfers.create({
                    amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                    currency: 'usd',
                    destination: worker.stripeConnectAccountId,
                    transfer_group: `job-${job.id}`,
                    metadata: {
                      jobId: job.id.toString(),
                      workerId: job.workerId.toString(),
                      earningId: earning.id.toString(),
                      paymentId: payment.id.toString()
                    },
                    description: `Payment for job: ${job.title}`
                  });
                  
                  console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
                  
                  // Update the earning record to mark it as paid
                  await storage.updateEarningStatus(earning.id, 'paid', new Date());
                } catch (transferError) {
                  console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
                  // We don't want to fail the whole transaction if the transfer fails
                  // The admin can manually transfer later
                }
              } else {
                console.log(`Worker ${job.workerId} doesn't have a Stripe Connect account yet. Funds will be held by the platform.`);
              }
            }
          }
        }
      } else if (metadata && metadata.jobId) {
        // Payment record doesn't exist yet, but we have job info
        // This could happen if the client closed before the payment was confirmed
        const jobId = parseInt(metadata.jobId);
        const job = await storage.getJob(jobId);
        
        if (job) {
          // Create a payment record
          const createdPayment = await storage.createPayment({
            type: "job_payment",
            status: "completed",
            description: `Payment for job: ${job.title}`,
            jobId: job.id,
            amount: job.totalAmount,
            userId: job.posterId,
            paymentMethod: "stripe",
            transactionId: paymentIntentId,
            metadata: {
              clientSecret: paymentIntent.client_secret
            }
          });
          
          console.log(`Created payment record ${createdPayment.id} from webhook`);
          
          // Create earning for worker if assigned
          if (job.workerId) {
            const netAmount = job.paymentAmount - job.serviceFee;
            
            const earning = await storage.createEarning({
              jobId: job.id,
              workerId: job.workerId,
              amount: job.paymentAmount,
              serviceFee: job.serviceFee,
              netAmount: netAmount
            });
            
            console.log(`Earning created for worker ${job.workerId} for job ${job.id}`);
            
            // Get the worker to check if they have a Stripe Connect account
            const worker = await storage.getUser(job.workerId);
            
            // If the worker has a Stripe Connect account, transfer the payment to them
            if (worker && worker.stripeConnectAccountId) {
              try {
                // Create a transfer to the worker's Connect account
                const transfer = await stripe.transfers.create({
                  amount: Math.round(netAmount * 100), // Convert to cents for Stripe
                  currency: 'usd',
                  destination: worker.stripeConnectAccountId,
                  transfer_group: `job-${job.id}`,
                  metadata: {
                    jobId: job.id.toString(),
                    workerId: job.workerId.toString(),
                    earningId: earning.id.toString(),
                    paymentId: createdPayment.id.toString()
                  },
                  description: `Payment for job: ${job.title}`
                });
                
                console.log(`Successfully transferred $${netAmount} to worker ${job.workerId} (Connect account: ${worker.stripeConnectAccountId})`);
                
                // Update the earning record to mark it as paid
                await storage.updateEarningStatus(earning.id, 'paid', new Date());
              } catch (transferError) {
                console.error(`Error transferring to Connect account: ${(transferError as Error).message}`);
                // We don't want to fail the whole transaction if the transfer fails
                // The admin can manually transfer later
              }
            } else {
              console.log(`Worker ${job.workerId} doesn't have a Stripe Connect account yet. Funds will be held by the platform.`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error handling successful payment: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle failed payments
  async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId } = paymentIntent;
    
    try {
      // Find the payment in our database
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Update the payment status to failed
        await storage.updatePaymentStatus(payment.id, 'failed', paymentIntentId);
        console.log(`Payment ${payment.id} marked as failed via webhook`);
      }
    } catch (error) {
      console.error(`Error handling failed payment: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle canceled payments
  async function handleCanceledPayment(paymentIntent: Stripe.PaymentIntent) {
    const { id: paymentIntentId } = paymentIntent;
    
    try {
      // Find the payment in our database
      const payment = await storage.getPaymentByTransactionId(paymentIntentId);
      
      if (payment) {
        // Update the payment status to canceled
        await storage.updatePaymentStatus(payment.id, 'canceled', paymentIntentId);
        console.log(`Payment ${payment.id} marked as canceled via webhook`);
      }
    } catch (error) {
      console.error(`Error handling canceled payment: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle Connect account updates
  async function handleConnectAccountUpdate(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status based on the Connect account details
      const accountStatus = getConnectAccountStatus(account);
      
      // Update the user in the database with the new status
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: accountStatus
      });
      
      console.log(`Updated Connect account status for user ${user.id} to ${accountStatus}`);
    } catch (error) {
      console.error(`Error handling Connect account update: ${(error as Error).message}`);
    }
  }
  
  // Helper function to determine Connect account status
  function getConnectAccountStatus(account: Stripe.Account): string {
    // Check if the account is fully onboarded
    if (account.charges_enabled && account.payouts_enabled) {
      return 'active';
    }
    
    // Check if the account is disabled
    if (account.requirements?.disabled_reason) {
      return 'disabled';
    }
    
    // Check if the account has pending requirements
    if (account.requirements?.currently_due?.length > 0) {
      return 'incomplete';
    }
    
    // Default status if we can't determine
    return 'pending';
  }
  
  // Helper function to handle Connect account authorization
  async function handleConnectAccountAuthorized(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status in the database
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: 'active'
      });
      
      console.log(`Connect account for user ${user.id} is now authorized`);
    } catch (error) {
      console.error(`Error handling Connect account authorization: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle Connect account deauthorization
  async function handleConnectAccountDeauthorized(account: Stripe.Account) {
    try {
      // Find the user with this Connect account ID
      const users = await storage.getAllUsers();
      const user = users.find(u => u.stripeConnectAccountId === account.id);
      
      if (!user) {
        console.error(`No user found with Stripe Connect account ID: ${account.id}`);
        return;
      }
      
      // Update the user's account status in the database
      await storage.updateUser(user.id, {
        stripeConnectAccountStatus: 'deauthorized'
      });
      
      console.log(`Connect account for user ${user.id} has been deauthorized`);
    } catch (error) {
      console.error(`Error handling Connect account deauthorization: ${(error as Error).message}`);
    }
  }
  
  // Helper function to handle transfer events (payout to worker)
  async function handleTransferEvent(transfer: Stripe.Transfer, eventType: string) {
    try {
      // Extract metadata from transfer (job ID, worker ID, earning ID)
      const { jobId, workerId, earningId } = transfer.metadata || {};
      
      if (!jobId || !workerId || !earningId) {
        console.log(`Transfer ${transfer.id} doesn't have required metadata, ignoring`);
        return;
      }
      
      // Parse IDs to integers
      const jobIdInt = parseInt(jobId);
      const workerIdInt = parseInt(workerId);
      const earningIdInt = parseInt(earningId);
      
      // Get the earning record
      const earning = await storage.getEarning(earningIdInt);
      
      if (!earning) {
        console.error(`No earning found with ID: ${earningIdInt}`);
        return;
      }
      
      // Update the earning status based on the transfer event
      if (eventType === 'transfer.paid') {
        // Transfer has been paid out to the worker's bank account
        await storage.updateEarningStatus(earningIdInt, 'paid', new Date());
        console.log(`Earning ${earningIdInt} for job ${jobIdInt} marked as paid via webhook`);
      } else if (eventType === 'transfer.created') {
        // Transfer has been created but not yet paid out
        await storage.updateEarningStatus(earningIdInt, 'processing');
        console.log(`Earning ${earningIdInt} for job ${jobIdInt} marked as processing via webhook`);
      }
    } catch (error) {
      console.error(`Error handling transfer event: ${(error as Error).message}`);
    }
  }

  // Mount the API router under /api prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
