import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, InsertUser } from "@shared/schema";
import MemoryStore from "memorystore";

// Extend the session data type with our custom properties
declare module 'express-session' {
  interface SessionData {
    accountType?: 'worker' | 'poster';
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
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

// Helper function to generate random string for password
function generateRandomPassword() {
  return randomBytes(16).toString('hex');
}

// Function to find or create a user from social login
async function findOrCreateUserFromSocial(
  profile: any
): Promise<SelectUser> {
  // Check if a user with this social profile ID already exists
  // We'll handle all users regardless of account type
  const allUsers = Array.from((storage as any).users.values());
  const existingUser = allUsers.find(u => u.googleId === profile.id);
  
  if (existingUser) {
    return existingUser;
  }
  
  // No existing user, create a new one
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
  const name = profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : '');
  const photoUrl = 
    profile.photos && profile.photos[0] ? profile.photos[0].value : 
    profile._json && profile._json.picture ? profile._json.picture : 
    null;
  
  // Create a username based on provider ID and a random number to avoid collisions
  const randomSuffix = Math.floor(Math.random() * 10000); // Add a random number to avoid collisions
  const username = `${profile.provider}_${profile.id}_${randomSuffix}`;
  
  // Generate a random password
  const password = await hashPassword(generateRandomPassword());
  
  // Create user data object - using "pending" account type that will need to be selected
  const userData: InsertUser = {
    username,
    password,
    fullName: name,
    email,
    phone: null,
    bio: null,
    accountType: "pending", // User will need to select account type
    avatarUrl: photoUrl,
    skills: [],
    isActive: true,
    requiresProfileCompletion: true, // Flag to indicate profile needs completion
    googleId: profile.id,
    facebookId: null,
  };
  
  // Create the user
  const newUser = await storage.createUser(userData);
  
  return newUser;
}

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : undefined;
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gig-connect-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isProduction, // Use secure cookies in production
      sameSite: isProduction ? 'none' : 'lax', // Allow cross-site cookies in production
      domain: domain ? domain.replace('https://', '').replace('http://', '') : undefined, // Set domain in production
      httpOnly: true,
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
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
        // The account type is now optional during login
        const accountType = req.body.accountType as 'worker' | 'poster' | undefined;
        let user;
        
        if (accountType) {
          // If account type is provided, search for user with that specific account type
          user = await storage.getUserByUsernameAndType(username, accountType);
          if (!user) {
            return done(null, false, { message: `No ${accountType} account found with this username` });
          }
        } else {
          // If no account type is provided, find any user with this username
          user = await storage.getUserByUsername(username);
          if (!user) {
            return done(null, false, { message: "No account found with this username" });
          }
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
  
  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.REPLIT_DOMAINS ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/auth/google/callback`,
      passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Find or create the user with "pending" account type
        const user = await findOrCreateUserFromSocial(profile);
        
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));
  }
  
  // Only Google authentication is used

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register a new user without account type (initial registration)
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password: rawPassword } = req.body;

      // Check if the username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(rawPassword);
      
      // Create a user with worker account type directly
      const userData = {
        username,
        email,
        password: hashedPassword,
        fullName: req.body.fullName || username,
        phone: req.body.phone || null,
        bio: req.body.bio || null,
        avatarUrl: req.body.avatarUrl || null,
        accountType: "worker", // Always set to worker
        skills: req.body.skills || [],
        isActive: true,
        rating: 0,
        requiresProfileCompletion: false, // Regular sign-ups don't need profile completion
        location: req.body.location || null,
        googleId: null,
        facebookId: null
      };

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't return password in response
        const { password, ...userResponse } = user;
        res.status(201).json({
          ...userResponse,
          needsAccountType: true // Flag to indicate account type selection is needed
        });
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Check if user has a "pending" account type that needs selection
        const needsAccountType = user.accountType === "pending";
        
        // Don't return password in response
        const { password, ...userResponse } = user;
        
        // Return flag if account type selection is needed
        res.json({
          ...userResponse,
          needsAccountType
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Don't return password in response
    const { password, ...user } = req.user;
    res.json(user);
  });
  
  // Removing this endpoint as it's been moved to routes.ts
  // app.post("/api/set-account-type", async (req, res) => { ... });

  // Google Authentication Routes
  app.get('/auth/google', (req, res, next) => {
    // Store the account type in the session
    if (req.query.accountType) {
      req.session.accountType = req.query.accountType;
    }
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      session: true
    })(req, res, next);
  });

  app.get('/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/login',
      session: true
    }),
    async (req, res) => {
      if (!req.user) {
        return res.redirect('/login');
      }
      
      // Check if this is a new social login user who needs to complete their profile
      if ((req.user as any).requiresProfileCompletion) {
        // Send to complete profile page first before account type selection
        return res.redirect(`/complete-profile?id=${req.user.id}&provider=google`);
      }
      
      // Always set to worker and redirect home
      if (req.user.accountType === "pending") {
        try {
          // Update the account type directly to "worker"
          const updatedUser = await storage.updateUser(req.user.id, { accountType: "worker" });
          if (updatedUser) {
            // Re-login with updated user
            req.login(updatedUser, (err) => {
              if (err) {
                console.error("Failed to re-login after setting account type:", err);
              }
              return res.redirect('/');
            });
          } else {
            // Failed to update, still redirect home
            return res.redirect('/');
          }
        } catch (error) {
          console.error("Error updating account type:", error);
          return res.redirect('/');
        }
      } else {
        // Account type already set, redirect home
        return res.redirect('/');
      }
    }
  );

  // No Facebook integration
}