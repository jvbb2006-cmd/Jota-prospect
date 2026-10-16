/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  Sparkles,
  PhoneCall,
  MessageSquare,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  Trophy,
  Percent,
  TrendingUp,
  DollarSign,
  Briefcase,
  Filter,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { dbRepo } from '../../services/dbRepository';
import {
  AnalyticsFilters,
  AnalyticsReport,
  PeriodFilter,
} from '../../services/analyticsService';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

interface DashboardViewProps {
  workspaceId: string;
  onNavigateToLeads: () => void;
  onNavigateToKanban: () => void;
  onSelectCompany: (companyId: string) => void;
  onOpenNewCompany: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceId,
  onNavigateToLeads,
  onNavigateToKanban,
  onSelectCompany,
  onOpenNewCompany,
}) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  // Filters State
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [city, setCity] = useState<string>('all');
  const [segment, setSegment] = useState<string>('all');
  const [campaign, setCampaign] = useState<string>('all');
  const [responsible, setResponsible] = useState<string>('all');

  const isDemo = workspaceId === DEMO_WORKSPACE_ID;

  const loadReport = async () => {
    setLoading(true);
    try {
      const filters: AnalyticsFilters = {
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        city: city !== 'all' ? city : undefined,
        segment: segment !== 'all' ? segment : undefined,
        campaign: campaign !== 'all' ? campaign : undefined,
        responsible: responsible !== 'all' ? responsible : undefined,
      };

      const data = await dbRepo.getAnalyticsReport(workspaceId, filters);
      setReport(data);
    } catch (err) {
      console.error('Erro ao carregar relatório analítico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [workspaceId, period, startDate, endDate, city, segment, campaign, responsible]);

  const handleResetFilters = () => {
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setCity('all');
    setSegment('all');
    setCampaign('all');
    setResponsible('all');
  };

  const isAnyFilterActive =
    period !== 'all' ||
    city !== 'all' ||
    segment !== 'all' ||
    campaign !== 'all' ||
    responsible !== 'all';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatPercent = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return '0.0%';
    return `${val.toFixed(1)}%`;
  };

  if (loading && !report) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-16 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-xl"></div>
          <div className="h-72 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const metrics = report?.metrics || {
    leadsFound: 0,
    leadsQualified: 0,
    diagnosticsCompleted: 0,
    contactsRegistered: 0,
    responsesReceived: 0,
    meetingsScheduled: 0,
    meetingsHeld: 0,
    proposalsSent: 0,
    contractsWon: 0,
    responseRate: 0,
    conversionRate: 0,
    opportunitiesValue: 0,
    contractedRevenue: 0,
  };

  const availableOptions = report?.availableFilterOptions || {
    cities: [],
    segments: [],
    campaigns: [],
    responsibles: [],
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner for Demo workspace */}
      {isDemo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Modo de Demonstração Ativo:</span> As métricas, taxas de conversão e gráficos abaixo são calculados dinamicamente com base nas empresas de demonstração e nos logs de auditoria comercial. Para analisar dados reais da sua operação comercial, selecione <strong>Meu Espaço</strong> na barra lateral.
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filtros de Inteligência Analítica
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}

            <button
              onClick={loadReport}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              title="Recarregar métricas"
            >
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Filters Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Período */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Período
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todo o período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="12m">Últimos 12 meses</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Cidade
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todas as cidades ({availableOptions.cities.length})</option>
              {availableOptions.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Segmento */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Segmento / Setor
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todos os segmentos ({availableOptions.segments.length})</option>
              {availableOptions.segments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Campanha */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Campanha
            </label>
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todas as campanhas ({availableOptions.campaigns.length})</option>
              {availableOptions.campaigns.map((cp) => (
                <option key={cp} value={cp}>
                  {cp}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Responsável (SDR/Closer)
            </label>
            <select
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todos os responsáveis ({availableOptions.responsibles.length})</option>
              {availableOptions.responsibles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if custom period */}
        {period === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* EMPTY STATE BANNER IF FILTERED TO ZERO */}
      {report?.isEmpty && (
        <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma empresa ou evento encontrado com os filtros selecionados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tente ampliar o período selecionado ou redefinir os filtros de cidade, segmento, campanha e responsável.
          </p>
          <div className="pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              Redefinir Filtros
            </button>
          </div>
        </div>
      )}

      {/* 13 REQUISITED KPI CARDS (ORGANIZED INTO 3 LOGICAL SECTIONS) */}
      <div className="space-y-4">
        {/* Section A: Descoberta, Qualificação & Diagnósticos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              1. Descoberta & Diagnóstico
            </span>
            <span className="text-[11px] text-slate-400">Topo de Funil</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Leads Encontrados */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Leads Encontrados</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.leadsFound}
                </span>
                <span className="text-xs text-slate-500">empresas cadastradas</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Total consolidado sem duplicidade
              </div>
            </div>

            {/* 2. Leads Qualificados */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Leads Qualificados</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.leadsQualified}
                </span>
                <span className="text-xs text-indigo-600 font-medium">
                  ({metrics.leadsFound > 0 ? ((metrics.leadsQualified / metrics.leadsFound) * 100).toFixed(0) : 0}% dos leads)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Critérios técnicos e comerciais validados
              </div>
            </div>

            {/* 3. Diagnósticos Concluídos */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-violet-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Diagnósticos Concluídos</span>
                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.diagnosticsCompleted}
                </span>
                <span className="text-xs text-slate-500">auditorias 360°</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                9 dimensões auditadas com evidências
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Prospecção, Atividades & Engajamento */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              2. Abordagem Comercial & Reuniões
            </span>
            <span className="text-[11px] text-slate-400">Meio de Funil</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 4. Contatos Registrados */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Contatos Registrados</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.contactsRegistered}
                </span>
                <span className="text-xs text-slate-500">contatos efetivos</span>
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                Links abertos não são contabilizados
              </div>
            </div>

            {/* 5. Respostas Recebidas */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Respostas Recebidas</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.responsesReceived}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  {metrics.responseRate}% taxa
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Respostas auditadas no histórico
              </div>
            </div>

            {/* 6. Reuniões Marcadas */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-pink-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Reuniões Marcadas</span>
                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.meetingsScheduled}
                </span>
                <span className="text-xs text-slate-500">agendadas</span>
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                Apenas reuniões confirmadas na agenda
              </div>
            </div>

            {/* 7. Reuniões Realizadas */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Reuniões Realizadas</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.meetingsHeld}
                </span>
                <span className="text-xs text-purple-600 font-medium">
                  ({metrics.meetingsScheduled > 0 ? ((metrics.meetingsHeld / metrics.meetingsScheduled) * 100).toFixed(0) : 0}% comparecimento)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Calls concluídas com decisores
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Vendas, Oportunidades & Conversão Financeira */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              3. Conversão Comercial & Receita
            </span>
            <span className="text-[11px] text-slate-400">Fundo de Funil & Fechamento</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* 8. Propostas Enviadas */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Propostas</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {metrics.proposalsSent}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                Propostas comerciais
              </div>
            </div>

            {/* 9. Contratos Ganhos */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Contratos Ganhos</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {metrics.contractsWon}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                Vendas fechadas
              </div>
            </div>

            {/* 10. Taxa de Resposta */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Taxa Resposta</span>
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Percent className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatPercent(metrics.responseRate)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                Respostas / Contatos
              </div>
            </div>

            {/* 11. Taxa de Conversão */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-cyan-300 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Conversão Global</span>
                <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-blue-700 tabular-nums">
                  {formatPercent(metrics.conversionRate)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                Ganhos / Total Leads
              </div>
            </div>

            {/* 12. Valor de Oportunidades (Pipeline Ativo) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Pipeline Aberto</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900 tabular-nums block truncate" title={formatCurrency(metrics.opportunitiesValue)}>
                  {formatCurrency(metrics.opportunitiesValue)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                Oportunidades ativas
              </div>
            </div>

            {/* 13. Receita Contratada Registrada */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-2xs hover:border-emerald-400 transition-colors lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Receita Fechada</span>
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-lg font-extrabold text-emerald-800 tabular-nums block truncate" title={formatCurrency(metrics.contractedRevenue)}>
                  {formatCurrency(metrics.contractedRevenue)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-700 font-semibold truncate">
                Contratos ganhos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 REQUISITED CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: EVOLUÇÃO SEMANAL DE CONTATOS E RESPOSTAS */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Evolução Semanal de Contatos e Respostas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparativo de esforços comerciais ativos vs feedback recebido dos leads
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500"></span> Contatos
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Respostas
                </span>
              </div>
            </div>

            {/* Weekly Bars Component */}
            {report?.weeklyTrend.length === 0 || report?.weeklyTrend.every((w) => w.contacts === 0 && w.responses === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                <Calendar className="w-6 h-6 mb-1 text-slate-300" />
                Sem atividades registradas no período selecionado
              </div>
            ) : (
              <div className="h-52 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200">
                {report?.weeklyTrend.map((w) => {
                  const maxVal = Math.max(
                    ...report.weeklyTrend.map((item) => Math.max(item.contacts, item.responses, 4))
                  );
                  const contactHeight = Math.max(Math.round((w.contacts / maxVal) * 140), w.contacts > 0 ? 12 : 0);
                  const responseHeight = Math.max(Math.round((w.responses / maxVal) * 140), w.responses > 0 ? 12 : 0);

                  return (
                    <div key={w.weekKey} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="flex items-end gap-1 w-full justify-center h-36">
                        {/* Contacts Bar */}
                        <div
                          style={{ height: `${contactHeight}px` }}
                          className="w-3.5 bg-blue-500 rounded-t-sm group-hover:bg-blue-600 transition-all relative"
                          title={`Semana ${w.weekLabel}: ${w.contacts} contatos registrados`}
                        >
                          {w.contacts > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-600 tabular-nums">
                              {w.contacts}
                            </span>
                          )}
                        </div>

                        {/* Responses Bar */}
                        <div
                          style={{ height: `${responseHeight}px` }}
                          className="w-3.5 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all relative"
                          title={`Semana ${w.weekLabel}: ${w.responses} respostas recebidas`}
                        >
                          {w.responses > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-700 tabular-nums">
                              {w.responses}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-medium text-slate-500 mt-1">
                        {w.weekLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 mt-3">
            <span>Regra de qualidade: links wa.me abertos não são contabilizados como contatos</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              Total: {metrics.contactsRegistered} contatos / {metrics.responsesReceived} respostas
            </span>
          </div>
        </div>

        {/* GRÁFICO 2: CONVERSÃO ENTRE ETAPAS (FUNIL COMERCIAL) */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Conversão entre Etapas (Funil Comercial)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Taxa de passagem etapa a etapa e retenção de leads desde a descoberta
                </p>
              </div>
              <button
                onClick={onNavigateToKanban}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Ver Kanban</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {report?.funnelStages.map((stage, idx) => (
                <div key={stage.stageKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: stage.color }}
                      ></span>
                      {stage.stageName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {stage.count} leads
                      </span>
                      {idx > 0 && (
                        <span className="text-[11px] text-slate-500 tabular-nums bg-slate-100 px-1.5 py-0.5 rounded">
                          {formatPercent(stage.conversionFromPrevious)} etapa ant.
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-blue-600 tabular-nums w-12 text-right">
                        {formatPercent(stage.conversionFromTop)}
                      </span>
                    </div>
                  </div>

                  {/* Funnel Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(stage.conversionFromTop, stage.count > 0 ? 3 : 0)}%`,
                        backgroundColor: stage.color,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Conversão final (Leads ➔ Contratos Ganhos):</span>
            <span className="font-bold text-emerald-700 text-xs">
              {formatPercent(metrics.conversionRate)}
            </span>
          </div>
        </div>

        {/* GRÁFICO 3: RESULTADOS POR SEGMENTO */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Resultados por Segmento / Setor
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Volume de empresas, taxa de conversão e receita por nicho de mercado
                </p>
              </div>
            </div>

            {report?.segmentBreakdown.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                Nenhum segmento encontrado para os filtros selecionados
              </div>
            ) : (
              <div className="space-y-3">
                {report?.segmentBreakdown.slice(0, 5).map((seg) => (
                  <div key={seg.segment} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{seg.segment}</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(seg.contractedRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{seg.leadCount} leads · {seg.wonCount} contratos</span>
                      <span className="text-blue-600 font-medium">
                        Conversão: {formatPercent(seg.conversionRate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] text-slate-400 text-right">
            Classificação ordenada por receita fechada
          </div>
        </div>

        {/* GRÁFICO 4: RESULTADOS POR CIDADE */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  Resultados por Cidade
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição geográfica de contas, taxa de fechamento e receita contratada
                </p>
              </div>
            </div>

            {report?.cityBreakdown.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                Nenhuma cidade encontrada para os filtros selecionados
              </div>
            ) : (
              <div className="space-y-3">
                {report?.cityBreakdown.slice(0, 5).map((c) => (
                  <div key={`${c.city}-${c.state}`} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {c.city} {c.state ? `(${c.state})` : ''}
                      </span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(c.contractedRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{c.leadCount} leads na praça · {c.wonCount} clientes</span>
                      <span className="text-rose-600 font-medium">
                        Taxa de conversão: {formatPercent(c.conversionRate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] text-slate-400 text-right">
            Mapeamento geoestratégico de oportunidades
          </div>
        </div>
      </div>

      {/* GRÁFICO 5: MOTIVOS DE PERDA (LARGURA COMPLETA) */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Motivos de Perda de Oportunidades & Contas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise quantitativa de atritos e causas de não fechamento para otimização do pitch e pricing
            </p>
          </div>
        </div>

        {report?.lossReasons.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma oportunidade ou lead marcado como perdido no período filtrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report?.lossReasons.map((lr) => (
              <div
                key={lr.reason}
                className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    {lr.reason}
                  </span>
                  <span className="text-xs font-extrabold text-rose-700 tabular-nums">
                    {lr.percentage}%
                  </span>
                </div>

                <div className="w-full bg-rose-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.max(lr.percentage, 5)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>{lr.count} ocorrência{lr.count > 1 ? 's' : ''}</span>
                  {lr.lostValue > 0 && (
                    <span className="font-semibold text-rose-800 tabular-nums">
                      {formatCurrency(lr.lostValue)} perdidos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER AUDIT NOTICE */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            <strong>Auditoria de Qualidade dos Dados:</strong> Os indicadores utilizam consultas reais com isolamento de workspace (RLS) e deduplicação de eventos.
          </span>
        </div>
        <button
          onClick={onOpenNewCompany}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors"
        >
          + Adicionar Lead Manual
        </button>
      </div>
    </div>
  );
};
