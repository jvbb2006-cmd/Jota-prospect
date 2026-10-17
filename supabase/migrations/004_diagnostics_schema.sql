
-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 3: Diagnóstico 360°
-- Migration: 004_diagnostics_schema.sql
-- Versão ajustada para evitar políticas duplicadas e remoções
-- ==============================================================================

-- 1. Tabela de Diagnósticos
CREATE TABLE IF NOT EXISTS public.diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'partial', 'failed')),
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0.0
    CHECK (overall_score >= 0 AND overall_score <= 100),
  coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0
    CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  executive_summary TEXT NOT NULL,
  positive_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed_problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  probable_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine VARCHAR(60) NOT NULL DEFAULT 'deterministic_rules_engine',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_company_diagnostic_version UNIQUE (company_id, version)
);

-- 2. Tabela de Achados Detalhados
CREATE TABLE IF NOT EXISTS public.diagnostic_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id UUID NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dimension VARCHAR(50) NOT NULL CHECK (dimension IN (
    'site_institucional',
    'experiencia_movel',
    'proposta_valor',
    'informacoes_contato',
    'seo_tecnico',
    'instagram_presenca',
    'perfil_google',
    'consistencia_canais',
    'conversao_agendamento'
  )),
  dimension_label VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'verified'
    CHECK (status IN ('verified', 'unverified', 'failed', 'not_applicable', 'partially_verified')),
  score NUMERIC(5,2)
    CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  weight NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  observed_fact TEXT NOT NULL,
  evidence_found TEXT NOT NULL,
  source_url TEXT,
  observation_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  confidence_level VARCHAR(20) NOT NULL DEFAULT 'alta'
    CHECK (confidence_level IN ('alta', 'media', 'baixa')),
  finding_type VARCHAR(40) NOT NULL DEFAULT 'neutro'
    CHECK (finding_type IN ('problema_confirmado', 'oportunidade_provavel', 'ponto_positivo', 'neutro')),
  potential_impact VARCHAR(20) NOT NULL DEFAULT 'medio'
    CHECK (potential_impact IN ('alto', 'medio', 'baixo')),
  interpretation TEXT NOT NULL,
  commercial_hypothesis TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  corresponding_service VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_diagnostics_workspace
  ON public.diagnostics(workspace_id);

CREATE INDEX IF NOT EXISTS idx_diagnostics_company
  ON public.diagnostics(company_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_diag
  ON public.diagnostic_findings(diagnostic_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_workspace
  ON public.diagnostic_findings(workspace_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_findings_dimension
  ON public.diagnostic_findings(dimension);

-- 4. Ativar RLS nas tabelas de diagnóstico
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_findings ENABLE ROW LEVEL SECURITY;

-- 5. Criar somente políticas que ainda não existem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostics'
      AND policyname = 'diagnostics_select_policy'
  ) THEN
    CREATE POLICY diagnostics_select_policy
      ON public.diagnostics FOR SELECT
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostics'
      AND policyname = 'diagnostics_insert_policy'
  ) THEN
    CREATE POLICY diagnostics_insert_policy
      ON public.diagnostics FOR INSERT
      WITH CHECK (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostics'
      AND policyname = 'diagnostics_update_policy'
  ) THEN
    CREATE POLICY diagnostics_update_policy
      ON public.diagnostics FOR UPDATE
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostics'
      AND policyname = 'diagnostics_delete_policy'
  ) THEN
    CREATE POLICY diagnostics_delete_policy
      ON public.diagnostics FOR DELETE
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostic_findings'
      AND policyname = 'findings_select_policy'
  ) THEN
    CREATE POLICY findings_select_policy
      ON public.diagnostic_findings FOR SELECT
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostic_findings'
      AND policyname = 'findings_insert_policy'
  ) THEN
    CREATE POLICY findings_insert_policy
      ON public.diagnostic_findings FOR INSERT
      WITH CHECK (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostic_findings'
      AND policyname = 'findings_update_policy'
  ) THEN
    CREATE POLICY findings_update_policy
      ON public.diagnostic_findings FOR UPDATE
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'diagnostic_findings'
      AND policyname = 'findings_delete_policy'
  ) THEN
    CREATE POLICY findings_delete_policy
      ON public.diagnostic_findings FOR DELETE
      USING (
        workspace_id = (
          SELECT p.workspace_id FROM public.profiles p
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END
$$;

-- 6. Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('diagnostics', 'diagnostic_findings');
