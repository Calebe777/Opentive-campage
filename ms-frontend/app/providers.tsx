"use client";

import React, { useState, createContext, useContext, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/auth-context";

// Simple Toast Notification Context
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <ToastContext.Provider value={{ toast }}>
            {children}
            
            {/* Toast Container Render */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 opacity-100 flex justify-between items-start pointer-events-auto ${
                    t.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900 dark:text-emerald-300"
                      : t.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900 dark:text-rose-300"
                      : t.type === "warning"
                      ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-900 dark:text-amber-300"
                      : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span>{t.message}</span>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                    className="ml-4 hover:opacity-75 focus:outline-none"
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </ToastContext.Provider>
        </AuthProvider>
      </NextThemeProvider>
    </QueryClientProvider>
  );
}
