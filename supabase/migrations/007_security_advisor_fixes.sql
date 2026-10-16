-- ==============================================================================
-- JOTA Prospect Intelligence — Correções Definitivas do Security Advisor
-- Migration: 007_security_advisor_fixes.sql
-- Description: Correção não destrutiva, estrita e compatível com as migrations 001-006:
--              1. search_path protegido (SET search_path = '') em todas as funções.
--              2. Restrição estrita de privilégios de execução (REVOKE PUBLIC/anon).
--              3. Isolamento multi-tenant estrito em handle_new_user():
--                 - Todo cadastro público gera OBRIGATORIAMENTE um novo workspace isolado.
--                 - Não existe ingresso em workspaces existentes por metadados de cliente.
--                 - Tratamento de conflito de perfil protegido contra criação de workspaces órfãos.
--              4. Correção de tipo em handle_updated_at() usando pg_catalog.now().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNÇÃO: public.handle_updated_at()
-- ------------------------------------------------------------------------------
-- Problema Anterior:
--   - search_path mutável.
--   - timezone('utc', now()) retornava TIMESTAMP WITHOUT TIME ZONE, causando
--     coerção implícita com a timezone da sessão ativa para a coluna TIMESTAMPTZ.
-- Correção:
--   - SET search_path = '' com chamada qualificada pg_catalog.now().
--   - Compatibilidade direta de tipo (TIMESTAMPTZ = TIMESTAMPTZ).
--   - SECURITY INVOKER preservado (executa com privilégios do chamador).
--   - Permissões concedidas exclusivamente aos papéis que executam UPDATE (authenticated, service_role).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;


-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO: public.handle_new_user()
-- ------------------------------------------------------------------------------
-- Problema Anterior:
--   - search_path mutável.
--   - Vulnerabilidade de Tenant Hijacking: raw_user_meta_data->>'workspace_id' podia
--     ser fornecido pelo usuário no navegador para invadir workspace alheio.
--   - Vulnerabilidade de Elevação de Privilégio: raw_user_meta_data->>'role' podia
--     atribuir 'Admin' indevidamente em workspace corporativo compartilhado.
--   - Em caso de conflito de ID em public.profiles, inseria workspace órfão desnecessário.
--   - Executável publicamente por PUBLIC e anon via RPC.
-- Correção:
--   - Todo cadastro público SEMPRE provisiona um novo workspace exclusivo em public.workspaces.
--   - Metadados de workspace_id e role enviados pelo cliente no navegador são TOTALMENTE IGNORADOS.
--   - Se o profile já existir (idempotência em auth.users), NÃO cria workspace órfão e
--     NUNCA altera o workspace_id ou role já estabelecidos.
--   - SET search_path = '' com chamadas totalmente qualificadas em pg_catalog e public.
--   - SECURITY DEFINER mantido estritamente para gravar em public.workspaces e public.profiles
--     durante o evento disparado em auth.users.
--   - EXECUTE revogado de PUBLIC, anon e authenticated. Concedido apenas a postgres,
--     supabase_auth_admin e service_role.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_workspace_id UUID;
    v_full_name TEXT;
BEGIN
    -- 1. Se o perfil já existe para este usuário, não cria novo workspace nem altera permissões
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

    -- 2. Higienização do Nome Completo
    v_full_name := pg_catalog.coalesce(
        pg_catalog.nullif(pg_catalog.trim(NEW.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    -- 3. Isolamento Multi-Tenant Estrito:
    -- Todo cadastro público OBRIGATORIAMENTE cria seu próprio novo workspace privado.
    -- Ignora qualquer workspace_id ou role enviado via raw_user_meta_data.
    v_workspace_id := pg_catalog.gen_random_uuid();

    INSERT INTO public.workspaces (id, name, created_at)
    VALUES (
        v_workspace_id,
        'Espaço Comercial - ' || v_full_name,
        pg_catalog.now()
    );

    -- 4. Criação do Perfil com role 'Admin' do seu próprio novo workspace
    INSERT INTO public.profiles (
        id,
        workspace_id,
        full_name,
        email,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_workspace_id,
        v_full_name,
        NEW.email,
        'Admin',
        pg_catalog.now(),
        pg_catalog.now()
    );

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;


-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO: public.current_user_workspace_id()
-- ------------------------------------------------------------------------------
-- Problema Anterior:
--   - search_path mutável.
--   - Executável por PUBLIC e anon.
-- Correção:
--   - SET search_path = '' com referência qualificada p.workspace_id e auth.uid().
--   - STABLE e SECURITY DEFINER mantidos: imprescindíveis para evitar o erro 42P17
--     (recursão infinita) na política RLS da tabela public.profiles.
--   - Revoga EXECUTE de PUBLIC e anon.
--   - Concede EXECUTE a authenticated e service_role (obrigatório para que as políticas
--     RLS de companies, contacts, tasks, etc. avaliem o isolamento sem erro de permissão).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.workspace_id 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid());
$$;

ALTER FUNCTION public.current_user_workspace_id() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.current_user_workspace_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_workspace_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_workspace_id() TO service_role;
