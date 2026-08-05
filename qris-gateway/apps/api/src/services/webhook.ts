import { prisma } from "../utils/prisma";
import crypto from "crypto";
import axios from "axios";

export class WebhookService {
  private static signPayload(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  static async send(
    merchantId: string,
    event: string,
    data: Record<string, any>
  ) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        merchantId,
        isActive: true,
      },
    });

    // Filter by event (works for both Postgres String[] and SQLite String)
    const matched = webhooks.filter((w) => {
      if (Array.isArray(w.events)) return w.events.includes(event);
      return w.events.split(",").map((e) => e.trim()).includes(event);
    });

    const results = await Promise.allSettled(
      matched.map(async (webhook) => {
        const payload = JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        });

        const signature = this.signPayload(payload, webhook.secret);

        const log = await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            transactionId: "",
            url: webhook.url,
            payload,
            attempts: 0,
          },
        });

        try {
          const response = await axios.post(webhook.url, payload, {
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": event,
            },
            timeout: 10000,
          });

          await prisma.webhookLog.update({
            where: { id: log.id },
            data: {
              statusCode: response.status,
              response: JSON.stringify(response.data),
              success: true,
              attempts: 1,
              lastAttempt: new Date(),
            },
          });

          return { webhookId: webhook.id, success: true };
        } catch (error: any) {
          await prisma.webhookLog.update({
            where: { id: log.id },
            data: {
              statusCode: error.response?.status || 0,
              response: error.message,
              success: false,
              attempts: 1,
              lastAttempt: new Date(),
            },
          });

          // Retry logic (3 attempts with exponential backoff)
          await this.retry(webhook.id, log.id, payload, signature, 1);

          return { webhookId: webhook.id, success: false };
        }
      })
    );

    return results;
  }

  private static async retry(
    webhookId: string,
    logId: string,
    payload: string,
    signature: string,
    attempt: number
  ) {
    if (attempt >= 3) return;

    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) return;

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        timeout: 10000,
      });

      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          statusCode: response.status,
          response: JSON.stringify(response.data),
          success: true,
          attempts: attempt + 1,
          lastAttempt: new Date(),
        },
      });
    } catch (error: any) {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          statusCode: error.response?.status || 0,
          response: error.message,
          success: false,
          attempts: attempt + 1,
          lastAttempt: new Date(),
        },
      });

      await this.retry(webhookId, logId, payload, signature, attempt + 1);
    }
  }

  static async list(merchantId: string) {
    return prisma.webhook.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(
    merchantId: string,
    url: string,
    events: string[] | string
  ) {
    const eventsValue = Array.isArray(events) ? events.join(",") : events;
    return prisma.webhook.create({
      data: {
        merchantId,
        url,
        events: eventsValue,
      },
    });
  }

  static async update(
    merchantId: string,
    webhookId: string,
    data: { url?: string; events?: string[] | string; isActive?: boolean }
  ) {
    const updateData: any = { ...data };
    if (Array.isArray(data.events)) {
      updateData.events = data.events.join(",");
    }
    return prisma.webhook.updateMany({
      where: {
        id: webhookId,
        merchantId,
      },
      data: updateData,
    });
  }

  static async delete(merchantId: string, webhookId: string) {
    return prisma.webhook.deleteMany({
      where: {
        id: webhookId,
        merchantId,
      },
    });
  }

  static async getLogs(merchantId: string, webhookId: string) {
    return prisma.webhookLog.findMany({
      where: {
        webhookId,
        webhook: { merchantId },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
