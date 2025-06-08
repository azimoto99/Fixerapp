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
    secret: process.env.SESSION_SECRET || "fixer-secret-key",
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
          
          // Get all users and find one with matching lowercase username
          const allUsers = await storage.getAllUsers();
          user = allUsers.find(u => u.username.toLowerCase() === lowerUsername);
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
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register a new user (always as worker type)
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password: rawPassword, fullName } = req.body;

      // Validate required fields
      if (!username || !email || !rawPassword || !fullName) {
        return res.status(400).json({ 
          message: "Missing required fields. Username, email, password, and full name are required." 
        });
      }

      // Validate username length
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long" });
      }

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
        requiresProfileCompletion: false,
        location: req.body.location || null,
        googleId: null,
        facebookId: null
      };

      const user = await storage.createUser(userData);

      // Store user ID as backup in case passport session gets corrupted
      req.session.userId = user.id;
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Ensure session is saved before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error after registration:', saveErr);
            return next(saveErr);
          }
          
          // Don't return password in response
          const { password, ...userResponse } = user as any;
          res.status(201).json(userResponse);
        });
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Simple login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      
      // Store user ID as backup in case passport session gets corrupted
      req.session.userId = user.id;
      
      req.login(user, (loginErr) => {
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