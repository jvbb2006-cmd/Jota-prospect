-- ==============================================================================
-- JOTA Prospect Intelligence — Fase 1: Fundação
-- Migration: 001_initial_schema.sql
-- Description: Tabelas principais, restrições, índices e políticas RLS de Workspace
-- ==============================================================================

-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.1 Tabela: WORKSPACES (Espaços de Trabalho / Multi-tenant)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Espaço Principal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela: PROFILES (Perfis de Usuários e Vínculo com Workspace)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Admin',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela: COMPANIES (Empresas / Prospecção B2B)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Brasil',
    phone TEXT,
    whatsapp_number TEXT,
    whatsapp_verified BOOLEAN DEFAULT false,
    email TEXT,
    website_url TEXT,
    instagram_url TEXT,
    google_maps_url TEXT,
    source TEXT DEFAULT 'Manual',
    source_place_id TEXT,
    lead_status TEXT NOT NULL DEFAULT 'novo' 
        CHECK (lead_status IN ('novo', 'contatado', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela: CONTACTS (Múltiplos Contatos por Empresa)
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela: ACTIVITIES (Histórico Comercial: Ligações, Reuniões, E-mails, WhatsApp)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'note', 'status_change')),
    title TEXT NOT NULL,
    description TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela: TASKS (Tarefas e Follow-ups)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela: OPPORTUNITIES (Oportunidades Comerciais / Pipeline)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stage TEXT NOT NULL DEFAULT 'prospeccao' 
        CHECK (stage IN ('prospeccao', 'contato', 'qualificacao', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido')),
    close_date DATE,
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE E DEDUPLICAÇÃO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_companies_workspace ON public.companies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_lead_status ON public.companies(lead_status);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON public.companies(lower(trim(name)));
CREATE INDEX IF NOT EXISTS idx_companies_city_state ON public.companies(city, state);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON public.activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON public.opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON public.opportunities(workspace_id);

-- ==============================================================================
-- FUNÇÕES DE SUPORTE E TRIGGERS DE UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_contacts_updated_at ON public.contacts;
CREATE TRIGGER set_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER set_opportunities_updated_at
    BEFORE UPDATE ON public.opportunities
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para provisionar automaticamente o Profile ao registrar em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Se um workspace_id foi passado no metadata, usa ele; senão gera um novo workspace
    IF (NEW.raw_user_meta_data->>'workspace_id') IS NOT NULL THEN
        new_workspace_id := (NEW.raw_user_meta_data->>'workspace_id')::UUID;
    ELSE
        new_workspace_id := uuid_generate_v4();
    END IF;

    INSERT INTO public.profiles (id, workspace_id, full_name, email, role)
    VALUES (
        NEW.id,
        new_workspace_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Admin')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) - ISOLAMENTO ESTRITO POR WORKSPACE
-- ==============================================================================

-- Função auxiliar estável que retorna o workspace_id do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Habilitação de RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para PROFILES
CREATE POLICY "Users can view members of their own workspace"
    ON public.profiles FOR SELECT
    USING (workspace_id = public.current_user_workspace_id() OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- 2. Políticas para COMPANIES
CREATE POLICY "Workspace isolation: Select companies"
    ON public.companies FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert companies"
    ON public.companies FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update companies"
    ON public.companies FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete companies"
    ON public.companies FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());

-- 3. Políticas para CONTACTS
CREATE POLICY "Workspace isolation: Select contacts"
    ON public.contacts FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert contacts"
    ON public.contacts FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update contacts"
    ON public.contacts FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete contacts"
    ON public.contacts FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());

-- 4. Políticas para ACTIVITIES
CREATE POLICY "Workspace isolation: Select activities"
    ON public.activities FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert activities"
    ON public.activities FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update activities"
    ON public.activities FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete activities"
    ON public.activities FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());

-- 5. Políticas para TASKS
CREATE POLICY "Workspace isolation: Select tasks"
    ON public.tasks FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update tasks"
    ON public.tasks FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete tasks"
    ON public.tasks FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());

-- 6. Políticas para OPPORTUNITIES
CREATE POLICY "Workspace isolation: Select opportunities"
    ON public.opportunities FOR SELECT
    USING (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Insert opportunities"
    ON public.opportunities FOR INSERT
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Update opportunities"
    ON public.opportunities FOR UPDATE
    USING (workspace_id = public.current_user_workspace_id())
    WITH CHECK (workspace_id = public.current_user_workspace_id());

CREATE POLICY "Workspace isolation: Delete opportunities"
    ON public.opportunities FOR DELETE
    USING (workspace_id = public.current_user_workspace_id());
