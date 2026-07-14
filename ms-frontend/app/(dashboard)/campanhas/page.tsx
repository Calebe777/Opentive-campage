"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { Campaign, CampaignMetrics, ContactList, EmailTemplate } from "@/types";
import {
  Plus,
  Search,
  Filter,
  Send,
  Eye,
  X,
  AlertTriangle,
  Mail,
  CheckCircle,
  HelpCircle,
  Clock,
  Check,
} from "lucide-react";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Double confirmation states
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<Campaign | null>(null);
  const [doubleConfirmText, setDoubleConfirmText] = useState("");
  const [isConfirmingStep2, setIsConfirmingStep2] = useState(false);

  // Metrics Drawer state
  const [viewingMetricsCampaign, setViewingMetricsCampaign] = useState<Campaign | null>(null);

  // Queries
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("/campaigns"),
  });

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["lists"],
    queryFn: () => apiRequest("/lists"),
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["templates"],
    queryFn: () => apiRequest("/templates"),
  });

  // Campaign Metrics Query (runs when drawer opens)
  const { data: activeMetrics = null, isLoading: isLoadingMetrics } = useQuery<CampaignMetrics>({
    queryKey: ["campaign-metrics", viewingMetricsCampaign?.id],
    enabled: !!viewingMetricsCampaign,
    queryFn: () => apiRequest(`/campaigns/${viewingMetricsCampaign!.id}/metrics`),
  });

  // Send Campaign Mutation
  const sendMutation = useMutation({
    mutationFn: (campaignId: string) =>
      apiRequest(`/campaigns/${campaignId}/send`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-metrics"] });
      toast(`Campanha enfileirada! ${data.queued} disparos adicionados ao outbox.`, "success");
      closeConfirmSend();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao disparar campanha.", "error");
      closeConfirmSend();
    },
  });

  const closeConfirmSend = () => {
    setConfirmSendCampaign(null);
    setDoubleConfirmText("");
    setIsConfirmingStep2(false);
  };

  const handleStartSend = (campaign: Campaign) => {
    setConfirmSendCampaign(campaign);
    setIsConfirmingStep2(false);
    setDoubleConfirmText("");
  };

  const handleNextConfirmStep = () => {
    setIsConfirmingStep2(true);
  };

  const handleExecuteSend = () => {
    if (doubleConfirmText !== "DISPARAR") {
      toast("Para prosseguir, digite DISPARAR exatamente.", "warning");
      return;
    }
    if (confirmSendCampaign) {
      sendMutation.mutate(confirmSendCampaign.id);
    }
  };

  // Filter campaigns
  const filtered = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Safe metrics calculations
  const calculateRates = (m: CampaignMetrics | null) => {
    if (!m) return null;
    const queued = m.sends?.queued || 0;
    const processing = m.sends?.processing || 0;
    const sent = m.sends?.sent || 0;
    const delivered = m.sends?.delivered || 0;
    const failed = m.sends?.failed || 0;

    const totalSends = queued + processing + sent + delivered + failed;
    const deliveredRate = totalSends > 0 ? (delivered / totalSends) * 100 : 0;
    
    const opens = m.events?.open || 0;
    const clicks = m.events?.click || 0;
    const bounces = m.events?.bounce || 0;
    const unsubscribes = m.events?.unsub || 0;

    // Use delivered as base for open rate (safe denominator)
    const openRate = delivered > 0 ? (opens / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clicks / delivered) * 100 : 0;
    const bounceRate = totalSends > 0 ? (bounces / totalSends) * 100 : 0;
    const unsubRate = totalSends > 0 ? (unsubscribes / totalSends) * 100 : 0;

    return {
      totalSends,
      queued,
      processing,
      sent,
      delivered,
      failed,
      opens,
      clicks,
      bounces,
      unsubscribes,
      deliveredRate,
      openRate,
      clickRate,
      bounceRate,
      unsubRate,
    };
  };

  const calculated = calculateRates(activeMetrics);

  const getListName = (id: string | null) => {
    if (!id) return "—";
    const found = lists.find((l) => l.id === id);
    return found ? found.name : "—";
  };

  const getTemplateName = (id: string | null) => {
    if (!id) return "—";
    const found = templates.find((t) => t.id === id);
    return found ? found.name : "—";
  };

  const statusMap = {
    draft: { label: "Rascunho", bg: "bg-[#f3f4f6] text-black" },
    scheduled: { label: "Agendada", bg: "bg-[#818cf8] text-black" },
    sending: { label: "Enviando", bg: "bg-[#fb923c] text-black" },
    sent: { label: "Disparada", bg: "bg-[#4ade80] text-black" },
    failed: { label: "Falhou", bg: "bg-[#ef4444] text-white" },
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Campanhas</h1>
          <p className="text-sm font-bold text-slate-655 dark:text-slate-400">
            Acompanhe o status de envios de e-mails agendados, rascunhos e relatórios estatísticos.
          </p>
        </div>

        <a href="/campanhas/nova" className="neo-btn-primary px-4 py-2.5 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nova Campanha
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou assunto da campanha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 neo-input"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-5 w-5 text-black dark:text-white" />
          <div className="inline-flex border-2 border-black dark:border-white p-0.5 bg-white dark:bg-[#1e1e1e] text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            {[
              { id: "all", label: "Todas" },
              { id: "draft", label: "Rascunhos" },
              { id: "scheduled", label: "Agendadas" },
              { id: "sending", label: "Enviando" },
              { id: "sent", label: "Disparadas" },
              { id: "failed", label: "Falhas" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1.5 uppercase transition-colors ${
                  statusFilter === f.id
                    ? "bg-[#818cf8] text-black border border-black"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fb923c]/20 border-b-[3px] border-black dark:border-white">
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Campanha</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Template</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Lista Alvo</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white text-center">Status</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black dark:divide-white">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white text-center"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
                    <td className="p-4 text-center"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12 mx-auto"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-bold uppercase text-xs text-slate-400">
                    Nenhuma campanha coincide com os critérios.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const statusInfo = statusMap[c.status] || { label: c.status, bg: "bg-slate-100" };
                  const canSend = c.status === "draft" || c.status === "scheduled";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="p-4 border-r-2 border-black dark:border-white text-left">
                        <p className="font-bold text-sm text-black dark:text-white uppercase">{c.name}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">{c.subject}</p>
                      </td>
                      <td className="p-4 border-r-2 border-black dark:border-white font-bold text-xs uppercase">
                        {getTemplateName(c.template_id)}
                      </td>
                      <td className="p-4 border-r-2 border-black dark:border-white font-bold text-xs uppercase">
                        {getListName(c.list_id)}
                      </td>
                      <td className="p-4 border-r-2 border-black dark:border-white text-center">
                        <span className={`px-2.5 py-0.5 border border-black text-[9px] font-black uppercase ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          {canSend && (
                            <button
                              onClick={() => handleStartSend(c)}
                              className="px-3 py-1.5 border-2 border-black dark:border-white bg-[#4ade80] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase flex items-center gap-1"
                            >
                              <Send className="h-3 w-3" />
                              Disparar
                            </button>
                          )}
                          <button
                            onClick={() => setViewingMetricsCampaign(c)}
                            className="px-3 py-1.5 border-2 border-black dark:border-white bg-[#818cf8] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Relatório
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Double Confirmation Modal (disparo de campanha) */}
      {confirmSendCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            
            {/* Step 1: Inform details */}
            {!isConfirmingStep2 ? (
              <>
                <div className="h-12 flex items-center px-6 border-b-[3px] border-black bg-[#fb923c]/20 gap-2">
                  <AlertTriangle className="h-5 w-5 text-black" />
                  <span className="font-black uppercase tracking-wider text-xs text-black">Aviso de Disparo</span>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <p className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                    Você solicitou o início do envio imediato para a campanha:
                    <strong className="block uppercase text-sm mt-1 bg-slate-50 dark:bg-slate-900 p-2.5 border-2 border-black">
                      {confirmSendCampaign.name}
                    </strong>
                  </p>
                  <p className="text-xs font-bold leading-relaxed text-slate-655">
                    Este comando enviará mensagens de e-mail em massa aos contatos <strong>ATIVOS</strong> vinculados à lista associada.
                  </p>
                  <div className="flex justify-end gap-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <button onClick={closeConfirmSend} className="neo-btn-secondary px-4 py-2 text-xs">
                      Cancelar
                    </button>
                    <button onClick={handleNextConfirmStep} className="neo-btn-primary px-4 py-2 text-xs bg-[#fb923c]">
                      Prosseguir
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Step 2: Input command confirmation */
              <>
                <div className="h-12 flex items-center px-6 border-b-[3px] border-black bg-[#ef4444]/20 gap-2">
                  <AlertTriangle className="h-5 w-5 text-black" />
                  <span className="font-black uppercase tracking-wider text-xs text-black">Confirmação de Segurança</span>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <p className="text-xs font-bold text-slate-750">
                    Esta ação <strong>NÃO</strong> pode ser desfeita. Para confirmar a fila de disparos de e-mail marketing, digite <strong>DISPARAR</strong> no campo abaixo:
                  </p>
                  <input
                    type="text"
                    placeholder="Digite DISPARAR..."
                    value={doubleConfirmText}
                    onChange={(e) => setDoubleConfirmText(e.target.value)}
                    className="w-full py-2 px-3 neo-input font-bold text-center"
                  />
                  <div className="flex justify-end gap-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <button onClick={closeConfirmSend} className="neo-btn-secondary px-4 py-2 text-xs">
                      Cancelar
                    </button>
                    <button
                      onClick={handleExecuteSend}
                      disabled={doubleConfirmText !== "DISPARAR" || sendMutation.isPending}
                      className="neo-btn-danger px-4 py-2 text-xs flex items-center gap-1"
                    >
                      {sendMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Iniciar Disparos
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Metrics Drawer / Dialog Overlay */}
      {viewingMetricsCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-lg w-full h-full bg-white dark:bg-[#1e1e1e] border-l-[3px] border-black dark:border-white shadow-[8px_0px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#818cf8]/20 shrink-0">
              <div className="text-left truncate mr-3">
                <span className="font-black uppercase tracking-wider text-[10px] text-slate-500">Métricas da Campanha</span>
                <h3 className="font-black uppercase tracking-tight text-sm truncate text-black dark:text-white">
                  {viewingMetricsCampaign.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingMetricsCampaign(null)}
                className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-850 text-black dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              {isLoadingMetrics ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-20 bg-slate-200 dark:bg-slate-800 border-2 border-black"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-slate-200 dark:bg-slate-800 border-2 border-black"></div>
                    <div className="h-16 bg-slate-200 dark:bg-slate-800 border-2 border-black"></div>
                  </div>
                  <div className="h-48 bg-slate-200 dark:bg-slate-800 border-2 border-black"></div>
                </div>
              ) : calculated ? (
                <>
                  {/* Status header card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white font-bold text-xs space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                      <span>Status do Envio</span>
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-sm font-black text-black dark:text-white uppercase">
                      Campanha {viewingMetricsCampaign.status === "sent" ? "Concluída" : "Em Processamento"}
                    </p>
                    <p className="text-slate-500 font-semibold leading-relaxed">
                      Esta visualização consolida dados de cliques, aberturas, e taxas de entrega dos
                      disparos realizados.
                    </p>
                  </div>

                  {/* Highlight Rates Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#4ade80]/20 border-2 border-black text-center">
                      <p className="text-[10px] font-black uppercase text-slate-550">Entregue</p>
                      <p className="text-lg font-black text-emerald-650 mt-1">
                        {calculated.deliveredRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-[#818cf8]/20 border-2 border-black text-center">
                      <p className="text-[10px] font-black uppercase text-slate-550">Abertura</p>
                      <p className="text-lg font-black text-indigo-650 mt-1">
                        {calculated.openRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-[#fde047]/20 border-2 border-black text-center">
                      <p className="text-[10px] font-black uppercase text-slate-550">Cliques</p>
                      <p className="text-lg font-black text-amber-650 mt-1">
                        {calculated.clickRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Absolute volume list */}
                  <div className="border-[3px] border-black dark:border-white p-5 bg-white dark:bg-[#1e1e1e] space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider border-b border-black dark:border-white pb-2">
                      Volume Absoluto de Disparos
                    </h4>
                    
                    <div className="space-y-3 font-bold text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Total Enfileirado</span>
                        <span className="font-mono">{calculated.totalSends}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Entregues com Sucesso</span>
                        <span className="font-mono text-emerald-600">{calculated.delivered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Visualizações Únicas</span>
                        <span className="font-mono text-indigo-600">{calculated.opens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Cliques nos Links</span>
                        <span className="font-mono text-amber-650">{calculated.clicks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Erros Permanentes (Bounce)</span>
                        <span className="font-mono text-rose-600">{calculated.bounces}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 uppercase text-[10px]">Rejeições/Falhas</span>
                        <span className="font-mono text-rose-600">{calculated.failed}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-sm text-slate-400 font-bold uppercase">
                  Sem dados disponíveis na API.
                </div>
              )}
            </div>

            <div className="p-4 border-t-[3px] border-black dark:border-white bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <button
                onClick={() => setViewingMetricsCampaign(null)}
                className="w-full py-2.5 neo-btn-secondary text-xs"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
