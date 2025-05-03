import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
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
  profile: any, 
  accountType: 'worker' | 'poster'
): Promise<SelectUser> {
  // Check if a user with this social profile ID already exists
  // If so, return that user (assuming their account type matches)
  const allUsers = Array.from((storage as any).users.values());
  const existingUser = allUsers.find(
    u => (u.googleId === profile.id || u.facebookId === profile.id) && u.accountType === accountType
  );
  
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
  
  const username = `${accountType}_${profile.provider}_${profile.id}`;
  
  // Generate a random password
  const password = await hashPassword(generateRandomPassword());
  
  // Create user data object
  const userData: InsertUser = {
    username,
    password,
    fullName: name,
    email,
    phone: null,
    bio: null,
    accountType,
    avatarUrl: photoUrl,
    skills: [],
    isActive: true,
  };
  
  // Add the specific provider ID
  if (profile.provider === 'google') {
    (userData as any).googleId = profile.id;
  } else if (profile.provider === 'facebook') {
    (userData as any).facebookId = profile.id;
  }
  
  // Create the user
  return await storage.createUser(userData);
}

export function setupAuth(app: Express) {
  const MemoryStoreSession = MemoryStore(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gig-connect-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
        const accountType = req.body.accountType as 'worker' | 'poster';
        
        if (!accountType) {
          return done(null, false, { message: "Account type is required" });
        }
        
        const user = await storage.getUserByUsernameAndType(username, accountType);
        
        if (!user) {
          return done(null, false, { message: `No ${accountType} account found with this username` });
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
      callbackURL: "/auth/google/callback",
      passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Get the account type from the session or query parameter
        const accountType = req.query.accountType || req.session.accountType || 'worker';
        
        // Store the account type in the session
        if (req.session) {
          req.session.accountType = accountType;
        }
        
        // Find or create the user
        const user = await findOrCreateUserFromSocial(profile, accountType as 'worker' | 'poster');
        
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));
  }
  
  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ['id', 'displayName', 'photos', 'email', 'name'],
      passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Get the account type from the session or query parameter
        const accountType = req.query.accountType || req.session.accountType || 'worker';
        
        // Store the account type in the session
        if (req.session) {
          req.session.accountType = accountType;
        }
        
        // Find or create the user
        const user = await findOrCreateUserFromSocial(profile, accountType as 'worker' | 'poster');
        
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, accountType } = req.body;

      // Check if the username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if a user with the same email and account type already exists
      const allUsers = Array.from((storage as any).users.values());
      const userWithSameEmailAndType = allUsers.find(
        u => u.email === email && u.accountType === accountType
      );
      
      if (userWithSameEmailAndType) {
        return res.status(400).json({ 
          message: `You already have a ${accountType} account with this email address` 
        });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword,
      };

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't return password in response
        const { password, ...userResponse } = user;
        res.status(201).json(userResponse);
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
        // Don't return password in response
        const { password, ...userResponse } = user;
        res.json(userResponse);
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
    (req, res) => {
      // Successful authentication, redirect home
      res.redirect('/');
    }
  );

  // Facebook Authentication Routes
  app.get('/auth/facebook', (req, res, next) => {
    // Store the account type in the session
    if (req.query.accountType) {
      req.session.accountType = req.query.accountType;
    }
    
    passport.authenticate('facebook', { 
      scope: ['email', 'public_profile'],
      session: true
    })(req, res, next);
  });

  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { 
      failureRedirect: '/login',
      session: true
    }),
    (req, res) => {
      // Successful authentication, redirect home
      res.redirect('/');
    }
  );
}