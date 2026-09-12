import React, { useState } from 'react';
import { Shield, Clock, Search, Trash2, Filter, X } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onClearLogs: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.targetName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">
                Activity Audit Trail & History Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catat riwayat dan aktivitas perubahan sistem secara real-time ({logs.length} entri)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold transition cursor-pointer border border-red-200 dark:border-red-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Log</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari aktivitas atau target..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'AI_TAG', 'HEALTH_CHECK'].map(action => (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer ${
                  filterAction === action
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Tidak ada catatan audit log yang ditemukan.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      log.action === 'CREATE'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : log.action === 'DELETE'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : log.action === 'AI_TAG'
                        ? 'bg-purple-50 text-purple-600 border border-purple-200'
                        : log.action === 'HEALTH_CHECK'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    }`}
                  >
                    {log.action.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {log.targetName || 'Sistem'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-semibold">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({log.targetType})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {log.details}
                    </p>
                    {log.userEmail && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Oleh: {log.userEmail}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {log.formattedTime}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
