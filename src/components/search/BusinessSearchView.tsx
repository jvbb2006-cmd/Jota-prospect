/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  MapPin,
  Globe,
  Phone,
  Star,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import { SearchParams, NormalizedPlace } from '../../services/providers/types';
import { googlePlacesProvider } from '../../services/providers/GooglePlacesProvider';
import { dbRepo } from '../../services/dbRepository';
import { BusinessSearch, BusinessSearchStatus } from '../../types/database';

interface BusinessSearchViewProps {
  workspaceId: string;
  userId?: string;
  onNavigateToLeads: () => void;
  onSelectCompany: (companyId: string) => void;
}

export const BusinessSearchView: React.FC<BusinessSearchViewProps> = ({
  workspaceId,
  userId,
  onNavigateToLeads,
  onSelectCompany,
}) => {
  // Form State
  const [segment, setSegment] = useState('Clínicas médicas');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Belém');
  const [state, setState] = useState('Pará');
  const [country, setCountry] = useState('Brasil');
  const [desiredQuantity, setDesiredQuantity] = useState(20);
  const [minRating, setMinRating] = useState(0);
  const [onlyWithWebsite, setOnlyWithWebsite] = useState(false);

  // Search Execution & State
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<BusinessSearchStatus | null>(null);
  const [results, setResults] = useState<NormalizedPlace[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());

  // Search History & Stats
  const [history, setHistory] = useState<BusinessSearch[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ imported: number; skipped: number } | null>(null);

  // Load Search History
  const loadHistory = async () => {
    try {
      const items = await dbRepo.getSearchHistory(workspaceId);
      setHistory(items);
    } catch (err) {
      console.warn('Erro ao carregar histórico de buscas:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [workspaceId]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!segment.trim() && !query.trim()) {
      setErrorMessage('Informe o segmento ou termos de pesquisa.');
      return;
    }

    setLoading(true);
    setSearchStatus('pending');
    setErrorMessage(null);
    setErrorCode(null);
    setImportFeedback(null);
    setResults([]);
    setSelectedPlaceIds(new Set());

    const params: SearchParams = {
      segment: segment.trim(),
      query: query.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim() || 'Brasil',
      desiredQuantity: Number(desiredQuantity) || 20,
      minRating: Number(minRating) || 0,
      onlyWithWebsite,
    };

    try {
      // 1. Consult provider via server-side /api/search-businesses
      const response = await googlePlacesProvider.search(params);

      // 2. Mark if places already exist in CRM
      const annotatedItems = await dbRepo.markPlacesExistingInCrm(workspaceId, response.items);

      // 3. Save search execution to database
      const savedSearch = await dbRepo.saveSearchExecution(workspaceId, params, {
        ...response,
        items: annotatedItems,
      }, userId);

      setActiveSearchId(savedSearch.id);
      setSearchStatus(response.status);
      setTotalFound(response.totalFound);
      setResults(annotatedItems);

      if (!response.success) {
        setErrorMessage(response.errorMessage || 'Falha na busca.');
        setErrorCode(response.errorCode || 'ERROR');
      } else {
        // Auto select items not yet in CRM
        const newIds = new Set(
          annotatedItems.filter((i) => !i.alreadyInCrm).map((i) => i.providerPlaceId)
        );
        setSelectedPlaceIds(newIds);
      }

      // Refresh history
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSearchStatus('failed');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const selectable = results.filter((r) => !r.alreadyInCrm);
    if (selectedPlaceIds.size === selectable.length && selectable.length > 0) {
      setSelectedPlaceIds(new Set());
    } else {
      setSelectedPlaceIds(new Set(selectable.map((r) => r.providerPlaceId)));
    }
  };

  const toggleSelectPlace = (placeId: string) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const handleImportSelected = async () => {
    if (selectedPlaceIds.size === 0) return;
    setImporting(true);
    setImportFeedback(null);

    const placesToImport = results.filter((r) => selectedPlaceIds.has(r.providerPlaceId));

    try {
      const stats = await dbRepo.importPlacesToCrm(
        workspaceId,
        placesToImport,
        activeSearchId || undefined,
        userId
      );

      setImportFeedback({
        imported: stats.importedCount,
        skipped: stats.skippedCount,
      });

      // Update alreadyInCrm state locally
      setResults((prev) =>
        prev.map((r) =>
          selectedPlaceIds.has(r.providerPlaceId) ? { ...r, alreadyInCrm: true } : r
        )
      );
      setSelectedPlaceIds(new Set());
    } catch (err) {
      console.error('Erro ao importar para CRM:', err);
    } finally {
      setImporting(false);
    }
  };

  const loadExample = (exSegment: string, exCity: string, exState: string) => {
    setSegment(exSegment);
    setQuery('');
    setCity(exCity);
    setState(exState);
    setCountry('Brasil');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Example Prompt */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Encontrar Empresas & Leads B2B
            </h1>
            <p className="text-xs text-slate-500">
              Prospecção de estabelecimentos reais via Google Places API (New) com FieldMasking e importação direta para o CRM
            </p>
          </div>
        </div>

        {/* Example Query Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Consultas de Exemplo:</span>
          <button
            type="button"
            onClick={() => loadExample('Clínicas médicas', 'Belém', 'Pará')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium transition-colors"
          >
            "Clínicas médicas em Belém, Pará, Brasil"
          </button>
          <button
            type="button"
            onClick={() => loadExample('Transportadoras & Logística', 'São Paulo', 'SP')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium transition-colors"
          >
            "Transportadoras em São Paulo, SP"
          </button>
          <button
            type="button"
            onClick={() => loadExample('Escritórios de Advocacia', 'Curitiba', 'PR')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium transition-colors"
          >
            "Advocacia em Curitiba, PR"
          </button>
        </div>
      </div>

      {/* Search Filter Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <form onSubmit={handleSearch} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Segmento / Nicho <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex: Clínicas médicas, Restaurantes, Metalúrgicas"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Termos Adicionais / Especialidade
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: estética, ortopedia, pediatria"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Belém"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado / Região
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ex: Pará ou PA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                País
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Brasil"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade Desejada
              </label>
              <select
                value={desiredQuantity}
                onChange={(e) => setDesiredQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              >
                <option value={5}>5 estabelecimentos</option>
                <option value={10}>10 estabelecimentos</option>
                <option value={20}>20 estabelecimentos (1 página)</option>
                <option value={40}>40 estabelecimentos (2 páginas com token)</option>
                <option value={60}>60 estabelecimentos (limite máximo do provedor)</option>
              </select>
            </div>
          </div>

          {/* Secondary Filters Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Avaliação Mínima:</span>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none"
                >
                  <option value={0}>Todas as avaliações</option>
                  <option value={3.5}>★ 3.5 ou mais</option>
                  <option value={4.0}>★ 4.0 ou mais</option>
                  <option value={4.5}>★ 4.5 ou mais</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWithWebsite}
                  onChange={(e) => setOnlyWithWebsite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-medium">Apenas estabelecimentos com website</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Consultando Places API...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Pesquisar Empresas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error / Provider Notice */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 leading-relaxed">
            <span className="font-semibold block mb-0.5">Falha na Pesquisa de Empresas ({errorCode}):</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Search State Indicator Bar */}
      {searchStatus && !loading && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {searchStatus === 'completed' && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Busca concluída: {totalFound} estabelecimentos localizados
              </span>
            )}
            {searchStatus === 'partial' && (
              <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <Info className="w-4 h-4 text-amber-600" />
                Resultado parcial: Foram encontrados {totalFound} de {desiredQuantity} solicitados para esta localização.
              </span>
            )}
            {searchStatus === 'no_results' && (
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                Nenhum estabelecimento encontrado com os parâmetros fornecidos.
              </span>
            )}
            {searchStatus === 'failed' && (
              <span className="text-red-700 font-medium">
                A consulta não pôde ser completada devido a erro no provedor.
              </span>
            )}
          </div>

          <div className="text-slate-500 text-[11px]">
            Provedor: <strong className="text-slate-700">Google Places API (New) Text Search</strong>
          </div>
        </div>
      )}

      {/* Import Feedback Banner */}
      {importFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Sucesso! <strong>{importFeedback.imported}</strong> novas empresas foram importadas para o CRM.
              {importFeedback.skipped > 0 && (
                <span> ({importFeedback.skipped} duplicatas já existentes foram ignoradas).</span>
              )}
            </span>
          </div>

          <button
            onClick={onNavigateToLeads}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold transition-colors"
          >
            Ver no CRM
          </button>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Action Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <span>
                  {selectedPlaceIds.size === results.filter((r) => !r.alreadyInCrm).length && selectedPlaceIds.size > 0
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos Disponíveis'}
                </span>
              </button>

              <span className="text-xs text-slate-400">·</span>

              <span className="text-xs text-slate-600 font-mono tabular-nums">
                {selectedPlaceIds.size} selecionadas para importação
              </span>
            </div>

            <button
              type="button"
              disabled={selectedPlaceIds.size === 0 || importing}
              onClick={handleImportSelected}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando para CRM...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Importar Selecionadas ({selectedPlaceIds.size})</span>
                </>
              )}
            </button>
          </div>

          {/* Results Grid / List */}
          <div className="divide-y divide-slate-100">
            {results.map((place) => {
              const isSelected = selectedPlaceIds.has(place.providerPlaceId);
              return (
                <div
                  key={place.providerPlaceId}
                  className={`p-4 transition-colors flex items-start gap-4 ${
                    place.alreadyInCrm
                      ? 'bg-slate-50/50 opacity-80'
                      : isSelected
                      ? 'bg-blue-50/40'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Select Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      disabled={place.alreadyInCrm}
                      checked={isSelected}
                      onChange={() => toggleSelectPlace(place.providerPlaceId)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-slate-900 leading-tight">
                            {place.name}
                          </h3>
                          {place.alreadyInCrm && (
                            <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                              Já Cadastrado no CRM
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{place.address || `${place.city}, ${place.state}`}</span>
                        </div>
                      </div>

                      {/* Rating & Google Maps Attribution */}
                      <div className="text-right shrink-0">
                        {place.rating ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-800 justify-end">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{place.rating.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">
                              ({place.userRatingsTotal})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem avaliações</span>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">Google Maps</span>
                      </div>
                    </div>

                    {/* Metadata & Links Row */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                      {place.phone ? (
                        <span className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{place.phone}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Telefone não listado</span>
                      )}

                      {place.websiteUrl && (
                        <a
                          href={place.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">
                            {place.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      {place.googleMapsUrl && (
                        <a
                          href={place.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                        >
                          <span>Ver no Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      <span className="text-slate-400 ml-auto text-[11px] font-mono">
                        ID: {place.providerPlaceId.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mandatory Google Maps Attribution Footer on Results */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
            Google Maps
          </div>
        </div>
      )}

      {/* History of Past Searches */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Histórico de Pesquisas de Mercado</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{history.length} registradas</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-semibold text-slate-900">{h.query}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{h.city ? `${h.city}, ${h.state}` : h.country}</span>
                    <span aria-hidden="true">·</span>
                    <span>{h.results_count} resultados</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{new Date(h.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      h.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : h.status === 'partial'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : h.status === 'no_results'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {h.status === 'completed'
                      ? 'Concluída'
                      : h.status === 'partial'
                      ? 'Parcial'
                      : h.status === 'no_results'
                      ? 'Sem Resultados'
                      : 'Falha'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
