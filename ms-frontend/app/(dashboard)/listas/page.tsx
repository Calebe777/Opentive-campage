"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/app/providers";
import { listSchema } from "@/lib/validations/schemas";
import { ContactList, Contact } from "@/types";
import {
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
  Check,
  AlertOctagon,
  FolderOpen,
  Info,
} from "lucide-react";
import { z } from "zod";

type ListFormValues = z.infer<typeof listSchema>;

const listColors = [
  "bg-[#818cf8]", // Violet
  "bg-[#fb923c]", // Orange
  "bg-[#4ade80]", // Green
  "bg-[#fde047]", // Yellow
  "bg-[#f472b6]", // Pink
];

export default function ListsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactSearchTerm, setContactSearchTerm] = useState("");

  // Fetch Lists
  const { data: lists = [], isLoading: isLoadingLists } = useQuery<ContactList[]>({
    queryKey: ["lists"],
    queryFn: () => apiRequest("/lists"),
  });

  // Fetch Contacts (to associate)
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => apiRequest("/contacts"),
  });

  // Create List Mutation
  const createListMutation = useMutation({
    mutationFn: (newList: ListFormValues) =>
      apiRequest("/lists", {
        method: "POST",
        body: JSON.stringify(newList),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast("Lista criada com sucesso!", "success");
      setIsCreateModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao criar lista.", "error");
    },
  });

  // Delete List Mutation
  const deleteListMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/lists/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      toast("Lista excluída com sucesso!", "success");
      setDeletingListId(null);
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao excluir lista.", "error");
    },
  });

  // Associate Contact Mutation
  const associateContactMutation = useMutation({
    mutationFn: ({ listId, contactId }: { listId: string; contactId: string }) =>
      apiRequest(`/lists/${listId}/contacts`, {
        method: "POST",
        body: JSON.stringify({ contact_id: contactId }),
      }),
    onSuccess: () => {
      toast("Contato associado à lista com sucesso!", "success");
      setIsAssociateModalOpen(false);
      setSelectedContactId("");
      setSelectedListId(null);
      setContactSearchTerm("");
    },
    onError: (err: any) => {
      toast(err.message || "Erro ao associar contato à lista.", "error");
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListFormValues>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: ListFormValues) => {
    createListMutation.mutate({
      name: values.name,
      description: values.description || null,
    });
  };

  const handleAssociate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId || !selectedContactId) {
      toast("Por favor, selecione um contato.", "warning");
      return;
    }
    associateContactMutation.mutate({
      listId: selectedListId,
      contactId: selectedContactId,
    });
  };

  // Filtering lists
  const filteredLists = lists.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtering contacts in association dropdown
  const filteredContacts = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Listas de Envio</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Crie agrupamentos de contatos para disparar suas campanhas segmentadas.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="neo-btn-primary px-4 py-2.5 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nova Lista
        </button>
      </div>

      {/* Info Warning */}
      <div className="p-4 bg-blue-50 dark:bg-slate-900 border-2 border-black dark:border-white text-xs flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
          Nota: O servidor armazena a relação de membros por lista, porém não disponibiliza a
          contagem de inscritos ou a listagem detalhada de participantes na API atual de listagens.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black dark:text-white">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          placeholder="Buscar lista por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 neo-input"
        />
      </div>

      {/* Grid Section */}
      {isLoadingLists ? (
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
      ) : filteredLists.length === 0 ? (
        <div className="p-12 text-center border-[3px] border-black dark:border-white border-dashed bg-white dark:bg-[#1e1e1e] rounded-none">
          <FolderOpen className="h-12 w-12 mx-auto text-slate-400 mb-3" />
          <p className="font-black uppercase text-xs text-slate-400">Nenhuma lista cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((list, index) => {
            const cardBgColor = listColors[index % listColors.length];
            return (
              <div
                key={list.id}
                className="flex flex-col bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
              >
                {/* Header of list card */}
                <div className={`p-4 border-b-2 border-black ${cardBgColor} text-black flex justify-between items-center`}>
                  <span className="font-black text-xs uppercase tracking-wider truncate mr-2">
                    {list.name}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedListId(list.id);
                        setIsAssociateModalOpen(true);
                      }}
                      className="p-1 bg-white hover:bg-slate-100 text-black border border-black"
                      title="Associar Contato"
                    >
                      <UserPlus className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => setDeletingListId(list.id)}
                      className="p-1 bg-black text-white hover:bg-slate-850 border border-black"
                      title="Excluir Lista"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-350 line-clamp-3 leading-relaxed">
                    {list.description || "Sem descrição informada."}
                  </p>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                    <span>Criação</span>
                    <span>{new Date(list.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Create List */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#fb923c]/20">
              <h3 className="font-black uppercase tracking-wider text-sm">Criar Lista</h3>
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
                  Nome da lista *
                </label>
                <input
                  type="text"
                  placeholder="Clientes Ativos"
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
                  Descrição
                </label>
                <textarea
                  placeholder="Descrição sobre os contatos desta lista..."
                  {...register("description")}
                  className="w-full h-24 p-3 neo-input"
                />
                {errors.description && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">
                    {errors.description.message}
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
                  className="neo-btn-primary px-6 py-2 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Associate Contact to List */}
      {isAssociateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="h-14 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#818cf8]/20">
              <h3 className="font-black uppercase tracking-wider text-sm">Adicionar Contato</h3>
              <button
                onClick={() => {
                  setIsAssociateModalOpen(false);
                  setSelectedContactId("");
                  setSelectedListId(null);
                  setContactSearchTerm("");
                }}
                className="p-1 border-2 border-black dark:border-white bg-white dark:bg-slate-850 text-black dark:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssociate} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Filtrar Contatos
                </label>
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou e-mail..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="w-full py-2 px-3 neo-input mb-3"
                />

                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o Contato *
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full py-2.5 px-3 neo-input bg-white dark:bg-slate-800 text-xs font-bold"
                  size={5}
                >
                  <option value="" disabled className="text-slate-400">
                    Selecione um contato da base
                  </option>
                  {filteredContacts.map((c) => (
                    <option key={c.id} value={c.id} className="p-1 border-b border-dashed">
                      {c.name ? `${c.name} (${c.email})` : c.email}
                    </option>
                  ))}
                </select>
                {filteredContacts.length === 0 && (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 uppercase">
                    Nenhum contato coincide com a busca
                  </p>
                )}
              </div>

              <div className="pt-4 border-t-2 border-black dark:border-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssociateModalOpen(false);
                    setSelectedContactId("");
                    setSelectedListId(null);
                    setContactSearchTerm("");
                  }}
                  className="neo-btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedContactId || associateContactMutation.isPending}
                  className="neo-btn-primary px-6 py-2 flex items-center gap-1.5"
                >
                  {associateContactMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Delete List Confirmation */}
      {deletingListId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="h-12 flex items-center justify-between px-6 border-b-[3px] border-black dark:border-white bg-[#ef4444]/20 text-black dark:text-white">
              <span className="font-black uppercase tracking-wider text-xs flex items-center gap-1">
                <AlertOctagon className="h-4 w-4" />
                Excluir Lista
              </span>
            </div>
            <div className="p-6 space-y-4 text-left">
              <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                Tem certeza de que deseja remover esta lista de envio? Isto não excluirá os contatos
                da base de dados, mas cancelará campanhas que estejam associadas a esta lista.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingListId(null)}
                  className="neo-btn-secondary px-4 py-2 text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (deletingListId) deleteListMutation.mutate(deletingListId);
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
    </div>
  );
}
