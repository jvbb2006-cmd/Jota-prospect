/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Layers,
  Search,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../../services/dbRepository';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

export type ActiveView =
  | 'dashboard'
  | 'search'
  | 'leads'
  | 'kanban'
  | 'diagnostics'
  | 'company-detail'
  | 'settings'
  | 'tests';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: AuthUser | null;
  activeWorkspaceId: string;
  onSwitchToDemo: () => void;
  onSwitchToUserWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  currentUser,
  activeWorkspaceId,
  onSwitchToDemo,
  onSwitchToUserWorkspace,
}) => {
  const isDemoActive = activeWorkspaceId === DEMO_WORKSPACE_ID;

  const navItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search' as ActiveView, label: 'Encontrar Empresas', icon: Search },
    { id: 'leads' as ActiveView, label: 'Leads & Empresas', icon: Building2 },
    { id: 'kanban' as ActiveView, label: 'Pipeline Kanban', icon: Kanban },
    { id: 'diagnostics' as ActiveView, label: 'Diagnósticos 360°', icon: Sparkles },
    { id: 'tests' as ActiveView, label: 'Testes & RLS QA', icon: ShieldCheck },
    { id: 'settings' as ActiveView, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col shrink-0 h-screen bg-[#0A192F] text-slate-300 border-r border-[#1E293B] transition-all duration-300 ease-in-out z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-md shrink-0">
            J
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white tracking-tight text-sm leading-tight">
                JOTA PROSPECT
              </span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Intelligence B2B
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-label="Alternar barra lateral"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Workspace Indicator & Switcher */}
      <div className="px-3 py-3 border-b border-slate-800/60">
        {!collapsed ? (
          <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Espaço de Trabalho</span>
              </div>
              {isDemoActive ? (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-medium">
                  DEMO
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-medium">
                  PRIVADO
                </span>
              )}
            </div>

            <div className="text-xs font-semibold text-white truncate mb-2">
              {isDemoActive ? 'Dados de Demonstração' : currentUser?.full_name ? `Workspace de ${currentUser.full_name}` : 'Meu Workspace'}
            </div>

            <div className="flex gap-1 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={onSwitchToDemo}
                className={`flex-1 py-1 px-1.5 text-[10px] font-medium rounded transition-colors text-center ${
                  isDemoActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Ver Demo
              </button>
              <button
                type="button"
                onClick={onSwitchToUserWorkspace}
                className={`flex-1 py-1 px-1.5 text-[10px] font-medium rounded transition-colors text-center ${
                  !isDemoActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Meu Espaço
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={isDemoActive ? onSwitchToUserWorkspace : onSwitchToDemo}
              className={`p-2 rounded-lg transition-colors ${
                isDemoActive ? 'text-amber-400 bg-amber-950/40' : 'text-emerald-400 bg-emerald-950/40'
              }`}
              title={isDemoActive ? 'Alternar para Meu Workspace' : 'Alternar para Modo Demo'}
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer Info / DB Architecture Link */}
      <div className="p-3 border-t border-slate-800/60">
        {!collapsed ? (
          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-1">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>PostgreSQL & RLS</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal mb-2">
              Arquitetura Supabase com migrações 001 prontas.
            </p>
            <button
              onClick={() => onNavigate('settings')}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Ver migrações SQL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Configurações & Migrações SQL"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
