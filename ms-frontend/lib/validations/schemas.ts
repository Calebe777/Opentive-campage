import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido").min(1, "E-mail é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(150, "Nome muito longo (máximo 150 caracteres)"),
  email: z.string().email("Formato de e-mail inválido").min(1, "E-mail é obrigatório"),
  password: z.string().min(10, "A senha deve ter no mínimo 10 caracteres").max(128, "Senha muito longa"),
});

// Contacts
export const contactSchema = z.object({
  name: z.string().max(150, "Nome deve ter no máximo 150 caracteres").nullable().optional().or(z.literal("")),
  email: z.string().email("Formato de e-mail inválido").min(1, "E-mail é obrigatório"),
  phone: z.string().max(30, "Telefone deve ter no máximo 30 caracteres").nullable().optional().or(z.literal("")),
  source: z.string().max(100, "Origem deve ter no máximo 100 caracteres").nullable().optional().or(z.literal("")),
  status: z.enum(["active", "unsubscribed", "bounced"]),
  custom_fields: z.record(z.string(), z.any()).optional(),
});

// Lists
export const listSchema = z.object({
  name: z.string().min(1, "Nome da lista é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").nullable().optional().or(z.literal("")),
});

// Templates
export const templateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  subject: z.string().max(255, "Assunto deve ter no máximo 255 caracteres").nullable().optional().or(z.literal("")),
  preview_text: z.string().max(255, "Texto de prévia deve ter no máximo 255 caracteres").nullable().optional().or(z.literal("")),
  html_content: z.string().min(1, "O conteúdo HTML é obrigatório"),
});

export const aiTemplateSchema = z.object({
  name: z.string().min(1, "Nome do template é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  briefing: z.string().min(1, "Instruções/Briefing são obrigatórios"),
  tone: z.string().nullable().optional().or(z.literal("")),
  audience: z.string().nullable().optional().or(z.literal("")),
  cta: z.string().nullable().optional().or(z.literal("")),
});

// Campaigns
export const campaignSchema = z.object({
  name: z.string().min(1, "Nome da campanha é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  subject: z.string().min(1, "Assunto do e-mail é obrigatório").max(255, "Assunto deve ter no máximo 255 caracteres"),
  template_id: z.string().uuid("Selecione um template válido"),
  list_id: z.string().uuid("Selecione uma lista de contatos válida"),
  from_name: z.string().max(150, "Nome do remetente deve ter no máximo 150 caracteres").nullable().optional().or(z.literal("")),
  from_email: z.string().email("E-mail do remetente inválido").min(1, "E-mail do remetente é obrigatório"),
  scheduled_at: z.string().nullable().optional().or(z.literal("")),
});

// Webhooks
export const webhookSchema = z.object({
  name: z.string().min(1, "Nome do webhook é obrigatório").max(150, "Nome deve ter no máximo 150 caracteres"),
  target_list: z.string().uuid("Selecione uma lista de destino válida").nullable().optional().or(z.literal("")),
  secret: z.string().min(16, "O segredo deve ter no mínimo 16 caracteres").max(128, "Segredo deve ter no máximo 128 caracteres").nullable().optional().or(z.literal("")),
});
