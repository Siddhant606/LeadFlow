import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { EmailTemplate } from '../models/EmailTemplate';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (config.emailProvider === 'smtp' && config.smtp.host) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
      logger.info('Nodemailer configured for SMTP');
    } else {
      // Default to JSON/Console stream for mock / development
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.info('Nodemailer configured for mock/console output');
    }
  }
  return transporter;
}

export interface EmailPlaceholderData {
  clientName: string;
  advisorName?: string;
  brokerageName: string;
}

export function replacePlaceholders(templateText: string, data: EmailPlaceholderData): string {
  return templateText
    .replace(/\{\{\s*clientName\s*\}\}/g, data.clientName || 'Valued Client')
    .replace(/\{\{\s*advisorName\s*\}\}/g, data.advisorName || 'Your Mortgage Advisor')
    .replace(/\{\{\s*brokerageName\s*\}\}/g, data.brokerageName || 'LeadFlow Brokerage');
}

export class EmailService {
  /**
   * Sends an email safely. Failures are caught and logged so that the core pipeline stage
   * update NEVER fails even if the email provider experiences an outage.
   */
  static async sendTemplateEmail(
    to: string,
    templateId: string,
    placeholders: EmailPlaceholderData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        logger.warn(`Email template not found: ${templateId}`);
        return { success: false, error: 'Template not found' };
      }

      const subject = replacePlaceholders(template.subject, placeholders);
      const htmlBody = replacePlaceholders(template.body, placeholders);

      const mailOptions = {
        from: config.smtp.from,
        to,
        subject,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${htmlBody}</div>`,
        text: htmlBody.replace(/<[^>]*>?/gm, ''),
      };

      const mailer = getTransporter();
      const info = await mailer.sendMail(mailOptions);
      logger.info(`[Email Sent] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId || 'local-mock'}`);
      
      return { success: true, messageId: info.messageId || 'mock-id' };
    } catch (error: any) {
      logger.error(`[Email Failed] To: ${to} | Error: ${error.message}`);
      // Requirement: Email failure must not cause the core lead/stage update to fail.
      return { success: false, error: error.message };
    }
  }
}
