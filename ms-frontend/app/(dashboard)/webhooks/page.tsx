"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { webhookSchema } from "@/lib/validations/schemas";
import { LeadWebhook, ContactList } from "@/types";
import {
  Plus,
  Webhook as WebhookIcon,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
  Info,
  X,
  Code,
} from "lucide-react";
import { z } from "zod";

type WebhookFormValues = z.infer<typeof webhookSchema>;

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Selected webhook for details panel
  const [selectedWebhook, setSelectedWebhook] = useState<LeadWebhook | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Queries
  const { data: webhooks = [], isLoading } = useQuery<LeadWebhook[]>({
    queryKey: ["webhooks"],
    queryFn: () => apiRequest("/webhooks"),
  });

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["lists"],
    queryFn: () => apiRequest("/lists"),
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: (newWebhook: any) =>
      apiRequest("/webhooks", {
        method: "POST",
        body: JSON.stringify(newWebhook),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast("Webhook criado com sucesso!", "success");
      setIsCreateModalOpen(false);
      setSelectedWebhook(data); // Open details panel for the new webhook
      reset();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao criar webhook.", "error");
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      target_list: "",
      secret: "",
    },
  });

  const onSubmit = (values: WebhookFormValues) => {
    const payload = {
      name: values.name,
      target_list: values.target_list || null,
      secret: values.secret || null,
    };
    createWebhookMutation.mutate(payload);
  };

  const getListName = (id: string | null) => {
    if (!id) return "Sem lista vinculada";
    const found = lists.find((l) => l.id === id);
    return found ? found.name : "Lista não encontrada";
  };

  const handleCopy = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Copiado para a área de transferência!", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  const getWebhookUrl = (token: string) => {
    return `${apiEndpoint}/webhook/leads/${token}`;
  };

  const getCurlExample = (token: string) => {
    return `curl -X POST "${getWebhookUrl(token)}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Delivery: uuid-unico-da-requisicao" \\
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "phone": "+5511999998888",
    "source": "landing-page",
    "custom_fields": {
      "cargo": "CTO"
    }
  }'`;
  };

  const payloadExample = `{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "+5511999998888",
  "source": "landing-page",
  "custom_fields": {
    "cargo": "CTO"
  }
}`;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-black dark:border-white pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Webhooks de Leads</h1>
          <p className="text-sm font-bold text-slate-655 dark:text-slate-400">
            Cadastre endpoints para receber novos contatos de formulários externos de forma automatizada.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="neo-btn-primary px-4 py-2.5 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Novo Webhook
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Webhooks List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Endpoints Ativos</h3>
          
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="animate-pulse p-4 border-2 border-black bg-white h-20"></div>
            ))
          ) : webhooks.length === 0 ? (
            <div className="p-8 text-center border-[3px] border-black border-dashed bg-white dark:bg-[#1e1e1e]">
              <WebhookIcon className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-xs uppercase text-slate-450">Nenhum webhook ativo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((w) => {
                const isSelected = selectedWebhook?.id === w.id;
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWebhook(w)}
                    className={`p-4 border-[3px] border-black cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] ${
                      isSelected
                        ? "bg-[#818cf8] text-black border-indigo-600 scale-[1.01]"
                        : "bg-white dark:bg-[#1e1e1e] hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-black text-xs uppercase truncate tracking-wider">
                        {w.name}
                      </span>
                      <span className={`px-1.5 py-0.5 border border-black text-[8px] font-black uppercase ${
                        w.is_active ? "bg-[#4ade80]" : "bg-[#ef4444]"
                      } text-black`}>
                        {w.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>Lista: {getListName(w.target_list)}</span>
                      <span>{w.total_leads} leads</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Integration Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWebhook ? (
            <div className="p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-6">
              <div className="flex justify-between items-center border-b-2 border-black dark:border-white pb-3">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-slate-450">Detalhes de Integração</span>
                  <h3 className="font-black uppercase tracking-tight text-sm text-black dark:text-white">
                    {selectedWebhook.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedWebhook(null)}
                  className="p-1 border-2 border-black dark:border-white bg-slate-100 text-black rounded-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Endpoint Address Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500 block">URL do Endpoint de Integração</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white font-mono text-[10px] break-all flex justify-between items-center gap-3">
                  <span className="text-black dark:text-white font-bold">{getWebhookUrl(selectedWebhook.token)}</span>
                  <button
                    onClick={() => handleCopy(getWebhookUrl(selectedWebhook.token), setCopiedUrl)}
                    className="p-1.5 bg-white border border-black hover:bg-slate-100 shrink-0 text-black flex items-center gap-1 font-black text-[9px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedUrl ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* Header Info Banner */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-black dark:border-white text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-black uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                  <ShieldAlert className="h-4 w-4" />
                  Cabeçalho de Identificação Obrigatório
                </div>
                <p>
                  As requisições POST enviadas a este endpoint <strong>DEVEM</strong> incluir o cabeçalho
                  HTTP <code>X-Webhook-Delivery</code> contendo um identificador único de entrega (ex: UUIDv4)
                  para evitar duplicidade.
                </p>
                {selectedWebhook.token && (
                  <p>
                    Como este webhook possui chave ou token, o servidor validará a requisição. Caso tenha
                    configurado um <strong>Secret</strong>, o cabeçalho <code>X-Webhook-Signature</code>
                    será validado no formato HMAC-SHA256: <code>sha256=&lt;assinatura-hash&gt;</code>.
                  </p>
                )}
              </div>

              {/* cURL Example Container */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5 text-[#fb923c]" />
                    Exemplo de Requisição cURL
                  </span>
                  <button
                    onClick={() => handleCopy(getCurlExample(selectedWebhook.token), setCopiedCurl)}
                    className="text-[9px] font-black uppercase underline hover:text-indigo-650 text-black dark:text-white"
                  >
                    {copiedCurl ? "Copiado!" : "Copiar Snippet"}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 border-2 border-black text-slate-100 text-[10px] font-mono overflow-x-auto whitespace-pre leading-relaxed max-w-full">
                  {getCurlExample(selectedWebhook.token)}
                </pre>
              </div>

              {/* JSON payload template info */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                    <Code className="h-3.5 w-3.5 text-[#4ade80]" />
                    Payload JSON de Exemplo
                  </span>
                  <button
                    onClick={() => handleCopy(payloadExample, setCopiedPayload)}
                    className="text-[9px] font-black uppercase underline hover:text-indigo-650 text-black dark:text-white"
                  >
                    {copiedPayload ? "Copiado!" : "Copiar JSON"}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border-2 border-black text-slate-100 text-[10px] font-mono overflow-x-auto leading-relaxed max-w-full">
                  {payloadExample}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border-[3px] border-black border-dashed bg-white dark:bg-[#1e1e1e] rounded-none">
              <Info className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-xs uppercase text-slate-400">
                Selecione um webhook na lista ao lado para ver as instruções de integração.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Webhook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#4ade80]/20">
              <h3 className="font-black uppercase tracking-wider text-sm text-black">Novo Webhook de Leads</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-850 text-black dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Webhook *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Landing Page de Inscrições"
                  {...register("name")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errors.name && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Lista de Contatos de Destino
                </label>
                <select
                  {...register("target_list")}
                  className="w-full py-2.5 px-3 neo-input bg-white dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">Sem lista (Apenas salvar nos contatos gerais)</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                {errors.target_list && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">
                    {errors.target_list.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Assinatura Secret (Opcional - mínimo 16 caracteres)
                </label>
                <input
                  type="text"
                  placeholder="Chave secreta para assinatura HMAC-SHA256"
                  {...register("secret")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errors.secret && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">
                    {errors.secret.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="neo-btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="neo-btn-primary px-6 py-2 flex items-center gap-1.5 bg-[#4ade80]"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Criar Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
