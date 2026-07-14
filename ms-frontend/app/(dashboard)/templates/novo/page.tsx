"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { templateSchema, aiTemplateSchema } from "@/lib/validations/schemas";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Sparkles,
  FileCode,
  Laptop,
  Smartphone,
  Check,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { z } from "zod";

type HTMLFormValues = z.infer<typeof templateSchema>;
type AIFormValues = z.infer<typeof aiTemplateSchema>;

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"html" | "ai">("html");

  // HTML Editor States
  const initialHtml = `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; padding: 20px; }\n    h1 { color: #4f46e5; }\n  </style>\n</head>\n<body>\n  <h1>Olá, {{name}}!</h1>\n  <p>Este é o seu novo template de e-mail.</p>\n</body>\n</html>`;

  // HTML Editor States
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isSavingHtml, setIsSavingHtml] = useState(false);

  // AI Generator States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const steps = [
    "Recebendo briefing e configurações de tom...",
    "Conectando ao modelo de IA generativa...",
    "Estruturando seções de texto e copy do e-mail...",
    "Codificando estrutura HTML compatível com provedores...",
    "Limpando e validando folhas de estilo...",
    "Salvando template gerado...",
  ];

  // Simulated AI generation steps progress
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 3500);
    } else {
      setGenerationStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, steps.length]);

  // Form HTML Setup
  const {
    register: registerHtml,
    handleSubmit: handleSubmitHtml,
    setValue: setValueHtml,
    formState: { errors: errorsHtml },
  } = useForm<HTMLFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      subject: "",
      preview_text: "",
      html_content: initialHtml,
    },
  });

  // Register html_content inside react-hook-form
  useEffect(() => {
    registerHtml("html_content");
  }, [registerHtml]);

  // Form AI Setup
  const {
    register: registerAi,
    handleSubmit: handleSubmitAi,
    formState: { errors: errorsAi },
  } = useForm<AIFormValues>({
    resolver: zodResolver(aiTemplateSchema),
    defaultValues: {
      name: "",
      briefing: "",
      tone: "corporativo",
      audience: "",
      cta: "",
    },
  });

  const onSaveManual = async (values: HTMLFormValues) => {
    setIsSavingHtml(true);
    try {
      await apiRequest("/templates", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          subject: values.subject || null,
          preview_text: values.preview_text || null,
          html_content: htmlContent,
        }),
      });
      toast("Template salvo com sucesso!", "success");
      router.push("/templates");
    } catch (err: any) {
      toast(err.message || "Erro ao salvar template.", "error");
    } finally {
      setIsSavingHtml(false);
    }
  };

  const onGenerateAI = async (values: AIFormValues) => {
    setIsGenerating(true);
    try {
      const generatedTemplate = await apiRequest("/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          briefing: values.briefing,
          tone: values.tone || null,
          audience: values.audience || null,
          cta: values.cta || null,
        }),
      });
      toast("Template gerado via IA e salvo com sucesso!", "success");
      router.push("/templates");
    } catch (err: any) {
      console.error(err);
      if (err.status === 502 || err.status === 503) {
        toast("O serviço de IA está temporariamente indisponível. Tente criar manualmente.", "error");
      } else {
        toast(err.message || "Erro ao gerar template via IA.", "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center gap-3">
        <a
          href="/templates"
          className="p-2 border-2 border-black dark:border-white bg-white dark:bg-slate-900 text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Novo Template</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Crie layouts HTML de e-mail ou gere estruturas prontas usando inteligência artificial.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-[3px] border-black dark:border-white p-1 bg-white dark:bg-[#1e1e1e] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] max-w-sm w-full font-black text-xs">
        <button
          onClick={() => setActiveTab("html")}
          className={`flex-1 py-2 uppercase flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "html"
              ? "bg-[#818cf8] text-black border-2 border-black"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileCode className="h-4 w-4" />
          Editor HTML
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2 uppercase flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "ai"
              ? "bg-[#4ade80] text-black border-2 border-black"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Gerador IA
        </button>
      </div>

      {/* Tab HTML Editor */}
      {activeTab === "html" && (
        <form onSubmit={handleSubmitHtml(onSaveManual)} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left panel edit */}
          <div className="bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col p-6 space-y-4">
            <h3 className="font-black uppercase tracking-wider text-sm border-b-2 border-black dark:border-white pb-3 flex items-center gap-1.5">
              <FileCode className="h-5 w-5 text-[#818cf8]" />
              Manual HTML
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Oferta Black Friday"
                  {...registerHtml("name")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errorsHtml.name && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errorsHtml.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Assunto do E-mail
                  </label>
                  <input
                    type="text"
                    placeholder="Assunto padrão enviado"
                    {...registerHtml("subject")}
                    className="w-full py-2 px-3 neo-input"
                  />
                  {errorsHtml.subject && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errorsHtml.subject.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Texto de Prévia (Preview text)
                  </label>
                  <input
                    type="text"
                    placeholder="Frase curta abaixo do assunto"
                    {...registerHtml("preview_text")}
                    className="w-full py-2 px-3 neo-input"
                  />
                  {errorsHtml.preview_text && (
                    <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errorsHtml.preview_text.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 min-h-[350px] border-[3px] border-black dark:border-white relative flex flex-col mt-2">
              <div className="h-10 bg-slate-100 dark:bg-slate-900 border-b-2 border-black dark:border-white px-4 flex items-center justify-between text-xs font-black">
                <span className="uppercase text-[10px] tracking-wider text-slate-500">Editor de Código</span>
                <span className="text-[10px] text-slate-400 font-mono">HTML5</span>
              </div>
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  language="html"
                  theme="vs-dark"
                  onChange={(val) => {
                    const value = val || "";
                    setHtmlContent(value);
                    setValueHtml("html_content", value, { shouldValidate: true });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    formatOnPaste: true,
                    lineHeight: 18,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end gap-3 shrink-0">
              <button
                type="submit"
                disabled={isSavingHtml}
                className="neo-btn-primary px-6 py-2.5 flex items-center gap-1.5"
              >
                {isSavingHtml ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Salvar Template
              </button>
            </div>
          </div>

          {/* Right panel live preview */}
          <div className="bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black dark:border-white pb-3 shrink-0">
              <h3 className="font-black uppercase tracking-wider text-sm">Visualização em tempo real</h3>
              
              {/* Desktop/Mobile Size Selector Toggles */}
              <div className="inline-flex border-2 border-black dark:border-white p-0.5 bg-slate-50 dark:bg-slate-900 font-black text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`p-1.5 transition-colors uppercase ${
                    previewMode === "desktop" ? "bg-[#818cf8] text-black border border-black" : "text-slate-500"
                  }`}
                  title="Desktop View"
                >
                  <Laptop className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`p-1.5 transition-colors uppercase ${
                    previewMode === "mobile" ? "bg-[#818cf8] text-black border border-black" : "text-slate-500"
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Live iframe container */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex justify-center items-center overflow-auto min-h-[450px]">
              <div
                className={`h-full bg-white border-[3px] border-black transition-all duration-300 ${
                  previewMode === "mobile" ? "w-[360px]" : "w-full"
                }`}
              >
                <iframe
                  title="Live Preview"
                  sandbox="allow-same-origin"
                  srcDoc={htmlContent}
                  className="w-full h-full min-h-[420px]"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab AI Generator */}
      {activeTab === "ai" && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <div className="h-14 flex items-center px-6 border-b-[3px] border-black dark:border-white bg-[#4ade80]/20 gap-2">
            <Sparkles className="h-5 w-5 text-black" />
            <h3 className="font-black uppercase tracking-wider text-sm text-black">Gerar com Inteligência Artificial</h3>
          </div>

          {!isGenerating ? (
            <form onSubmit={handleSubmitAi(onGenerateAI)} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boas-vindas para Desenvolvedores"
                  {...registerAi("name")}
                  className="w-full py-2 px-3 neo-input"
                />
                {errorsAi.name && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errorsAi.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Briefing / Instruções *
                </label>
                <textarea
                  placeholder="Escreva detalhadamente o que este e-mail deve conter (ex: 'Promoção de natal com 50% de desconto nos cursos de Node.js e React. Destaque os benefícios e coloque um botão vermelho')"
                  {...registerAi("briefing")}
                  className="w-full h-28 p-3 neo-input"
                />
                {errorsAi.briefing && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errorsAi.briefing.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Tom de Linguagem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: empolgante, corporativo, técnico, amigável"
                    {...registerAi("tone")}
                    className="w-full py-2 px-3 neo-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Público-alvo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: desenvolvedores júnior, designers, executivos"
                    {...registerAi("audience")}
                    className="w-full py-2 px-3 neo-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Call to Action (CTA - Botão Principal)
                </label>
                <input
                  type="text"
                  placeholder="Texto do botão (ex: Compre agora, Inscreva-se já)"
                  {...registerAi("cta")}
                  className="w-full py-2 px-3 neo-input"
                />
              </div>

              <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end">
                <button
                  type="submit"
                  className="neo-btn-primary px-6 py-2.5 flex items-center gap-2 bg-[#4ade80]"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar E-mail com IA
                </button>
              </div>
            </form>
          ) : (
            /* AI Loading screen with progressive step logging */
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black dark:border-white"></div>
                <Cpu className="h-6 w-6 text-[#4ade80] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              <div className="space-y-2 max-w-md">
                <h4 className="text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center justify-center gap-1.5">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#4ade80]" />
                  A IA está criando seu e-mail...
                </h4>
                
                {/* Step feedback logging */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white text-xs font-mono font-bold text-slate-700 dark:text-slate-350 select-none">
                  {steps[generationStep]}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Isso pode levar até 60 segundos. Não feche esta janela.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
