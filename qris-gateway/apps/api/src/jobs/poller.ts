import { prisma } from "../utils/prisma";
import { InteractiveQrisService } from "../services/interactiveQris";
import { TransactionService } from "../services/transaction";

const POLL_INTERVAL = 60 * 1000; // 1 minute (per InterActive API rules)

export class PollerJob {
  private static timer: NodeJS.Timeout | null = null;

  static start() {
    if (!InteractiveQrisService.isConfigured()) {
      console.log("⚠️  InterActive QRIS not configured, poller disabled");
      return;
    }

    console.log("🔄 QRIS status poller started (60s interval)");
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static async tick() {
    try {
      // Get pending transactions not yet expired
      const pending = await prisma.transaction.findMany({
        where: {
          status: "PENDING",
          qrisInvoiceId: { not: null },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        take: 50,
      });

      for (const tx of pending) {
        try {
          await TransactionService.checkStatus(tx.externalId);
        } catch (error: any) {
          // Log but continue with other transactions
          console.error(`Poller error for ${tx.externalId}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error("Poller tick error:", error.message);
    }
  }
}
