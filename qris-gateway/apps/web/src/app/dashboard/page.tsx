"use client";

import { useQuery } from "react-query";
import { merchantApi, transactionApi } from "@/lib/api";
import { useMerchantStore } from "@/lib/store";
import {
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { merchant } = useMerchantStore();
  const router = useRouter();

  const { data: stats } = useQuery("stats", () => merchantApi.stats());
  const { data: transactions } = useQuery(
    "recent-transactions",
    () => transactionApi.list({ limit: 5 }),
    { refetchInterval: 5000 }
  );

  const statCards = [
    {
      label: "Total Volume",
      value: `Rp ${(stats?.data?.totalVolume || 0).toLocaleString("id-ID")}`,
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Transaksi Sukses",
      value: stats?.data?.successTransactions || 0,
      icon: CheckCircle,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Transaksi Pending",
      value: stats?.data?.pendingSettlements || 0,
      icon: Clock,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Total Transaksi",
      value: stats?.data?.totalTransactions || 0,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Selamat datang, {merchant?.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Kelola pembayaran QRIS Anda di sini
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/qris")}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Buat QRIS</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Transaksi Terbaru</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                <th className="pb-3">External ID</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.data?.data?.map((tx: any) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-100 text-sm hover:bg-gray-50"
                >
                  <td className="py-3 font-mono text-xs">{tx.externalId}</td>
                  <td className="py-3">
                    Rp {Number(tx.amount).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3">
                    <span
                      className={`badge ${
                        tx.status === "SUCCESS"
                          ? "badge-success"
                          : tx.status === "PENDING"
                          ? "badge-pending"
                          : "badge-failed"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3">{tx.customerName || "-"}</td>
                  <td className="py-3">
                    {new Date(tx.createdAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
