"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f3f4f6] dark:bg-[#121212]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fde047]/10 dark:bg-[#121212] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#1e1e1e] p-8 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#818cf8] text-black border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white uppercase">
            Inboxflow
          </h1>
          <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Plataforma de E-mail Marketing de alta performance
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
