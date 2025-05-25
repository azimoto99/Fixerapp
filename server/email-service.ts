import { MailService } from '@sendgrid/mail';

// Email Notification Service for Plan Bravo Implementation
export class EmailService {
  private static instance: EmailService;
  private mailService: MailService;
  private isInitialized = false;

  private constructor() {
    this.mailService = new MailService();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Initialize with API key
  public initialize(apiKey: string): void {
    if (!apiKey) {
      console.warn('SendGrid API key not provided - email notifications disabled');
      return;
    }
    
    this.mailService.setApiKey(apiKey);
    this.isInitialized = true;
    console.log('✓ Email service initialized with SendGrid');
  }

  // Send ticket response notification
  async sendTicketResponseNotification(params: {
    userEmail: string;
    userName: string;
    ticketId: number;
    ticketTitle: string;
    responseMessage: string;
    adminName: string;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('Email service not initialized - skipping notification');
      return false;
    }

    try {
      const emailContent = {
        to: params.userEmail,
        from: 'support@fixer.app', // Your verified sender email
        subject: `Response to Support Ticket #${params.ticketId}: ${params.ticketTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0;">Support Ticket Update</h2>
            </div>
            
            <div style="padding: 20px;">
              <p>Hi ${params.userName},</p>
              
              <p>You've received a response to your support ticket:</p>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>Ticket #${params.ticketId}:</strong> ${params.ticketTitle}
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
                <strong>Response from ${params.adminName}:</strong><br><br>
                ${params.responseMessage.replace(/\n/g, '<br>')}
              </div>
              
              <p style="margin-top: 30px;">
                To reply or view the full conversation, please log into your Fixer account and visit the support section.
              </p>
              
              <p>Best regards,<br>The Fixer Support Team</p>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              This is an automated notification from Fixer Support System
            </div>
          </div>
        `,
        text: `
Hi ${params.userName},

You've received a response to your support ticket:

Ticket #${params.ticketId}: ${params.ticketTitle}

Response from ${params.adminName}:
${params.responseMessage}

To reply or view the full conversation, please log into your Fixer account and visit the support section.

Best regards,
The Fixer Support Team
        `
      };

      await this.mailService.send(emailContent);
      console.log(`✓ Support ticket notification sent to ${params.userEmail}`);
      return true;

    } catch (error) {
      console.error('Failed to send ticket notification email:', error);
      return false;
    }
  }

  // Send security incident notification to admins
  async sendSecurityIncidentNotification(params: {
    adminEmails: string[];
    incidentType: string;
    severity: string;
    description: string;
    incidentId: number;
    timestamp: Date;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('Email service not initialized - skipping security notification');
      return false;
    }

    try {
      const severityColor = params.severity === 'critical' ? '#dc3545' : 
                           params.severity === 'high' ? '#fd7e14' :
                           params.severity === 'medium' ? '#ffc107' : '#17a2b8';

      const emailContent = {
        to: params.adminEmails,
        from: 'security@fixer.app',
        subject: `[${params.severity.toUpperCase()}] Security Incident #${params.incidentId} - ${params.incidentType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0;">🔒 Security Alert</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Incident #${params.incidentId}</p>
            </div>
            
            <div style="padding: 20px;">
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Severity:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${params.severity.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Type:</td>
                    <td style="padding: 8px 0;">${params.incidentType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                    <td style="padding: 8px 0;">${params.timestamp.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <strong>Description:</strong><br>
                ${params.description}
              </div>
              
              <p>
                <strong>Immediate Action Required:</strong> Please review this incident in the Fixer admin panel and take appropriate action.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View in Admin Panel
                </a>
              </div>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              Fixer Security Operations Center - Automated Alert
            </div>
          </div>
        `
      };

      await this.mailService.send(emailContent);
      console.log(`✓ Security incident notification sent to ${params.adminEmails.length} admins`);
      return true;

    } catch (error) {
      console.error('Failed to send security incident email:', error);
      return false;
    }
  }

  // Send refund processed notification
  async sendRefundNotification(params: {
    userEmail: string;
    userName: string;
    refundAmount: number;
    jobTitle: string;
    jobId: number;
    refundId: number;
    status: 'approved' | 'denied';
    adminNotes?: string;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('Email service not initialized - skipping refund notification');
      return false;
    }

    try {
      const isApproved = params.status === 'approved';
      const statusColor = isApproved ? '#28a745' : '#dc3545';
      const statusText = isApproved ? 'Approved' : 'Denied';

      const emailContent = {
        to: params.userEmail,
        from: 'billing@fixer.app',
        subject: `Refund Request ${statusText} - Job: ${params.jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0;">💳 Refund Request Update</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Request #${params.refundId}</p>
            </div>
            
            <div style="padding: 20px;">
              <p>Hi ${params.userName},</p>
              
              <p>Your refund request has been <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Job:</td>
                    <td style="padding: 8px 0;">${params.jobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                    <td style="padding: 8px 0;">$${params.refundAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${statusText}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${params.adminNotes ? `
                <div style="background: #e9ecef; padding: 15px; border-radius: 6px; border-left: 4px solid #6c757d; margin: 20px 0;">
                  <strong>Admin Notes:</strong><br>
                  ${params.adminNotes}
                </div>
              ` : ''}
              
              ${isApproved ? `
                <p style="color: #28a745;">
                  ✓ Your refund has been processed and should appear in your original payment method within 5-10 business days.
                </p>
              ` : `
                <p>
                  If you have questions about this decision, please contact our support team.
                </p>
              `}
              
              <p>Best regards,<br>The Fixer Team</p>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              Fixer Billing Department - Automated Notification
            </div>
          </div>
        `
      };

      await this.mailService.send(emailContent);
      console.log(`✓ Refund notification sent to ${params.userEmail}`);
      return true;

    } catch (error) {
      console.error('Failed to send refund notification email:', error);
      return false;
    }
  }

  // Send audit report to admins
  async sendAuditReport(params: {
    adminEmails: string[];
    reportType: string;
    reportData: any;
    generatedAt: Date;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.log('Email service not initialized - skipping audit report');
      return false;
    }

    try {
      const emailContent = {
        to: params.adminEmails,
        from: 'audit@fixer.app',
        subject: `${params.reportType} - Generated ${params.generatedAt.toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #17a2b8; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0;">📊 Audit Report</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${params.reportType}</p>
            </div>
            
            <div style="padding: 20px;">
              <p>Generated: ${params.generatedAt.toLocaleString()}</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <pre style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto;">
${JSON.stringify(params.reportData, null, 2)}
                </pre>
              </div>
              
              <p>This automated audit report contains important security and financial data. Please review and take action as needed.</p>
            </div>
            
            <div style="background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px;">
              Fixer Audit System - Automated Report
            </div>
          </div>
        `
      };

      await this.mailService.send(emailContent);
      console.log(`✓ Audit report sent to ${params.adminEmails.length} admins`);
      return true;

    } catch (error) {
      console.error('Failed to send audit report email:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();

// Initialize with environment variable if available
if (process.env.SENDGRID_API_KEY) {
  emailService.initialize(process.env.SENDGRID_API_KEY);
}