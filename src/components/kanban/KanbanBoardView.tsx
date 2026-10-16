/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  ExternalLink,
  MoveRight,
} from 'lucide-react';
import { Company, LeadStatus, Opportunity } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

interface KanbanBoardViewProps {
  workspaceId: string;
  searchQuery: string;
  onSelectCompany: (companyId: string) => void;
  onOpenNewCompany: () => void;
}

const STAGES: { id: LeadStatus; label: string; headerColor: string; bgBadge: string }[] = [
  { id: 'novo', label: 'Novo Lead', headerColor: 'border-slate-300', bgBadge: 'bg-slate-100 text-slate-700' },
  { id: 'contatado', label: 'Contatado', headerColor: 'border-blue-400', bgBadge: 'bg-blue-50 text-blue-700' },
  { id: 'qualificado', label: 'Qualificado', headerColor: 'border-indigo-400', bgBadge: 'bg-indigo-50 text-indigo-700' },
  { id: 'proposta', label: 'Proposta Comercial', headerColor: 'border-purple-400', bgBadge: 'bg-purple-50 text-purple-700' },
  { id: 'negociacao', label: 'Negociação', headerColor: 'border-amber-400', bgBadge: 'bg-amber-50 text-amber-800' },
  { id: 'ganho', label: 'Fechado / Ganho', headerColor: 'border-emerald-500', bgBadge: 'bg-emerald-50 text-emerald-700' },
  { id: 'perdido', label: 'Perdido', headerColor: 'border-rose-400', bgBadge: 'bg-rose-50 text-rose-700' },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  workspaceId,
  searchQuery,
  onSelectCompany,
  onOpenNewCompany,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedCompanyId, setDraggedCompanyId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, opps] = await Promise.all([
        dbRepo.getCompanies(workspaceId, { search: searchQuery }),
        dbRepo.getOpportunities(workspaceId),
      ]);
      setCompanies(comps);
      setOpportunities(opps);
    } catch (err) {
      console.error('Erro ao carregar dados do Kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId, searchQuery]);

  const moveStage = async (companyId: string, newStage: LeadStatus) => {
    try {
      await dbRepo.updateCompany(workspaceId, companyId, { lead_status: newStage });
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, lead_status: newStage } : c))
      );
    } catch (err) {
      console.error('Erro ao mover lead:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedCompanyId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedCompanyId;
    if (id) {
      await moveStage(id, targetStage);
    }
    setDraggedCompanyId(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getCompanyOpportunityValue = (companyId: string) => {
    const opps = opportunities.filter((o) => o.company_id === companyId);
    return opps.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 overflow-hidden">
      {/* Board Header Bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">CRM Pipeline Kanban</h2>
          <p className="text-xs text-slate-500">
            Arraste os cards entre as colunas ou use as setas para mover estágios de prospecção
          </p>
        </div>
        <button
          onClick={onOpenNewCompany}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Lead</span>
        </button>
      </div>

      {/* Kanban Columns Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stage, stageIdx) => {
            const stageCompanies = companies.filter((c) => c.lead_status === stage.id);
            const totalStageValue = stageCompanies.reduce((acc, c) => acc + getCompanyOpportunityValue(c.id), 0);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="w-80 flex flex-col bg-slate-100/70 border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* Column Header */}
                <div className={`p-3.5 bg-white border-b-2 ${stage.headerColor} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{stage.label}</span>
                      <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold">
                        {stageCompanies.length}
                      </span>
                    </div>
                    {totalStageValue > 0 && (
                      <span className="text-[11px] font-medium text-emerald-700 block mt-0.5">
                        {formatCurrency(totalStageValue)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">
                  {stageCompanies.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[11px] text-slate-400">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageCompanies.map((comp) => {
                      const oppVal = getCompanyOpportunityValue(comp.id);
                      return (
                        <div
                          key={comp.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, comp.id)}
                          onClick={() => onSelectCompany(comp.id)}
                          className="p-3 bg-white border border-slate-200/90 rounded-lg shadow-2xs hover:shadow-sm hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing group"
                        >
                          {/* Card Title & Category */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                              {comp.name}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="truncate">{comp.category || 'Geral'}</span>
                            {comp.city && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="shrink-0">{comp.city}</span>
                              </>
                            )}
                          </div>

                          {/* Extra info: Opp Value + WhatsApp */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            {oppVal > 0 ? (
                              <span className="font-mono font-semibold text-emerald-700">
                                {formatCurrency(oppVal)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Sem negócio</span>
                            )}

                            {comp.whatsapp_verified && (
                              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </span>
                            )}
                          </div>

                          {/* Quick Stage Steppers */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={stageIdx === 0}
                              onClick={() => moveStage(comp.id, STAGES[stageIdx - 1].id)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                              title="Mover para estágio anterior"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectCompany(comp.id)}
                              className="text-[10px] text-blue-600 hover:underline font-medium"
                            >
                              Abrir Perfil
                            </button>

                            <button
                              type="button"
                              disabled={stageIdx === STAGES.length - 1}
                              onClick={() => moveStage(comp.id, STAGES[stageIdx + 1].id)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                              title="Avançar para próximo estágio"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
