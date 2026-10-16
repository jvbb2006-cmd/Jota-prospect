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
        SET full_name = COALESCE(
                NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'full_name'), ''),
                p.full_name
            ),
            updated_at = pg_catalog.now()
        WHERE p.id = NEW.id;
        RETURN NEW;
    END IF;

    -- 2. Higienização do Nome Completo
    v_full_name := COALESCE(
        NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    -- 3. Isolamento Multi-Tenant Estrito: