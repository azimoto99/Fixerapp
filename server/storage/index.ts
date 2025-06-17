import { DatabaseStorage } from "../database-storage";

// Re-export the full DatabaseStorage API so existing imports continue to work.
export * from "../database-storage";

// Create a singleton instance that the rest of the server can use.
export const storage = new DatabaseStorage();
// For backward compatibility with older code that expected a named export
// called `Storage`, alias the instance here as well.
export const Storage = storage; 