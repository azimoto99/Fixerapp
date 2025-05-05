import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
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
    loggingIn?: boolean;
    userId?: number;
    loginTime?: string;
    passport?: {
      user: number;
    };
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



export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : undefined;
  
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
  
  // Configure session with better security and longer duration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gig-connect-secret-key-improve-security",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on each response
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for better persistence
      secure: isProduction, // Only use secure cookies in production
      sameSite: 'lax',
      httpOnly: true,
      path: '/',
    },
    name: 'fixer.sid' // Custom name for the session cookie
  };

  // Trust the first proxy to handle X-Forwarded-* headers correctly
  app.set("trust proxy", 1);
  
  // Add session middleware
  app.use(session(sessionSettings));
  
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
        const user = await storage.getUserByUsername(username);
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
        // No need for account type selection flag anymore since it's always worker
        res.status(201).json(userResponse);
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Add a simple CSRF token endpoint (doesn't need to do anything)
  app.get("/api/csrf-token", (req, res) => {
    console.log('CSRF token requested - session ID:', req.sessionID);
    res.status(200).json({ message: "CSRF token request received" });
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt with username:', req.body.username);
    console.log('Current session ID:', req.sessionID);
    
    // Make sure to regenerate session on login to prevent session fixation attacks
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error('Session regeneration error:', regenerateErr);
        return next(regenerateErr);
      }
      
      console.log('Session regenerated with new ID:', req.sessionID);
      
      passport.authenticate("local", (err: Error | null, userObj: Express.User | false, info: { message: string } | undefined) => {
        if (err) {
          console.error('Login authentication error:', err);
          return next(err);
        }
        
        if (!userObj) {
          console.log('Login failed for username:', req.body.username);
          return res.status(401).json({ message: info?.message || "Login failed" });
        }
        
        console.log('User authenticated successfully:', userObj.id);
        
        // Need to cast to avoid type errors
        let user = userObj as Express.User;
        
        // If account type is still pending, update it to worker automatically
        if (user.accountType === "pending") {
          (async () => {
            try {
              console.log('Updating account type from pending to worker');
              const updatedUser = await storage.updateUser(user.id, { accountType: "worker" });
              if (updatedUser) {
                user = updatedUser;
              }
            } catch (error) {
              console.error("Error updating account type during login:", error);
            }
            
            finishLogin();
          })();
        } else {
          finishLogin();
        }
        
        function finishLogin() {
          console.log('Logging in user:', user.id);
          
          // Set a key in session to indicate we're in the login process
          // This helps track if there are any session storage issues
          req.session.loggingIn = true;
          req.session.userId = user.id; // Store user ID directly in session as a backup
          
          req.login(user, (err) => {
            if (err) {
              console.error('Login session error:', err);
              return next(err);
            }
            
            // Store a timestamp for debugging session issues
            req.session.loginTime = new Date().toISOString();
            
            // Make sure cookie maxAge is set correctly
            if (req.session.cookie) {
              req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            
            // Save the session explicitly before sending response
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error('Session save error:', saveErr);
                return next(saveErr);
              }
              
              console.log('Login successful - session established and saved');
              console.log('Session ID after login:', req.sessionID);
              console.log('Session expiration:', req.session.cookie.maxAge ? 
                new Date(Date.now() + req.session.cookie.maxAge).toISOString() : 'No expiration');
              console.log('isAuthenticated after login:', req.isAuthenticated());
              console.log('User in session:', req.user ? `ID: ${req.user.id}` : 'No user');
              console.log('Session data:', req.session);
              
              // Enhanced session verification after login
              if (!req.isAuthenticated() || !req.user) {
                console.error('WARNING: User authenticated but session verification failed!');
                console.log('Attempting retry login with session ID:', req.sessionID);
                
                // Try to recover by retrying login
                req.login(user, (retryErr) => {
                  if (retryErr) {
                    console.error('Login retry error:', retryErr);
                    return next(retryErr);
                  }
                  
                  // Save the session again after retry
                  req.session.save((retrySaveErr) => {
                    if (retrySaveErr) {
                      console.error('Retry session save error:', retrySaveErr);
                      return next(retrySaveErr);
                    }
                    
                    console.log('Login retry successful');
                    console.log('isAuthenticated after retry:', req.isAuthenticated());
                    
                    // Don't return password in response
                    const { password, ...userResponse } = user;
                    res.json(userResponse);
                  });
                });
                return;
              }
              
              // Check if passport data is properly stored in session
              if (!req.session.passport || !req.session.passport.user) {
                console.warn('WARNING: Session passport data not found after login!');
                console.log('Session contents:', req.session);
              }
              
              // Don't return password in response
              const { password, ...userResponse } = user;
              
              // Account type selection is no longer needed
              res.json(userResponse);
            });
          });
        }
      })(req, res, next);
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log('User info requested - session ID:', req.sessionID);
    console.log('isAuthenticated:', req.isAuthenticated());
    console.log('Session data:', req.session);
    
    // Primary check: Use passport's isAuthenticated
    if (req.isAuthenticated() && req.user) {
      console.log('User authenticated via Passport:', req.user.id);
      
      // Don't return password in response
      const { password, ...user } = req.user;
      return res.json(user);
    }
    
    // Backup check: If passport auth fails but we have userId in session
    if (req.session.userId) {
      console.log('Trying backup authentication via session.userId:', req.session.userId);
      
      try {
        // Try to get the user from the database
        const user = await storage.getUser(req.session.userId);
        
        if (user) {
          console.log('User authenticated via backup userId:', user.id);
          
          // Restore passport session
          req.login(user, (err) => {
            if (err) {
              console.error('Failed to restore passport session:', err);
            } else {
              console.log('Passport session restored from backup userId');
            }
            
            // Don't return password in response
            const { password, ...userResponse } = user;
            return res.json(userResponse);
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching user from backup userId:', err);
      }
    }
    
    // If we get here, authentication failed by all methods
    console.log('User not authenticated by any method');
    return res.status(401).json({ message: "Not authenticated" });
  });
  
  // Removing this endpoint as it's been moved to routes.ts
  // app.post("/api/set-account-type", async (req, res) => { ... });


}