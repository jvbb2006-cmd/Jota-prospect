/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, PhoneCall, Mail, Users, MessageSquare, FileText } from 'lucide-react';
import { Activity, ActivityType } from '../../types/database';
import { dbRepo } from '../../services/dbRepository';

interface ActivityModalProps {
  isOpen: boolean;
  workspaceId: string;
  companyId: string;
  companyName?: string;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  workspaceId,
  companyId,
  companyName,
  onClose,
  onSaved,
}) => {
  const [type, setType] = useState<ActivityType>('call');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activityTypes: { type: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'call', label: 'Ligação', icon: PhoneCall },
    { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { type: 'meeting', label: 'Reunião', icon: Users },
    { type: 'email', label: 'E-mail', icon: Mail },
    { type: 'note', label: 'Nota', icon: FileText },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O resumo da atividade é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const act = await dbRepo.createActivity(workspaceId, {
        company_id: companyId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        performed_at: new Date().toISOString(),
      });
      onSaved(act);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Erro ao registrar atividade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Registrar Atividade Comercial</h3>
            {companyName && (
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{companyName}</p>
            )}
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
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Tipo de Atividade
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {activityTypes.map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setType(item.type)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 text-[11px] font-medium rounded-md transition-all ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Resumo do Contato / Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ligação com diretor para agendar demo técnica"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Notas & Resultados
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os pontos acordados, objeções levantadas e próximos passos..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
            />
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
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
