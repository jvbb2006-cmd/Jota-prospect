-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 5: Analytics e Qualidade
-- Migration: 006_analytics_schema.sql
-- Description: Campos de segmentação analítica, métricas reutilizáveis e índices
-- ==============================================================================

-- Adiciona campos analíticos na tabela companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS campaign TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Adiciona campos analíticos na tabela opportunities
ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS campaign TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT;

-- Índices analíticos para consultas agregadas rápidas
CREATE INDEX IF NOT EXISTS idx_companies_assigned_to ON public.companies (workspace_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_companies_campaign ON public.companies (workspace_id, campaign);
CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies (workspace_id, city);
CREATE INDEX IF NOT EXISTS idx_companies_category ON public.companies (workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities (workspace_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_loss_reason ON public.opportunities (workspace_id, loss_reason);
CREATE INDEX IF NOT EXISTS idx_activities_type_performed ON public.activities (workspace_id, type, performed_at);
