import { prisma } from "../utils/prisma";

export interface SettlementPeriod {
  start: Date;
  end: Date;
  label: string;
}

export class SettlementService {
  private static FEE_PERCENTAGE = 0.7; // 0.7% fee

  static getCurrentPeriod(): SettlementPeriod {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      start,
      end,
      label: `${start.toISOString().split("T")[0]}`,
    };
  }

  static async calculateSettlement(merchantId: string) {
    const period = this.getCurrentPeriod();

    // Get successful transactions that haven't been settled
    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: "SUCCESS",
        paidAt: {
          gte: period.start,
          lt: period.end,
        },
      },
    });

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const fee = totalAmount * (this.FEE_PERCENTAGE / 100);
    const netAmount = totalAmount - fee;

    return {
      period,
      transactions,
      totalAmount,
      fee,
      netAmount,
      transactionCount: transactions.length,
    };
  }

  static async createSettlement(merchantId: string, bankAccountId: string) {
    const calculation = await this.calculateSettlement(merchantId);

    if (calculation.transactionCount === 0) {
      throw new Error("No transactions to settle");
    }

    const settlement = await prisma.settlement.create({
      data: {
        merchantId,
        bankAccountId,
        amount: calculation.totalAmount,
        fee: calculation.fee,
        netAmount: calculation.netAmount,
        period: calculation.period.label,
        status: "PENDING",
      },
    });

    return settlement;
  }

  static async processSettlement(settlementId: string) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { bankAccount: true },
    });

    if (!settlement) {
      throw new Error("Settlement not found");
    }

    if (settlement.status !== "PENDING") {
      throw new Error("Settlement is not pending");
    }

    // Update status to processing
    await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: "PROCESSING" },
    });

    // Here you would integrate with bank API
    // For now, simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update to completed
    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    return updated;
  }

  static async list(
    merchantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    const where: any = { merchantId };
    if (status) where.status = status;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true,
              accountName: true,
            },
          },
        },
      }),
      prisma.settlement.count({ where }),
    ]);

    return {
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(merchantId: string, settlementId: string) {
    return prisma.settlement.findFirst({
      where: {
        id: settlementId,
        merchantId,
      },
      include: {
        bankAccount: {
          select: {
            bankName: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });
  }
}
