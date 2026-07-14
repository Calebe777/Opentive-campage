"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "next-themes";
import {
  Settings,
  ShieldCheck,
  Server,
  User,
  Info,
  Sun,
  Moon,
  CheckCircle,
} from "lucide-react";

export default function ConfigPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Configurações</h1>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Gerenciamento técnico, domínio e status da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Session Status & Theme */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Profile Info Card */}
          <div className="p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black dark:border-white pb-3">
              <User className="h-5 w-5 text-[#818cf8]" />
              <h3 className="font-black uppercase tracking-wider text-sm">Sua Conta</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Nome do Usuário</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white uppercase text-xs">
                  {user?.name || "NÃO IDENTIFICADO"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">E-mail Cadastrado</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white text-xs">
                  {user?.email || "NÃO IDENTIFICADO"}
                </div>
              </div>
            </div>
          </div>

          {/* System API settings */}
          <div className="p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black dark:border-white pb-3">
              <Server className="h-5 w-5 text-[#fb923c]" />
              <h3 className="font-black uppercase tracking-wider text-sm">Integração & Servidor</h3>
            </div>

            <div className="space-y-4 text-sm font-bold">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Endpoint da API FastAPI</span>
                <div className="p-3 bg-[#fde047]/10 dark:bg-yellow-950/20 border-2 border-black dark:border-white font-mono text-xs flex justify-between items-center">
                  <span>{apiEndpoint}</span>
                  <span className="px-2 py-0.5 border border-black bg-[#4ade80] text-[9px] font-black text-black uppercase">
                    Conectado
                  </span>
                </div>
              </div>

              {/* Warning box */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-black dark:border-white text-xs space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-400 uppercase">
                  <Info className="h-4 w-4" />
                  Segurança SMTP & Credenciais
                </div>
                <p className="text-slate-500 dark:text-slate-300 font-bold leading-relaxed">
                  As chaves internas de envio (`INTERNAL_API_KEY`) e as credenciais SMTP do servidor
                  de disparo de e-mails são gerenciadas de forma centralizada e segura no ambiente de
                  variáveis do microsserviço `ms-backend`. Nenhum dado sensível de configuração é
                  exposto ou enviado pelo navegador.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Domais Setup (SPF/DKIM/DMARC) */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-black dark:border-white pb-3">
              <ShieldCheck className="h-5 w-5 text-[#4ade80]" />
              <h3 className="font-black uppercase tracking-wider text-sm">Entregabilidade</h3>
            </div>

            <p className="text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400">
              Para garantir que seus e-mails cheguem na caixa de entrada do destinatário sem cair em spam,
              adicione estes registros DNS em sua hospedagem:
            </p>

            <div className="space-y-4 text-xs font-bold">
              {/* SPF */}
              <div className="p-3 border-2 border-black dark:border-white bg-slate-50 dark:bg-slate-900 space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <div className="flex justify-between items-center">
                  <span className="font-black text-black dark:text-white uppercase tracking-wider">SPF (TXT)</span>
                  <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] break-all">
                  v=spf1 include:inboxflow.com ~all
                </div>
              </div>

              {/* DKIM */}
              <div className="p-3 border-2 border-black dark:border-white bg-slate-50 dark:bg-slate-900 space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <div className="flex justify-between items-center">
                  <span className="font-black text-black dark:text-white uppercase tracking-wider">DKIM (TXT)</span>
                  <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] break-all">
                  k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
                </div>
              </div>

              {/* DMARC */}
              <div className="p-3 border-2 border-black dark:border-white bg-slate-50 dark:bg-slate-900 space-y-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <div className="flex justify-between items-center">
                  <span className="font-black text-black dark:text-white uppercase tracking-wider">DMARC (TXT)</span>
                  <CheckCircle className="h-4 w-4 text-[#4ade80]" />
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] break-all">
                  v=DMARC1; p=quarantine; pct=100;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
