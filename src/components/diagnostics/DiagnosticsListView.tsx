/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Clock,
  Plus,
} from 'lucide-react';
import { Company, Diagnostic } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';

interface DiagnosticsListViewProps {
  workspaceId: string;
  onSelectCompany: (companyId: string) => void;
  onOpenCompanyTab?: (companyId: string, tab: string) => void;
}

export const DiagnosticsListView: React.FC<DiagnosticsListViewProps> = ({
  workspaceId,
  onSelectCompany,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'critical' | 'regular' | 'excellent' | 'unexamined'>('all');
  const [auditingId, setAuditingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const allCompanies = await dbRepo.getCompanies(workspaceId);
      const allDiags = await dbRepo.getAllDiagnostics(workspaceId);
      setCompanies(allCompanies);
      setDiagnostics(allDiags);
    } catch (err) {
      console.error('Erro ao carregar lista de diagnósticos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleQuickAudit = async (company: Company) => {
    setAuditingId(company.id);
    try {
      await dbRepo.runDiagnosticServer(workspaceId, company.id, company);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao auditar empresa');
    } finally {
      setAuditingId(null);
    }
  };

  // Mapear diagnósticos mais recentes por company_id
  const diagByCompany = new Map<string, Diagnostic>();
  for (const d of diagnostics) {
    diagByCompany.set(d.company_id, d);
  }

  // Estatísticas globais
  const totalAudited = diagnostics.length;
  const avgScore =
    totalAudited > 0
      ? Math.round(diagnostics.reduce((acc, d) => acc + d.overall_score, 0) / totalAudited)
      : 0;
  const totalHighImpactOpportunities = diagnostics.reduce(
    (acc, d) =>
      acc + (d.priority_recommendations || []).filter((r) => r.potentialImpact === 'alto').length,
    0
  );
  const avgCoverage =
    totalAudited > 0
      ? Math.round(diagnostics.reduce((acc, d) => acc + d.coverage_percentage, 0) / totalAudited)
      : 0;

  // Filtragem de empresas
  const filteredCompanies = companies.filter((company) => {
    const diag = diagByCompany.get(company.id);

    // Filtro por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = company.name.toLowerCase().includes(q);
      const matchCategory = (company.category || '').toLowerCase().includes(q);
      const matchCity = (company.city || '').toLowerCase().includes(q);
      if (!matchName && !matchCategory && !matchCity) return false;
    }

    // Filtro por pontuação
    if (scoreFilter === 'unexamined') {
      return !diag;
    }
    if (scoreFilter === 'critical') {
      return diag && diag.overall_score < 60;
    }
    if (scoreFilter === 'regular') {
      return diag && diag.overall_score >= 60 && diag.overall_score < 80;
    }
    if (scoreFilter === 'excellent') {
      return diag && diag.overall_score >= 80;
    }

    return true;
  });

  const getScoreBadge = (score?: number) => {
    if (score === undefined) {
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
          Sem Diagnóstico
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          {score}/100 • Excelente
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          {score}/100 • Regular
        </span>
      );
    }
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
        {score}/100 • Crítico
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              Fase 3: Inteligência de Presença Digital
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Diagnósticos 360° do Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo de auditoria técnica independente por empresa, histórico evolutivo e evidências B2B
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Auditorias</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Empresas Auditadas
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {totalAudited}
            </span>
            <span className="text-xs font-medium text-slate-400">/ {companies.length} contas</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${companies.length > 0 ? (totalAudited / companies.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Média Geral de Maturidade
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {avgScore}
            </span>
            <span className="text-xs font-semibold text-slate-400">/100</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2">
            Baseada em pesos metodológicos ponderados
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Oportunidades de Alto Impacto
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black text-rose-600 tracking-tight">
              {totalHighImpactOpportunities}
            </span>
            <span className="text-xs font-semibold text-slate-400">ações sugeridas</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2">
            Ganchos comerciais de fechamento rápido
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Cobertura Média
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {avgCoverage}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2">
            Itens não verificados não recebem zero
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, setor ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: 'all', label: `Todas (${companies.length})` },
            { id: 'critical', label: 'Crítico (<60)' },
            { id: 'regular', label: 'Regular (60-79)' },
            { id: 'excellent', label: 'Excelente (≥80)' },
            { id: 'unexamined', label: 'Não Auditadas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setScoreFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                scoreFilter === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Companies Diagnostic Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Carregando diagnósticos...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma empresa encontrada com os filtros selecionados</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar a busca ou filtro de pontuação</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Empresa & Segmento</th>
                  <th className="py-3 px-4">Pontuação 360°</th>
                  <th className="py-3 px-4">Histórico</th>
                  <th className="py-3 px-4">Principal Oportunidade Identificada</th>
                  <th className="py-3 px-4">Última Auditoria</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((company) => {
                  const diag = diagByCompany.get(company.id);
                  const topRec = diag?.priority_recommendations?.[0];
                  const isAuditingThis = auditingId === company.id;

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectCompany(company.id)}
                    >
                      {/* Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {company.name}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>{company.category || 'Geral'}</span>
                              {company.city && (
                                <>
                                  <span>•</span>
                                  <span>{company.city} - {company.state}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getScoreBadge(diag?.overall_score)}
                      </td>

                      {/* Versions */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {diag ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>v{diag.version}</span>
                            {diag.engine && (
                              <span className="text-[10px] text-slate-400 font-sans">
                                ({diag.engine === 'gemini-3.8-flash' ? 'IA' : 'Det'})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Top Opportunity */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {topRec ? (
                          <div>
                            <span className="font-semibold text-slate-800 block truncate">
                              {topRec.title}
                            </span>
                            <span className="text-[10px] text-blue-600 block truncate">
                              {topRec.correspondingService}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Pendente de análise</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {diag ? new Date(diag.created_at).toLocaleDateString('pt-BR') : 'Nunca'}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleQuickAudit(company)}
                            disabled={isAuditingThis}
                            className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Executar auditoria em tempo real"
                          >
                            <RefreshCw className={`w-3 h-3 ${isAuditingThis ? 'animate-spin text-blue-600' : ''}`} />
                            <span>{isAuditingThis ? 'Auditando...' : diag ? 'Reauditar' : 'Auditar'}</span>
                          </button>

                          <button
                            onClick={() => onSelectCompany(company.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>Ver Ficha 360°</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
