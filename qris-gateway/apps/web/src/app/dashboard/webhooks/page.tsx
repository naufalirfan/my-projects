"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { webhookApi } from "@/lib/api";

export default function WebhooksPage() {
  const [url, setUrl] = useState("");
  const [selectedLogs, setSelectedLogs] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery("webhooks", () =>
    webhookApi.list()
  );

  const { data: logs } = useQuery(
    ["webhook-logs", selectedLogs],
    () => webhookApi.logs(selectedLogs!),
    { enabled: !!selectedLogs }
  );

  const createMutation = useMutation(
    (data: any) => webhookApi.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("webhooks");
        setUrl("");
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => webhookApi.delete(id),
    {
      onSuccess: () => queryClient.invalidateQueries("webhooks"),
    }
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Webhooks</h1>
      <p className="text-gray-600 mb-8">
        Konfigurasi callback URL untuk notifikasi pembayaran
      </p>

      {/* Add Webhook */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Tambah Webhook</h2>
        <div className="flex gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-site.com/webhook"
            className="input flex-1"
          />
          <button
            onClick={() => url && createMutation.mutate({ url })}
            disabled={createMutation.isLoading || !url}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      </div>

      {/* Webhook List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Daftar Webhooks</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : webhooks?.data?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Belum ada webhook
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks?.data?.map((wh: any) => (
              <div
                key={wh.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{wh.url}</p>
                  <div className="flex gap-2 mt-2">
                    {wh.events.map((event: string) => (
                      <span key={event} className="badge badge-pending">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedLogs(selectedLogs === wh.id ? null : wh.id)
                    }
                    className="btn btn-secondary text-sm"
                  >
                    {selectedLogs === wh.id ? "Hide Logs" : "Logs"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(wh.id)}
                    className="btn btn-danger text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {/* Logs */}
            {selectedLogs && logs && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Recent Logs</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {logs.data?.map((log: any) => (
                    <div
                      key={log.id}
                      className="text-xs p-2 bg-white rounded border"
                    >
                      <div className="flex justify-between">
                        <span className="font-mono">{log.statusCode}</span>
                        <span
                          className={log.success ? "text-green-600" : "text-red-600"}
                        >
                          {log.success ? "SUCCESS" : "FAILED"}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">
                        {new Date(log.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
