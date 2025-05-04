import { eq, and, like, desc, or, asc } from 'drizzle-orm';
import { db } from './db';
import { IStorage } from './storage';
import {
  users, jobs, applications, reviews, tasks, earnings, payments,
  User, InsertUser,
  Job, InsertJob,
  Application, InsertApplication,
  Review, InsertReview,
  Task, InsertTask,
  Earning, InsertEarning,
  Payment, InsertPayment
} from '@shared/schema';
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true
    });
  }
  
  // User operations
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    
    // Add the requiresProfileCompletion property to each user
    return allUsers.map(user => {
      // Check if user has social login and either has 'pending' account type or missing profile fields
      const hasSocialLogin = Boolean(user.googleId || user.facebookId);
      const hasPendingAccountType = user.accountType === 'pending';
      const hasMissingProfileFields = !user.bio || !user.phone;
      const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
      
      return {
        ...user,
        requiresProfileCompletion: needsProfileCompletion === true ? true : null
      };
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    // If user is found and is a social login user (has googleId or facebookId), 
    // we may need to mark it as requiring profile completion
    if (user) {
      // Add the requiresProfileCompletion property for social login users
      // who have pending account type or have just registered
      // Check if user has social login and either has 'pending' account type or missing profile fields
      const hasSocialLogin = Boolean(user.googleId || user.facebookId);
      const hasPendingAccountType = user.accountType === 'pending';
      const hasMissingProfileFields = !user.bio || !user.phone;
      const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
      
      return {
        ...user,
        requiresProfileCompletion: needsProfileCompletion === true ? true : null
      };
    }
    
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    // If user is found, add the requiresProfileCompletion property
    if (user) {
      // Same logic as in getUser
      // Check if user has social login and either has 'pending' account type or missing profile fields
      const hasSocialLogin = Boolean(user.googleId || user.facebookId);
      const hasPendingAccountType = user.accountType === 'pending';
      const hasMissingProfileFields = !user.bio || !user.phone;
      const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
      
      return {
        ...user,
        requiresProfileCompletion: needsProfileCompletion === true ? true : null
      };
    }
    
    return user;
  }
  
  async getUserByUsernameAndType(username: string, accountType: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username),
        eq(users.accountType, accountType)
      )
    );
    
    // If user is found, add the requiresProfileCompletion property
    if (user) {
      // Same logic as in getUser
      // Check if user has social login and either has 'pending' account type or missing profile fields
      const hasSocialLogin = Boolean(user.googleId || user.facebookId);
      const hasPendingAccountType = user.accountType === 'pending';
      const hasMissingProfileFields = !user.bio || !user.phone;
      const needsProfileCompletion = hasSocialLogin && (hasPendingAccountType || hasMissingProfileFields);
      
      return {
        ...user,
        requiresProfileCompletion: needsProfileCompletion === true ? true : null
      };
    }
    
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Extract the requiresProfileCompletion property (if it exists) and remove it from the user object
    // since it doesn't exist in the database schema
    const { requiresProfileCompletion, ...dbUser } = user;
    
    // Insert the user without the requiresProfileCompletion field
    const [createdUser] = await db.insert(users).values(dbUser).returning();
    
    // Add the requiresProfileCompletion property back to the user object for the client
    return {
      ...createdUser,
      requiresProfileCompletion: requiresProfileCompletion === true ? true : null
    };
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    // Extract the requiresProfileCompletion property (if it exists) and remove it from the data object
    // since it doesn't exist in the database schema
    const { requiresProfileCompletion, ...dbData } = data;
    
    // Update the user without the requiresProfileCompletion field
    const [updatedUser] = await db.update(users)
      .set(dbData)
      .where(eq(users.id, id))
      .returning();
      
    if (!updatedUser) return undefined;
    
    // Add the requiresProfileCompletion property back to the user object for the client
    return {
      ...updatedUser,
      requiresProfileCompletion: requiresProfileCompletion === true ? true : null
    };
  }
  
  // Rest of your methods will be copied over
}