"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMerchantStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useMerchantStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
