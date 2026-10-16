/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_URL = 'jota_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'jota_supabase_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
  error?: string | null;
}

// Retrieve from environment or persistent config
export function getSavedSupabaseConfig(): { url: string; anonKey: string } {
  let envUrl = '';
  let envKey = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
      envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
    } else if (typeof process !== 'undefined' && process.env) {
      envUrl = process.env.VITE_SUPABASE_URL || '';
      envKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch {
    // fallback
  }

  let localUrl = '';
  let localKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      localUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '';
      localKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '';
    }
  } catch {
    // fallback
  }

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
  };
}

let activeClient: SupabaseClient | null = null;
let currentConfig: { url: string; anonKey: string } = getSavedSupabaseConfig();

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSavedSupabaseConfig();
  
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  if (activeClient && currentConfig.url === url && currentConfig.anonKey === anonKey) {
    return activeClient;
  }

  try {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentConfig = { url, anonKey };
    return activeClient;
  } catch (err) {
    console.warn('[JOTA Supabase] Error creating client:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (url) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  }

  if (anonKey) {
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  }

  activeClient = null;
  getSupabaseClient();
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL e Anon Key do Supabase são obrigatórias.' };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return { success: false, message: 'A URL do Supabase deve iniciar com https://' };
  }

  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    const { error } = await testClient.from('companies').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conectado ao Supabase com sucesso! A tabela companies ainda não existe. Execute a migration 001_initial_schema.sql no SQL Editor do Supabase.',
        };
      }
      return {
        success: false,
        message: `Erro retornado pelo Supabase: ${error.message} (Código: ${error.code})`,
      };
    }

    return {
      success: true,
      message: 'Conexão com Supabase e tabela companies verificada com sucesso!',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha ao conectar: ${errMsg}`,
    };
  }
}
