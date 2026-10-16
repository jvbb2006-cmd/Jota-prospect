-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 4: Central de Abordagem Comercial
-- Migration: 005_outreach_central_schema.sql
-- Description: Tabelas de mensagens personalizadas, histórico comercial e cadência
-- ==============================================================================

-- 1. Alterar tabela de empresas para suportar políticas de não-contato e cadência
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cadence_status VARCHAR(30) NOT NULL DEFAULT 'none' CHECK (cadence_status IN ('none', 'active', 'paused', 'completed', 'stopped')),
  ADD COLUMN IF NOT EXISTS cadence_started_at TIMESTAMPTZ NULL;

-- 2. Alterar tabela de atividades para distinguir eventos observados pelo sistema de registros manuais
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS origin VARCHAR(30) NOT NULL DEFAULT 'manual_user' CHECK (origin IN ('system_observed', 'manual_user')),
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Tabela de Mensagens da Central de Abordagem (4 etapas)
CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage VARCHAR(30) NOT NULL CHECK (stage IN ('etapa_1', 'etapa_2', 'etapa_3', 'etapa_4')),
  stage_title VARCHAR(120) NOT NULL,
  stage_step INTEGER NOT NULL CHECK (stage_step >= 1 AND stage_step <= 4),
  channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'linkedin', 'phone')),
  content TEXT NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'rascunho' CHECK (state IN ('rascunho', 'editado', 'aprovado', 'utilizado')),
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL,
  diagnostic_score NUMERIC(5,2) NULL,
  tailored_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_company_stage UNIQUE (company_id, stage)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_outreach_messages_workspace ON public.outreach_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_company ON public.outreach_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_origin ON public.activities(company_id, origin);

-- Habilitar RLS
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para outreach_messages
CREATE POLICY "outreach_messages_workspace_isolation"
  ON public.outreach_messages
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
    )
  );
