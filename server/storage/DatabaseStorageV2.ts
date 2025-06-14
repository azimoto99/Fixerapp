import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../migrations/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// Creates a typed Drizzle instance we can reuse across the API routes.

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('SUPABASE_DATABASE_URL env var must be set');
}

const client = postgres(connectionString, {
  max: 10,
  ssl: connectionString.includes('localhost') ? false : 'require',
});

export const db = drizzle(client, { schema });

// Types inferred from Drizzle schema
export type Application = typeof schema.applications.$inferSelect;
export type InsertApplication = typeof schema.applications.$inferInsert;
export type Notification = typeof schema.notifications.$inferSelect;
export type InsertNotification = typeof schema.notifications.$inferInsert;

// Basic helpers that we will progressively expand.
export const Storage = {
  /** Get a user by primary key */
  getUser: async (id: number) => {
    const [user] = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.id, id),
      limit: 1,
    });
    return user ?? null;
  },

  /** Get a job by primary key */
  getJob: async (id: number) => {
    const [job] = await db.query.jobs.findMany({
      where: (j, { eq }) => eq(j.id, id),
      limit: 1,
    });
    return job ?? null;
  },

  /** Create a job */
  createJob: async (data: typeof schema.jobs.$inferInsert) => {
    const [row] = await db
      .insert(schema.jobs)
      .values(data)
      .returning();
    return row;
  },

  /** Create an application */
  createApplication: async (data: InsertApplication) => {
    const [row] = await db
      .insert(schema.applications)
      .values(data)
      .returning();
    return row;
  },

  /** Fetch applications for a job */
  getApplicationsByJobId: async (jobId: number) => {
    return db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.jobId, jobId));
  },

  /** Get single application */
  getApplication: async (id: number) => {
    const [row] = await db
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.id, id))
      .limit(1);
    return row ?? null;
  },

  /** Create notification */
  createNotification: async (data: InsertNotification) => {
    const [row] = await db
      .insert(schema.notifications)
      .values(data)
      .returning();
    return row;
  },

  /** Update an application */
  updateApplication: async (id: number, data: Partial<InsertApplication>) => {
    const [row] = await db
      .update(schema.applications)
      .set(data)
      .where(eq(schema.applications.id, id))
      .returning();
    return row;
  },

  /** Update a job */
  updateJob: async (id: number, data: Partial<typeof schema.jobs.$inferInsert>) => {
    const [row] = await db
      .update(schema.jobs)
      .set(data)
      .where(eq(schema.jobs.id, id))
      .returning();
    return row;
  },
}; 