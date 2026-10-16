/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Opportunity, OpportunityStage } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';

interface OpportunityModalProps {
  isOpen: boolean;
  workspaceId: string;
  companyId: string;
  companyName?: string;
  onClose: () => void;
  onSaved: (opportunity: Opportunity) => void;
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({
  isOpen,
  workspaceId,
  companyId,
  companyName,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<OpportunityStage>('prospeccao');
  const [probability, setProbability] = useState('50');
  const [closeDate, setCloseDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título do negócio é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const opp = await dbRepo.createOpportunity(workspaceId, {
        company_id: companyId,
        title: title.trim(),
        value: parseFloat(value.replace(/\D/g, '')) / 100 || Number(value) || 0,
        stage,
        probability: parseInt(probability, 10) || 50,
        close_date: closeDate || null,
      });
      onSaved(opp);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Erro ao criar oportunidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Nova Oportunidade Comercial</h3>
              {companyName && (
                <p className="text-xs text-slate-500 truncate max-w-[260px]">{companyName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Título da Negociação <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrato Anual Software B2B"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="45000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estágio do Funil
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OpportunityStage)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              >
                <option value="prospeccao">Prospecção</option>
                <option value="contato">Contato Inicial</option>
                <option value="qualificacao">Qualificação</option>
                <option value="proposta">Proposta Comercial</option>
                <option value="negociacao">Negociação</option>
                <option value="fechado_ganho">Fechado / Ganho</option>
                <option value="fechado_perdido">Perdido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Previsão de Fechamento
              </label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
            >
              {loading ? 'Salvando...' : 'Salvar Oportunidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
