import React, { useState } from 'react';
import {
  X,
  Code,
  Download,
  Copy,
  Check,
  HardDrive,
  Terminal,
  FileSpreadsheet,
  ExternalLink,
  Info,
} from 'lucide-react';
import { getPythonScannerScript } from '../utils/storageExcelHelper';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUploadModal: () => void;
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({
  isOpen,
  onClose,
  onOpenUploadModal,
}) => {
  const [copied, setCopied] = useState(false);
  const scriptContent = getPythonScannerScript();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hdd_inventory_scanner.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Script Python Scanner 4 Hardisk Eksternal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  v1.2 Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pindai direktori folder, subfolder, & berkas pada 4 HDD Anda secara otomatis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition border border-slate-200/60 dark:border-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Steps Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Pasang Library</span>
              </div>
              <code className="block font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200">
                pip install openpyxl
              </code>
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Jalankan Script</span>
              </div>
              <code className="block font-mono text-[11px] bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200">
                python hdd_inventory_scanner.py
              </code>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/60">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Upload ke Dashboard</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                File <span className="font-bold">hdd_inventory_result.xlsx</span> langsung divisualisasikan!
              </p>
            </div>
          </div>

          {/* Action Bar: Download .py and Copy */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Source Code (hdd_inventory_scanner.py)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Script'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .py</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>hdd_inventory_scanner.py</span>
              <span>Python 3.8+ Compatible</span>
            </div>
            <pre className="p-4 overflow-x-auto max-h-80 leading-relaxed text-[11px] text-slate-300">
              {scriptContent}
            </pre>
          </div>

          {/* Drive Configuration Tip */}
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold">Tips Penyesuaian Huruf Drive:</p>
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                Buka file script yang diunduh lalu sesuaikan <code className="font-bold">mount_path</code> (misalnya <code className="font-bold">D:\\</code>, <code className="font-bold">E:\\</code>, <code className="font-bold">F:\\</code>, <code className="font-bold">G:\\</code> pada Windows, atau path folder spesifik). Script akan otomatis menghitung ukuran file dan mengelompokkan folder serta subfoldernya.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenUploadModal();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Sudah Punya File Excel? Upload Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
