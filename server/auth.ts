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
    name: 'fixer.sid', // Custom name for the session cookie
  };

  // Trust the first proxy to handle X-Forwarded-* headers correctly
  app.set("trust proxy", 1);
  
  // Add session middleware
  app.use(session(sessionSettings));
  
  // Use a session checker middleware
  app.use((req, res, next) => {
    if (!req.session) {
      console.error('Session not available!', { sessionID: req.sessionID });
      
      // Create a new session if needed
      if (!req.sessionID) {
        console.log('Creating new session since none exists');
      }
    }
    
    // Ensure cookie is properly set
    if (req.session && req.session.cookie) {
      // Ensure cookie maxAge is set to 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
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
      
      // Add connect.sid cookie explicitly to help browsers
      res.cookie('connect.sid', req.sessionID, {
        path: '/', 
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax'
      });
      
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
          
          // If session.passport doesn't exist yet, create it
          if (!req.session.passport) {
            req.session.passport = { user: user.id };
          }
          
          req.login(user, (err) => {
            if (err) {
              console.error('Login session error:', err);
              return next(err);
            }
            
            // Double check that passport data was properly set
            if (!req.session.passport || !req.session.passport.user) {
              console.warn('Passport data missing after login! Fixing...');
              req.session.passport = { user: user.id };
            }
            
            // Store a timestamp for debugging session issues
            req.session.loginTime = new Date().toISOString();
            
            // Make sure cookie maxAge is set correctly
            if (req.session.cookie) {
              req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            
            // Force the session to be saved back to the store
            // This is crucial to ensure the session data is persisted
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
              console.log('Passport data in session:', req.session.passport);
              
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
                  
                  // Make absolutely sure passport data is set
                  req.session.passport = { user: user.id };
                  
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
                // Repair the session
                req.session.passport = { user: user.id };
                // Save again
                req.session.save();
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
    console.log('Logout requested for user:', req.user?.id);
    
    // First, call req.logout to remove the req.user property and clear the login session
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
        return next(err);
      }
      
      // Then regenerate the session to ensure complete cleanup
      req.session.regenerate((regerr) => {
        if (regerr) {
          console.error('Error regenerating session during logout:', regerr);
          // Continue anyway since the authentication is already cleared
        }
        
        console.log('User logged out and session regenerated');
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log('User info requested - session ID:', req.sessionID);
    console.log('isAuthenticated:', req.isAuthenticated());
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    
    // Check for session passport data
    if (req.session.passport && req.session.passport.user) {
      console.log('Session has passport user ID:', req.session.passport.user);
    } else {
      console.log('No passport data in session');
      // Try to repair the session
      if (req.session.userId && typeof req.session.userId === 'number') {
        console.log('Attempting to restore session from userId:', req.session.userId);
        req.session.passport = { user: req.session.userId };
      }
    }
    
    // Primary check: Use passport's isAuthenticated
    if (req.isAuthenticated() && req.user) {
      console.log('User authenticated via Passport:', req.user.id);
      
      // Don't return password in response
      const { password, ...user } = req.user;
      return res.json(user);
    }
    
    // Backup check: If passport auth fails but we have passport.user in session
    if (req.session.passport && req.session.passport.user) {
      console.log('Trying backup authentication via passport.user:', req.session.passport.user);
      
      try {
        // Try to get the user from the database
        const user = await storage.getUser(req.session.passport.user);
        
        if (user) {
          console.log('User authenticated via backup passport.user:', user.id);
          
          // Restore passport session
          req.login(user, (err) => {
            if (err) {
              console.error('Failed to restore passport session:', err);
            } else {
              console.log('Passport session restored from backup passport.user');
            }
            
            // Don't return password in response
            const { password, ...userResponse } = user;
            
            // Save the session to ensure changes are persisted
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error('Error saving session after restoring:', saveErr);
              } else {
                console.log('Session saved after restore');
              }
              
              return res.json(userResponse);
            });
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching user from backup passport.user:', err);
      }
    } else if (req.session.userId && typeof req.session.userId === 'number') {
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
            
            // Save the session explicitly to ensure it persists
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error('Error saving session after restoring from userId:', saveErr);
              } else {
                console.log('Session saved after restore from userId');
              }
              
              // Don't return password in response
              const { password, ...userResponse } = user;
              return res.json(userResponse);
            });
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching user from backup userId:', err);
      }
    }
    
    // If we get here, authentication failed by all methods
    console.log('User not authenticated by any method');
    console.log('Authentication failed: isAuthenticated=' + req.isAuthenticated() + 
                ', has session=' + (req.session ? true : false) + 
                ', has user=' + (req.user ? true : false) + 
                ', sessionID=' + req.sessionID);
    console.log('Session data: ' + JSON.stringify({
      id: req.sessionID,
      cookie: req.session?.cookie,
      passport: req.session?.passport ? 'set' : 'not set',
      userId: req.session?.userId ? 'set' : 'not set',
      loginTime: req.session?.loginTime ? 'set' : 'not set'
    }, null, 2));
    return res.status(401).json({ message: "Unauthorized - Please login again" });
  });
  
  // Removing this endpoint as it's been moved to routes.ts
  // app.post("/api/set-account-type", async (req, res) => { ... });


}