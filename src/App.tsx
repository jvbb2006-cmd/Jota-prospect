/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { LeadsTableView } from './components/leads/LeadsTableView';
import { KanbanBoardView } from './components/kanban/KanbanBoardView';
import { CompanyDetailView } from './components/company/CompanyDetailView';
import { BusinessSearchView } from './components/search/BusinessSearchView';
import { DiagnosticsListView } from './components/diagnostics/DiagnosticsListView';
import { SettingsView } from './components/settings/SettingsView';
import { TestResultsView } from './components/tests/TestResultsView';
import { CompanyFormModal } from './components/modals/CompanyFormModal';
import { ConfirmDialog } from './components/modals/ConfirmDialog';
import { AuthModal } from './components/auth/AuthModal';
import { dbRepo, AuthUser } from './services/dbRepository';
import { DEMO_WORKSPACE_ID } from './services/mockData';
import { Company } from './types/database';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Authentication & Active Workspace
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(DEMO_WORKSPACE_ID);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      await dbRepo.initialize();
      // Set default demo user
      setCurrentUser({
        id: 'u-default-001',
        email: 'gestor@jota.com.br',
        full_name: 'Gestor Comercial Demo',
        role: 'Admin',
        workspace_id: DEMO_WORKSPACE_ID,
        created_at: new Date().toISOString(),
      });
    };
    initApp();
  }, []);

  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    setActiveView('company-detail');
  };

  const handleOpenNewCompany = () => {
    setCompanyToEdit(null);
    setIsCompanyFormOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setCompanyToEdit(company);
    setIsCompanyFormOpen(true);
  };

  const handleDeleteCompanyConfirm = async () => {
    if (!companyToDelete) return;
    try {
      await dbRepo.deleteCompany(activeWorkspaceId, companyToDelete.id);
      setCompanyToDelete(null);
      if (activeCompanyId === companyToDelete.id) {
        setActiveCompanyId(null);
        setActiveView('leads');
      }
    } catch (err) {
      console.error('Erro ao deletar empresa:', err);
    }
  };

  const handleSwitchToDemo = () => {
    setActiveWorkspaceId(DEMO_WORKSPACE_ID);
    setActiveCompanyId(null);
  };

  const handleSwitchToUserWorkspace = () => {
    if (currentUser?.workspace_id && currentUser.workspace_id !== DEMO_WORKSPACE_ID) {
      setActiveWorkspaceId(currentUser.workspace_id);
    } else {
      // Prompt to create or sign in with their own isolated workspace
      setIsAuthModalOpen(true);
    }
    setActiveCompanyId(null);
  };

  const handleUserAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveWorkspaceId(user.workspace_id);
    setActiveCompanyId(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveWorkspaceId(DEMO_WORKSPACE_ID);
    setActiveCompanyId(null);
    setActiveView('dashboard');
  };

  // View Title & Subtitle helper
  const getHeaderInfo = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Métricas executivas de prospecção comercial B2B' };
      case 'search':
        return { title: 'Encontrar Empresas', subtitle: 'Prospecção e busca de estabelecimentos comerciais reais via Google Places API (New)' };
      case 'leads':
        return { title: 'Leads & Empresas', subtitle: 'Tabela de prospecção, filtros de segmento e ações' };
      case 'kanban':
        return { title: 'Pipeline Kanban', subtitle: 'Gestão visual dos estágios comerciais' };
      case 'diagnostics':
        return { title: 'Diagnósticos 360°', subtitle: 'Inteligência de presença digital, auditoria em 9 dimensões e histórico de versões' };
      case 'company-detail':
        return { title: 'Ficha da Conta', subtitle: 'Detalhes comerciais, contatos, atividades e oportunidades' };
      case 'settings':
        return { title: 'Configurações', subtitle: 'Conexão Supabase, credenciais e migrações SQL' };
      case 'tests':
        return { title: 'Auditoria de Testes QA', subtitle: 'Validação de CRUD, isolamento RLS e regras de negócio' };
      default:
        return { title: 'JOTA Prospect Intelligence' };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden antialiased">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={(view) => {
          if (view !== 'company-detail') {
            setActiveCompanyId(null);
          }
          setActiveView(view);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchToDemo={handleSwitchToDemo}
        onSwitchToUserWorkspace={handleSwitchToUserWorkspace}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <Header
          title={title}
          subtitle={subtitle}
          searchQuery={globalSearch}
          onSearchChange={(q) => {
            setGlobalSearch(q);
            if (activeView === 'dashboard' && q.trim().length > 0) {
              setActiveView('leads');
            }
          }}
          onOpenNewCompany={handleOpenNewCompany}
          currentUser={currentUser}
          activeWorkspaceId={activeWorkspaceId}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {activeView === 'dashboard' && (
            <DashboardView
              workspaceId={activeWorkspaceId}
              onNavigateToLeads={() => setActiveView('leads')}
              onNavigateToKanban={() => setActiveView('kanban')}
              onSelectCompany={handleSelectCompany}
              onOpenNewCompany={handleOpenNewCompany}
            />
          )}

          {activeView === 'search' && (
            <BusinessSearchView
              workspaceId={activeWorkspaceId}
              userId={currentUser?.id}
              onNavigateToLeads={() => setActiveView('leads')}
              onSelectCompany={handleSelectCompany}
            />
          )}

          {activeView === 'leads' && (
            <LeadsTableView
              workspaceId={activeWorkspaceId}
              searchQuery={globalSearch}
              onSelectCompany={handleSelectCompany}
              onEditCompany={handleEditCompany}
              onDeleteCompany={(c) => setCompanyToDelete(c)}
              onOpenNewCompany={handleOpenNewCompany}
            />
          )}

          {activeView === 'kanban' && (
            <KanbanBoardView
              workspaceId={activeWorkspaceId}
              searchQuery={globalSearch}
              onSelectCompany={handleSelectCompany}
              onOpenNewCompany={handleOpenNewCompany}
            />
          )}

          {activeView === 'diagnostics' && (
            <DiagnosticsListView
              workspaceId={activeWorkspaceId}
              onSelectCompany={handleSelectCompany}
            />
          )}

          {activeView === 'company-detail' && activeCompanyId && (
            <CompanyDetailView
              workspaceId={activeWorkspaceId}
              companyId={activeCompanyId}
              onBack={() => {
                setActiveCompanyId(null);
                setActiveView('leads');
              }}
              onEditCompany={handleEditCompany}
              onDeleteCompany={(c) => setCompanyToDelete(c)}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              activeWorkspaceId={activeWorkspaceId}
            />
          )}

          {activeView === 'tests' && <TestResultsView />}
        </main>
      </div>

      {/* Company Create / Edit Modal */}
      <CompanyFormModal
        isOpen={isCompanyFormOpen}
        workspaceId={activeWorkspaceId}
        initialData={companyToEdit}
        onClose={() => {
          setIsCompanyFormOpen(false);
          setCompanyToEdit(null);
        }}
        onSave={(saved) => {
          setIsCompanyFormOpen(false);
          setCompanyToEdit(null);
          handleSelectCompany(saved.id);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!companyToDelete}
        title="Excluir Empresa e Dados Relacionados"
        message={`Tem certeza que deseja excluir "${companyToDelete?.name}"? Esta ação removerá em cascata todos os contatos, atividades, tarefas e oportunidades associadas.`}
        confirmLabel="Excluir Empresa"
        onConfirm={handleDeleteCompanyConfirm}
        onCancel={() => setCompanyToDelete(null)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleUserAuthenticated}
      />
    </div>
  );
}
