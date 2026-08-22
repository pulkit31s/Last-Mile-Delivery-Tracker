import nodemailer from 'nodemailer';
import { Notification } from '../models/Notification';
import { NotificationChannel, NotificationStatus } from '../types';
import { logger } from '../config/logger';

interface INotificationPayload {
  userId?: any;
  orderId?: string;
  channel: NotificationChannel;
  type: string;
  recipient: string;
  subject?: string;
  message: string;
}

export class NotificationService {
  private static emailTransporter: nodemailer.Transporter | null = null;

  private static getEmailTransporter(): nodemailer.Transporter | null {
    if (this.emailTransporter) return this.emailTransporter;

    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
    return this.emailTransporter;
  }

  /**
   * Dispatches a notification across email or SMS with fallback mock logging
   * and saves the record in the Notification collection.
   */
  static async send(payload: INotificationPayload): Promise<void> {
    try {
      if (payload.channel === NotificationChannel.EMAIL) {
        await this.sendEmail(payload);
      } else if (payload.channel === NotificationChannel.SMS) {
        await this.sendSMS(payload);
      }
    } catch (err: any) {
      logger.warn(`Notification send failed for ${payload.recipient}: ${err.message}`);
    }
  }

  private static async sendEmail(payload: INotificationPayload): Promise<void> {
    const transporter = this.getEmailTransporter();
    const from = process.env.EMAIL_FROM || '"LastMile Logistics" <noreply@lastmile.com>';

    if (transporter && process.env.EMAIL_PROVIDER !== 'mock') {
      try {
        const info = await transporter.sendMail({
          from,
          to: payload.recipient,
          subject: payload.subject || 'Last-Mile Delivery Update',
          text: payload.message,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #4f46e5;">Last-Mile Delivery Tracker</h2>
            <p>${payload.message.replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #64748b;">Order Ref: ${payload.orderId || 'N/A'}</p>
          </div>`
        });

        await Notification.create({
          userId: payload.userId,
          orderId: payload.orderId,
          channel: NotificationChannel.EMAIL,
          type: payload.type,
          recipient: payload.recipient,
          subject: payload.subject,
          message: payload.message,
          status: NotificationStatus.SENT,
          providerMessageId: info.messageId,
          sentAt: new Date()
        });

        logger.info(`[Email Sent] To: ${payload.recipient} | Subject: ${payload.subject}`);
        return;
      } catch (err: any) {
        logger.warn(`Failed real email dispatch, saving notification log: ${err.message}`);
      }
    }

    // Mock / Dev Fallback
    logger.info(`[DEV EMAIL MOCK] To: ${payload.recipient} | Subject: ${payload.subject} | Content: ${payload.message}`);
    await Notification.create({
      userId: payload.userId,
      orderId: payload.orderId,
      channel: NotificationChannel.EMAIL,
      type: payload.type,
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
      status: NotificationStatus.DEV_MOCKED,
      sentAt: new Date()
    });
  }

  private static async sendSMS(payload: INotificationPayload): Promise<void> {
    // Twilio SMS provider or Dev Mock fallback
    logger.info(`[DEV SMS MOCK] To: ${payload.recipient} | Msg: ${payload.message}`);
    await Notification.create({
      userId: payload.userId,
      orderId: payload.orderId,
      channel: NotificationChannel.SMS,
      type: payload.type,
      recipient: payload.recipient,
      message: payload.message,
      status: NotificationStatus.DEV_MOCKED,
      sentAt: new Date()
    });
  }

  /**
   * Helper to dispatch standard lifecycle notifications
   */
  static async notifyOrderLifecycle(
    order: any,
    customerEmail: string,
    customerPhone: string,
    type: string,
    statusNote?: string
  ): Promise<void> {
    const subject = `Order #${order.orderId} Update: ${order.status}`;
    const message = `Hello,\nYour package with Order ID #${order.orderId} is currently [${order.status}].\n${statusNote || 'Track your shipment live in your portal.'}\n\nPickup: ${order.pickupAddress?.street}, ${order.pickupAddress?.city}\nDrop: ${order.dropAddress?.street}, ${order.dropAddress?.city}`;

    if (customerEmail) {
      await this.send({
        userId: order.customerId,
        orderId: order.orderId,
        channel: NotificationChannel.EMAIL,
        type,
        recipient: customerEmail,
        subject,
        message
      });
    }

    if (customerPhone) {
      await this.send({
        userId: order.customerId,
        orderId: order.orderId,
        channel: NotificationChannel.SMS,
        type,
        recipient: customerPhone,
        message: `Order #${order.orderId} is now ${order.status}. ${statusNote || ''}`
      });
    }
  }
}
