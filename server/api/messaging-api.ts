/**
 * Messaging API Routes - Handles contacts, friend requests, and messaging between users
 */
import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";

// Request validation schemas
const addContactSchema = z.object({
  username: z.string().min(1, "Username is required")
});

const sendMessageSchema = z.object({
  recipientId: z.number().int().positive(),
  content: z.string().min(1, "Message content is required")
});

export function registerMessagingRoutes(app: Express) {
  
  // Get user's contacts (friends)
  app.get("/api/contacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      const contacts = await storage.getUserContacts(userId);
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  
  // Add a contact (friend)
  app.post("/api/contacts/add", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validation = addContactSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { username } = validation.data;
      const userId = req.user.id;
      
      // Check if the user exists
      const contactUser = await storage.getUserByUsername(username);
      if (!contactUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Can't add yourself as a contact
      if (contactUser.id === userId) {
        return res.status(400).json({ message: "You cannot add yourself as a contact" });
      }
      
      // Check if already a contact
      const contacts = await storage.getUserContacts(userId);
      const isAlreadyContact = contacts.some(contact => contact.id === contactUser.id);
      
      if (isAlreadyContact) {
        return res.status(400).json({ message: "This user is already in your contacts" });
      }
      
      // Add contact
      await storage.addUserContact(userId, contactUser.id);
      
      // Send notification to the other user
      await storage.createNotification({
        userId: contactUser.id,
        type: "contact_request",
        content: `${req.user.username} added you as a contact`,
        isRead: false,
        data: {
          userId: userId,
          username: req.user.username
        }
      });
      
      res.json({ message: "Contact added successfully", contact: contactUser });
    } catch (error) {
      console.error("Error adding contact:", error);
      res.status(500).json({ message: "Failed to add contact" });
    }
  });
  
  // Remove a contact (friend)
  app.delete("/api/contacts/:contactId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = req.user.id;
      const contactId = parseInt(req.params.contactId);
      
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      await storage.removeUserContact(userId, contactId);
      
      res.json({ message: "Contact removed successfully" });
    } catch (error) {
      console.error("Error removing contact:", error);
      res.status(500).json({ message: "Failed to remove contact" });
    }
  });
  
  // Get messages between current user and another user
  app.get("/api/messages/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUserId = req.user.id;
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      
      // Mark all received messages as read
      await storage.markMessagesAsRead(currentUserId, otherUserId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Send a message to another user
  app.post("/api/messages/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validation = sendMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { recipientId, content } = validation.data;
      const senderId = req.user.id;
      
      // Check if recipient exists
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      // Create and send the message
      const message = await storage.createMessage({
        senderId,
        recipientId,
        content,
        isRead: false
      });
      
      // Create notification for the recipient
      await storage.createNotification({
        userId: recipientId,
        type: "message",
        content: `New message from ${req.user.username}`,
        isRead: false,
        data: {
          messageId: message.id,
          senderId,
          content: content.substring(0, 30) + (content.length > 30 ? '...' : '')
        }
      });
      
      res.json({ message: "Message sent successfully", data: message });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Search for users
  app.get("/api/users/search", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const query = req.query.query as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }
      
      const users = await storage.searchUsers(query, req.user.id);
      
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });
}