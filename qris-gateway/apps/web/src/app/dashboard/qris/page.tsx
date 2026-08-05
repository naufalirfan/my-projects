"use client";

import { useState } from "react";
import { useMutation } from "react-query";
import { QRCodeCanvas } from "qrcode.react";
import { qrisApi } from "@/lib/api";

export default function QrisPage() {
  const [form, setForm] = useState({
    amount: "",
    description: "",
    reference: "",
  });
  const [result, setResult] = useState<any>(null);

  const generateMutation = useMutation(
    (data: any) => qrisApi.generate(data),
    {
      onSuccess: (data) => setResult(data.data),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      amount: parseFloat(form.amount),
      description: form.description,
      reference: form.reference || undefined,
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Buat QRIS</h1>
      <p className="text-gray-600 mb-8">Generate QR code QRIS untuk pembayaran</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Detail Pembayaran</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (IDR)
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input"
                placeholder="10000"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi (opsional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="input"
                placeholder="Pembayaran order #123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference (opsional)
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="input"
                placeholder="AUTO-GENERATED"
              />
            </div>

            <button
              type="submit"
              disabled={generateMutation.isLoading}
              className="btn btn-primary w-full"
            >
              {generateMutation.isLoading ? "Generating..." : "Generate QRIS"}
            </button>
          </form>
        </div>

        {/* QR Result */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">QR Code</h2>
          {result ? (
            <div className="text-center">
              <div className="inline-block p-4 bg-white border rounded-lg shadow-sm">
                <QRCodeCanvas
                  value={result.qrString}
                  size={256}
                  level="M"
                />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-600">
                  Amount:{" "}
                  <span className="font-semibold">
                    Rp {parseFloat(form.amount).toLocaleString("id-ID")}
                  </span>
                </p>
                <p className="text-gray-600 break-all">
                  Reference:{" "}
                  <span className="font-mono text-xs">{result.reference}</span>
                </p>
                <details className="text-left">
                  <summary className="cursor-pointer text-primary-600">
                    Show QRIS Data
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {result.qrString}
                  </pre>
                </details>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              QR code akan muncul di sini
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
