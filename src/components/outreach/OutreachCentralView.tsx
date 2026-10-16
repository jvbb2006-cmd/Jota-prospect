/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCw,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Layers,
  Phone,
  Mail,
  UserCheck,
  Pause,
  Play,
  Check,
} from 'lucide-react';
import {
  Company,
  Contact,
  Diagnostic,
  OutreachMessage,
  OutreachChannel,
  Activity,
  Task,
  ActivityType,
} from '../../types/database';
import { dbRepo } from '../../services/dbRepository';
import { openWhatsAppDirect } from '../../services/whatsappService';
import { OutreachMessageCard } from './OutreachMessageCard';
import { ManualContactModal } from './ManualContactModal';

interface OutreachCentralViewProps {
  company: Company;
  workspaceId: string;
  onRefreshCompany?: () => void;
  onNavigateToDiagnostic?: () => void;
}

export const OutreachCentralView: React.FC<OutreachCentralViewProps> = ({
  company: initialCompany,
  workspaceId,
  onRefreshCompany,
  onNavigateToDiagnostic,
}) => {
  const [company, setCompany] = useState<Company>(initialCompany);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cadenceTasks, setCadenceTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [preferredChannel, setPreferredChannel] = useState<OutreachChannel>('whatsapp');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [compFresh, contList, diagList, actList, taskList, outreachList] =
        await Promise.all([
          dbRepo.getCompanyById(workspaceId, company.id),
          dbRepo.getContacts(workspaceId, company.id),
          dbRepo.getDiagnosticsByCompany(workspaceId, company.id),
          dbRepo.getActivities(workspaceId, company.id),
          dbRepo.getTasks(workspaceId, { companyId: company.id }),
          dbRepo.getOutreachMessages(workspaceId, company.id),
        ]);

      if (compFresh) setCompany(compFresh);
      setContacts(contList);

      const primary = contList.find((c) => c.is_primary) || contList[0];
      if (primary && !selectedContactId) {
        setSelectedContactId(primary.id);
      }

      const latestDiag = diagList.length > 0 ? diagList[0] : null;
      setDiagnostic(latestDiag);

      setActivities(actList);
      setCadenceTasks(taskList.filter((t) => t.title.startsWith('Dia ')));

      // Se mensagens já existirem no repositório, carregar; senão, gerar lote inicial
      if (outreachList.length > 0) {
        setMessages(outreachList);
      } else if (compFresh) {
        const gen = await dbRepo.generateOutreachForCompany(
          workspaceId,
          company.id,
          primary?.id,
          preferredChannel
        );
        setMessages(gen.messages);
      }
    } catch (err) {
      console.error('Erro ao carregar Central de Abordagem:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company.id, workspaceId]);

  const activeContact = contacts.find((c) => c.id === selectedContactId) || null;

  // Regenerar todas as 4 etapas com IA ou regras determinísticas
  const handleRegenerateAll = async () => {
    setRegenerating(true);
    try {
      const res = await dbRepo.generateOutreachForCompany(
        workspaceId,
        company.id,
        selectedContactId,
        preferredChannel
      );
      setMessages(res.messages);
      showToast(`4 mensagens regeneradas com sucesso (${res.engine}).`);
      const freshActs = await dbRepo.getActivities(workspaceId, company.id);
      setActivities(freshActs);
    } catch (err: any) {
      showToast(`Erro ao regenerar: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  // Salvar edição manual de uma etapa
  const handleSaveMessage = async (updated: OutreachMessage, note?: string) => {
    try {
      const saved = await dbRepo.saveOutreachMessage(workspaceId, updated, note);
      setMessages((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
      showToast('Mensagem e nova versão salvas com sucesso!');
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`);
    }
  };

  // Copiar mensagem
  const handleCopyMessage = async (text: string, msg: OutreachMessage) => {
    await dbRepo.logCommercialEvent(
      workspaceId,
      company.id,
      'message_copied',
      'system_observed',
      `Mensagem da ${msg.stage_title} copiada`,
      `Texto da etapa ${msg.stage_step} copiado para transferência pelo operador comercial.`,
      { stage: msg.stage, channel: msg.channel }
    );
    const freshActs = await dbRepo.getActivities(workspaceId, company.id);
    setActivities(freshActs);
  };

  // Ação de abrir WhatsApp manual
  const handleOpenWhatsApp = (e164: string, msg: OutreachMessage) => {
    const res = openWhatsAppDirect(e164, msg.content, async (details) => {
      // Registrar evento do sistema (sem alegar que a mensagem foi entregue ou enviada)
      await dbRepo.logCommercialEvent(
        workspaceId,
        company.id,
        'contact_link_opened',
        'system_observed',
        `Link WhatsApp aberto (${details.e164})`,
        `O operador abriu o link oficial wa.me da etapa ${msg.stage_step} no navegador. Observação: este registro audita a abertura do link, não a confirmação de envio ou leitura pelo lead.`,
        {
          stage: msg.stage,
          phone: details.e164,
          openedAt: details.openedAt,
        }
      );

      // Atualizar estado da mensagem para utilizado
      const updatedMsg: OutreachMessage = {
        ...msg,
        state: 'utilizado',
        updated_at: new Date().toISOString(),
      };
      await dbRepo.saveOutreachMessage(workspaceId, updatedMsg, 'Link de WhatsApp aberto');

      // Recarregar mensagens e atividades
      const [freshMsgs, freshActs] = await Promise.all([
        dbRepo.getOutreachMessages(workspaceId, company.id),
        dbRepo.getActivities(workspaceId, company.id),
      ]);
      setMessages(freshMsgs);
      setActivities(freshActs);
      showToast('Link WhatsApp aberto! Registrado no histórico como "Link aberto".');
    });

    if (!res.success) {
      showToast(res.error || 'Falha ao validar número para WhatsApp.');
    }
  };

  // Iniciar cadência dos 5 passos (dias 0, 2, 4, 8, 12)
  const handleStartCadence = async () => {
    try {
      const res = await dbRepo.startCadenceForCompany(workspaceId, company.id);
      setCadenceTasks(res.tasks);
      const [compFresh, freshActs] = await Promise.all([
        dbRepo.getCompanyById(workspaceId, company.id),
        dbRepo.getActivities(workspaceId, company.id),
      ]);
      if (compFresh) setCompany(compFresh);
      setActivities(freshActs);
      showToast('Cadência iniciada! 5 tarefas criadas no CRM e calendário.');
    } catch (err: any) {
      showToast(`Erro na cadência: ${err.message}`);
    }
  };

  // Interromper ou pausar cadência
  const handleStopCadence = async (reason: 'opt_out' | 'meeting' | 'not_interested' | 'paused') => {
    try {
      const res = await dbRepo.stopOrPauseCadence(workspaceId, company.id, reason);
      const [compFresh, freshActs, freshTasks] = await Promise.all([
        dbRepo.getCompanyById(workspaceId, company.id),
        dbRepo.getActivities(workspaceId, company.id),
        dbRepo.getTasks(workspaceId, { companyId: company.id }),
      ]);
      if (compFresh) setCompany(compFresh);
      setActivities(freshActs);
      setCadenceTasks(freshTasks.filter((t) => t.title.startsWith('Dia ')));
      showToast(res.message);
    } catch (err: any) {
      showToast(`Erro ao atualizar cadência: ${err.message}`);
    }
  };

  // Submeter registro manual no histórico
  const handleManualEventSubmit = async (data: {
    eventType: ActivityType;
    channel: string;
    result: string;
    notes: string;
    scheduledMeetingAt?: string;
  }) => {
    if (data.eventType === 'opt_out_requested') {
      await handleStopCadence('opt_out');
      return;
    }

    if (data.eventType === 'meeting_scheduled') {
      await handleStopCadence('meeting');
      return;
    }

    await dbRepo.logCommercialEvent(
      workspaceId,
      company.id,
      data.eventType,
      'manual_user',
      `Registro manual: ${data.result}`,
      `Canal: ${data.channel.toUpperCase()}. Observações: ${data.notes || 'Sem notas adicionais'}.`,
      { channel: data.channel, result: data.result }
    );

    const freshActs = await dbRepo.getActivities(workspaceId, company.id);
    setActivities(freshActs);
    showToast('Registro manual adicionado com sucesso ao histórico comercial.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Lead Bloqueado por Opt-Out */}
      {company.do_not_contact && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">
                Bloqueio Ativo — Pedido de Não Contato (Opt-Out)
              </h4>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                Este lead solicitou não receber mensagens. O envio via WhatsApp e a geração de novas tarefas de prospecção estão estritamente bloqueados em conformidade comercial.
              </p>
              {company.do_not_contact_reason && (
                <p className="text-[11px] text-red-600 mt-1 italic font-medium">
                  Motivo registrado: "{company.do_not_contact_reason}"
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => handleStopCadence('paused')}
            className="px-3 py-1.5 text-xs text-red-700 bg-white border border-red-200 hover:bg-red-100 rounded-lg font-semibold shrink-0"
          >
            Revisar Bloqueio
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Central de Abordagem Comercial
                  </h1>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2 py-0.5 rounded-full">
                    4 Etapas Estruturadas
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Geração personalizada com base nas informações do CRM e nas evidências do Diagnóstico 360°.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Contato */}
            {contacts.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 text-[11px]">Destinatário:</span>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role || 'Sem cargo'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Canal Preferencial */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 text-[11px]">Canal:</span>
              <select
                value={preferredChannel}
                onChange={(e) => setPreferredChannel(e.target.value as OutreachChannel)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none text-xs cursor-pointer capitalize"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="linkedin">LinkedIn</option>
                <option value="phone">Telefone</option>
              </select>
            </div>

            {/* Botão Regenerar Tudo */}
            <button
              onClick={handleRegenerateAll}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              <span>{regenerating ? 'Regenerando...' : 'Regenerar com IA & Dados'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Context Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-600">Base Analítica:</span>
            {diagnostic ? (
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                Diagnóstico 360° v{diagnostic.version} • Nota de Maturidade:
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  {diagnostic.overall_score}/100
                </span>
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Nenhum diagnóstico executado ainda (usando dados básicos do cadastro)
              </span>
            )}
          </div>

          {onNavigateToDiagnostic && (
            <button
              onClick={onNavigateToDiagnostic}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 self-start sm:self-auto hover:underline"
            >
              <span>Ver Diagnóstico 360° Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid com os 4 Cartões Editáveis das 4 Etapas */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Cartões de Mensagem por Etapa de Abordagem
          </h2>
          <span className="text-xs text-slate-400">
            Edição livre • Não há envio em massa ou automático
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <RotateCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-medium">Carregando central de mensagens...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map((msg) => (
              <OutreachMessageCard
                key={msg.stage}
                message={msg}
                company={company}
                contact={activeContact}
                onSave={handleSaveMessage}
                onRegenerate={async (m) => {
                  setRegenerating(true);
                  try {
                    const res = await dbRepo.generateOutreachForCompany(
                      workspaceId,
                      company.id,
                      selectedContactId,
                      m.channel
                    );
                    const updatedStage = res.messages.find((x) => x.stage === m.stage);
                    if (updatedStage) {
                      setMessages((prev) =>
                        prev.map((item) => (item.stage === m.stage ? updatedStage : item))
                      );
                      showToast(`Etapa ${m.stage_step} regenerada com sucesso!`);
                    }
                  } finally {
                    setRegenerating(false);
                  }
                }}
                onCopy={handleCopyMessage}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenManualLogModal={() => setIsManualModalOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção da Cadência de Acompanhamento (Dias 0, 2, 4, 8, 12) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Cadência de Acompanhamento Sugerida (Dias 0, 2, 4, 8 e 12)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Não envia mensagens automaticamente. Cria tarefas pendentes no CRM para revisão humana.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {company.cadence_status !== 'active' ? (
              <button
                onClick={handleStartCadence}
                disabled={company.do_not_contact}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Ativar Cadência Sugerida</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cadência Ativa
                </span>
                <button
                  onClick={() => handleStopCadence('paused')}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg"
                  title="Pausar cadência"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Linha do tempo das 5 tarefas da cadência */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { day: 0, label: 'Dia 0', title: 'Abertura & Decisor', step: 1 },
            { day: 2, label: 'Dia 2', title: 'Apresentação', step: 2 },
            { day: 4, label: 'Dia 4', title: 'Diagnóstico 360°', step: 3 },
            { day: 8, label: 'Dia 8', title: 'Insight de Setor', step: 4 },
            { day: 12, label: 'Dia 12', title: 'Convite Reunião', step: 5 },
          ].map((item, idx) => {
            const correspondingTask = cadenceTasks.find((t) => t.title.includes(`Dia ${item.day}`));
            const isCompleted = correspondingTask?.status === 'completed';
            const isPending = correspondingTask?.status === 'pending';

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isPending
                    ? 'bg-blue-50/30 border-blue-200'
                    : 'bg-slate-50/50 border-slate-200 text-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-800">{item.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? 'Concluída' : isPending ? 'Pendente' : 'Não iniciada'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-700 mt-1">{item.title}</p>
                </div>

                {correspondingTask?.due_date && (
                  <div className="mt-2 text-[10px] text-slate-400">
                    Vencimento: {new Date(correspondingTask.due_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botões de Interrupção de Cadência */}
        {company.cadence_status === 'active' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-medium">Interrupções Rápidas de Cadência:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStopCadence('meeting')}
                className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md font-semibold"
              >
                Reunião Agendada
              </button>
              <button
                onClick={() => handleStopCadence('not_interested')}
                className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md font-medium"
              >
                Sem Interesse
              </button>
              <button
                onClick={() => handleStopCadence('opt_out')}
                className="px-2.5 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md font-semibold flex items-center gap-1"
              >
                <Ban className="w-3 h-3" /> Pedido de Não Contato
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico Comercial & Auditoria de Eventos */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Histórico Comercial & Rastreabilidade de Eventos
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Diferenciação clara entre eventos observados pelo sistema e registros manuais do operador.
            </p>
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            + Registrar Evento Manual
          </button>
        </div>

        {/* Lista de Atividades */}
        <div className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Nenhuma atividade registrada ainda nesta empresa.
            </p>
          ) : (
            activities.map((act) => {
              const isSystem = act.origin === 'system_observed';
              return (
                <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 mt-0.5 ${
                        isSystem
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isSystem ? 'Sistema Observado' : 'Registro Manual'}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{act.title}</p>
                      {act.description && (
                        <p className="text-slate-500 mt-0.5 leading-relaxed text-[11px]">
                          {act.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(act.performed_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Registro Manual de Contato */}
      <ManualContactModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        company={company}
        contact={activeContact}
        onSubmit={handleManualEventSubmit}
      />
    </div>
  );
};
