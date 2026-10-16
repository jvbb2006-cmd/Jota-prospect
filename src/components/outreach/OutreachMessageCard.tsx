/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  Save,
  History,
  Send,
  MessageSquare,
  Mail,
  Linkedin,
  Phone,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  OutreachMessage,
  OutreachChannel,
  OutreachMessageState,
  Company,
  Contact,
} from '../../types/database';
import { validateAndNormalizePhone, buildWhatsAppLink } from '../../services/whatsappService';

interface OutreachMessageCardProps {
  message: OutreachMessage;
  company: Company;
  contact?: Contact | null;
  onSave: (updated: OutreachMessage, note?: string) => Promise<void>;
  onRegenerate: (message: OutreachMessage) => Promise<void>;
  onCopy: (text: string, message: OutreachMessage) => void;
  onOpenWhatsApp: (e164: string, message: OutreachMessage) => void;
  onOpenManualLogModal: (message: OutreachMessage) => void;
  isSaving?: boolean;
  isRegenerating?: boolean;
}

export const OutreachMessageCard: React.FC<OutreachMessageCardProps> = ({
  message,
  company,
  contact,
  onSave,
  onRegenerate,
  onCopy,
  onOpenWhatsApp,
  onOpenManualLogModal,
  isSaving = false,
  isRegenerating = false,
}) => {
  const [content, setContent] = useState(message.content);
  const [channel, setChannel] = useState<OutreachChannel>(message.channel);
  const [state, setState] = useState<OutreachMessageState>(message.state);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [customPhone, setCustomPhone] = useState<string>('');
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  // Determinar telefone ativo (do contato ou da empresa)
  const effectivePhone = customPhone || contact?.whatsapp_number || contact?.phone || company.whatsapp_number || company.phone || '';
  const phoneValidation = validateAndNormalizePhone(effectivePhone);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
    if (state !== 'editado') {
      setState('editado');
    }
  };

  const handleChannelChange = (newChannel: OutreachChannel) => {
    setChannel(newChannel);
    setHasChanges(true);
  };

  const handleSaveClick = async () => {
    const updated: OutreachMessage = {
      ...message,
      content,
      channel,
      state: hasChanges ? 'editado' : state,
      updated_at: new Date().toISOString(),
    };
    await onSave(updated, 'Edição salva pelo usuário');
    setHasChanges(false);
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy(content, message);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleWhatsAppClick = () => {
    if (!phoneValidation.isValid || !phoneValidation.e164) {
      setShowPhoneEditor(true);
      return;
    }
    onOpenWhatsApp(phoneValidation.e164, {
      ...message,
      content,
      channel,
    });
  };

  const stateBadges: Record<OutreachMessageState, { label: string; color: string }> = {
    rascunho: { label: 'Rascunho IA', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    editado: { label: 'Editado Manualmente', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    aprovado: { label: 'Aprovado', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    utilizado: { label: 'Utilizado em Abordagem', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  };

  const channelIcons: Record<OutreachChannel, React.ReactNode> = {
    whatsapp: <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />,
    email: <Mail className="w-3.5 h-3.5 text-blue-600" />,
    linkedin: <Linkedin className="w-3.5 h-3.5 text-indigo-600" />,
    phone: <Phone className="w-3.5 h-3.5 text-amber-600" />,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col overflow-hidden">
      {/* Header do Cartão */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
            {message.stage_step}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              {message.stage_title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${stateBadges[state]?.color}`}
              >
                {stateBadges[state]?.label}
              </span>
              <span className="text-[11px] text-slate-400">
                Criado: {new Date(message.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Seletor de Canal */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['whatsapp', 'email', 'linkedin', 'phone'] as OutreachChannel[]).map((c) => (
            <button
              key={c}
              onClick={() => handleChannelChange(c)}
              className={`p-1.5 rounded-md border text-xs font-medium flex items-center gap-1 transition-colors ${
                channel === c
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title={`Definir canal como ${c.toUpperCase()}`}
            >
              {channelIcons[c]}
              <span className="capitalize hidden md:inline text-[11px]">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tailored Points (Evidências Reais Utilizadas) */}
      {message.tailored_points && message.tailored_points.length > 0 && (
        <div className="px-4 py-2 bg-blue-50/40 border-b border-blue-100/60 flex items-center gap-2 overflow-x-auto text-[11px] text-blue-900">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold text-blue-800 shrink-0">Dados do CRM & Diagnóstico:</span>
          <div className="flex items-center gap-1.5 truncate">
            {message.tailored_points.map((pt, i) => (
              <span
                key={i}
                className="bg-white/80 border border-blue-200/80 px-2 py-0.5 rounded text-[10px] text-slate-700 whitespace-nowrap"
              >
                {pt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Área Editável de Conteúdo */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="relative flex-1">
          <textarea
            value={content}
            onChange={handleTextChange}
            rows={7}
            className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-sans resize-y"
            placeholder="Digite ou edite o texto da mensagem de abordagem..."
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
            <span>
              {content.length} caracteres • {content.trim().split(/\s+/).filter(Boolean).length} palavras
            </span>
            {hasChanges && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Alterações pendentes de salvar
              </span>
            )}
          </div>
        </div>

        {/* Alerta de Validação de Telefone WhatsApp */}
        {channel === 'whatsapp' && (
          <div className="mt-3 p-2.5 rounded-lg border bg-slate-50 border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-700 font-medium">Destino WhatsApp: </span>
                {phoneValidation.isValid ? (
                  <span className="font-mono text-emerald-700 font-semibold">
                    {phoneValidation.formattedDisplay}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    {phoneValidation.errorMessage || 'Telefone não configurado ou ambíguo'}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPhoneEditor(!showPhoneEditor)}
              className="text-[11px] text-blue-600 hover:text-blue-700 underline font-medium self-start sm:self-auto"
            >
              {showPhoneEditor ? 'Fechar edição de número' : 'Corrigir número manualmente'}
            </button>
          </div>
        )}

        {/* Editor manual de telefone quando ambíguo */}
        {showPhoneEditor && (
          <div className="mt-2 p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
            <label className="block text-[11px] font-semibold text-amber-900">
              Informe o número completo com DDD (ex: +55 11 98888-7777 ou 91 3200-1122):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="Ex: +55 11 99999-8888"
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => setShowPhoneEditor(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-white font-medium rounded-md hover:bg-slate-900"
              >
                Aplicar
              </button>
            </div>
            {phoneValidation.errorMessage && (
              <p className="text-[11px] text-red-600 font-medium">
                {phoneValidation.errorMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Histórico de Versões Expansível */}
      {showHistory && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Histórico de Versões ({message.versions?.length || 1})
            </span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-400 hover:text-slate-600 text-[11px]"
            >
              Ocultar
            </button>
          </div>

          <div className="space-y-2">
            {(message.versions || []).map((ver) => (
              <div
                key={ver.version}
                className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-blue-700">Versão {ver.version}</span>
                  <span className="text-slate-400">
                    {new Date(ver.updated_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2 italic text-[11px]">
                  "{ver.content}"
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Canal: {ver.channel.toUpperCase()} • Estado: {ver.state}</span>
                  <button
                    onClick={() => {
                      setContent(ver.content);
                      setChannel(ver.channel);
                      setHasChanges(true);
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Restaurar este texto
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé com Ações Comerciais */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors flex items-center gap-1 border border-transparent"
            title="Ver histórico de edições"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px]">Versões ({message.versions?.length || 1})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={() => onRegenerate(message)}
            disabled={isRegenerating}
            className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors flex items-center gap-1"
            title="Regenerar texto com IA e evidências do diagnóstico"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="text-[11px]">Regenerar</span>
          </button>

          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 font-medium ${
              hasChanges
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Salvar alterações no texto"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="text-[11px]">{hasChanges ? 'Salvar Edição' : 'Salvo'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Copiar */}
          <button
            onClick={handleCopyClick}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
            title="Copiar mensagem para área de transferência"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Copiar</span>
              </>
            )}
          </button>

          {/* Botão Ação WhatsApp ou Manual */}
          {channel === 'whatsapp' ? (
            <button
              onClick={handleWhatsAppClick}
              disabled={company.do_not_contact}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 ${
                company.do_not_contact
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : phoneValidation.isValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
              title={
                company.do_not_contact
                  ? 'Lead bloqueado por Opt-out'
                  : phoneValidation.isValid
                  ? 'Abrir link wa.me com mensagem pré-preenchida (sem envio automático)'
                  : 'Número necessita de ajuste de DDD'
              }
            >
              <Send className="w-3.5 h-3.5" />
              <span>{phoneValidation.isValid ? 'Abrir no WhatsApp' : 'Validar Telefone'}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenManualLogModal(message)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
              title="Registrar contato comercial realizado"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Registrar Ação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
