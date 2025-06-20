/**
 * Messaging API Routes - Handles contacts, friend requests, and messaging between users
 */
import { Request, Response, Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import twilio from 'twilio';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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
      
      // Optional jobId filters the conversation to a single job
      const jobIdParam = req.query.jobId as string | undefined;
      let jobId: number | undefined = undefined;
      if (jobIdParam) {
        const parsed = parseInt(jobIdParam);
        if (!isNaN(parsed)) jobId = parsed;
      }

      const messages = await (jobId
        ? storage.getConversation(currentUserId, otherUserId, jobId)
        : storage.getMessagesBetweenUsers(currentUserId, otherUserId));
      
      // Mark messages as read (ignores job filter for simplicity)
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
      const messageSchema = z.object({
        recipientId: z.number().positive("Recipient ID is required"),
        content: z.string().min(1, "Message content is required"),
        messageType: z.string().optional(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.string().optional(),
        jobId: z.number().optional()
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
      const { contactId, jobId: jobIdParam } = req.query;
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

      let jobId: number | undefined = undefined;
      if (jobIdParam) {
        const parsed = parseInt(jobIdParam as string);
        if (!isNaN(parsed)) jobId = parsed;
      }

      const messages = await (jobId
        ? storage.getConversation(userId, contactIdNum, jobId)
        : storage.getMessagesBetweenUsers(userId, contactIdNum));
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

  // Endpoint for uploading message attachments
  app.post('/api/messages/upload-attachment', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if S3 is configured
      const bucketName = process.env.S3_BUCKET_NAME;
      if (!bucketName) {
        return res.status(500).json({ error: 'File upload not configured' });
      }

      // Upload the file to S3
      const fileKey = `uploads/${Date.now()}-${req.file.originalname}`;
      const uploadParams = {
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };

      const command = new PutObjectCommand(uploadParams);
      const uploadResult = await s3Client.send(command);
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';

      res.json({
        attachmentUrl: fileUrl,
        attachmentType: fileType
      });
    } catch (error) {
      console.error('Error uploading attachment to S3:', error);
      res.status(500).json({ error: 'Failed to upload attachment' });
    }
  });

  // Endpoint to initiate a call
  app.post('/initiate-call', async (req: Request, res: Response) => {
    try {
      const { recipientId } = req.body;
      if (!recipientId) {
        return res.status(400).json({ error: 'Recipient ID is required' });
      }

      // In a real implementation, you would fetch the recipient's phone number from the database
      // For now, we'll use a placeholder
      const recipientPhoneNumber = '+1234567890'; // Replace with actual phone number retrieval logic
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      const call = await twilioClient.calls.create({
        url: 'http://demo.twilio.com/docs/voice.xml', // Replace with your TwiML URL or use TwiML Bin
        to: recipientPhoneNumber,
        from: fromNumber
      });

      res.json({
        message: 'Call initiated successfully',
        callSid: call.sid
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  /**
   * Create a group conversation for a job
   * @route POST /api/conversations/group
   * @middleware isAuthenticated - User must be logged in
   * @body { jobId: number, title?: string, participants: number[] }
   * @returns The created conversation with participants
   */
  app.post("/api/conversations/group", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const conversationSchema = z.object({
        jobId: z.number().positive("Job ID is required"),
        title: z.string().optional(),
        participants: z.array(z.number().positive()).min(1, "At least one participant is required")
      });

      const validatedData = conversationSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if user has access to the job
      const job = await storage.getJob(validatedData.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Check if user is the job poster or an applicant
      const applications = await storage.getApplicationsForJob(validatedData.jobId);
      const isJobPoster = job.posterId === userId;
      const isApplicant = applications.some(app => app.userId === userId);

      if (!isJobPoster && !isApplicant) {
        return res.status(403).json({ message: "You don't have access to create conversations for this job" });
      }

      // Create conversation
      const conversation = await storage.createGroupConversation({
        jobId: validatedData.jobId,
        title: validatedData.title || `${job.title} - Group Chat`,
        createdBy: userId,
        type: 'job_group',
        participants: [userId, ...validatedData.participants].filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating group conversation:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to create group conversation" });
      }
    }
  });

  /**
   * Send a message to a group conversation
   * @route POST /api/conversations/:conversationId/messages
   * @middleware isAuthenticated - User must be logged in
   * @body { content: string }
   * @returns The created message
   */
  app.post("/api/conversations/:conversationId/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const conversationId = parseInt(req.params.conversationId);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const messageSchema = z.object({
        content: z.string().min(1, "Message content is required"),
        messageType: z.string().optional(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.string().optional()
      });

      const validatedData = messageSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if user is a participant in the conversation
      const isParticipant = await storage.isConversationParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }

      // Create the message
      const message = await storage.createGroupMessage({
        conversationId,
        senderId: userId,
        content: validatedData.content,
        messageType: validatedData.messageType || 'text',
        attachmentUrl: validatedData.attachmentUrl,
        attachmentType: validatedData.attachmentType
      });

      // Update conversation last message timestamp
      await storage.updateConversationLastMessage(conversationId);

      // Get conversation details for broadcasting
      const conversation = await storage.getConversation(conversationId);
      if (conversation) {
        // Broadcast to all participants via WebSocket
        // This would be handled by the WebSocket service
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending group message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to send group message" });
      }
    }
  });

  /**
   * Get group conversation messages
   * @route GET /api/conversations/:conversationId/messages
   * @middleware isAuthenticated - User must be logged in
   * @returns Array of messages with read receipts
   */
  app.get("/api/conversations/:conversationId/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const conversationId = parseInt(req.params.conversationId);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if user is a participant in the conversation
      const isParticipant = await storage.isConversationParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }

      // Get messages with read receipts
      const messages = await storage.getConversationMessages(conversationId);
      
      // Mark messages as read for current user
      await storage.markConversationMessagesAsRead(conversationId, userId);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to retrieve conversation messages" });
    }
  });

  /**
   * Get user's group conversations
   * @route GET /api/conversations
   * @middleware isAuthenticated - User must be logged in
   * @returns Array of conversations the user is part of
   */
  app.get("/api/conversations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to retrieve conversations" });
    }
  });

  /**
   * Add participants to a group conversation
   * @route POST /api/conversations/:conversationId/participants
   * @middleware isAuthenticated - User must be logged in
   * @body { participants: number[] }
   * @returns Updated conversation with new participants
   */
  app.post("/api/conversations/:conversationId/participants", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const conversationId = parseInt(req.params.conversationId);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const participantsSchema = z.object({
        participants: z.array(z.number().positive()).min(1, "At least one participant is required")
      });

      const validatedData = participantsSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if user has admin role in the conversation
      const userRole = await storage.getConversationParticipantRole(conversationId, userId);
      if (!userRole || (userRole !== 'admin' && userRole !== 'owner')) {
        return res.status(403).json({ message: "You don't have permission to add participants" });
      }

      // Add participants
      const updatedConversation = await storage.addConversationParticipants(conversationId, validatedData.participants);
      
      res.json(updatedConversation);
    } catch (error) {
      console.error("Error adding participants:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Failed to add participants" });
      }
    }
  });

  /**
   * Leave a group conversation
   * @route POST /api/conversations/:conversationId/leave
   * @middleware isAuthenticated - User must be logged in
   * @returns Success message
   */
  app.post("/api/conversations/:conversationId/leave", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    try {
      const conversationId = parseInt(req.params.conversationId);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if user is a participant
      const isParticipant = await storage.isConversationParticipant(conversationId, userId);
      if (!isParticipant) {
        return res.status(404).json({ message: "You are not a participant in this conversation" });
      }

      // Leave conversation
      await storage.leaveConversation(conversationId, userId);

      res.json({ message: "Successfully left the conversation" });
    } catch (error) {
      console.error("Error leaving conversation:", error);
      res.status(500).json({ message: "Failed to leave conversation" });
    }
  });
}