"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { settlementApi, merchantApi } from "@/lib/api";

export default function SettlementsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: settlements, isLoading } = useQuery(
    ["settlements", page],
    () => settlementApi.list({ page, limit: 20 }),
    { refetchInterval: 10000 }
  );

  const { data: calculation } = useQuery("settlement-calc", () =>
    settlementApi.calculate()
  );

  const { data: bankAccounts } = useQuery("bank-accounts", () =>
    merchantApi.bankAccounts()
  );

  const createMutation = useMutation(
    (data: any) => settlementApi.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("settlements");
        queryClient.invalidateQueries("settlement-calc");
      },
    }
  );

  const processMutation = useMutation(
    (id: string) => settlementApi.process(id),
    {
      onSuccess: () => queryClient.invalidateQueries("settlements"),
    }
  );

  const handleCreate = () => {
    const defaultAccount = bankAccounts?.data?.find((acc: any) => acc.isDefault);
    if (!defaultAccount && bankAccounts?.data?.length > 0) {
      createMutation.mutate({ bankAccountId: bankAccounts?.data?.[0].id });
    } else if (defaultAccount) {
      createMutation.mutate({ bankAccountId: defaultAccount.id });
    } else {
      alert("Add a bank account first in Settings");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settlement</h1>
      <p className="text-gray-600 mb-8">Rekonsiliasi dan pencairan dana</p>

      {/* Pending Settlement Card */}
      {calculation?.data && calculation.data.transactionCount > 0 && (
        <div className="card mb-6 bg-gradient-to-r from-primary-50 to-primary-100">
          <h2 className="text-lg font-semibold mb-4">Pending Settlement</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">
                Rp {Number(calculation.data.totalAmount).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fee (0.7%)</p>
              <p className="text-xl font-bold text-gray-900">
                Rp {Number(calculation.data.fee).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Amount</p>
              <p className="text-xl font-bold text-primary-700">
                Rp {Number(calculation.data.netAmount).toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-xl font-bold text-gray-900">
                {calculation.data.transactionCount}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isLoading}
            className="btn btn-primary mt-4"
          >
            {createMutation.isLoading ? "Creating..." : "Create Settlement"}
          </button>
        </div>
      )}

      {/* Settlements List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Riwayat Settlement</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : settlements?.data?.data?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Belum ada settlement
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Fee</th>
                  <th className="pb-3">Net</th>
                  <th className="pb-3">Bank</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements?.data?.data?.map((s: any) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 text-sm hover:bg-gray-50"
                  >
                    <td className="py-3 font-mono text-xs">
                      {s.reference.substring(0, 8)}
                    </td>
                    <td className="py-3">{s.period}</td>
                    <td className="py-3">
                      Rp {Number(s.amount).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3">
                      Rp {Number(s.fee).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3">
                      Rp {Number(s.netAmount).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3">
                      {s.bankAccount?.bankName} -{" "}
                      {s.bankAccount?.accountNumber}
                    </td>
                    <td className="py-3">
                      <span
                        className={`badge ${
                          s.status === "COMPLETED"
                            ? "badge-success"
                            : s.status === "PENDING"
                            ? "badge-pending"
                            : "badge-failed"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {s.status === "PENDING" && (
                        <button
                          onClick={() => processMutation.mutate(s.id)}
                          className="btn btn-secondary text-xs"
                        >
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-600">
                Page {page} of {settlements?.data?.pagination?.totalPages || 1}
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
                  disabled={page >= (settlements?.data?.pagination?.totalPages || 1)}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
