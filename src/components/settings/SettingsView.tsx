/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  User,
  AlertCircle,
  FileCode,
  Sparkles,
  Search,
} from 'lucide-react';
import { getSavedSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { AuthUser } from '../../services/dbRepository';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

interface SettingsViewProps {
  currentUser: AuthUser | null;
  activeWorkspaceId: string;
}

const INITIAL_MIGRATION_SQL = `-- JOTA Prospect Intelligence — 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
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

-- 2. COMPANIES
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

-- 3. CONTACTS
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

-- 4. ACTIVITIES
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

-- 5. TASKS
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

-- 6. OPPORTUNITIES
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

-- RLS POLICIES (ISOLAMENTO POR WORKSPACE)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Workspace isolation: Companies" ON public.companies
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
CREATE POLICY "Workspace isolation: Contacts" ON public.contacts
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
CREATE POLICY "Workspace isolation: Activities" ON public.activities
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
CREATE POLICY "Workspace isolation: Tasks" ON public.tasks
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
CREATE POLICY "Workspace isolation: Opportunities" ON public.opportunities
    FOR ALL USING (workspace_id = public.current_user_workspace_id());`;

const PLACES_SEARCH_MIGRATION_SQL = `-- JOTA Prospect Intelligence — 003_business_searches.sql
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

CREATE TABLE IF NOT EXISTS public.business_search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES public.business_searches(id) ON DELETE CASCADE,
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
    imported_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.business_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation: business_searches" ON public.business_searches
    FOR ALL USING (workspace_id = public.current_user_workspace_id());
CREATE POLICY "Workspace isolation: business_search_results" ON public.business_search_results
    FOR ALL USING (workspace_id = public.current_user_workspace_id());`;

const SECURITY_MIGRATION_SQL = `-- JOTA Prospect Intelligence — 007_security_advisor_fixes.sql
-- 1. handle_updated_at: Define search_path e usa now() direto para TIMESTAMPTZ
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;

-- 2. handle_new_user: Validação estrita de metadados, auto-provisionamento de workspace e RBAC seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_workspace_id UUID;
    v_full_name TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.id) THEN
        UPDATE public.profiles p
        SET full_name = pg_catalog.coalesce(
                pg_catalog.nullif(pg_catalog.trim(NEW.raw_user_meta_data->>'full_name'), ''),
                p.full_name
            ),
            updated_at = pg_catalog.now()
        WHERE p.id = NEW.id;
        RETURN NEW;
    END IF;

    v_full_name := pg_catalog.coalesce(
        pg_catalog.nullif(pg_catalog.trim(NEW.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    v_workspace_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.workspaces (id, name, created_at)
    VALUES (v_workspace_id, 'Espaço Comercial - ' || v_full_name, pg_catalog.now());

    INSERT INTO public.profiles (id, workspace_id, full_name, email, role, created_at, updated_at)
    VALUES (NEW.id, v_workspace_id, v_full_name, NEW.email, 'Admin', pg_catalog.now(), pg_catalog.now());
    RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin, service_role;

-- 3. current_user_workspace_id: STABLE SECURITY DEFINER (evita recursão RLS), search_path=''
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT p.workspace_id FROM public.profiles p WHERE p.id = (SELECT auth.uid());
$$;
ALTER FUNCTION public.current_user_workspace_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_user_workspace_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_workspace_id() TO authenticated, service_role;`;

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  activeWorkspaceId,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [googleMapsKey, setGoogleMapsKey] = useState(
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || localStorage.getItem('jota_google_maps_key') || ''
  );
  const [gmpStatus, setGmpStatus] = useState<string | null>(null);
  const [testingGmp, setTestingGmp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMigrationTab, setActiveMigrationTab] = useState<'001' | '003' | '007'>('001');

  useEffect(() => {
    const cfg = getSavedSupabaseConfig();
    setSupabaseUrl(cfg.url);
    setSupabaseKey(cfg.anonKey);
  }, []);

  const handleSaveConfig = () => {
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    setTestResult({
      success: true,
      message: 'Configurações de Supabase atualizadas e salvas com sucesso!',
    });
  };

  const handleSaveGoogleMapsKey = () => {
    localStorage.setItem('jota_google_maps_key', googleMapsKey.trim());
    setGmpStatus('Chave salva localmente! O servidor usará esta chave nas requisições da Places API.');
  };

  const handleTestGooglePlaces = async () => {
    setTestingGmp(true);
    setGmpStatus(null);
    try {
      const res = await fetch('/api/search-businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-google-maps-api-key': googleMapsKey.trim(),
        },
        body: JSON.stringify({
          segment: 'Hospital',
          city: 'São Paulo',
          desiredQuantity: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setGmpStatus(`Google Places API (New) conectada com sucesso! Retornou ${data.totalFound} estabelecimento teste.`);
      } else {
        setGmpStatus(`Aviso do provedor: ${data.errorMessage || res.statusText}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGmpStatus(`Erro de conexão: ${msg}`);
    } finally {
      setTestingGmp(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) {
        saveSupabaseConfig(supabaseUrl, supabaseKey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const copyMigration = () => {
    let sqlToCopy = INITIAL_MIGRATION_SQL;
    if (activeMigrationTab === '003') sqlToCopy = PLACES_SEARCH_MIGRATION_SQL;
    if (activeMigrationTab === '007') sqlToCopy = SECURITY_MIGRATION_SQL;
    navigator.clipboard.writeText(sqlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configurações & Integrações</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerenciamento de credenciais do Supabase, Google Maps Platform (Places API New), migrações e isolamento RLS
        </p>
      </div>

      {/* Section: Google Maps Platform (Places API New) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Google Maps Platform — Places API (New) Text Search
              </h2>
              <p className="text-xs text-slate-500">
                Provedor de dados para o módulo "Encontrar Empresas". A chave é processada exclusivamente no servidor backend (/api/search-businesses).
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Google Maps API Key (GOOGLE_MAPS_API_KEY)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={googleMapsKey}
                onChange={(e) => setGoogleMapsKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveGoogleMapsKey}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Salvar Chave
              </button>
              <button
                type="button"
                disabled={testingGmp || !googleMapsKey}
                onClick={handleTestGooglePlaces}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs whitespace-nowrap"
              >
                {testingGmp ? 'Testando API...' : 'Testar Conexão Places API'}
              </button>
            </div>
          </div>

          {gmpStatus && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              {gmpStatus}
            </div>
          )}

          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-relaxed">
            <span className="font-semibold block mb-1">Guia de Ativação no Google Cloud:</span>
            1. Acesse o <strong>Google Cloud Console</strong> e selecione seu projeto.<br />
            2. Ative a API <strong>Places API (New)</strong> na biblioteca de APIs.<br />
            3. Certifique-se de que o <strong>faturamento (billing)</strong> esteja habilitado na conta GCP.<br />
            4. Recomendação de segurança: restrinja a chave de API para o serviço <em>Places API (New)</em> e IPs autorizados.
          </div>
        </div>
      </div>

      {/* Section 1: Supabase Connection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Conexão com Banco de Dados Supabase (PostgreSQL)</h2>
              <p className="text-xs text-slate-500">
                Conecte a URL e a Anon Key do seu projeto Supabase para sincronização em nuvem e RLS
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Public Anon Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-400">
              Caso as chaves não estejam configuradas, a aplicação executa normalmente via repositório IndexedDB estruturado persistente com 100% dos recursos funcionais.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Salvar Credenciais
              </button>
              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
              >
                {testing ? 'Testando Conexão...' : 'Testar Conexão com Supabase'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: SQL Migration Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Arquivos de Migração SQL (PostgreSQL & RLS)
              </h2>
              <p className="text-xs text-slate-500">
                Execute estes scripts no SQL Editor do Supabase para criar as estruturas e políticas de segurança
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveMigrationTab('001')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeMigrationTab === '001'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                001 (Fase 1: CRM & Tabelas)
              </button>
              <button
                type="button"
                onClick={() => setActiveMigrationTab('003')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeMigrationTab === '003'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                003 (Fase 2: Busca)
              </button>
              <button
                type="button"
                onClick={() => setActiveMigrationTab('007')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeMigrationTab === '007'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                007 (Segurança & Hardening)
              </button>
            </div>

            <button
              onClick={copyMigration}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
            <pre>
              {activeMigrationTab === '001'
                ? INITIAL_MIGRATION_SQL
                : activeMigrationTab === '003'
                ? PLACES_SEARCH_MIGRATION_SQL
                : SECURITY_MIGRATION_SQL}
            </pre>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Arquivo:{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">
              {activeMigrationTab === '001'
                ? '/supabase/migrations/001_initial_schema.sql'
                : activeMigrationTab === '003'
                ? '/supabase/migrations/003_business_searches.sql'
                : '/supabase/migrations/007_security_advisor_fixes.sql'}
            </code>.
          </p>
        </div>
      </div>

      {/* Section 3: Workspace & Deduplication Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workspace Card */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Dados do Workspace Ativo</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Identificador do Workspace (UUID)</span>
              <span className="font-mono text-slate-800 font-medium select-all">
                {activeWorkspaceId}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Usuário Conectado</span>
              <span className="text-slate-800 font-medium">
                {currentUser?.full_name || 'Gestor Demo'} ({currentUser?.email || 'gestor@jota.com.br'})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Papel no Workspace</span>
              <span className="text-slate-800 font-medium">{currentUser?.role || 'Admin'}</span>
            </div>
          </div>
        </div>

        {/* Deduplication Engine Card */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Motor de Deduplicação Ativo</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O JOTA analisa em tempo real possíveis duplicidades durante o cadastro ou edição de empresas no workspace:
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
            <li>Normalização fonética e remoção de sufixos societários (LTDA, S.A., ME).</li>
            <li>Identificação de domínios corporativos compartilhados em sites ou e-mails.</li>
            <li>Conferência dos 8 dígitos finais de números telefônicos ou WhatsApp.</li>
            <li>Alerta preventivo na interface antes da persistência.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
