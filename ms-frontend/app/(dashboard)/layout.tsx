"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  FileText,
  Send,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Mail,
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contatos", href: "/contatos", icon: Users },
  { name: "Listas de Envio", href: "/listas", icon: ListTodo },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Campanhas", href: "/campanhas", icon: Send },
  { name: "Webhooks", href: "/webhooks", icon: Webhook },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f3f4f6] dark:bg-[#121212]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getPageTitle = () => {
    const active = sidebarItems.find((item) => pathname.startsWith(item.href));
    return active ? active.name : "Inboxflow";
  };

  return (
    <div className="min-h-screen flex bg-[#f3f4f6] dark:bg-[#121212] text-black dark:text-white transition-colors duration-200">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-[#1e1e1e] border-r-[3px] border-black dark:border-white transition-all duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#fb923c]/20">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-black dark:bg-white text-white dark:text-black shrink-0 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <Mail className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <span className="font-black text-md tracking-wider uppercase text-black dark:text-white">
                Inboxflow
              </span>
            )}
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-none border-2 border-black dark:border-white hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-none font-bold text-sm transition-all group ${
                  isActive
                    ? "bg-[#818cf8] text-black border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "text-slate-700 dark:text-slate-300 border-3 border-transparent hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${
                  isActive ? "text-black" : "text-slate-800 dark:text-slate-200"
                }`} />
                {!isCollapsed && <span className="uppercase tracking-wider text-[11px]">{item.name}</span>}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer / Toggle collapse */}
        <div className="p-4 border-t-[3px] border-black dark:border-white flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-none border-2 border-black dark:border-white bg-[#4ade80] text-black flex items-center justify-center font-black shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-black text-black dark:text-white truncate uppercase tracking-wider">
                  {user?.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-none border-2 border-black dark:border-white hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ml-auto shrink-0"
            aria-label="Recolher Sidebar"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main View Shell */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isCollapsed ? "lg:pl-20" : "lg:pl-64"
      }`}>
        {/* Header */}
        <header className="h-16 bg-white dark:bg-[#1e1e1e] border-b-[3px] border-black dark:border-white flex items-center justify-between px-6 sticky top-0 z-30">
          
          {/* Mobile menu trigger / Page Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 border-2 border-black dark:border-white rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-black text-black dark:text-white uppercase tracking-wider">
              {getPageTitle()}
            </h2>
          </div>

          {/* Right Header Options */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 border-2 border-black dark:border-white rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                aria-label="Alternar Tema"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center p-1 border-2 border-black dark:border-white rounded-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="h-8 w-8 rounded-none bg-[#fde047] border border-black text-black flex items-center justify-center font-black text-sm">
                  {user?.name?.charAt(0) || "U"}
                </div>
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] z-20 py-2 text-left">
                    <div className="px-4 py-2 border-b-2 border-black dark:border-white mb-2">
                      <p className="text-sm font-black text-black dark:text-white uppercase tracking-wider">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <a
                      href="/configuracoes"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-black dark:text-white hover:bg-[#818cf8] hover:text-black border-b border-dashed border-slate-200 dark:border-slate-800"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </a>
                    
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-900 text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da sessão
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
