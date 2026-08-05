import { prisma } from "../utils/prisma";

export class MerchantService {
  static async getProfile(merchantId: string) {
    return prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        apiKey: true,
        _count: {
          select: {
            transactions: true,
            settlements: true,
            webhooks: true,
          },
        },
      },
    });
  }

  static async updateProfile(
    merchantId: string,
    data: { name?: string; phone?: string }
  ) {
    return prisma.merchant.update({
      where: { id: merchantId },
      data,
    });
  }

  static async createBankAccount(
    merchantId: string,
    data: {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      isDefault?: boolean;
    }
  ) {
    if (data.isDefault) {
      // Remove default from others
      await prisma.bankAccount.updateMany({
        where: { merchantId },
        data: { isDefault: false },
      });
    }

    return prisma.bankAccount.create({
      data: {
        ...data,
        merchantId,
      },
    });
  }

  static async getBankAccounts(merchantId: string) {
    return prisma.bankAccount.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async deleteBankAccount(merchantId: string, accountId: string) {
    return prisma.bankAccount.deleteMany({
      where: {
        id: accountId,
        merchantId,
      },
    });
  }

  static async getStats(merchantId: string) {
    const [totalTransactions, successTransactions, totalVolume, pendingSettlements] =
      await Promise.all([
        prisma.transaction.count({ where: { merchantId } }),
        prisma.transaction.count({ where: { merchantId, status: "SUCCESS" } }),
        prisma.transaction.aggregate({
          where: { merchantId, status: "SUCCESS" },
          _sum: { amount: true },
        }),
        prisma.settlement.count({ where: { merchantId, status: "PENDING" } }),
      ]);

    return {
      totalTransactions,
      successTransactions,
      failedTransactions: totalTransactions - successTransactions,
      totalVolume: totalVolume._sum.amount || 0,
      pendingSettlements,
    };
  }
}
