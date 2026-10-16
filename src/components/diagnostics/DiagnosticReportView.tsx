/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileText,
  Calendar,
  Share2,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  Company,
  Diagnostic,
  DiagnosticFinding,
  FindingType,
  VerificationStatus,
  PriorityRecommendation,
} from '../../types/database';
import { dbRepo } from '../../services/dbRepository';

interface DiagnosticReportViewProps {
  company: Company;
  workspaceId: string;
  onOpenTaskModal?: (taskData: { title: string; description: string }) => void;
  onBack?: () => void;
}

export const DiagnosticReportView: React.FC<DiagnosticReportViewProps> = ({
  company,
  workspaceId,
  onOpenTaskModal,
  onBack,
}) => {
  const [diagnosticsList, setDiagnosticsList] = useState<Diagnostic[]>([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningNewAudit, setRunningNewAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Carregar histórico de diagnósticos da empresa
  const loadDiagnostics = async () => {
    setLoading(true);
    setAuditError(null);
    try {
      const history = await dbRepo.getDiagnosticsByCompany(workspaceId, company.id);
      setDiagnosticsList(history);
      if (history.length > 0) {
        setSelectedDiagnostic(history[0]); // Seleciona a versão mais recente
      } else {
        setSelectedDiagnostic(null);
      }
    } catch (err: any) {
      console.error('Erro ao carregar diagnósticos:', err);
      setAuditError('Falha ao carregar histórico de diagnósticos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, [workspaceId, company.id]);

  // Executar nova auditoria server-side
  const handleRunNewAudit = async () => {
    setRunningNewAudit(true);
    setAuditError(null);
    try {
      const newDiag = await dbRepo.runDiagnosticServer(workspaceId, company.id, company);
      await loadDiagnostics();
      setSelectedDiagnostic(newDiag);
    } catch (err: any) {
      console.error('Erro ao executar novo diagnóstico:', err);
      setAuditError(err.message || 'Erro ao processar auditoria 360°.');
    } finally {
      setRunningNewAudit(false);
    }
  };

  const toggleFindingExpand = (id: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Gerar pitch comercial de prospecção personalizado com base nas evidências
  const handleCopyPitch = () => {
    if (!selectedDiagnostic) return;

    const topRec = selectedDiagnostic.priority_recommendations[0];
    const topProblem = selectedDiagnostic.confirmed_problems[0];
    const topOpportunity = selectedDiagnostic.probable_opportunities[0];

    const pitch = `Prezado(a) decisor da ${company.name},

Durante nossa análise técnica de presença digital e inteligência comercial no JOTA Prospect Intelligence, identificamos oportunidades relevantes para o crescimento e captação de clientes da sua empresa:

Pontuação Geral da Presença Digital: ${selectedDiagnostic.overall_score}/100 (Auditoria 360°)

Destaques da Análise:
• Ponto Crítico Observado: ${topProblem || 'Gargalo no fluxo de conversão mobile'}
• Oportunidade Comercial: ${topOpportunity || 'Aumento substancial no volume de leads qualificados'}
• Recomendação Prioritária: ${topRec?.title || 'Otimização dos canais de captura'}
  -> Ação: ${topRec?.description || 'Implementação imediata'}
  -> Serviço Proposto: ${topRec?.correspondingService || 'Consultoria Estratégica'}

Gostaria de agendar uma breve conversa de 10 minutos esta semana para demonstrar as evidências técnicas e como podemos implementar essas melhorias com retorno garantido.

Podemos conversar na próxima terça ou quinta-feira?

Atenciosamente,
Equipe Comercial JOTA Prospect Intelligence`;

    navigator.clipboard.writeText(pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  // Copiar relatório formatado em Markdown
  const handleCopyReport = () => {
    if (!selectedDiagnostic) return;

    const report = `# Diagnóstico 360° de Presença Digital — JOTA Prospect Intelligence
**Empresa:** ${company.name}
**Data da Auditoria:** ${new Date(selectedDiagnostic.created_at).toLocaleString('pt-BR')}
**Versão:** v${selectedDiagnostic.version} | **Motor:** ${selectedDiagnostic.engine}
**Pontuação Global:** ${selectedDiagnostic.overall_score}/100 | **Cobertura:** ${selectedDiagnostic.coverage_percentage}%

## Resumo Executivo
${selectedDiagnostic.executive_summary}

## 3 Recomendações Prioritárias
${selectedDiagnostic.priority_recommendations
  .map(
    (r) =>
      `### ${r.priority}. ${r.title} (Impacto: ${r.potentialImpact.toUpperCase()})
- **Serviço Correspondente:** ${r.correspondingService}
- **Descrição:** ${r.description}
- **Próximo Passo:** ${r.actionableStep}`
  )
  .join('\n\n')}

## Dimensões Auditadas
${(selectedDiagnostic.findings || [])
  .map(
    (f) =>
      `### ${f.dimension_label} [Status: ${f.status} | Nota: ${f.score !== null ? `${f.score}/100` : 'Não verificado'}]
- **Fato Observado:** ${f.observed_fact}
- **Evidência:** ${f.evidence_found}
- **Interpretação:** ${f.interpretation}
- **Hipótese Comercial:** ${f.commercial_hypothesis}
- **Recomendação:** ${f.recommendation}
- **Serviço Sugerido:** ${f.corresponding_service}`
  )
  .join('\n\n')}

---
*Gerado por JOTA Prospect Intelligence B2B*`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-800">Carregando dados do Diagnóstico 360°...</p>
        <p className="text-xs text-slate-500 mt-1">Auditando histórico de versões e evidências técnicas</p>
      </div>
    );
  }

  // Se a empresa ainda não possui diagnósticos
  if (!selectedDiagnostic) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Nenhum Diagnóstico 360° executado ainda
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
            Execute uma auditoria completa de presença digital em 9 dimensões: site institucional,
            experiência móvel, proposta de valor, contatos, SEO técnico, Instagram, Google Meu Negócio,
            consistência de canais e conversão.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRunNewAudit}
              disabled={runningNewAudit}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {runningNewAudit ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auditando em tempo real...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Executar Diagnóstico 360° Agora</span>
                </>
              )}
            </button>
          </div>

          {auditError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{auditError}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const findings = selectedDiagnostic.findings || [];

  // Filtragem de achados
  const filteredFindings = findings.filter((f) => {
    if (filterType === 'all') return true;
    if (filterType === 'problema_confirmado') return f.finding_type === 'problema_confirmado';
    if (filterType === 'oportunidade_provavel') return f.finding_type === 'oportunidade_provavel';
    if (filterType === 'ponto_positivo') return f.finding_type === 'ponto_positivo';
    if (filterType === 'unverified') return f.status === 'unverified' || f.status === 'failed';
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Selector de Versão, Métricas Rápidas & Ações Comerciais */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Diagnóstico 360° Ativo
              </span>

              {/* Version Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Versão:</span>
                <select
                  value={selectedDiagnostic.id}
                  onChange={(e) => {
                    const match = diagnosticsList.find((d) => d.id === e.target.value);
                    if (match) setSelectedDiagnostic(match);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-900 border-none outline-none cursor-pointer"
                >
                  {diagnosticsList.map((d) => (
                    <option key={d.id} value={d.id}>
                      v{d.version} ({new Date(d.created_at).toLocaleDateString('pt-BR')} — Score: {d.overall_score})
                    </option>
                  ))}
                </select>
              </div>

              {selectedDiagnostic.engine && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {selectedDiagnostic.engine === 'gemini-3.8-flash' ? '✨ Gemini AI' : '⚙️ Regras Determinísticas'}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Presença Digital de {company.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoria em 9 dimensões independentes com rastreamento factual de evidências
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyPitch}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
              title="Copiar script comercial personalizado pronto para envio"
            >
              {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedPitch ? 'Pitch Copiado!' : 'Copiar Pitch SDR'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
              title="Copiar relatório completo em formato Markdown"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedReport ? 'Relatório Copiado!' : 'Exportar Relatório'}</span>
            </button>

            <button
              onClick={handleRunNewAudit}
              disabled={runningNewAudit}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Executar nova auditoria em tempo real gerando versão evolutiva"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningNewAudit ? 'animate-spin' : ''}`} />
              <span>{runningNewAudit ? 'Auditando...' : 'Reauditar (Nova Versão)'}</span>
            </button>
          </div>
        </div>

        {auditError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}

        {/* Score & Key KPIs Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          {/* Overall Score Meter */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Pontuação Geral
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {selectedDiagnostic.overall_score}
                </span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {selectedDiagnostic.overall_score >= 80
                  ? 'Forte Maturidade'
                  : selectedDiagnostic.overall_score >= 60
                  ? 'Maturidade Média'
                  : 'Alta Oportunidade'}
              </span>
            </div>
            <div
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-base ${getScoreColor(
                selectedDiagnostic.overall_score
              )}`}
            >
              {selectedDiagnostic.overall_score}
            </div>
          </div>

          {/* Coverage KPI */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Cobertura da Avaliação
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {selectedDiagnostic.coverage_percentage}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {Math.round((selectedDiagnostic.coverage_percentage / 100) * 9)} de 9 dimensões verificadas
            </span>
          </div>

          {/* Confirmed Problems */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Problemas Confirmados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-rose-600 tracking-tight">
                {selectedDiagnostic.confirmed_problems.length}
              </span>
              <span className="text-xs font-semibold text-slate-400">gargalos</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Comprovação rastreável
            </span>
          </div>

          {/* Probable Opportunities */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Oportunidades Prováveis
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-blue-600 tracking-tight">
                {selectedDiagnostic.probable_opportunities.length}
              </span>
              <span className="text-xs font-semibold text-slate-400">ofertas B2B</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Ganchos para prospecção
            </span>
          </div>
        </div>

        {/* Methodology & Fair Scoring Note */}
        <div className="mt-4 p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-800">Metodologia Documentada:</strong> A pontuação de 0 a 100 utiliza pesos calibrados (Site: 15%, Mobile: 10%, Proposta: 10%, Contatos: 15%, SEO: 10%, Instagram: 10%, Google: 15%, Canais: 5%, Conversão: 10%). Itens marcados como <em>"não verificado"</em> são excluídos do denominador ativo e <strong>não recebem nota zero automaticamente</strong>.
          </div>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Resumo Executivo da Auditoria
          </h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
          {selectedDiagnostic.executive_summary}
        </p>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Pontos Positivos */}
          <div className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pontos Positivos Observados ({selectedDiagnostic.positive_points.length})</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-700">
              {selectedDiagnostic.positive_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Limitações da Análise */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Limitações & Transparência da Análise ({selectedDiagnostic.analysis_limitations.length})</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              {selectedDiagnostic.analysis_limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Três Recomendações Prioritárias */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Três Recomendações Prioritárias de Alto Impacto
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Ordenadas por relevância comercial
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedDiagnostic.priority_recommendations.map((rec) => (
            <div
              key={rec.priority}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {rec.priority}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      rec.potentialImpact === 'alto'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    Impacto {rec.potentialImpact}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {rec.title}
                </h4>

                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  {rec.description}
                </p>

                <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Serviço Correspondente
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700 block truncate">
                    {rec.correspondingService}
                  </span>
                </div>
              </div>

              {onOpenTaskModal && (
                <button
                  onClick={() =>
                    onOpenTaskModal({
                      title: `Apresentar proposta: ${rec.title}`,
                      description: `Serviço: ${rec.correspondingService}\nAção: ${rec.actionableStep}`,
                    })
                  }
                  className="mt-4 w-full py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                >
                  <span>Criar Tarefa no CRM</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Findings Breakdown by Dimension */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Detalhamento das 9 Dimensões Auditadas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Separação estrita entre fato observado, evidência, interpretação, hipótese e recomendação
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'all', label: `Todos (${findings.length})` },
              { id: 'problema_confirmado', label: `Problemas (${selectedDiagnostic.confirmed_problems.length})` },
              { id: 'oportunidade_provavel', label: `Oportunidades (${selectedDiagnostic.probable_opportunities.length})` },
              { id: 'ponto_positivo', label: `Positivos (${selectedDiagnostic.positive_points.length})` },
              {
                id: 'unverified',
                label: `Não Verificados (${findings.filter((f) => f.status === 'unverified' || f.status === 'failed').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dimension Findings List */}
        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedFindings[finding.id] ?? true;

            const getTypeBadge = () => {
              if (finding.status === 'unverified') {
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Não Verificado
                  </span>
                );
              }
              if (finding.finding_type === 'problema_confirmado') {
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    Problema Confirmado
                  </span>
                );
              }
              if (finding.finding_type === 'oportunidade_provavel') {
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Oportunidade Provável
                  </span>
                );
              }
              if (finding.finding_type === 'ponto_positivo') {
                return (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ponto Positivo
                  </span>
                );
              }
              return (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Neutro
                </span>
              );
            };

            return (
              <div
                key={finding.id}
                className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleFindingExpand(finding.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                        finding.score !== null ? getScoreColor(finding.score) : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {finding.score !== null ? finding.score : '—'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {finding.dimension_label}
                        </span>
                        {getTypeBadge()}
                        <span className="text-[10px] text-slate-500 font-mono">
                          Peso: {finding.weight}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Confiança: {finding.confidence_level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                        {finding.observed_fact}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Impacto {finding.potential_impact}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details: Strict Separation of Facts, Interpretations, Hypotheses and Recommendations */}
                {isExpanded && (
                  <div className="p-4 pt-3 border-t border-slate-200 space-y-3 bg-white">
                    {/* 1. FATO OBSERVADO */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-slate-500" />
                          <span>1. Fato Técnico Observado</span>
                        </span>
                        {finding.source_url && (
                          <a
                            href={finding.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Origem</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">
                        {finding.observed_fact}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200">
                        <strong>Evidência:</strong> {finding.evidence_found}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 2. INTERPRETAÇÃO */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          2. Interpretação Técnica
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {finding.interpretation}
                        </p>
                      </div>

                      {/* 3. HIPÓTESE COMERCIAL */}
                      <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                          3. Hipótese Comercial (Pitch)
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {finding.commercial_hypothesis}
                        </p>
                      </div>
                    </div>

                    {/* 4. RECOMENDAÇÃO & SERVIÇO */}
                    <div className="p-3 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-0.5">
                          4. Recomendação & Serviço Proposto
                        </span>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {finding.recommendation}
                        </p>
                      </div>

                      <div className="shrink-0 bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-right">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                          Serviço Sugerido
                        </span>
                        <span className="text-xs font-bold text-white block">
                          {finding.corresponding_service}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
