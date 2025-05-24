import { MailService } from '@sendgrid/mail';

interface EmailNotificationData {
  to: string;
  ticketNumber: string;
  subject: string;
  userName: string;
  message?: string;
  status?: string;
  priority?: string;
}

class EmailNotificationService {
  private mailService: MailService;
  private fromEmail: string;

  constructor() {
    this.mailService = new MailService();
    this.fromEmail = 'support@fixer-app.com'; // Your support email
    
    // Only initialize if SendGrid API key is available
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  private isConfigured(): boolean {
    return !!process.env.SENDGRID_API_KEY;
  }

  async sendTicketCreatedEmail(data: EmailNotificationData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('SendGrid not configured, skipping email notification');
      return false;
    }

    try {
      const emailContent = {
        to: data.to,
        from: this.fromEmail,
        subject: `Support Ticket Created - #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Support Ticket Created</h2>
            <p>Hello ${data.userName},</p>
            <p>Your support ticket has been successfully created. Here are the details:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details</h3>
              <p><strong>Ticket Number:</strong> #${data.ticketNumber}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Priority:</strong> ${data.priority || 'Medium'}</p>
              <p><strong>Status:</strong> Open</p>
            </div>
            
            <p>We'll review your ticket and respond as soon as possible. You can track the status of your ticket in the Fixer app support section.</p>
            
            <p>Thank you for using Fixer!</p>
            <p>The Fixer Support Team</p>
          </div>
        `,
        text: `
Support Ticket Created

Hello ${data.userName},

Your support ticket has been successfully created.

Ticket Details:
- Ticket Number: #${data.ticketNumber}
- Subject: ${data.subject}
- Priority: ${data.priority || 'Medium'}
- Status: Open

We'll review your ticket and respond as soon as possible.

Thank you for using Fixer!
The Fixer Support Team
        `
      };

      await this.mailService.send(emailContent);
      console.log(`Ticket creation email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send ticket creation email:', error);
      return false;
    }
  }

  async sendTicketUpdateEmail(data: EmailNotificationData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('SendGrid not configured, skipping email notification');
      return false;
    }

    try {
      const emailContent = {
        to: data.to,
        from: this.fromEmail,
        subject: `Support Ticket Update - #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Support Ticket Update</h2>
            <p>Hello ${data.userName},</p>
            <p>There's been an update to your support ticket:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket #${data.ticketNumber}</h3>
              <p><strong>Subject:</strong> ${data.subject}</p>
              ${data.status ? `<p><strong>Status:</strong> ${data.status}</p>` : ''}
              ${data.priority ? `<p><strong>Priority:</strong> ${data.priority}</p>` : ''}
              ${data.message ? `
                <div style="margin-top: 15px;">
                  <strong>New Message:</strong>
                  <p style="background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 10px 0;">${data.message}</p>
                </div>
              ` : ''}
            </div>
            
            <p>You can view the full conversation and respond in the Fixer app support section.</p>
            
            <p>Thank you for using Fixer!</p>
            <p>The Fixer Support Team</p>
          </div>
        `,
        text: `
Support Ticket Update

Hello ${data.userName},

There's been an update to your support ticket #${data.ticketNumber}.

Subject: ${data.subject}
${data.status ? `Status: ${data.status}` : ''}
${data.priority ? `Priority: ${data.priority}` : ''}
${data.message ? `New Message: ${data.message}` : ''}

You can view the full conversation and respond in the Fixer app.

Thank you for using Fixer!
The Fixer Support Team
        `
      };

      await this.mailService.send(emailContent);
      console.log(`Ticket update email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send ticket update email:', error);
      return false;
    }
  }

  async sendTicketResolvedEmail(data: EmailNotificationData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('SendGrid not configured, skipping email notification');
      return false;
    }

    try {
      const emailContent = {
        to: data.to,
        from: this.fromEmail,
        subject: `Support Ticket Resolved - #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Support Ticket Resolved</h2>
            <p>Hello ${data.userName},</p>
            <p>Great news! Your support ticket has been resolved:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="margin-top: 0; color: #16a34a;">Ticket #${data.ticketNumber} - Resolved</h3>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Status:</strong> Resolved</p>
              ${data.message ? `
                <div style="margin-top: 15px;">
                  <strong>Resolution Message:</strong>
                  <p style="background-color: white; padding: 15px; border-radius: 4px; margin: 10px 0;">${data.message}</p>
                </div>
              ` : ''}
            </div>
            
            <p>If you need further assistance or have additional questions, please don't hesitate to create a new support ticket.</p>
            
            <p>Thank you for using Fixer!</p>
            <p>The Fixer Support Team</p>
          </div>
        `,
        text: `
Support Ticket Resolved

Hello ${data.userName},

Great news! Your support ticket #${data.ticketNumber} has been resolved.

Subject: ${data.subject}
Status: Resolved
${data.message ? `Resolution Message: ${data.message}` : ''}

If you need further assistance, please create a new support ticket.

Thank you for using Fixer!
The Fixer Support Team
        `
      };

      await this.mailService.send(emailContent);
      console.log(`Ticket resolved email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send ticket resolved email:', error);
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();