"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { merchantApi, authApi } from "@/lib/api";
import { useMerchantStore } from "@/lib/store";

export default function SettingsPage() {
  const { merchant, setMerchant } = useMerchantStore();
  const queryClient = useQueryClient();
  const [newAccount, setNewAccount] = useState({
    bankCode: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    isDefault: false,
  });

  const { data: bankAccounts } = useQuery("bank-accounts", () =>
    merchantApi.bankAccounts()
  );

  const { data: profile } = useQuery("merchant-profile", () =>
    merchantApi.profile()
  );

  const createAccountMutation = useMutation(
    (data: any) => merchantApi.createBankAccount(data),
    {
      onSuccess: () => queryClient.invalidateQueries("bank-accounts"),
    }
  );

  const deleteAccountMutation = useMutation(
    (id: string) => merchantApi.deleteBankAccount(id),
    {
      onSuccess: () => queryClient.invalidateQueries("bank-accounts"),
    }
  );

  const regenerateKeyMutation = useMutation(() => authApi.regenerateKey(), {
    onSuccess: () => {
      queryClient.invalidateQueries("merchant-profile");
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Pengaturan</h1>
      <p className="text-gray-600 mb-8">Kelola profil dan API keys</p>

      {/* API Keys */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">API Keys</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profile?.data?.apiKey || merchant?.apiKey || ""}
                readOnly
                className="input font-mono text-xs"
              />
              <button
                onClick={() => regenerateKeyMutation.mutate()}
                className="btn btn-secondary whitespace-nowrap"
              >
                Regenerate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Gunakan API key ini untuk autentikasi API requests
            </p>
          </div>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Rekening Bank</h2>

        {/* Existing accounts */}
        {bankAccounts?.data?.length > 0 && (
          <div className="space-y-3 mb-6">
            {bankAccounts?.data?.map((acc: any) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {acc.bankName} - {acc.accountNumber}
                  </p>
                  <p className="text-sm text-gray-600">{acc.accountName}</p>
                  {acc.isDefault && (
                    <span className="badge badge-success mt-1">Default</span>
                  )}
                </div>
                <button
                  onClick={() => deleteAccountMutation.mutate(acc.id)}
                  className="btn btn-danger text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new account */}
        <h3 className="font-medium mb-3">Tambah Rekening</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={newAccount.bankCode}
            onChange={(e) =>
              setNewAccount({ ...newAccount, bankCode: e.target.value })
            }
            placeholder="Bank Code (e.g. BCA)"
            className="input"
          />
          <input
            type="text"
            value={newAccount.bankName}
            onChange={(e) =>
              setNewAccount({ ...newAccount, bankName: e.target.value })
            }
            placeholder="Bank Name"
            className="input"
          />
          <input
            type="text"
            value={newAccount.accountNumber}
            onChange={(e) =>
              setNewAccount({ ...newAccount, accountNumber: e.target.value })
            }
            placeholder="Account Number"
            className="input"
          />
          <input
            type="text"
            value={newAccount.accountName}
            onChange={(e) =>
              setNewAccount({ ...newAccount, accountName: e.target.value })
            }
            placeholder="Account Name"
            className="input"
          />
        </div>
        <div className="flex items-center mt-4 space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={newAccount.isDefault}
              onChange={(e) =>
                setNewAccount({ ...newAccount, isDefault: e.target.checked })
              }
            />
            <span className="text-sm text-gray-700">Set as default</span>
          </label>
          <button
            onClick={() => {
              if (
                newAccount.bankCode &&
                newAccount.bankName &&
                newAccount.accountNumber &&
                newAccount.accountName
              ) {
                createAccountMutation.mutate(newAccount);
                setNewAccount({
                  bankCode: "",
                  bankName: "",
                  accountNumber: "",
                  accountName: "",
                  isDefault: false,
                });
              }
            }}
            disabled={createAccountMutation.isLoading}
            className="btn btn-primary"
          >
            Add Account
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Profil</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-600">Name:</span> {profile?.data?.name}
          </p>
          <p>
            <span className="text-gray-600">Email:</span> {profile?.data?.email}
          </p>
          <p>
            <span className="text-gray-600">Phone:</span>{" "}
            {profile?.data?.phone || "-"}
          </p>
          <p>
            <span className="text-gray-600">Status:</span>{" "}
            <span className="badge badge-success">{profile?.data?.status}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
