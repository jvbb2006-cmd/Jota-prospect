/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Sparkles } from 'lucide-react';
import { Company, LeadStatus, DeduplicationMatch } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';

interface CompanyFormModalProps {
  isOpen: boolean;
  workspaceId: string;
  initialData?: Company | null;
  onClose: () => void;
  onSave: (savedCompany: Company) => void;
}

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  isOpen,
  workspaceId,
  initialData,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    address: '',
    city: '',
    state: 'SP',
    country: 'Brasil',
    phone: '',
    whatsapp_number: '',
    whatsapp_verified: false,
    email: '',
    website_url: '',
    instagram_url: '',
    google_maps_url: '',
    source: 'Manual',
    source_place_id: '',
    lead_status: 'novo' as LeadStatus,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DeduplicationMatch[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || 'SP',
        country: initialData.country || 'Brasil',
        phone: initialData.phone || '',
        whatsapp_number: initialData.whatsapp_number || '',
        whatsapp_verified: !!initialData.whatsapp_verified,
        email: initialData.email || '',
        website_url: initialData.website_url || '',
        instagram_url: initialData.instagram_url || '',
        google_maps_url: initialData.google_maps_url || '',
        source: initialData.source || 'Manual',
        source_place_id: initialData.source_place_id || '',
        lead_status: initialData.lead_status || 'novo',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        address: '',
        city: '',
        state: 'SP',
        country: 'Brasil',
        phone: '',
        whatsapp_number: '',
        whatsapp_verified: false,
        email: '',
        website_url: '',
        instagram_url: '',
        google_maps_url: '',
        source: 'Manual',
        source_place_id: '',
        lead_status: 'novo',
        notes: '',
      });
    }
    setDuplicates([]);
    setError(null);
  }, [initialData, isOpen]);

  // Real-time deduplication check on typing
  useEffect(() => {
    if (!isOpen || !formData.name || formData.name.trim().length < 3) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const matches = await dbRepo.checkDuplicates(
          workspaceId,
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || formData.whatsapp_number,
            website_url: formData.website_url,
          },
          initialData?.id
        );
        setDuplicates(matches);
      } catch (err) {
        console.warn('Erro ao verificar duplicatas:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.name, formData.email, formData.phone, formData.website_url, workspaceId, initialData?.id, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('O nome da empresa é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        const updated = await dbRepo.updateCompany(workspaceId, initialData.id, formData);
        if (updated) {
          onSave(updated);
        } else {
          setError('Não foi possível atualizar a empresa.');
        }
      } else {
        const created = await dbRepo.createCompany(workspaceId, formData);
        onSave(created);
      }
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Erro ao salvar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl my-8 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {initialData ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </h2>
              <p className="text-xs text-slate-500">
                {initialData ? 'Atualize as informações comerciais da conta' : 'Preencha os dados do lead B2B para o workspace'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deduplication Alert */}
        {duplicates.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Alerta de Deduplicação:</span> Possível lead duplicado detectado:
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
                {duplicates.map((d, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{d.matchedCompany.name}</span> — coincidência em {d.field === 'name' ? 'nome similar' : d.field === 'domain' ? 'domínio web' : 'telefone'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Section 1: Dados Principais */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Identificação & Estágio
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nome da Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: PetroSul Engenharia e Logística"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estágio Comercial
                  </label>
                  <select
                    value={formData.lead_status}
                    onChange={(e) => setFormData({ ...formData, lead_status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Categoria / Segmento
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Transporte & Cargas"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Origem do Lead
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Ex: Google Maps Scraping, Indicação"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Google Place ID (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.source_place_id}
                    onChange={(e) => setFormData({ ...formData, source_place_id: e.target.value })}
                    placeholder="ChIJ..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contato & Enriquecimento */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Canais de Contato & Redes
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefone Principal
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 11 3200-0000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Número WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="+55 11 99999-8888"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.whatsapp_verified}
                      onChange={(e) => setFormData({ ...formData, whatsapp_verified: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      WhatsApp Verificado
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://empresa.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/empresa"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Endereço & Localização */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Localização & Google Maps
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Logradouro / Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Av. Paulista, 1000 - Bela Vista"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Link do Google Maps
                  </label>
                  <input
                    type="url"
                    value={formData.google_maps_url}
                    onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notas & Anotações de Prospecção */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notas Comerciais & Contexto
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre faturamento estimado, número de funcionários, dores identificadas..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs whitespace-nowrap flex items-center gap-2"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{initialData ? 'Salvar Alterações' : 'Criar Empresa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
