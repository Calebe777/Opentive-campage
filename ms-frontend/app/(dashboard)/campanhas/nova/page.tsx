"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { campaignSchema } from "@/lib/validations/schemas";
import { EmailTemplate, ContactList } from "@/types";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Send, Sparkles } from "lucide-react";
import { z } from "zod";

type CampaignFormValues = z.infer<typeof campaignSchema>;

const steps = [
  { id: 1, name: "Dados" },
  { id: 2, name: "Template" },
  { id: 3, name: "Lista" },
  { id: 4, name: "Remetente" },
  { id: 5, name: "Revisão" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  // Queries for selectors
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["templates"],
    queryFn: () => apiRequest("/templates"),
  });

  const { data: lists = [], isLoading: isLoadingLists } = useQuery<ContactList[]>({
    queryKey: ["lists"],
    queryFn: () => apiRequest("/lists"),
  });

  // Create Campaign Mutation
  const createCampaignMutation = useMutation({
    mutationFn: (newCampaign: any) =>
      apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify(newCampaign),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast("Campanha criada com sucesso!", "success");
      router.push("/campanhas");
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao criar campanha.", "error");
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      template_id: "",
      list_id: "",
      from_name: "",
      from_email: "",
      scheduled_at: "",
    },
  });

  // Watch fields for review step
  const watchName = watch("name");
  const watchSubject = watch("subject");
  const watchTemplateId = watch("template_id");
  const watchListId = watch("list_id");
  const watchFromName = watch("from_name");
  const watchFromEmail = watch("from_email");
  const watchScheduledAt = watch("scheduled_at");

  const handleNext = async () => {
    // Validate current step fields before going forward
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ["name", "subject"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["template_id"];
    } else if (currentStep === 3) {
      fieldsToValidate = ["list_id"];
    } else if (currentStep === 4) {
      fieldsToValidate = ["from_email"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((c) => c + 1);
    } else {
      toast("Preencha todos os campos obrigatórios corretamente.", "warning");
    }
  };

  const handlePrev = () => {
    setCurrentStep((c) => c - 1);
  };

  const onSubmit = (values: CampaignFormValues) => {
    const payload = {
      ...values,
      from_name: values.from_name || null,
      scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : null,
    };
    createCampaignMutation.mutate(payload);
  };

  const selectedTemplate = templates.find((t) => t.id === watchTemplateId);
  const selectedList = lists.find((l) => l.id === watchListId);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top back button / Header */}
      <div className="flex items-center gap-3 border-b-2 border-black dark:border-white pb-4">
        <a
          href="/campanhas"
          className="p-2 border-2 border-black dark:border-white bg-white dark:bg-slate-900 text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Criar Campanha</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Siga as etapas para criar, selecionar público e configurar o envio.
          </p>
        </div>
      </div>

      {/* Step Progress indicators */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-[#1e1e1e] p-4 border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isCompleted = currentStep > s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-8 w-8 border-2 border-black flex items-center justify-center font-black text-sm select-none ${
                    isActive
                      ? "bg-[#fde047] text-black"
                      : isCompleted
                      ? "bg-[#4ade80] text-black"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                </span>
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    isActive ? "text-black dark:text-white" : "text-slate-400"
                  }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:block flex-1 h-0.5 border-t-2 border-dashed border-slate-300 dark:border-slate-800 mx-2" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Form view containers */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-6 space-y-6">
        
        {/* Step 1: Basic Campaign Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase border-b-2 border-black dark:border-white pb-2 text-[#fb923c]">
              1. Identificação da Campanha
            </h3>
            
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha de Lançamento Julho"
                  {...register("name")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errors.name && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Assunto do E-mail *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Última chance para garantir desconto exclusivo!"
                  {...register("subject")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errors.subject && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.subject.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Template */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase border-b-2 border-black dark:border-white pb-2 text-[#818cf8]">
              2. Escolha o Layout de E-mail
            </h3>

            {isLoadingTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-24 border-2 border-black bg-slate-50"></div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-6 uppercase text-center">
                Crie um template primeiro nas configurações para poder vinculá-lo.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[350px] overflow-y-auto pr-1">
                {templates.map((t) => {
                  const isSelected = watchTemplateId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setValue("template_id", t.id, { shouldValidate: true })}
                      className={`p-4 border-[3px] border-black cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                        isSelected
                          ? "bg-[#818cf8]/45 border-indigo-600 border-[3.5px] scale-[1.01]"
                          : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span className="font-black text-xs uppercase truncate block mb-1">
                        {t.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block truncate">
                        Assunto: {t.subject || "—"}
                      </span>
                      <span className="mt-3 px-2 py-0.5 border border-black text-[8px] font-black uppercase inline-block bg-white text-black">
                        {t.source === "ai" ? "IA" : "Manual"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.template_id && (
              <p className="text-[10px] font-bold text-rose-600 uppercase">{errors.template_id.message}</p>
            )}
          </div>
        )}

        {/* Step 3: Select List */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase border-b-2 border-black dark:border-white pb-2 text-[#fb923c]">
              3. Destinatários da Campanha
            </h3>

            {isLoadingLists ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-24 border-2 border-black bg-slate-50"></div>
                ))}
              </div>
            ) : lists.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-6 uppercase text-center">
                Cadastre uma lista de envio primeiro na aba de Listas para selecionar.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[350px] overflow-y-auto pr-1">
                {lists.map((l) => {
                  const isSelected = watchListId === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => setValue("list_id", l.id, { shouldValidate: true })}
                      className={`p-4 border-[3px] border-black cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                        isSelected
                          ? "bg-[#fb923c]/45 border-[#fb923c] border-[3.5px] scale-[1.01]"
                          : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span className="font-black text-xs uppercase truncate block mb-1">
                        {l.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-450 block truncate">
                        {l.description || "Sem descrição"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.list_id && (
              <p className="text-[10px] font-bold text-rose-600 uppercase">{errors.list_id.message}</p>
            )}
          </div>
        )}

        {/* Step 4: Sender Details and scheduling */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase border-b-2 border-black dark:border-white pb-2 text-[#4ade80]">
              4. Dados de Remetente & Agendamento
            </h3>

            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Remetente
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Silva"
                    {...register("from_name")}
                    className="w-full py-2 px-3 neo-input"
                  />
                  {errors.from_name && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.from_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    E-mail do Remetente *
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: contato@suaempresa.com"
                    {...register("from_email")}
                    className="w-full py-2 px-3 neo-input"
                  />
                  {errors.from_email && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.from_email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Agendar Disparo (Opcional)
                </label>
                <input
                  type="datetime-local"
                  {...register("scheduled_at")}
                  className="w-full py-2 px-3 neo-input font-bold"
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  Deixe vazio para salvar como rascunho e disparar manualmente depois.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review all data */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase border-b-2 border-black dark:border-white pb-2 text-[#fde047] text-black bg-[#fde047] inline-block px-2 border-2">
              5. Revisão Geral
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-bold">
              {/* Left column details */}
              <div className="space-y-4 border-[3px] border-black p-5 bg-slate-50 dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black uppercase border-b border-black pb-1.5 mb-3 text-slate-655">Geral</h4>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Nome da Campanha</span>
                    <span className="uppercase text-xs">{watchName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Assunto do E-mail</span>
                    <span className="text-xs">{watchSubject}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Lista Alvo</span>
                    <span className="uppercase text-xs text-indigo-650">{selectedList?.name || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Right column details */}
              <div className="space-y-4 border-[3px] border-black p-5 bg-slate-50 dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black uppercase border-b border-black pb-1.5 mb-3 text-slate-655">Disparo</h4>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Remetente</span>
                    <span className="text-xs">
                      {watchFromName ? `${watchFromName} <${watchFromEmail}>` : watchFromEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Template Selecionado</span>
                    <span className="uppercase text-xs text-emerald-650">{selectedTemplate?.name || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 block">Data de Agendamento</span>
                    <span className="text-xs">
                      {watchScheduledAt ? new Date(watchScheduledAt).toLocaleString("pt-BR") : "Disparo Manual (Rascunho)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action controllers */}
        <div className="pt-4 border-t-2 border-black dark:border-white flex justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="neo-btn-secondary px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="neo-btn-primary px-4 py-2 flex items-center gap-1.5"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createCampaignMutation.isPending}
              className="neo-btn-primary px-6 py-2.5 flex items-center gap-2 bg-[#fde047]"
            >
              {createCampaignMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
              ) : (
                <Check className="h-4 w-4" />
              )}
              Criar Campanha
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
