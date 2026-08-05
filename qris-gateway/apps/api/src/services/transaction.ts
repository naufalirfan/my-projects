import { prisma } from "../utils/prisma";
import { v4 as uuidv4 } from "uuid";
import { InteractiveQrisService } from "./interactiveQris";
import { QrisService } from "./qris";
import { WebhookService } from "./webhook";

export interface CreateTransactionInput {
  amount: number;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  expiresInMinutes?: number;
}

export class TransactionService {
  static async create(merchantId: string, input: CreateTransactionInput) {
    const externalId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (input.expiresInMinutes || 30));

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { name: true },
    });

    let qrisContent: string;
    let qrisInvoiceId: string | null = null;
    let qrisNmid: string | null = null;
    let qrisRequestDate: Date | null = null;

    if (InteractiveQrisService.isConfigured()) {
      // Production: use InterActive QRIS API
      const qris = await InteractiveQrisService.createInvoice({
        cliTrxNumber: externalId,
        cliTrxAmount: input.amount,
        useTip: "no",
      });
      qrisContent = qris.qris_content;
      qrisInvoiceId = qris.qris_invoiceid;
      qrisNmid = qris.qris_nmid;
      qrisRequestDate = new Date(qris.qris_request_date.replace(" ", "T"));
    } else {
      // Fallback mode (localhost without API key): generate local QRIS
      const qris = await QrisService.generate({
        merchantId,
        merchantName: merchant?.name || "Merchant",
        amount: input.amount,
        reference: externalId,
        description: input.description,
      });
      qrisContent = qris.qrString;
    }

    const transaction = await prisma.transaction.create({
      data: {
        merchantId,
        externalId,
        amount: input.amount,
        description: input.description,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        qrisData: qrisContent,
        qrCodeUrl: qrisContent,
        qrisInvoiceId,
        qrisNmid,
        qrisRequestDate,
        expiresAt,
        status: "PENDING",
      },
    });

    return {
      id: transaction.id,
      externalId: transaction.externalId,
      amount: transaction.amount,
      status: transaction.status,
      qrCodeUrl: qrisContent,
      qrisData: qrisContent,
      qrisNmid,
      expiresAt: transaction.expiresAt,
      createdAt: transaction.createdAt,
    };
  }

  static async getById(merchantId: string, transactionId: string) {
    return prisma.transaction.findFirst({
      where: {
        id: transactionId,
        merchantId,
      },
    });
  }

  static async getByExternalId(externalId: string) {
    return prisma.transaction.findUnique({
      where: { externalId },
      include: { merchant: { select: { name: true, apiKey: true } } },
    });
  }

  static async list(
    merchantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    const where: any = { merchantId };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          externalId: true,
          amount: true,
          status: true,
          description: true,
          customerName: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async checkStatus(externalId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { externalId },
      include: { merchant: true },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "PENDING") {
      return transaction;
    }

    if (transaction.expiresAt && new Date() > transaction.expiresAt) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("Transaction expired");
    }

    // Fallback mode (no InterActive API key): simulate payment on manual check
    if (!InteractiveQrisService.isConfigured()) {
      const updated = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "SUCCESS",
          paidAt: new Date(),
          paymentMethod: "QRIS (simulated)",
          paymentReference: `SIM-${Date.now()}`,
        },
      });

      await WebhookService.send(transaction.merchantId, "payment.success", {
        externalId: updated.externalId,
        amount: updated.amount,
        status: "SUCCESS",
        paidAt: updated.paidAt,
        paymentMethod: updated.paymentMethod,
        customerName: updated.customerName,
      });

      return updated;
    }

    if (!transaction.qrisInvoiceId || !transaction.qrisRequestDate) {
      throw new Error("Transaction has no QRIS invoice");
    }

    const trxdate = transaction.qrisRequestDate
      .toISOString()
      .split("T")[0];

    const status = await InteractiveQrisService.checkStatus({
      invid: transaction.qrisInvoiceId,
      trxvalue: Number(transaction.amount),
      trxdate,
    });

    if (status.qris_status !== "paid") {
      return { ...transaction, status: "PENDING" };
    }

    // Update to success
    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        paymentMethod: status.qris_payment_methodby || "QRIS",
        paymentReference: transaction.qrisInvoiceId,
        customerName:
          status.qris_payment_customername || transaction.customerName,
      },
    });

    // Send webhook to merchant
    await WebhookService.send(transaction.merchantId, "payment.success", {
      externalId: updated.externalId,
      amount: updated.amount,
      status: "SUCCESS",
      paidAt: updated.paidAt,
      paymentMethod: updated.paymentMethod,
      customerName: updated.customerName,
    });

    return updated;
  }

  static async expirePending() {
    const expired = await prisma.transaction.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
      data: { status: "EXPIRED" },
    });

    return expired.count;
  }
}
