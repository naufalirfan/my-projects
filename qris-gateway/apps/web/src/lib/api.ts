import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: any) => api.post("/auth/register", data),
  login: (data: any) => api.post("/auth/login", data),
  profile: () => api.get("/auth/profile"),
  regenerateKey: () => api.post("/auth/regenerate-key"),
};

// Merchant API
export const merchantApi = {
  profile: () => api.get("/merchants/profile"),
  updateProfile: (data: any) => api.put("/merchants/profile", data),
  stats: () => api.get("/merchants/stats"),
  bankAccounts: () => api.get("/merchants/bank-accounts"),
  createBankAccount: (data: any) => api.post("/merchants/bank-accounts", data),
  deleteBankAccount: (id: string) => api.delete(`/merchants/bank-accounts/${id}`),
};

// Transaction API
export const transactionApi = {
  create: (data: any) => api.post("/transactions", data),
  list: (params: any) => api.get("/transactions", { params }),
  get: (id: string) => api.get(`/transactions/${id}`),
  simulate: (externalId: string) => api.post(`/transactions/${externalId}/simulate-payment`),
  checkStatus: (externalId: string) => api.post(`/transactions/${externalId}/check-status`),
};

// Webhook API
export const webhookApi = {
  list: () => api.get("/webhooks"),
  create: (data: any) => api.post("/webhooks", data),
  update: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  logs: (id: string) => api.get(`/webhooks/${id}/logs`),
};

// Settlement API
export const settlementApi = {
  list: (params: any) => api.get("/settlements", { params }),
  calculate: () => api.get("/settlements/calculate"),
  create: (data: any) => api.post("/settlements", data),
  get: (id: string) => api.get(`/settlements/${id}`),
  process: (id: string) => api.post(`/settlements/${id}/process`),
};

// QRIS API
export const qrisApi = {
  generate: (data: any) => api.post("/qris/generate", data),
};
