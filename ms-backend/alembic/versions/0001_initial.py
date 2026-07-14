"""Initial reproducible schema.

Revision ID: 0001
Revises:
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "citext"')
    op.execute("CREATE TYPE contactstatus AS ENUM ('active','unsubscribed','bounced')")
    op.execute("CREATE TYPE campaignstatus AS ENUM ('draft','scheduled','sending','sent','failed')")
    op.execute("""
    CREATE TABLE users (
      id UUID PRIMARY KEY, name VARCHAR(150) NOT NULL, email CITEXT NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL,
      is_active BOOLEAN NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_users_email ON users(email);
    CREATE TABLE contacts (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150), email CITEXT NOT NULL, phone VARCHAR(30), source VARCHAR(100),
      status contactstatus NOT NULL, custom_fields JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      UNIQUE(user_id,email)
    );
    CREATE INDEX ix_contacts_user_id ON contacts(user_id);
    CREATE INDEX ix_contacts_email ON contacts(email);
    CREATE TABLE lists (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL, description TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_lists_user_id ON lists(user_id);
    CREATE TABLE list_contacts (
      list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      added_at TIMESTAMPTZ DEFAULT now() NOT NULL, PRIMARY KEY(list_id,contact_id)
    );
    CREATE TABLE templates (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL, subject VARCHAR(255), preview_text VARCHAR(255),
      html_content TEXT NOT NULL, source VARCHAR(20) NOT NULL, ai_briefing TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_templates_user_id ON templates(user_id);
    CREATE TABLE campaigns (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
      list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
      name VARCHAR(150) NOT NULL, subject VARCHAR(255) NOT NULL, from_name VARCHAR(150),
      from_email CITEXT, status campaignstatus NOT NULL, scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_campaigns_user_id ON campaigns(user_id);
    CREATE TABLE campaign_sends (
      id UUID PRIMARY KEY, campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL, provider_id VARCHAR(255), error TEXT, sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL, UNIQUE(campaign_id,contact_id)
    );
    CREATE INDEX ix_campaign_sends_campaign_id ON campaign_sends(campaign_id);
    CREATE INDEX ix_campaign_sends_status ON campaign_sends(status);
    CREATE TABLE outbox_jobs (
      id UUID PRIMARY KEY, topic VARCHAR(100) NOT NULL, payload JSONB NOT NULL,
      attempts INTEGER NOT NULL, processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_outbox_jobs_topic ON outbox_jobs(topic);
    CREATE INDEX ix_outbox_jobs_processed_at ON outbox_jobs(processed_at);
    CREATE TABLE events (
      id UUID PRIMARY KEY, provider_event_id VARCHAR(255) NOT NULL UNIQUE,
      send_id UUID REFERENCES campaign_sends(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
      event_type VARCHAR(20) NOT NULL, url TEXT, ip_address VARCHAR(45), user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_events_campaign_id ON events(campaign_id);
    CREATE INDEX ix_events_event_type ON events(event_type);
    CREATE TABLE webhooks (
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL, token VARCHAR(64) NOT NULL UNIQUE, secret VARCHAR(128),
      target_list UUID REFERENCES lists(id) ON DELETE SET NULL, is_active BOOLEAN NOT NULL,
      total_leads INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
    CREATE INDEX ix_webhooks_user_id ON webhooks(user_id);
    CREATE INDEX ix_webhooks_token ON webhooks(token);
    CREATE TABLE webhook_logs (
      id UUID PRIMARY KEY, webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      delivery_id VARCHAR(255) NOT NULL, contact_id UUID, payload JSONB NOT NULL,
      status_code INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      UNIQUE(webhook_id,delivery_id)
    );
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE webhook_logs, webhooks, events, outbox_jobs, campaign_sends,
      campaigns, templates, list_contacts, lists, contacts, users CASCADE;
    DROP TYPE campaignstatus;
    DROP TYPE contactstatus;
    """)
