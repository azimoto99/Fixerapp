/**
 * Messaging API Routes - Handles contacts, friend requests, and messaging between users
 */
import { Request, Response, Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";

export function registerMessagingRoutes(app: Express) {
  /**
   * Get all contacts for the logged-in user
   * @route GET /api/contacts
   * @middleware isAuthenticated - User must be logged in
   * @returns Array of contacts with user details
   */
  app.get("/api/contacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      // Assuming req.user.id exists after successful authentication
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const contacts = await storage.getUserContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to retrieve contacts" });
    }
  });

  /**
   * Add a new contact for the current user
   * @route POST /api/contacts/add
   * @middleware isAuthenticated - User must be logged in
   * @body { contactId: number } - ID of user to add as contact
   * @returns Success message and contact details
   */
  app.post("/api/contacts/add", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const { contactId } = req.body;
      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Check if contact already exists
      const existingContacts = await storage.getUserContacts(userId);
      const contactExists = existingContacts.some(contact => contact.id === contactId);
      
      if (contactExists) {
        return res.status(400).json({ message: "Contact already exists" });
      }
      
      // Add contact
      await storage.addUserContact(userId, contactId);
      
      // Get updated contact list
      const updatedContacts = await storage.getUserContacts(userId);
      res.status(201).json({ 
        message: "Contact added successfully",
        contacts: updatedContacts
      });
    } catch (error) {
      console.error("Error adding contact:", error);
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  /**
   * Remove a contact for the current user
   * @route DELETE /api/contacts/:contactId
   * @middleware isAuthenticated - User must be logged in
   * @param contactId - ID of contact to remove
   * @returns Success message
   */
  app.delete("/api/contacts/:contactId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const result = await storage.removeUserContact(userId, contactId);
      if (result) {
        res.json({ message: "Contact removed successfully" });
      } else {
        res.status(404).json({ message: "Contact not found" });
      }
    } catch (error) {
      console.error("Error removing contact:", error);
      res.status(500).json({ message: "Failed to remove contact" });
    }
  });

  /**
   * Get messages between current user and another user
   * @route GET /api/messages/:userId
   * @middleware isAuthenticated - User must be logged in
   * @param userId - ID of the other user in the conversation
   * @returns Array of messages
   */
  app.get("/api/messages/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(currentUserId, otherUserId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to retrieve messages" });
    }
  });

  /**
   * Send a message to another user
   * @route POST /api/messages/send
   * @middleware isAuthenticated - User must be logged in
   * @body { recipientId: number, content: string }
   * @returns The created message
   */
  app.post("/api/messages/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const messageSchema = insertMessageSchema.extend({
        recipientId: z.number().positive("Recipient ID is required"),
        content: z.string().min(1, "Message content is required")
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const message = await storage.createMessage({
        senderId,
        recipientId: validatedData.recipientId,
        content: validatedData.content,
        attachmentUrl: validatedData.attachmentUrl,
        attachmentType: validatedData.attachmentType
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  /**
   * Search for users to add as contacts
   * @route GET /api/users/search
   * @middleware isAuthenticated - User must be logged in
   * @query q - Search query (username, email, or full name)
   * @returns Array of matching users
   */
  app.get("/api/users/search", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }
      
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Perform search with any numeric checks to avoid NaN errors
      let parsedUserId = currentUserId;
      if (typeof parsedUserId === 'string') {
        parsedUserId = parseInt(parsedUserId, 10);
        if (isNaN(parsedUserId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
      }
      
      console.log(`Searching users with query: "${query}" for user ID: ${parsedUserId}`);
      const users = await storage.searchUsers(query, parsedUserId);
      
      if (!users || users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
}