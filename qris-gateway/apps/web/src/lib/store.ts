import { create } from "zustand";

interface MerchantState {
  token: string | null;
  merchant: any;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setMerchant: (merchant: any) => void;
  logout: () => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  merchant: null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("token") : false,
  setToken: (token: string) => {
    if (typeof window !== "undefined") localStorage.setItem("token", token);
    set({ token, isAuthenticated: true });
  },
  setMerchant: (merchant: any) => set({ merchant }),
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("token");
    set({ token: null, merchant: null, isAuthenticated: false });
  },
}));
