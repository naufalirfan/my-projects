"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { QRCodeCanvas } from "qrcode.react";
import { transactionApi } from "@/lib/api";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [newTx, setNewTx] = useState({ amount: "", description: "", customerName: "" });
  const [qrTx, setQrTx] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery(
    ["transactions", page, status],
    () => transactionApi.list({ page, limit: 20, status: status || undefined }),
    { refetchInterval: 5000 }
  );

  const createTransaction = async () => {
    if (!newTx.amount) return;
    try {
      await transactionApi.create({
        amount: parseFloat(newTx.amount),
        description: newTx.description,
        customerName: newTx.customerName,
        expiresInMinutes: 30,
      });
      setNewTx({ amount: "", description: "", customerName: "" });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create");
    }
  };

  const checkStatusMutation = useMutation(
    (externalId: string) => transactionApi.checkStatus(externalId),
    {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries("stats");
      },
    }
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaksi</h1>
      <p className="text-gray-600 mb-4">Kelola semua transaksi QRIS</p>
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-4">
        Mode localhost: InterActive API belum dikonfigurasi. Klik <b>"Cek Status"</b> pada
        transaksi PENDING untuk mensimulasikan pembayaran berhasil.
      </div>

      {/* Create Transaction */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Buat Transaksi Baru</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="number"
            value={newTx.amount}
            onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
            placeholder="Amount"
            className="input"
          />
          <input
            type="text"
            value={newTx.description}
            onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
            placeholder="Description"
            className="input"
          />
          <input
            type="text"
            value={newTx.customerName}
            onChange={(e) => setNewTx({ ...newTx, customerName: e.target.value })}
            placeholder="Customer Name"
            className="input"
          />
          <button onClick={createTransaction} className="btn btn-primary">
            Create
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-48"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3">External ID</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.data?.map((tx: any) => (
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
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQrTx(tx)}
                          className="btn btn-secondary text-xs"
                        >
                          QR
                        </button>
                        {tx.status === "PENDING" && (
                          <button
                            onClick={() => checkStatusMutation.mutate(tx.externalId)}
                            disabled={checkStatusMutation.isLoading}
                            className="btn btn-primary text-xs"
                          >
                            Cek Status
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-600">
                Page {page} of {data?.data?.pagination?.totalPages || 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (data?.data?.pagination?.totalPages || 1)}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={() => setQrTx(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="text-center">
              <div className="inline-block p-4 bg-white border rounded-lg">
                <QRCodeCanvas value={qrTx.qrisData || qrTx.qrCodeUrl} size={220} level="M" />
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Rp {Number(qrTx.amount).toLocaleString("id-ID")}
              </p>
              <p className="text-xs font-mono text-gray-400 mt-1">
                {qrTx.externalId}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
