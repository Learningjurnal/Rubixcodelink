import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map(toast => {
        let bg = 'bg-slate-900 text-white';
        let Icon = Info;
        if (toast.type === 'success') {
          bg = 'bg-emerald-800 text-emerald-50 border border-emerald-700';
          Icon = CheckCircle2;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-800 text-amber-50 border border-amber-700';
          Icon = AlertCircle;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-900 text-rose-50 border border-rose-700';
          Icon = AlertCircle;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-2xl text-sm transition-all duration-300 border border-white/10 ${bg}`}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-medium text-xs leading-snug truncate">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    onDismiss(toast.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {toast.undoLabel || 'Urungkan'}
                </button>
              )}
              <button
                id={`dismiss-toast-${toast.id}`}
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
