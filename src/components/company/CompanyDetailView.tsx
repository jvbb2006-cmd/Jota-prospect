/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Calendar,
  CheckSquare,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  UserPlus,
  CheckCircle2,
  Clock,
  FileText,
  PhoneCall,
  Users,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Send,
} from 'lucide-react';
import { Company, Contact, Task, Opportunity, Activity, LeadStatus, TaskStatus } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';
import { ContactModal } from '../modals/ContactModal';
import { TaskModal } from '../modals/TaskModal';
import { OpportunityModal } from '../modals/OpportunityModal';
import { ActivityModal } from '../modals/ActivityModal';
import { ConfirmDialog } from '../modals/ConfirmDialog';
import { DiagnosticReportView } from '../diagnostics/DiagnosticReportView';
import { OutreachCentralView } from '../outreach/OutreachCentralView';

interface CompanyDetailViewProps {
  workspaceId: string;
  companyId: string;
  onBack: () => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
}

export const CompanyDetailView: React.FC<CompanyDetailViewProps> = ({
  workspaceId,
  companyId,
  onBack,
  onEditCompany,
  onDeleteCompany,
}) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'outreach' | 'activities' | 'tasks' | 'opportunities' | 'notes'>('diagnostic');

  // Modal triggers
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Destructive delete contact confirmation
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const data = await dbRepo.getCompanyById(workspaceId, companyId);
      setCompany(data);
    } catch (err) {
      console.error('Erro ao carregar detalhes da empresa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [workspaceId, companyId]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!company) return;
    try {
      const updated = await dbRepo.updateCompany(workspaceId, company.id, { lead_status: newStatus });
      if (updated) {
        setCompany((prev) => (prev ? { ...prev, lead_status: newStatus } : null));
        // refresh activities
        const act = await dbRepo.getActivities(workspaceId, company.id);
        setCompany((prev) => (prev ? { ...prev, activities: act } : null));
      }
    } catch (err) {
      console.error('Erro ao atualizar estágio:', err);
    }
  };

  const handleToggleWhatsAppVerified = async () => {
    if (!company) return;
    const newVal = !company.whatsapp_verified;
    try {
      await dbRepo.updateCompany(workspaceId, company.id, { whatsapp_verified: newVal });
      setCompany((prev) => (prev ? { ...prev, whatsapp_verified: newVal } : null));
    } catch (err) {
      console.error('Erro ao alternar verificação de WhatsApp:', err);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await dbRepo.updateTaskStatus(workspaceId, task.id, newStatus);
      const updatedTasks = await dbRepo.getTasks(workspaceId, { companyId: company?.id });
      setCompany((prev) => (prev ? { ...prev, tasks: updatedTasks } : null));
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete || !company) return;
    try {
      await dbRepo.deleteContact(workspaceId, contactToDelete.id);
      setCompany((prev) =>
        prev ? { ...prev, contacts: prev.contacts?.filter((c) => c.id !== contactToDelete.id) } : null
      );
      setContactToDelete(null);
    } catch (err) {
      console.error('Erro ao deletar contato:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !company) return;
    try {
      await dbRepo.deleteTask(workspaceId, taskToDelete.id);
      setCompany((prev) =>
        prev ? { ...prev, tasks: prev.tasks?.filter((t) => t.id !== taskToDelete.id) } : null
      );
      setTaskToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Empresa não encontrada</h3>
        <p className="text-xs text-slate-500 mt-1">
          O registro pode ter sido excluído ou pertencer a outro workspace.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voltar para Lista de Leads
        </button>
      </div>
    );
  }

  const cleanWhatsAppNumber = (company.whatsapp_number || company.phone || '').replace(/\D/g, '');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Contas</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {company.name}
                </h1>
                {company.is_demo && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200 font-mono">
                    DEMONSTRAÇÃO
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
                <span className="font-medium text-slate-700">{company.category || 'Geral'}</span>
                <span aria-hidden="true">·</span>
                <span>{company.city ? `${company.city}, ${company.state || ''}` : 'Brasil'}</span>
                <span aria-hidden="true">·</span>
                <span>Origem: {company.source || 'Manual'}</span>
              </div>
            </div>
          </div>

          {/* Right Actions: Stage changer + Edit + Delete */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Estágio:</span>
              <select
                value={company.lead_status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="py-1.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="novo">Novo Lead</option>
                <option value="contatado">Contatado</option>
                <option value="qualificado">Qualificado</option>
                <option value="proposta">Proposta Comercial</option>
                <option value="negociacao">Negociação</option>
                <option value="ganho">Fechado / Ganho</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>

            <button
              onClick={() => onEditCompany(company)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              title="Editar dados da empresa"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDeleteCompany(company)}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
              title="Excluir empresa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enrichment & Channels Quick Bar */}
        <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* WhatsApp */}
            {company.whatsapp_number ? (
              <a
                href={`https://wa.me/${cleanWhatsAppNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Conversar no WhatsApp</span>
                <ExternalLink className="w-3 h-3 text-emerald-500" />
              </a>
            ) : null}

            {/* Google Maps */}
            {company.google_maps_url ? (
              <a
                href={company.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-700 hover:text-blue-800 font-medium hover:underline"
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Ver no Google Maps</span>
                <ExternalLink className="w-3 h-3 text-blue-500" />
              </a>
            ) : company.address ? (
              <span className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{company.address}</span>
              </span>
            ) : null}

            {/* Website */}
            {company.website_url && (
              <a
                href={company.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-medium hover:underline"
              >
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {/* Instagram */}
            {company.instagram_url && (
              <a
                href={company.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-700 hover:text-pink-600 font-medium hover:underline"
              >
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>Instagram</span>
                <ExternalLink className="w-3 h-3 text-pink-400" />
              </a>
            )}

            {/* Email */}
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-medium hover:underline"
              >
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{company.email}</span>
              </a>
            )}
          </div>

          {/* WhatsApp verification toggle */}
          <div className="flex items-center">
            <button
              onClick={handleToggleWhatsAppVerified}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                company.whatsapp_verified
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{company.whatsapp_verified ? 'WhatsApp Verificado' : 'Marcar WhatsApp como Verificado'}</span>
            </button>
          </div>
        </div>

        {/* Multi-Contact Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Decisores & Contatos da Conta</h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                ({company.contacts?.length || 0})
              </span>
            </div>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Adicionar Contato</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(!company.contacts || company.contacts.length === 0) ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Nenhum contato cadastrado para esta empresa. Adicione o decisor principal.
              </div>
            ) : (
              company.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {contact.name}
                      </span>
                      {contact.is_primary && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium border border-blue-200 shrink-0">
                          Principal
                        </span>
                      )}
                    </div>
                    {contact.role && (
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                        {contact.role}
                      </span>
                    )}

                    <div className="mt-2.5 space-y-1 text-[11px] text-slate-600">
                      {contact.whatsapp_number && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>{contact.whatsapp_number}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    {contact.linkedin_url ? (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    ) : <span />}

                    <button
                      onClick={() => setContactToDelete(contact)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir contato"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tabs: Diagnóstico 360°, Atividades, Tarefas, Oportunidades, Notas */}
        <div className="border-b border-slate-200 px-6 bg-slate-50/50 flex gap-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'diagnostic'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Diagnóstico 360°</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Presença Digital
            </span>
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'outreach'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Central de Abordagem</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              4 Etapas
            </span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'activities'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Histórico de Atividades</span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              ({company.activities?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tarefas & Follow-ups</span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              ({company.tasks?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'opportunities'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Negócios & Oportunidades</span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              ({company.opportunities?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Anotações & Notas</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6">
          {/* 0. Diagnóstico 360° Tab */}
          {activeTab === 'diagnostic' && (
            <DiagnosticReportView
              company={company}
              workspaceId={workspaceId}
              onOpenTaskModal={(taskData) => {
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {/* 0.1 Central de Abordagem Tab (Fase 4) */}
          {activeTab === 'outreach' && (
            <OutreachCentralView
              company={company}
              workspaceId={workspaceId}
              onRefreshCompany={loadCompanyData}
              onNavigateToDiagnostic={() => setActiveTab('diagnostic')}
            />
          )}

          {/* 1. Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">
                  Registro cronológico de todas as ligações, e-mails, conversas e reuniões com a empresa
                </p>
                <button
                  onClick={() => setIsActivityModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Atividade</span>
                </button>
              </div>

              {(!company.activities || company.activities.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  Nenhuma atividade registrada ainda. Clique em "Registrar Atividade" para iniciar o histórico.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {company.activities.map((act) => {
                    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                      call: PhoneCall,
                      meeting: Users,
                      email: Mail,
                      whatsapp: MessageCircle,
                      note: FileText,
                      status_change: Clock,
                    };
                    const Icon = iconMap[act.type] || FileText;

                    return (
                      <div key={act.id} className="relative flex items-start gap-4 pl-1">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 shrink-0 z-10 shadow-2xs">
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 p-3.5 rounded-lg border border-slate-200 bg-white shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-slate-900">{act.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(act.performed_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">
                  Compromissos, ligações agendadas e prazos de retorno comercial
                </p>
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Tarefa</span>
                </button>
              </div>

              {(!company.tasks || company.tasks.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  Nenhuma tarefa agendada para esta empresa.
                </div>
              ) : (
                <div className="space-y-2">
                  {company.tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 transition-colors ${
                          isDone ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTaskStatus(task)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className={`text-xs font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {task.title}
                            </span>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {task.due_date && (
                            <span className="text-[11px] font-mono text-slate-500">
                              {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              task.priority === 'high'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : task.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>

                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Excluir tarefa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">
                  Contratos, negócios em andamento e propostas comerciais atreladas à conta
                </p>
                <button
                  onClick={() => setIsOpportunityModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Oportunidade</span>
                </button>
              </div>

              {(!company.opportunities || company.opportunities.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  Nenhuma oportunidade comercial vinculada a esta empresa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{opp.title}</span>
                        <span className="text-sm font-bold font-mono text-emerald-700">
                          {formatCurrency(opp.value)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="capitalize font-medium text-slate-700">
                          Estágio: {opp.stage.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[11px]">
                          {opp.probability}% probabilidade
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Observações internas da prospecção, histórico corporativo e notas estratégicas
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {company.notes || 'Nenhuma observação interna cadastrada para esta empresa.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <ContactModal
        isOpen={isContactModalOpen}
        workspaceId={workspaceId}
        companyId={company.id}
        onClose={() => setIsContactModalOpen(false)}
        onSaved={(newContact) => {
          setCompany((prev) => (prev ? { ...prev, contacts: [...(prev.contacts || []), newContact] } : null));
        }}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        workspaceId={workspaceId}
        companyId={company.id}
        companyName={company.name}
        onClose={() => setIsTaskModalOpen(false)}
        onSaved={(newTask) => {
          setCompany((prev) => (prev ? { ...prev, tasks: [...(prev.tasks || []), newTask] } : null));
        }}
      />

      <OpportunityModal
        isOpen={isOpportunityModalOpen}
        workspaceId={workspaceId}
        companyId={company.id}
        companyName={company.name}
        onClose={() => setIsOpportunityModalOpen(false)}
        onSaved={(newOpp) => {
          setCompany((prev) => (prev ? { ...prev, opportunities: [...(prev.opportunities || []), newOpp] } : null));
        }}
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        workspaceId={workspaceId}
        companyId={company.id}
        companyName={company.name}
        onClose={() => setIsActivityModalOpen(false)}
        onSaved={(newAct) => {
          setCompany((prev) => (prev ? { ...prev, activities: [newAct, ...(prev.activities || [])] } : null));
        }}
      />

      {/* Delete Contact Confirmation */}
      <ConfirmDialog
        isOpen={!!contactToDelete}
        title="Excluir Contato Comercial"
        message={`Tem certeza que deseja remover o contato "${contactToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Contato"
        onConfirm={handleDeleteContact}
        onCancel={() => setContactToDelete(null)}
      />

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"?`}
        confirmLabel="Excluir Tarefa"
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
