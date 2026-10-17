
-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 2: Busca de Empresas
-- Migration: 003_business_searches.sql
-- Description: Histórico de buscas e resultados de empresas
-- Versão corrigida: execução repetível das políticas RLS
-- ==============================================================================

-- 1. Tabela: BUSINESS_SEARCHES
CREATE TABLE IF NOT EXISTS public.business_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    segment TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Brasil',
    desired_quantity INTEGER NOT NULL DEFAULT 20,
    results_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'partial', 'failed', 'no_results')),
    provider TEXT NOT NULL DEFAULT 'google_places_new',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela: BUSINESS_SEARCH_RESULTS
CREATE TABLE IF NOT EXISTS public.business_search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL
        REFERENCES public.business_searches(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    provider_place_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Brasil',
    phone TEXT,
    website_url TEXT,
    google_maps_url TEXT,
    rating NUMERIC(3, 1),
    user_ratings_total INTEGER DEFAULT 0,
    category TEXT,
    is_imported BOOLEAN DEFAULT false,
    imported_company_id UUID
        REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_business_searches_workspace
    ON public.business_searches(workspace_id);

CREATE INDEX IF NOT EXISTS idx_business_searches_status
    ON public.business_searches(status);

CREATE INDEX IF NOT EXISTS idx_business_results_search_id
    ON public.business_search_results(search_id);

CREATE INDEX IF NOT EXISTS idx_business_results_place_id
    ON public.business_search_results(provider_place_id);

CREATE INDEX IF NOT EXISTS idx_business_results_workspace
    ON public.business_search_results(workspace_id);

-- 4. Habilitar RLS
ALTER TABLE public.business_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_search_results ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas existentes para evitar duplicidade
DROP POLICY IF EXISTS "Workspace isolation: Select business_searches"
    ON public.business_searches;
DROP POLICY IF EXISTS "Workspace isolation: Insert business_searches"
    ON public.business_searches;
DROP POLICY IF EXISTS "Workspace isolation: Update business_searches"
    ON public.business_searches;
DROP POLICY IF EXISTS "Workspace isolation: Delete business_searches"
    ON public.business_searches;

DROP POLICY IF EXISTS "Workspace isolation: Select business_search_results"
    ON public.business_search_results;
DROP POLICY IF EXISTS "Workspace isolation: Insert business_search_results"
    ON public.business_search_results;
DROP POLICY IF EXISTS "Workspace isolation: Update business_search_results"
    ON public.business_search_results;
DROP POLICY IF EXISTS "Workspace isolation: Delete business_search_results"
    ON public.business_search_results;

-- 6. Políticas de business_searches
CREATE POLICY "Workspace isolation: Select business_searches"
    ON public.business_searches
    FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert business_searches"
    ON public.business_searches
    FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update business_searches"
    ON public.business_searches
    FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete business_searches"
    ON public.business_searches
    FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());

-- 7. Políticas de business_search_results
CREATE POLICY "Workspace isolation: Select business_search_results"
    ON public.business_search_results
    FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert business_search_results"
    ON public.business_search_results
    FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update business_search_results"
    ON public.business_search_results
    FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete business_search_results"
    ON public.business_search_results
    FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());
