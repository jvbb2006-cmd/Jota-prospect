/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Clock,
  Layers,
  Database,
} from 'lucide-react';
import { runProspectIntelligenceTestSuite, TestResult } from '../../services/testRunner';

export const TestResultsView: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleRunTests = async () => {
    setRunning(true);
    setHasRun(true);
    try {
      const res = await runProspectIntelligenceTestSuite();
      setResults(res);
    } catch (err) {
      console.error('Erro na execução dos testes:', err);
    } finally {
      setRunning(false);
    }
  };

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Auditoria de Qualidade: CRUD, RLS, Google Places, Diagnóstico 360°, Abordagem & Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Execução de testes automatizados de ponta a ponta para validação das Fases 1, 2, 3, 4 e 5
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap self-start md:self-auto"
        >
          {running ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Executando Testes...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>{hasRun ? 'Executar Novamente' : 'Executar Bateria de Testes'}</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard if run */}
      {hasRun && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Total de Testes</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {results.length}
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-xs text-emerald-800 font-medium">Testes Aprovados</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1 flex items-center gap-2">
              <span>{passedCount}</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Falhas Detectadas</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {failedCount}
            </div>
          </div>
        </div>
      )}

      {/* Test List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Casos de Teste Avaliados
          </h2>
          <span className="text-xs text-slate-400">Ambiente: Isolado (RLS + Transacional)</span>
        </div>

        {!hasRun ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-600 font-medium">
              Nenhuma bateria executada nesta sessão.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Clique em "Executar Bateria de Testes" para auditar o ciclo CRUD, RLS e deduplicação.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((t, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {t.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{t.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {t.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.details}</p>
                      {t.error && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{t.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> {t.durationMs}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
