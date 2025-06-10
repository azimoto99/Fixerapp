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
      await storage.addContact(userId, contactId);
      
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
      
      const result = await storage.removeContact(userId, contactId);
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
      
      const messageData = {
        senderId,
        recipientId: validatedData.recipientId,
        content: validatedData.content,
        messageType: validatedData.messageType || 'text',
        isRead: false,
        ...(validatedData.attachmentUrl && { attachmentUrl: validatedData.attachmentUrl }),
        ...(validatedData.attachmentType && { attachmentType: validatedData.attachmentType }),
        ...(validatedData.jobId && { jobId: validatedData.jobId })
      };

      const message = await storage.createMessage(messageData);
      
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
   * Send a contact request to another user
   * @route POST /api/contact-requests/send
   * @middleware isAuthenticated - User must be logged in
   * @body { receiverId: number, message?: string } - ID of user to send request to
   * @returns Success message and request details
   */
  app.post("/api/contact-requests/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const { receiverId, message } = req.body;
      if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
      }

      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (senderId === receiverId) {
        return res.status(400).json({ message: "Cannot send contact request to yourself" });
      }

      // Create contact request
      const request = await storage.createContactRequest(senderId, receiverId, message);

      res.status(201).json({
        message: "Contact request sent successfully",
        request
      });
    } catch (error) {
      console.error("Error sending contact request:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to send contact request" });
      }
    }
  });

  /**
   * Get contact requests (sent or received)
   * @route GET /api/contact-requests
   * @middleware isAuthenticated - User must be logged in
   * @query type - 'sent' or 'received'
   * @returns Array of contact requests
   */
  app.get("/api/contact-requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const { type } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!type || (type !== 'sent' && type !== 'received')) {
        return res.status(400).json({ message: "Type must be 'sent' or 'received'" });
      }

      const requests = await storage.getContactRequests(userId, type as 'sent' | 'received');
      res.json(requests);
    } catch (error) {
      console.error("Error fetching contact requests:", error);
      res.status(500).json({ message: "Failed to fetch contact requests" });
    }
  });

  /**
   * Respond to a contact request (accept or reject)
   * @route PUT /api/contact-requests/:requestId
   * @middleware isAuthenticated - User must be logged in
   * @body { status: 'accepted' | 'rejected' }
   * @returns Updated request details
   */
  app.put("/api/contact-requests/:requestId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const requestId = parseInt(req.params.requestId);
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      if (!status || (status !== 'accepted' && status !== 'rejected')) {
        return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
      }

      const updatedRequest = await storage.updateContactRequestStatus(requestId, status, userId);

      res.json({
        message: `Contact request ${status} successfully`,
        request: updatedRequest
      });
    } catch (error) {
      console.error("Error updating contact request:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update contact request" });
      }
    }
  });

  /**
   * Get messages between current user and a contact
   * @route GET /api/messages
   * @middleware isAuthenticated - User must be logged in
   * @query contactId - ID of the contact to get messages with
   * @returns Array of messages
   */
  app.get("/api/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const { contactId } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
      }

      const contactIdNum = parseInt(contactId as string);
      if (isNaN(contactIdNum)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      // Get messages between the two users
      const messages = await storage.getMessagesBetweenUsers(userId, contactIdNum);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to retrieve messages" });
    }
  });

  /**
   * Search for users to add as contacts
   * @route GET /api/users/search
   * @middleware isAuthenticated - User must be logged in
   * @query q - Search query (username, email, or full name)
   * @returns Array of matching users
   */
  // Search endpoint moved to main routes.ts file
  // This helps avoid conflicts with duplicate endpoints
}