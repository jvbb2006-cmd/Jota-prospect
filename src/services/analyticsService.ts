/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Company,
  Opportunity,
  Activity,
  Diagnostic,
  Task,
} from '../types/database';

export type PeriodFilter = '7d' | '30d' | '90d' | '12m' | 'all' | 'custom';

export interface AnalyticsFilters {
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  city?: string;
  segment?: string;
  campaign?: string;
  responsible?: string;
}

export interface AnalyticsMetrics {
  leadsFound: number;
  leadsQualified: number;
  diagnosticsCompleted: number;
  contactsRegistered: number;
  responsesReceived: number;
  meetingsScheduled: number;
  meetingsHeld: number;
  proposalsSent: number;
  contractsWon: number;
  responseRate: number; // 0 - 100
  conversionRate: number; // 0 - 100
  opportunitiesValue: number; // R$
  contractedRevenue: number; // R$
}

export interface WeeklyTrendPoint {
  weekKey: string;
  weekLabel: string;
  weekStart: string;
  contacts: number;
  responses: number;
}

export interface FunnelStageData {
  stageKey: string;
  stageName: string;
  count: number;
  conversionFromPrevious: number; // %
  conversionFromTop: number; // %
  color: string;
}

export interface SegmentBreakdown {
  segment: string;
  leadCount: number;
  wonCount: number;
  conversionRate: number;
  pipelineValue: number;
  contractedRevenue: number;
}

export interface CityBreakdown {
  city: string;
  state?: string;
  leadCount: number;
  wonCount: number;
  conversionRate: number;
  contractedRevenue: number;
}

export interface LossReasonData {
  reason: string;
  count: number;
  percentage: number;
  lostValue: number;
}

export interface AnalyticsReport {
  filters: AnalyticsFilters;
  metrics: AnalyticsMetrics;
  weeklyTrend: WeeklyTrendPoint[];
  funnelStages: FunnelStageData[];
  segmentBreakdown: SegmentBreakdown[];
  cityBreakdown: CityBreakdown[];
  lossReasons: LossReasonData[];
  availableFilterOptions: {
    cities: string[];
    segments: string[];
    campaigns: string[];
    responsibles: string[];
  };
  hasData: boolean;
  isEmpty: boolean;
}

/**
 * Normaliza e calcula data inicial com base no filtro de período
 */
export function getStartDateFromPeriod(period: PeriodFilter, customStart?: string): Date | null {
  if (period === 'all') return null;
  if (period === 'custom' && customStart) {
    const d = new Date(customStart);
    return isNaN(d.getTime()) ? null : d;
  }
  const now = new Date();
  const res = new Date(now);
  switch (period) {
    case '7d':
      res.setDate(now.getDate() - 7);
      break;
    case '30d':
      res.setDate(now.getDate() - 30);
      break;
    case '90d':
      res.setDate(now.getDate() - 90);
      break;
    case '12m':
      res.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return null;
  }
  return res;
}

/**
 * Normaliza data final para o filtro
 */
export function getEndDateFromPeriod(period: PeriodFilter, customEnd?: string): Date | null {
  if (period === 'custom' && customEnd) {
    const d = new Date(customEnd);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Camada pura e reutilizável para cálculo de indicadores de Analytics B2B
 * Garante conformidade estrita com as regras da Fase 5:
 * - Não contabiliza links abertos como mensagens enviadas
 * - Não contabiliza reuniões sugeridas como reuniões agendadas
 * - Evita duplicar leads ou eventos nos indicadores (deduplicação por ID)
 * - Tratamento para denominadores iguais a zero e períodos sem dados
 */
export function computeAnalyticsReport(
  companies: Company[],
  opportunities: Opportunity[],
  activities: Activity[],
  diagnostics: Diagnostic[],
  tasks: Task[],
  filters: AnalyticsFilters
): AnalyticsReport {
  const startDate = getStartDateFromPeriod(filters.period, filters.startDate);
  const endDate = getEndDateFromPeriod(filters.period, filters.endDate);

  // 1. Extrair opções de filtros disponíveis antes da filtragem restritiva
  const citiesSet = new Set<string>();
  const segmentsSet = new Set<string>();
  const campaignsSet = new Set<string>();
  const responsiblesSet = new Set<string>();

  companies.forEach((c) => {
    if (c.city && c.city.trim()) citiesSet.add(c.city.trim());
    if (c.category && c.category.trim()) segmentsSet.add(c.category.trim());
    if (c.campaign && c.campaign.trim()) campaignsSet.add(c.campaign.trim());
    if (c.assigned_to && c.assigned_to.trim()) responsiblesSet.add(c.assigned_to.trim());
  });

  opportunities.forEach((op) => {
    if (op.campaign && op.campaign.trim()) campaignsSet.add(op.campaign.trim());
    if (op.assigned_to && op.assigned_to.trim()) responsiblesSet.add(op.assigned_to.trim());
  });

  tasks.forEach((t) => {
    if (t.assigned_to && t.assigned_to.trim()) responsiblesSet.add(t.assigned_to.trim());
  });

  // 2. Filtrar empresas com base nas dimensões solicitadas
  const filteredCompanies = companies.filter((c) => {
    // Período
    if (startDate || endDate) {
      const createdAt = new Date(c.created_at);
      if (startDate && createdAt < startDate) return false;
      if (endDate && createdAt > endDate) return false;
    }

    // Cidade
    if (filters.city && filters.city !== 'all') {
      if (c.city !== filters.city) return false;
    }

    // Segmento
    if (filters.segment && filters.segment !== 'all') {
      if (c.category !== filters.segment) return false;
    }

    // Campanha
    if (filters.campaign && filters.campaign !== 'all') {
      if (c.campaign !== filters.campaign) return false;
    }

    // Responsável
    if (filters.responsible && filters.responsible !== 'all') {
      if (c.assigned_to !== filters.responsible) return false;
    }

    return true;
  });

  const filteredCompanyIds = new Set(filteredCompanies.map((c) => c.id));

  // 3. Filtrar oportunidades das empresas selecionadas
  const filteredOpportunities = opportunities.filter((op) => {
    if (!filteredCompanyIds.has(op.company_id)) return false;
    if (filters.campaign && filters.campaign !== 'all' && op.campaign !== filters.campaign) {
      return false;
    }
    if (filters.responsible && filters.responsible !== 'all' && op.assigned_to !== filters.responsible) {
      return false;
    }
    return true;
  });

  // 4. Filtrar atividades das empresas selecionadas
  const filteredActivities = activities.filter((act) => {
    if (!filteredCompanyIds.has(act.company_id)) return false;
    if (startDate || endDate) {
      const performed = new Date(act.performed_at || act.created_at);
      if (startDate && performed < startDate) return false;
      if (endDate && performed > endDate) return false;
    }
    return true;
  });

  // 5. Filtrar diagnósticos das empresas selecionadas
  const filteredDiagnostics = diagnostics.filter((diag) => {
    if (!filteredCompanyIds.has(diag.company_id)) return false;
    if (startDate || endDate) {
      const createdAt = new Date(diag.created_at);
      if (startDate && createdAt < startDate) return false;
      if (endDate && createdAt > endDate) return false;
    }
    return true;
  });

  // 6. Filtrar tarefas das empresas selecionadas
  const filteredTasks = tasks.filter((t) => {
    if (t.company_id && !filteredCompanyIds.has(t.company_id)) return false;
    return true;
  });

  // ---------------------------------------------------------------------------
  // CÁLCULO DAS MÉTRICAS (com deduplicação estrita de IDs)
  // ---------------------------------------------------------------------------

  // A. Leads Encontrados (total único de empresas filtradas)
  const leadsFound = filteredCompanies.length;

  // B. Leads Qualificados (status avançado ou diag score >= 60)
  const qualifiedStatusSet = new Set(['qualificado', 'proposta', 'negociacao', 'ganho']);
  const qualifiedCompanyIds = new Set<string>();

  filteredCompanies.forEach((c) => {
    if (qualifiedStatusSet.has(c.lead_status)) {
      qualifiedCompanyIds.add(c.id);
    }
  });

  filteredDiagnostics.forEach((d) => {
    if (d.status === 'completed' && d.overall_score >= 60) {
      if (filteredCompanyIds.has(d.company_id)) {
        qualifiedCompanyIds.add(d.company_id);
      }
    }
  });

  const leadsQualified = qualifiedCompanyIds.size;

  // C. Diagnósticos Concluídos (apenas com status completed)
  const completedDiagnostics = filteredDiagnostics.filter((d) => d.status === 'completed');
  // Deduplicação: se houver múltiplas versões da mesma empresa, contar 1 por empresa ou diagnósticos únicos
  const completedDiagIds = new Set(completedDiagnostics.map((d) => d.id));
  const diagnosticsCompleted = completedDiagIds.size;

  // D. Contatos Registrados (Efetivos)
  // REGRA CRÍTICA: "Não contabilizar links abertos como mensagens enviadas."
  // Contabiliza apenas: call, whatsapp, email, manual_contact_logged
  // Exclui estritamente: contact_link_opened, message_prepared, message_copied, note, status_change
  const validContactTypes = new Set(['call', 'whatsapp', 'email', 'manual_contact_logged']);
  const contactsRegisteredActivities = filteredActivities.filter((act) =>
    validContactTypes.has(act.type)
  );
  const contactsRegistered = contactsRegisteredActivities.length;

  // E. Respostas Recebidas
  const responsesReceivedActivities = filteredActivities.filter(
    (act) => act.type === 'response_received'
  );
  const responsesReceived = responsesReceivedActivities.length;

  // F. Reuniões Marcadas
  // REGRA CRÍTICA: "Não contabilizar reuniões sugeridas como reuniões agendadas."
  // Apenas activities do tipo meeting_scheduled ou tasks de reunião marcadas/agendadas
  // Tarefas que são apenas sugestões automáticas de cadência não confirmadas NÃO entram
  const scheduledMeetingActivities = filteredActivities.filter(
    (act) => act.type === 'meeting_scheduled'
  );

  // Apenas tarefas explicitamente agendadas com data que não sejam sugestões pendentes de cadência
  const explicitScheduledMeetingTasks = filteredTasks.filter(
    (t) =>
      !t.is_cadence &&
      !t.title.startsWith('Dia ') &&
      (t.title.toLowerCase().includes('reunião agendada') ||
        t.title.toLowerCase().includes('reunião confirmada') ||
        (t.title.toLowerCase().includes('reunião') && t.status === 'completed'))
  );

  // Deduplicação de IDs de reuniões
  const scheduledMeetingKeys = new Set<string>();
  scheduledMeetingActivities.forEach((act) => scheduledMeetingKeys.add(`act-${act.id}`));
  explicitScheduledMeetingTasks.forEach((t) => scheduledMeetingKeys.add(`task-${t.id}`));
  const meetingsScheduled = scheduledMeetingKeys.size;

  // G. Reuniões Realizadas
  const meetingsHeldActivities = filteredActivities.filter(
    (act) => act.type === 'meeting' && !act.title.toLowerCase().includes('cancelada')
  );
  const completedMeetingTasks = filteredTasks.filter(
    (t) => t.status === 'completed' && t.title.toLowerCase().includes('reunião')
  );
  const heldMeetingKeys = new Set<string>();
  meetingsHeldActivities.forEach((act) => heldMeetingKeys.add(`act-${act.id}`));
  completedMeetingTasks.forEach((t) => heldMeetingKeys.add(`task-${t.id}`));
  const meetingsHeld = heldMeetingKeys.size;

  // H. Propostas Enviadas
  // Oportunidades em proposta, negociação ou ganho, ou empresas com esse estágio
  const proposalCompanyIds = new Set<string>();
  filteredCompanies.forEach((c) => {
    if (['proposta', 'negociacao', 'ganho'].includes(c.lead_status)) {
      proposalCompanyIds.add(c.id);
    }
  });
  filteredOpportunities.forEach((op) => {
    if (['proposta', 'negociacao', 'fechado_ganho'].includes(op.stage)) {
      proposalCompanyIds.add(op.company_id);
    }
  });
  const proposalsSent = proposalCompanyIds.size;

  // I. Contratos Ganhos
  const wonCompanyIds = new Set<string>();
  filteredCompanies.forEach((c) => {
    if (c.lead_status === 'ganho') wonCompanyIds.add(c.id);
  });
  filteredOpportunities.forEach((op) => {
    if (op.stage === 'fechado_ganho') wonCompanyIds.add(op.company_id);
  });
  const contractsWon = wonCompanyIds.size;

  // J. Taxa de Resposta (%) com proteção contra divisão por zero
  const responseRate =
    contactsRegistered > 0
      ? Number(((responsesReceived / contactsRegistered) * 100).toFixed(1))
      : 0;

  // K. Taxa de Conversão (%) com proteção contra divisão por zero
  const conversionRate =
    leadsFound > 0
      ? Number(((contractsWon / leadsFound) * 100).toFixed(1))
      : 0;

  // L. Valor de Oportunidades em Aberto no Funil (R$)
  const activeStages = new Set(['qualificacao', 'proposta', 'negociacao']);
  const opportunitiesValue = filteredOpportunities
    .filter((op) => activeStages.has(op.stage))
    .reduce((sum, op) => sum + (Number(op.value) || 0), 0);

  // M. Receita Contratada Registrada (R$)
  const contractedRevenue = filteredOpportunities
    .filter((op) => op.stage === 'fechado_ganho')
    .reduce((sum, op) => sum + (Number(op.value) || 0), 0);

  const metrics: AnalyticsMetrics = {
    leadsFound,
    leadsQualified,
    diagnosticsCompleted,
    contactsRegistered,
    responsesReceived,
    meetingsScheduled,
    meetingsHeld,
    proposalsSent,
    contractsWon,
    responseRate,
    conversionRate,
    opportunitiesValue,
    contractedRevenue,
  };

  // ---------------------------------------------------------------------------
  // GRÁFICO 1: EVOLUÇÃO SEMANAL DE CONTATOS E RESPOSTAS
  // ---------------------------------------------------------------------------
  const weeklyMap = new Map<string, WeeklyTrendPoint>();

  // Gerar últimas 6 semanas para garantir linha contínua mesmo sem dados
  const refDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);
    const weekLabel = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
    weeklyMap.set(weekKey, {
      weekKey,
      weekLabel,
      weekStart: weekKey,
      contacts: 0,
      responses: 0,
    });
  }

  // Preencher com atividades filtradas
  contactsRegisteredActivities.forEach((act) => {
    const actDate = new Date(act.performed_at || act.created_at);
    const day = actDate.getDay();
    const diff = actDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(actDate.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);
    if (weeklyMap.has(weekKey)) {
      weeklyMap.get(weekKey)!.contacts += 1;
    } else {
      const weekLabel = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
      weeklyMap.set(weekKey, {
        weekKey,
        weekLabel,
        weekStart: weekKey,
        contacts: 1,
        responses: 0,
      });
    }
  });

  responsesReceivedActivities.forEach((act) => {
    const actDate = new Date(act.performed_at || act.created_at);
    const day = actDate.getDay();
    const diff = actDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(actDate.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);
    if (weeklyMap.has(weekKey)) {
      weeklyMap.get(weekKey)!.responses += 1;
    } else {
      const weekLabel = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
      weeklyMap.set(weekKey, {
        weekKey,
        weekLabel,
        weekStart: weekKey,
        contacts: 0,
        responses: 1,
      });
    }
  });

  const weeklyTrend = Array.from(weeklyMap.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  // ---------------------------------------------------------------------------
  // GRÁFICO 2: CONVERSÃO ENTRE ETAPAS (FUNIL COMERCIAL)
  // ---------------------------------------------------------------------------
  const funnelStages: FunnelStageData[] = [
    {
      stageKey: 'leads',
      stageName: '1. Leads Encontrados',
      count: leadsFound,
      conversionFromPrevious: 100,
      conversionFromTop: 100,
      color: '#3B82F6', // Blue
    },
    {
      stageKey: 'qualificados',
      stageName: '2. Qualificados',
      count: leadsQualified,
      conversionFromPrevious: leadsFound > 0 ? Number(((leadsQualified / leadsFound) * 100).toFixed(1)) : 0,
      conversionFromTop: leadsFound > 0 ? Number(((leadsQualified / leadsFound) * 100).toFixed(1)) : 0,
      color: '#6366F1', // Indigo
    },
    {
      stageKey: 'contatados',
      stageName: '3. Contatados',
      count: Math.min(contactsRegistered, leadsFound),
      conversionFromPrevious:
        leadsQualified > 0
          ? Number(((Math.min(contactsRegistered, leadsFound) / leadsQualified) * 100).toFixed(1))
          : 0,
      conversionFromTop:
        leadsFound > 0
          ? Number(((Math.min(contactsRegistered, leadsFound) / leadsFound) * 100).toFixed(1))
          : 0,
      color: '#8B5CF6', // Purple
    },
    {
      stageKey: 'reunioes',
      stageName: '4. Reuniões Marcadas',
      count: meetingsScheduled,
      conversionFromPrevious:
        contactsRegistered > 0
          ? Number(((meetingsScheduled / contactsRegistered) * 100).toFixed(1))
          : 0,
      conversionFromTop:
        leadsFound > 0 ? Number(((meetingsScheduled / leadsFound) * 100).toFixed(1)) : 0,
      color: '#EC4899', // Pink
    },
    {
      stageKey: 'propostas',
      stageName: '5. Propostas Enviadas',
      count: proposalsSent,
      conversionFromPrevious:
        meetingsScheduled > 0
          ? Number(((proposalsSent / meetingsScheduled) * 100).toFixed(1))
          : 0,
      conversionFromTop:
        leadsFound > 0 ? Number(((proposalsSent / leadsFound) * 100).toFixed(1)) : 0,
      color: '#F59E0B', // Amber
    },
    {
      stageKey: 'ganhos',
      stageName: '6. Contratos Ganhos',
      count: contractsWon,
      conversionFromPrevious:
        proposalsSent > 0 ? Number(((contractsWon / proposalsSent) * 100).toFixed(1)) : 0,
      conversionFromTop:
        leadsFound > 0 ? Number(((contractsWon / leadsFound) * 100).toFixed(1)) : 0,
      color: '#10B981', // Emerald
    },
  ];

  // ---------------------------------------------------------------------------
  // GRÁFICO 3: RESULTADOS POR SEGMENTO
  // ---------------------------------------------------------------------------
  const segmentMap = new Map<string, SegmentBreakdown>();

  filteredCompanies.forEach((c) => {
    const seg = c.category && c.category.trim() ? c.category.trim() : 'Geral / Outros';
    if (!segmentMap.has(seg)) {
      segmentMap.set(seg, {
        segment: seg,
        leadCount: 0,
        wonCount: 0,
        conversionRate: 0,
        pipelineValue: 0,
        contractedRevenue: 0,
      });
    }
    const item = segmentMap.get(seg)!;
    item.leadCount += 1;
    if (c.lead_status === 'ganho') {
      item.wonCount += 1;
    }
  });

  filteredOpportunities.forEach((op) => {
    const comp = filteredCompanies.find((c) => c.id === op.company_id);
    const seg = comp?.category && comp.category.trim() ? comp.category.trim() : 'Geral / Outros';
    if (segmentMap.has(seg)) {
      const item = segmentMap.get(seg)!;
      if (activeStages.has(op.stage)) {
        item.pipelineValue += Number(op.value) || 0;
      }
      if (op.stage === 'fechado_ganho') {
        item.contractedRevenue += Number(op.value) || 0;
      }
    }
  });

  segmentMap.forEach((item) => {
    item.conversionRate =
      item.leadCount > 0 ? Number(((item.wonCount / item.leadCount) * 100).toFixed(1)) : 0;
  });

  const segmentBreakdown = Array.from(segmentMap.values()).sort(
    (a, b) => b.contractedRevenue - a.contractedRevenue || b.leadCount - a.leadCount
  );

  // ---------------------------------------------------------------------------
  // GRÁFICO 4: RESULTADOS POR CIDADE
  // ---------------------------------------------------------------------------
  const cityMap = new Map<string, CityBreakdown>();

  filteredCompanies.forEach((c) => {
    const city = c.city && c.city.trim() ? c.city.trim() : 'Não informada';
    const state = c.state || '';
    const key = `${city}-${state}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city,
        state,
        leadCount: 0,
        wonCount: 0,
        conversionRate: 0,
        contractedRevenue: 0,
      });
    }
    const item = cityMap.get(key)!;
    item.leadCount += 1;
    if (c.lead_status === 'ganho') {
      item.wonCount += 1;
    }
  });

  filteredOpportunities.forEach((op) => {
    if (op.stage === 'fechado_ganho') {
      const comp = filteredCompanies.find((c) => c.id === op.company_id);
      const city = comp?.city && comp.city.trim() ? comp.city.trim() : 'Não informada';
      const state = comp?.state || '';
      const key = `${city}-${state}`;
      if (cityMap.has(key)) {
        cityMap.get(key)!.contractedRevenue += Number(op.value) || 0;
      }
    }
  });

  cityMap.forEach((item) => {
    item.conversionRate =
      item.leadCount > 0 ? Number(((item.wonCount / item.leadCount) * 100).toFixed(1)) : 0;
  });

  const cityBreakdown = Array.from(cityMap.values()).sort(
    (a, b) => b.contractedRevenue - a.contractedRevenue || b.leadCount - a.leadCount
  );

  // ---------------------------------------------------------------------------
  // GRÁFICO 5: MOTIVOS DE PERDA
  // ---------------------------------------------------------------------------
  const lossReasonMap = new Map<string, { count: number; lostValue: number }>();

  // Contabilizar motivos de perda em oportunidades com stage 'fechado_perdido'
  const lostOpps = filteredOpportunities.filter((op) => op.stage === 'fechado_perdido');
  lostOpps.forEach((op) => {
    const reason = op.loss_reason && op.loss_reason.trim() ? op.loss_reason.trim() : 'Sem motivo especificado';
    if (!lossReasonMap.has(reason)) {
      lossReasonMap.set(reason, { count: 0, lostValue: 0 });
    }
    const item = lossReasonMap.get(reason)!;
    item.count += 1;
    item.lostValue += Number(op.value) || 0;
  });

  // Também contabilizar leads marcados como 'perdido' que tenham loss_reason
  filteredCompanies
    .filter((c) => c.lead_status === 'perdido')
    .forEach((c) => {
      // Se a empresa já teve oportunidade perdida contabilizada, não duplicar a contagem
      const hasLostOpp = lostOpps.some((op) => op.company_id === c.id);
      if (!hasLostOpp) {
        const reason = c.loss_reason && c.loss_reason.trim() ? c.loss_reason.trim() : 'Lead sem interesse / Inativo';
        if (!lossReasonMap.has(reason)) {
          lossReasonMap.set(reason, { count: 0, lostValue: 0 });
        }
        lossReasonMap.get(reason)!.count += 1;
      }
    });

  const totalLossCount = Array.from(lossReasonMap.values()).reduce((sum, item) => sum + item.count, 0);

  const lossReasons: LossReasonData[] = Array.from(lossReasonMap.entries())
    .map(([reason, data]) => ({
      reason,
      count: data.count,
      lostValue: data.lostValue,
      percentage: totalLossCount > 0 ? Number(((data.count / totalLossCount) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const isEmpty = leadsFound === 0;

  return {
    filters,
    metrics,
    weeklyTrend,
    funnelStages,
    segmentBreakdown,
    cityBreakdown,
    lossReasons,
    availableFilterOptions: {
      cities: Array.from(citiesSet).sort(),
      segments: Array.from(segmentsSet).sort(),
      campaigns: Array.from(campaignsSet).sort(),
      responsibles: Array.from(responsiblesSet).sort(),
    },
    hasData: !isEmpty,
    isEmpty,
  };
}
