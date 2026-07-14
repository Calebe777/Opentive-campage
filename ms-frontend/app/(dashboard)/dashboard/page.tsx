"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { Campaign, Contact, CampaignMetrics } from "@/types";
import {
  Users,
  Send,
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Plus,
  BarChart2,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type PeriodDays = 7 | 30 | 90;

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodDays>(30);

  // Fetch Campaigns
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("/campaigns"),
  });

  // Fetch Contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/contacts"),
  });

  // Fetch metrics for all campaigns
  const { data: allMetrics = {}, isLoading: isLoadingMetrics } = useQuery<Record<string, CampaignMetrics>>({
    queryKey: ["campaigns-metrics", campaigns.map((c) => c.id)],
    enabled: campaigns.length > 0,
    queryFn: async () => {
      const results: Record<string, CampaignMetrics> = {};
      const promises = campaigns.map(async (c) => {
        try {
          const metrics = await apiRequest(`/campaigns/${c.id}/metrics`);
          results[c.id] = metrics;
        } catch (e) {
          console.error(`Failed to fetch metrics for campaign ${c.id}`, e);
        }
      });
      await Promise.all(promises);
      return results;
    },
  });

  // Filter campaigns by selected period
  const getFilteredCampaigns = () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return campaigns.filter((c) => new Date(c.created_at) >= cutoff);
  };

  const filteredCampaigns = getFilteredCampaigns();

  // Aggregate Metrics
  const aggregateMetrics = () => {
    if (isLoadingCampaigns || isLoadingMetrics) {
      return {
        campaignsCount: null,
        contactsCount: null,
        sendsCount: null,
        opensCount: null,
        clicksCount: null,
        failuresCount: null,
      };
    }

    let sendsCount = 0;
    let opensCount = 0;
    let clicksCount = 0;
    let failuresCount = 0;

    filteredCampaigns.forEach((c) => {
      const m = allMetrics[c.id];
      if (m) {
        const queued = m.sends?.queued || 0;
        const processing = m.sends?.processing || 0;
        const sent = m.sends?.sent || 0;
        const delivered = m.sends?.delivered || 0;
        const failed = m.sends?.failed || 0;

        sendsCount += queued + processing + sent + delivered;
        failuresCount += failed;

        opensCount += m.events?.open || 0;
        clicksCount += m.events?.click || 0;
      }
    });

    return {
      campaignsCount: filteredCampaigns.length,
      contactsCount: contacts.length,
      sendsCount,
      opensCount,
      clicksCount,
      failuresCount,
    };
  };

  const stats = aggregateMetrics();

  // Generate chart data based on filtered campaigns
  const getChartData = () => {
    // Group metrics by day
    const dayMap: Record<string, { sent: number; opens: number; clicks: number }> = {};
    
    // Initialize days in the period
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      dayMap[dateStr] = { sent: 0, opens: 0, clicks: 0 };
    }

    filteredCampaigns.forEach((c) => {
      const dateStr = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      const m = allMetrics[c.id];
      if (dayMap[dateStr] !== undefined && m) {
        const queued = m.sends?.queued || 0;
        const processing = m.sends?.processing || 0;
        const sent = m.sends?.sent || 0;
        const delivered = m.sends?.delivered || 0;

        dayMap[dateStr].sent += queued + processing + sent + delivered;
        dayMap[dateStr].opens += m.events?.open || 0;
        dayMap[dateStr].clicks += m.events?.click || 0;
      }
    });

    return Object.entries(dayMap).map(([day, val]) => ({
      name: day,
      "Cliques": val.clicks,
      "Aberturas": val.opens,
      "Enviados": val.sent,
    }));
  };

  const chartData = getChartData();

  const isDataLoading = isLoadingCampaigns || isLoadingContacts || (campaigns.length > 0 && isLoadingMetrics);

  const formatStat = (val: number | null) => {
    if (isDataLoading || val === null) return "—";
    return val.toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Welcome / Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Visão Geral</h1>
          <p className="text-sm font-bold text-slate-650 dark:text-slate-400">
            Acompanhe o desempenho dos seus disparos e crescimento de contatos.
          </p>
        </div>

        {/* Period Selector Toggle */}
        <div className="inline-flex border-[3px] border-black dark:border-white p-1 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-xs font-black shrink-0">
          {([7, 30, 90] as PeriodDays[]).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 transition-colors uppercase ${
                period === d
                  ? "bg-[#818cf8] text-black border-2 border-black"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Últimos {d} dias
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <a
          href="/campanhas/nova"
          className="flex items-center gap-4 p-5 bg-[#fde047] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <div className="p-3 bg-black text-white border-2 border-black">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-black uppercase tracking-wider">Nova Campanha</p>
            <p className="text-xs font-bold text-slate-850">Crie um novo disparo</p>
          </div>
        </a>

        <a
          href="/contatos"
          className="flex items-center gap-4 p-5 bg-[#fb923c] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <div className="p-3 bg-black text-white border-2 border-black">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-black uppercase tracking-wider">Novo Contato</p>
            <p className="text-xs font-bold text-slate-850">Gerencie contatos e leads</p>
          </div>
        </a>

        <a
          href="/templates/novo"
          className="flex items-center gap-4 p-5 bg-[#4ade80] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <div className="p-3 bg-black text-white border-2 border-black">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-black uppercase tracking-wider">Criar Template</p>
            <p className="text-xs font-bold text-slate-850">Layouts com HTML ou IA</p>
          </div>
        </a>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
        {/* Campanhas */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Campanhas</span>
            <Send className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black">{formatStat(stats.campaignsCount)}</p>
        </div>

        {/* Contatos */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Contatos</span>
            <Users className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black">{formatStat(stats.contactsCount)}</p>
        </div>

        {/* Enviados */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-indigo-50/30">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Enviados</span>
            <Mail className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black text-indigo-650 dark:text-indigo-400">{formatStat(stats.sendsCount)}</p>
        </div>

        {/* Aberturas */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-emerald-50/30">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Aberturas</span>
            <Eye className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black text-emerald-650 dark:text-emerald-450">{formatStat(stats.opensCount)}</p>
        </div>

        {/* Cliques */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-amber-50/30">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Cliques</span>
            <MousePointerClick className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-450">{formatStat(stats.clicksCount)}</p>
        </div>

        {/* Falhas */}
        <div className="p-4 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-rose-50/30">
          <div className="flex justify-between items-center text-slate-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Falhas</span>
            <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
          </div>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-455">{formatStat(stats.failuresCount)}</p>
        </div>
      </div>

      {/* Main Charts & History section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Chart */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <div className="flex justify-between items-center border-b-2 border-black dark:border-white pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
              <h3 className="font-black uppercase tracking-wider text-sm">Desempenho de Disparos</h3>
            </div>
            <span className="text-[10px] font-bold uppercase text-slate-550 dark:text-slate-450 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Histórico no período
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            {isDataLoading ? (
              <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-[3px] border-black dark:border-white border-dashed">
                <div className="animate-pulse flex flex-col items-center gap-2 text-slate-500">
                  <BarChart2 className="h-8 w-8 animate-bounce text-black dark:text-white" />
                  <span className="text-xs font-bold uppercase">Carregando métricas...</span>
                </div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-[3px] border-black dark:border-white border-dashed">
                <span className="text-sm font-bold uppercase text-slate-400">Nenhum disparo realizado no período.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAberturas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-800" strokeWidth={2} />
                  <XAxis dataKey="name" stroke="#000000" fontSize={10} tickLine={true} axisLine={true} className="font-bold dark:stroke-white dark:fill-white" />
                  <YAxis stroke="#000000" fontSize={10} tickLine={true} axisLine={true} className="font-bold dark:stroke-white dark:fill-white" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "3px solid #000000",
                      borderRadius: "0px",
                      color: "#000000",
                      fontFamily: "monospace",
                      fontWeight: "bold",
                    }}
                  />
                  <Area type="monotone" dataKey="Enviados" stroke="#000000" fillOpacity={1} fill="url(#colorEnviados)" strokeWidth={3} />
                  <Area type="monotone" dataKey="Aberturas" stroke="#000000" fillOpacity={1} fill="url(#colorAberturas)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent campaigns side bar */}
        <div className="p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <h3 className="font-black uppercase tracking-wider text-sm border-b-2 border-black dark:border-white pb-3">Campanhas Recentes</h3>
          
          <div className="space-y-4 max-h-[17.5rem] overflow-y-auto pr-1">
            {isDataLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse p-3 border-2 border-black dark:border-white flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-350 dark:bg-slate-800 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-1/2"></div>
                  </div>
                  <div className="h-5 bg-slate-350 dark:bg-slate-800 rounded w-12"></div>
                </div>
              ))
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-8 font-bold uppercase text-xs text-slate-400">
                Nenhuma campanha recente.
              </div>
            ) : (
              filteredCampaigns.slice(0, 5).map((c) => {
                const badgeColor =
                  c.status === "sent"
                    ? "bg-[#4ade80]"
                    : c.status === "sending"
                    ? "bg-[#fb923c]"
                    : c.status === "scheduled"
                    ? "bg-[#818cf8]"
                    : c.status === "failed"
                    ? "bg-[#ef4444] text-white"
                    : "bg-[#f3f4f6]";
                
                const statusMap = {
                  draft: "Rascunho",
                  scheduled: "Agendada",
                  sending: "Enviando",
                  sent: "Disparada",
                  failed: "Falhou",
                };

                return (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  >
                    <div className="truncate text-left flex-1 mr-4">
                      <p className="text-xs font-black truncate uppercase text-black dark:text-white">
                        {c.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase ${badgeColor} text-black`}>
                      {statusMap[c.status]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
