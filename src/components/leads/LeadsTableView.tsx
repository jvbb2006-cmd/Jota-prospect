/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { Company, LeadStatus } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';
import { DEMO_WORKSPACE_ID } from '../../services/mockData';

interface LeadsTableViewProps {
  workspaceId: string;
  searchQuery: string;
  onSelectCompany: (companyId: string) => void;
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (company: Company) => void;
  onOpenNewCompany: () => void;
}

export const LeadsTableView: React.FC<LeadsTableViewProps> = ({
  workspaceId,
  searchQuery,
  onSelectCompany,
  onEditCompany,
  onDeleteCompany,
  onOpenNewCompany,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  const isDemo = workspaceId === DEMO_WORKSPACE_ID;

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await dbRepo.getCompanies(workspaceId, {
        search: searchQuery,
        status: statusFilter !== 'all' ? (statusFilter as LeadStatus) : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
      setCompanies(data);

      // Extract unique categories
      const allData = await dbRepo.getCompanies(workspaceId);
      const uniqueCats = Array.from(new Set(allData.map((c) => c.category).filter(Boolean))) as string[];
      setCategories(uniqueCats);
    } catch (err) {
      console.error('Erro ao listar leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [workspaceId, searchQuery, statusFilter, categoryFilter]);

  const handleQuickStatusChange = async (companyId: string, newStatus: LeadStatus) => {
    try {
      await dbRepo.updateCompany(workspaceId, companyId, { lead_status: newStatus });
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, lead_status: newStatus } : c))
      );
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const exportToCSV = () => {
    if (companies.length === 0) return;

    const headers = [
      'ID',
      'Nome da Empresa',
      'Categoria',
      'Cidade',
      'Estado',
      'Telefone',
      'WhatsApp',
      'WhatsApp Verificado',
      'Email',
      'Estagio Comercial',
      'Origem',
      'Website',
      'Criado Em',
    ];

    const rows = companies.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.category || ''}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.whatsapp_number || ''}"`,
      c.whatsapp_verified ? 'SIM' : 'NAO',
      `"${c.email || ''}"`,
      c.lead_status,
      `"${c.source || ''}"`,
      `"${c.website_url || ''}"`,
      c.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jota_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: LeadStatus) => {
    const config: Record<LeadStatus, { label: string; bg: string; text: string; border: string }> = {
      novo: { label: 'Novo Lead', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
      contatado: { label: 'Contatado', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      qualificado: { label: 'Qualificado', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      proposta: { label: 'Proposta', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      negociacao: { label: 'Negociação', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
      ganho: { label: 'Fechado / Ganho', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      perdido: { label: 'Perdido', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    };
    const c = config[status] || config.novo;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Estágio:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Estágios</option>
              <option value="novo">Novo Lead</option>
              <option value="contatado">Contatado</option>
              <option value="qualificado">Qualificado</option>
              <option value="proposta">Proposta</option>
              <option value="negociacao">Negociação</option>
              <option value="ganho">Fechado / Ganho</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-medium">Segmento:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[160px] truncate"
              >
                <option value="all">Todos os Segmentos</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            disabled={companies.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewCompany}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Lead</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Listagem de Contas B2B</h2>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({companies.length} {companies.length === 1 ? 'registro' : 'registros'})
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">Nenhum lead encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Nenhuma empresa corresponde aos filtros aplicados. Tente limpar os critérios.'
                : 'Cadastre a primeira empresa para iniciar o acompanhamento e prospecção comercial.'}
            </p>
            <button
              onClick={onOpenNewCompany}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              + Adicionar Empresa Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Empresa / Categoria</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Contato Principal</th>
                  <th className="py-3 px-4">Estágio Comercial</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onSelectCompany(company.id)}
                  >
                    {/* Name & Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <span>{company.category || 'Não categorizado'}</span>
                          {company.website_url && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-500 hover:underline">{company.website_url.replace(/^https?:\/\//, '').split('/')[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {company.city ? (
                        <span>
                          {company.city}
                          {company.state ? ` - ${company.state}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">Não informado</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        {company.whatsapp_number ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <MessageCircle className={`w-3.5 h-3.5 ${company.whatsapp_verified ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className={company.whatsapp_verified ? 'text-emerald-800 font-medium' : 'text-slate-700'}>
                              {company.whatsapp_number}
                            </span>
                          </div>
                        ) : company.phone ? (
                          <span className="font-mono text-[11px] text-slate-700">{company.phone}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}

                        {company.email && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {company.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status with Quick Change Dropdown */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={company.lead_status}
                          onChange={(e) => handleQuickStatusChange(company.id, e.target.value as LeadStatus)}
                          className="py-1 pl-2 pr-6 text-xs font-medium rounded border border-slate-200 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="novo">Novo Lead</option>
                          <option value="contatado">Contatado</option>
                          <option value="qualificado">Qualificado</option>
                          <option value="proposta">Proposta</option>
                          <option value="negociacao">Negociação</option>
                          <option value="ganho">Fechado / Ganho</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {company.source || 'Manual'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectCompany(company.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Ver detalhes da empresa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditCompany(company)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Editar empresa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCompany(company)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
