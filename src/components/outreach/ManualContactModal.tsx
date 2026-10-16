/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Ban,
  MessageSquare,
  Clock,
  Phone,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Company, Contact, ActivityType } from '../../types/database';

interface ManualContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  contact?: Contact | null;
  defaultStageStep?: number;
  onSubmit: (data: {
    eventType: ActivityType;
    channel: string;
    result: string;
    notes: string;
    scheduledMeetingAt?: string;
  }) => Promise<void>;
}

export const ManualContactModal: React.FC<ManualContactModalProps> = ({
  isOpen,
  onClose,
  company,
  contact,
  defaultStageStep = 1,
  onSubmit,
}) => {
  const [eventType, setEventType] = useState<ActivityType>('manual_contact_logged');
  const [channel, setChannel] = useState('whatsapp');
  const [result, setResult] = useState('Aguardando retorno');
  const [notes, setNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        eventType,
        channel,
        result,
        notes,
        scheduledMeetingAt: eventType === 'meeting_scheduled' ? meetingDate : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Registrar Resultado Comercial Manual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Empresa: <strong className="text-slate-700">{company.name}</strong>
              {contact ? ` • Contato: ${contact.name}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Tipo de Evento */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Tipo de Evento Comercial (Origem: Manual do Operador)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEventType('manual_contact_logged');
                  setResult('Mensagem enviada manualmente');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  eventType === 'manual_contact_logged'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Contato Realizado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEventType('response_received');
                  setResult('Lead respondeu com interesse');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  eventType === 'response_received'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Resposta Recebida</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEventType('meeting_scheduled');
                  setResult('Reunião agendada');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  eventType === 'meeting_scheduled'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Reunião Marcada</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEventType('opt_out_requested');
                  setResult('Lead pediu para não ser contatado');
                }}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  eventType === 'opt_out_requested'
                    ? 'border-red-600 bg-red-50/60 text-red-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Pedido de Não Contato</span>
              </button>
            </div>
          </div>

          {/* Aviso especial de Opt-Out */}
          {eventType === 'opt_out_requested' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Atenção às regras de conformidade:</strong> Registrar este pedido bloqueará
                o lead permanentemente no sistema e cancelará todas as tarefas pendentes da cadência.
              </div>
            </div>
          )}

          {/* Seletor de Canal Utilizado */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Canal de Comunicação</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="whatsapp">WhatsApp Web / Mobile</option>
              <option value="email">E-mail Corporativo</option>
              <option value="phone">Ligação Telefônica Direta</option>
              <option value="linkedin">LinkedIn Mensagem / InMail</option>
            </select>
          </div>

          {/* Campo de Data se Reunião Marcada */}
          {eventType === 'meeting_scheduled' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Data e Horário da Reunião
              </label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Observações e Resumo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Notas do Operador / Resumo do Contato
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Mensagem enviada via WhatsApp manual. O decisor confirmou recebimento e solicitou contato após as 14h."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Footer de Ações */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {submitting ? 'Salvando...' : 'Salvar Registro Comercial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
