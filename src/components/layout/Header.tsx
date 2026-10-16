/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AuthUser } from '../../services/dbRepository';
import { getSavedSupabaseConfig } from '../../lib/supabase';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewCompany: () => void;
  currentUser: AuthUser | null;
  activeWorkspaceId: string;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  onOpenNewCompany,
  currentUser,
  activeWorkspaceId,
  onOpenAuthModal,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const supabaseConfig = getSavedSupabaseConfig();
  const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
  const isDemo = activeWorkspaceId === DEMO_WORKSPACE_ID;

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-6 shrink-0 z-10">
      {/* Left: Section Title / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            {isDemo && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Dados Demonstrativos
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 leading-tight">{subtitle}</p>}
        </div>
      </div>

      {/* Center: Global Search Input */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por empresa, segmento, cidade, decisor ou telefone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-600 bg-slate-200 rounded px-1"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Supabase Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-medium">Supabase:</span>
          {isSupabaseConfigured ? (
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1" title="Persistência estruturada em IndexedDB local pronta para conectar com Supabase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Local Persistente
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewCompany}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Empresa</span>
        </button>

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
            aria-label="Menu do Usuário"
          >
            <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                {currentUser?.full_name || 'Usuário'}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">{currentUser?.role || 'Admin'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 truncate">
                  {currentUser?.full_name || 'Gestor'}
                </p>
                <p className="text-slate-500 text-[11px] truncate">{currentUser?.email}</p>
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500" />
                    <span>Workspace:</span>
                  </span>
                  <span className="font-mono text-slate-700">
                    {activeWorkspaceId.slice(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Trocar de Conta / Login</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Sessão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
