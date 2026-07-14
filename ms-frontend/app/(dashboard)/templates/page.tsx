"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";
import { EmailTemplate } from "@/types";
import { Plus, Search, Eye, X, FileCode, Sparkles } from "lucide-react";

const colorClasses = [
  "bg-[#818cf8]", // Violet
  "bg-[#fb923c]", // Orange
  "bg-[#4ade80]", // Green
  "bg-[#fde047]", // Yellow
  "bg-[#f472b6]", // Pink
];

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  // Fetch Templates
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["templates"],
    queryFn: () => apiRequest("/templates"),
  });

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Templates de E-mail</h1>
          <p className="text-sm font-bold text-slate-655 dark:text-slate-400">
            Crie layouts HTML customizados ou utilize IA para estruturar seus e-mails marketing.
          </p>
        </div>

        <a href="/templates/novo" className="neo-btn-primary px-4 py-2.5 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Novo Template
        </a>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou assunto de template..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 neo-input"
        />
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse p-6 bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white h-48 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              </div>
              <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-[3px] border-black dark:border-white border-dashed bg-white dark:bg-[#1e1e1e] rounded-none">
          <FileCode className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <p className="font-black uppercase text-xs text-slate-400">Nenhum template cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t, index) => {
            const cardBgColor = colorClasses[index % colorClasses.length];
            return (
              <div
                key={t.id}
                className="flex flex-col bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
              >
                {/* Header card color */}
                <div className={`p-4 border-b-2 border-black ${cardBgColor} text-black flex justify-between items-center`}>
                  <span className="font-black text-xs uppercase tracking-wider truncate mr-2">
                    {t.name}
                  </span>
                  
                  <div className="flex gap-2 shrink-0">
                    <span className={`px-2 py-0.5 border border-black text-[9px] font-black uppercase flex items-center gap-1 ${
                      t.source === "ai" ? "bg-white text-black" : "bg-black text-white"
                    }`}>
                      {t.source === "ai" && <Sparkles className="h-3 w-3" />}
                      {t.source === "ai" ? "IA" : "Manual"}
                    </span>

                    <button
                      onClick={() => setPreviewTemplate(t)}
                      className="p-1 bg-white hover:bg-slate-100 text-black border border-black"
                      title="Visualizar Preview"
                    >
                      <Eye className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-black text-slate-400">Assunto</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                      {t.subject || "Sem assunto cadastrado"}
                    </p>
                  </div>

                  {t.preview_text && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase font-black text-slate-400">Texto de Prévia</p>
                      <p className="text-[11px] font-bold text-slate-500 line-clamp-2">
                        {t.preview_text}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                    <span>Criação</span>
                    <span>{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Template Sandboxed Preview */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-4xl w-full h-[85vh] bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#818cf8]/20">
              <div className="truncate mr-4 text-left">
                <span className="font-black uppercase tracking-wider text-xs block">Preview de Template</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  {previewTemplate.name} {previewTemplate.subject ? `— ${previewTemplate.subject}` : ""}
                </span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-850 text-black dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sandboxed iframe */}
            <div className="flex-1 bg-slate-100 p-4">
              <iframe
                title={`Preview ${previewTemplate.name}`}
                sandbox="allow-same-origin"
                srcDoc={previewTemplate.html_content}
                className="w-full h-full bg-white border-2 border-black"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
