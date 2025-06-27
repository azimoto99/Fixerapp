import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { DbUser, InsertUser } from "@shared/schema";
import MemoryStore from "memorystore";

// Extend the session data type with our custom properties
declare module 'express-session' {
  interface SessionData {
    accountType?: 'worker' | 'poster';
    userId?: number;
    loginTime?: string;
    passport?: {
      user: number;
    };
  }
}

declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('Setting up authentication with session store');
  console.log('Database URL available:', !!process.env.DATABASE_URL);
  
  // Create the session store
  let sessionStore;
  if (storage.sessionStore) {
    console.log('Using database session store');
    sessionStore = storage.sessionStore;
  } else {
    console.log('Using memory session store');
    sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || (() => {
      // Generate a random session secret if not provided
      const randomSecret = randomBytes(32).toString('hex');
      console.warn('⚠️ No SESSION_SECRET environment variable set! Using generated random secret.');
      console.warn('⚠️ This is insecure for production. Set SESSION_SECRET in your environment.');
      
      // Exit with error in production mode if SESSION_SECRET is not set
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ SESSION_SECRET must be set in production mode!');
        process.exit(1);
      }
      
      return randomSecret;
    })(),
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: isProduction,
      sameSite: 'lax',
      httpOnly: true,
    },
  };

  // Trust the first proxy
  app.set("trust proxy", 1);
  
  // Add session middleware
  app.use(session(sessionSettings));
  
  // Add simple session middleware to ensure cookie settings are correct
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.cookie) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }
    next();
  });
  
  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, username, password, done) => {
      try {
        // Only worker accounts exist now, so just get the user by username
        let user = await storage.getUserByUsername(username);
        
        // If exact match failed, try case-insensitive match
        if (!user) {
          // Make login case-insensitive by converting username to lowercase
          const lowerUsername = username.toLowerCase();
          
          // Use database query for case-insensitive search instead of fetching all users
          user = await storage.getUserByUsernameInsensitive(lowerUsername);
        }
        
        if (!user) {
          return done(null, false, { message: "No account found with this username" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User not found or database timeout - destroy session
        console.log(`User ${id} no longer exists, destroying session`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error(`Error deserializing user ${id}:`, err);
      // On database errors, fail authentication but don't crash
      done(null, false);
    }
  });

  // Register a new user
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    console.log('🔄 Starting registration process for:', req.body.username);
    const startTime = Date.now();
    
    // Set a request timeout of 25 seconds to prevent hanging
    const timeout = setTimeout(() => {
      console.error('⚠️ Registration request timed out after 25 seconds for:', req.body.username);
      if (!res.headersSent) {
        res.status(408).json({ message: "Request timed out. Please try again." });
      }
    }, 25000);
    
    try {
      const { username, email, password: rawPassword, fullName } = req.body;

      // Validate required fields
      if (!username || !email || !rawPassword || !fullName) {
        return res.status(400).json({
          message: "Missing required fields. Username, email, password, and full name are required."
        });
      }

      console.log('⏱️ Basic validation passed after:', Date.now() - startTime, 'ms');

      // Import content moderation
      const { validateUsername, validateFullName, logModerationEvent, suggestAlternativeUsernames } = await import('./utils/contentModeration');

      console.log('⏱️ Content moderation imported after:', Date.now() - startTime, 'ms');

      // Validate username content
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        // Log the moderation event
        logModerationEvent('username', username, usernameValidation, undefined, req.ip);

        // Provide suggestions for inappropriate usernames
        const suggestions = suggestAlternativeUsernames(username);
        return res.status(400).json({
          message: usernameValidation.reason,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          severity: usernameValidation.severity
        });
      }

      console.log('⏱️ Username validation passed after:', Date.now() - startTime, 'ms');

      // Validate full name content
      const fullNameValidation = validateFullName(fullName);
      if (!fullNameValidation.isValid) {
        // Log the moderation event
        logModerationEvent('fullName', fullName, fullNameValidation, undefined, req.ip);

        return res.status(400).json({
          message: fullNameValidation.reason,
          severity: fullNameValidation.severity
        });
      }

      console.log('⏱️ Full name validation passed after:', Date.now() - startTime, 'ms');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Validate password
      if (rawPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Check if the username is already taken
      console.log('⏱️ Checking username availability after:', Date.now() - startTime, 'ms');
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      console.log('⏱️ Hashing password after:', Date.now() - startTime, 'ms');
      const hashedPassword = await hashPassword(rawPassword);
      
      // Create a user with the specified account type
      const userData = {
        username,
        email,
        password: hashedPassword,
        fullName: req.body.fullName || username,
        phone: req.body.phone || null,
        bio: req.body.bio || null,
        avatarUrl: req.body.avatarUrl || null,
        accountType: req.body.accountType || "worker", // Use the provided account type, default to worker
        skills: req.body.skills || [],
        isActive: true,
        location: req.body.location || null,
        googleId: null,
        facebookId: null
      };

      console.log('⏱️ Creating user in database after:', Date.now() - startTime, 'ms');
      const user = await storage.createUser(userData);

      // Validate that user creation was successful
      if (!user || !user.id) {
        console.error('User creation failed - no user or user.id returned');
        return res.status(500).json({ message: "Failed to create user account" });
      }

      console.log('⏱️ User created successfully after:', Date.now() - startTime, 'ms');

      // Generate email verification token (valid 24h)
      const token = (await import('crypto')).randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      console.log('⏱️ Updating user with verification token after:', Date.now() - startTime, 'ms');
      await storage.updateUser(user.id, {
        verificationToken: token,
        verificationTokenExpiry: expiry
      });

      console.log('⏱️ Starting login process after:', Date.now() - startTime, 'ms');

      // Build verification URL and e-mail HTML
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/verify-email?token=${token}`;
      const emailHtml = `
        <p>Hi ${user.fullName},</p>
        <p>Welcome to Fixer! Please confirm your e-mail address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify my e-mail</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, you can safely ignore this e-mail.</p>
      `;

      // Fire-and-forget email so the client doesn't wait
      (async () => {
        try {
          const { sendEmail } = await import('./utils/email.js');
          await sendEmail(user.email, 'Confirm your Fixer account', emailHtml);
        } catch (e) {
          console.error('Email send failure (non-blocking):', e);
        }
      })();

      // Automatically establish a session so the existing React flow (which expects
      // an authenticated user with an `id`) keeps working.
      req.login(user as any, (err) => {
        if (err) {
          console.error('Auto-login after registration failed:', err);
          return res.status(201).json({
            message: 'Registration succeeded but automatic login failed. Please sign in manually.',
          });
        }

        console.log('⏱️ Login successful, saving session after:', Date.now() - startTime, 'ms');

        // Save session then return the user payload (without password)
        req.session.save(() => {
          console.log('⏱️ Session saved, sending response after:', Date.now() - startTime, 'ms');
          const { password, ...sanitized } = user as any;
          res.status(201).json({
            ...sanitized,
            message: 'Registration successful. Please verify your e-mail.',
          });
        });
      });
    } catch (error) {
      console.error('⚠️ Registration error after:', Date.now() - startTime, 'ms', error);
      res.status(400).json({ message: (error as Error).message });
    } finally {
      clearTimeout(timeout);
    }
  });

  // Simple login endpoint (blocks unverified e-mail)
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      
      // Block login if e-mail not verified
      if (!(user as any).emailVerified) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Email not verified – bypassing because NODE_ENV is not production');
        } else {
          return res.status(401).json({ message: 'Please verify your e-mail before logging in.' });
        }
      }

      // Store user ID as backup in case passport session gets corrupted
      req.session.userId = (user as any).id;
      
      req.login(user as any, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Ensure session is saved before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error after login:', saveErr);
            return next(saveErr);
          }
          
          // Don't return password in response
          const { password, ...userResponse } = user as any;
          res.json(userResponse);
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      // Try fallback authentication using userId in session
      if (req.session.userId) {
        storage.getUser(req.session.userId)
          .then(user => {
            if (user) {
              // Don't return password in response
              const { password, ...userResponse } = user as any;
              return res.json(userResponse);
            } else {
              return res.status(401).json({ message: "Not authenticated" });
            }
          })
          .catch(() => {
            return res.status(401).json({ message: "Not authenticated" });
          });
        return;
      }
      
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Don't return password in response
    if (req.user) {
      const { password, ...userResponse } = req.user as any;
      res.json(userResponse);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}