export interface Contact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  status: "active" | "unsubscribed" | "bounced";
  custom_fields: Record<string, any>;
  created_at: string;
}

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string | null;
  preview_text: string | null;
  html_content: string;
  source: "manual" | "ai";
  ai_briefing: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  template_id: string | null;
  list_id: string | null;
  name: string;
  subject: string;
  from_name: string | null;
  from_email: string | null;
  scheduled_at: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
}

export interface LeadWebhook {
  id: string;
  name: string;
  token: string;
  target_list: string | null;
  is_active: boolean;
  total_leads: number;
  created_at: string;
}

export interface CampaignMetrics {
  sends: {
    queued?: number;
    processing?: number;
    sent?: number;
    delivered?: number;
    failed?: number;
  };
  events: {
    open?: number;
    click?: number;
    bounce?: number;
    complaint?: number;
    unsub?: number;
  };
}
