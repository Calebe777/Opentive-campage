"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { contactSchema } from "@/lib/validations/schemas";
import { Contact } from "@/types";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  Check,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { z } from "zod";

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch lists for CSV import list dropdown selection
  const { data: lists = [] } = useQuery<any[]>({
    queryKey: ["lists"],
    queryFn: () => apiRequest("/lists"),
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState("");
  const [selectedImportList, setSelectedImportList] = useState("");

  const openImportModal = () => {
    setImportFile(null);
    setImportSource("");
    setSelectedImportList("");
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
  };

  const importMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest("/contacts/import", {
        method: "POST",
        body: formData,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-metrics"] });
      toast(`Importação concluída! ${data.imported} contatos importados, ${data.skipped} ignorados.`, "success");
      closeImportModal();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao importar contatos.", "error");
    },
  });

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast("Por favor, selecione um arquivo CSV.", "error");
      return;
    }
    const formData = new FormData();
    formData.append("file", importFile);
    if (importSource.trim()) {
      formData.append("source", importSource.trim());
    }
    if (selectedImportList) {
      formData.append("list_id", selectedImportList);
    }
    importMutation.mutate(formData);
  };

  // Local Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [customFieldsText, setCustomFieldsText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Fetch Contacts Query
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/contacts"),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newContact: any) =>
      apiRequest("/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-metrics"] });
      toast("Contato cadastrado com sucesso!", "success");
      closeModal();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao criar contato.", "error");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiRequest(`/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-metrics"] });
      toast("Contato atualizado com sucesso!", "success");
      closeModal();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao atualizar contato.", "error");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/contacts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-metrics"] });
      toast("Contato excluído com sucesso!", "success");
      setDeletingContactId(null);
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao excluir contato.", "error");
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      source: "manual",
      status: "active",
      custom_fields: {},
    },
  });

  const openCreateModal = () => {
    setEditingContact(null);
    setCustomFieldsText("{}");
    setJsonError(null);
    reset({
      name: "",
      email: "",
      phone: "",
      source: "manual",
      status: "active",
      custom_fields: {},
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setCustomFieldsText(JSON.stringify(contact.custom_fields || {}, null, 2));
    setJsonError(null);
    reset({
      name: contact.name || "",
      email: contact.email,
      phone: contact.phone || "",
      source: contact.source || "manual",
      status: contact.status,
      custom_fields: contact.custom_fields,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setCustomFieldsText("{}");
    setJsonError(null);
  };

  const handleCustomFieldsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCustomFieldsText(val);
    if (!val.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError("JSON inválido: " + err.message);
    }
  };

  const onSubmit = (values: ContactFormValues) => {
    let customFields = {};
    if (customFieldsText.trim()) {
      try {
        customFields = JSON.parse(customFieldsText);
      } catch (err) {
        setJsonError("Verifique a sintaxe JSON antes de salvar");
        return;
      }
    }

    const payload = {
      ...values,
      name: values.name || null,
      phone: values.phone || null,
      source: values.source || null,
      custom_fields: customFields,
    };

    if (editingContact) {
      updateMutation.mutate({
        id: editingContact.id,
        payload: {
          name: payload.name,
          phone: payload.phone,
          status: payload.status,
          custom_fields: payload.custom_fields,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Local filtering & search logic
  const filtered = contacts.filter((contact) => {
    const matchesSearch =
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.name && contact.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Local Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[#4ade80] text-black border border-black";
      case "unsubscribed":
        return "bg-[#fde047] text-black border border-black";
      case "bounced":
        return "bg-[#ef4444] text-white border border-black";
      default:
        return "bg-slate-100 text-black border border-black";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "unsubscribed":
        return "Descadastrado";
      case "bounced":
        return "Rejeitado";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Contatos</h1>
          <p className="text-sm font-bold text-slate-655 dark:text-slate-400">
            Gerencie sua base de assinantes, origem dos leads e atributos personalizados.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={openImportModal}
            className="neo-btn-secondary px-4 py-2.5 flex items-center gap-2 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-black text-xs font-bold"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <button onClick={openCreateModal} className="neo-btn-primary px-4 py-2.5 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 neo-input"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-5 w-5 text-black dark:text-white" />
          <div className="inline-flex border-2 border-black dark:border-white p-0.5 bg-white dark:bg-[#1e1e1e] text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            {[
              { id: "all", label: "Todos" },
              { id: "active", label: "Ativos" },
              { id: "unsubscribed", label: "Descadastrados" },
              { id: "bounced", label: "Rejeitados" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setStatusFilter(f.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 uppercase transition-colors ${
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

      {/* Table Section */}
      <div className="bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fb923c]/20 border-b-[3px] border-black dark:border-white">
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Nome</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">E-mail</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Telefone</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white">Origem</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider border-r-2 border-black dark:border-white text-center">Status</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black dark:divide-white">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-40"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>
                    <td className="p-4 border-r-2 border-black dark:border-white text-center"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16 mx-auto"></div></td>
                    <td className="p-4 text-center"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12 mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center font-bold uppercase text-xs text-slate-400">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-4 border-r-2 border-black dark:border-white font-bold">{contact.name || "—"}</td>
                    <td className="p-4 border-r-2 border-black dark:border-white font-mono text-xs">{contact.email}</td>
                    <td className="p-4 border-r-2 border-black dark:border-white font-mono text-xs">{contact.phone || "—"}</td>
                    <td className="p-4 border-r-2 border-black dark:border-white font-bold text-xs uppercase">{contact.source || "—"}</td>
                    <td className="p-4 border-r-2 border-black dark:border-white text-center">
                      <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase ${getStatusBadge(contact.status)}`}>
                        {getStatusLabel(contact.status)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(contact)}
                          className="p-1.5 border-2 border-black dark:border-white bg-[#fde047] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                          aria-label="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingContactId(contact.id)}
                          className="p-1.5 border-2 border-black dark:border-white bg-[#ef4444] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t-[3px] border-black dark:border-white flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 font-bold text-xs">
            <span>
              Página {currentPage} de {totalPages} ({filtered.length} contatos)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="p-1.5 border-2 border-black dark:border-white bg-white dark:bg-[#1e1e1e] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="p-1.5 border-2 border-black dark:border-white bg-white dark:bg-[#1e1e1e] disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CRUD Edit/Create Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-xl w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col max-h-[90vh]">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#818cf8]/20">
              <h3 className="font-black uppercase tracking-wider text-sm">
                {editingContact ? "Editar Contato" : "Novo Contato"}
              </h3>
              <button onClick={closeModal} className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-800 text-black dark:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Nome</label>
                  <input type="text" {...register("name")} className="w-full py-2 px-3 neo-input" placeholder="João Silva" />
                  {errors.name && <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
                  <input type="email" {...register("email")} className="w-full py-2 px-3 neo-input" placeholder="joao@empresa.com" disabled={!!editingContact} />
                  {errors.email && <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input type="text" {...register("phone")} className="w-full py-2 px-3 neo-input" placeholder="+5511999998888" />
                  {errors.phone && <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Origem</label>
                  <input type="text" {...register("source")} className="w-full py-2 px-3 neo-input" placeholder="Landing Page" disabled={!!editingContact} />
                  {errors.source && <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">{errors.source.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1 font-bold">Status do Contato</label>
                <select {...register("status")} className="w-full py-2.5 px-3 neo-input bg-white dark:bg-slate-800">
                  <option value="active">Ativo (Aceita receber campanhas)</option>
                  <option value="unsubscribed">Descadastrado (Opt-out do assinante)</option>
                  <option value="bounced">Rejeitado (E-mail inválido/erro permanente)</option>
                </select>
              </div>

              {/* Custom fields JSON viewer */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Campos Personalizados (JSON)
                  </label>
                  <span className="text-[9px] font-bold uppercase text-slate-400">Atributos extras</span>
                </div>
                <textarea
                  value={customFieldsText}
                  onChange={handleCustomFieldsChange}
                  className="w-full h-28 p-3 font-mono text-xs neo-input"
                  placeholder='{ "cargo": "CTO", "empresa": "Minha Empresa" }'
                />
                {jsonError && (
                  <p className="mt-1.5 text-[10px] font-bold text-rose-650 bg-rose-50 border border-rose-650 px-2 py-0.5 inline-block uppercase">
                    {jsonError}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="neo-btn-secondary px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting || !!jsonError} className="neo-btn-primary px-6 py-2 flex items-center gap-1.5">
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal overlay */}
      {deletingContactId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="h-12 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#ef4444]/20 text-black dark:text-white">
              <span className="font-black uppercase tracking-wider text-xs flex items-center gap-1">
                <AlertOctagon className="h-4 w-4" />
                Excluir Contato
              </span>
            </div>
            <div className="p-6 space-y-4 text-left">
              <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                Tem certeza de que deseja remover este contato permanentemente? Esta ação é irreversível e o removerá de todas as listas.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingContactId(null)}
                  className="neo-btn-secondary px-4 py-2 text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (deletingContactId) deleteMutation.mutate(deletingContactId);
                  }}
                  className="neo-btn-danger px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] flex flex-col">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#a855f7]/20 text-black dark:text-white">
              <h3 className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Leads (CSV)
              </h3>
              <button onClick={closeImportModal} className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-800 text-black dark:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Arquivo CSV *
                </label>
                <div className="border-2 border-dashed border-black dark:border-white p-4 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-black dark:text-white">
                      {importFile ? importFile.name : "Clique para selecionar ou arraste o arquivo CSV"}
                    </p>
                    <p className="text-[10px] text-slate-400">Suporta delimitadores , ou ;</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Origem dos Leads (Source)
                </label>
                <input
                  type="text"
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  className="w-full py-2 px-3 neo-input"
                  placeholder="Ex: Leads do Instagram, Evento Outubro"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Associar à Lista de Envio (Opcional)
                </label>
                <select
                  value={selectedImportList}
                  onChange={(e) => setSelectedImportList(e.target.value)}
                  className="w-full py-2.5 px-3 neo-input bg-white dark:bg-slate-800"
                >
                  <option value="">Não associar a nenhuma lista</option>
                  {lists.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end gap-3">
                <button type="button" onClick={closeImportModal} className="neo-btn-secondary px-4 py-2 text-xs">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending || !importFile}
                  className="neo-btn-primary px-6 py-2 text-xs flex items-center gap-1.5"
                >
                  {importMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Importar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
