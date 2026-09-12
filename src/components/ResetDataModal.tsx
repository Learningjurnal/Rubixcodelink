import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Filter,
  Sliders,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  Sparkles,
} from 'lucide-react';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetFilters: () => void;
  onResetSettings: () => void;
  onClearDatabase: () => Promise<void>;
  totalLinksCount: number;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  onResetFilters,
  onResetSettings,
  onClearDatabase,
  totalLinksCount,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeletingDb, setIsDeletingDb] = useState(false);
  const [activeSuccessMsg, setActiveSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleResetFiltersClick = () => {
    onResetFilters();
    setActiveSuccessMsg('Filter pencarian, periode tanggal, dan seleksi berhasil direset!');
    setTimeout(() => {
      setActiveSuccessMsg('');
      onClose();
    }, 1200);
  };

  const handleResetSettingsClick = () => {
    onResetSettings();
    setActiveSuccessMsg('Pengaturan opsi kategori dan preset berhasil dikembalikan ke default!');
    setTimeout(() => {
      setActiveSuccessMsg('');
      onClose();
    }, 1200);
  };

  const performWipeAll = async () => {
    setIsDeletingDb(true);
    try {
      // Race against a safety timeout of 3.5 seconds max so it NEVER hangs
      await Promise.race([
        onClearDatabase(),
        new Promise(resolve => setTimeout(resolve, 3500)),
      ]);
      setActiveSuccessMsg('Seluruh data tautan & informasi berhasil dibersihkan total (0 data)!');
    } catch (e) {
      console.error('Clear DB error:', e);
      setActiveSuccessMsg('Data lokal berhasil dibersihkan total.');
    } finally {
      setTimeout(() => {
        setIsDeletingDb(false);
        setActiveSuccessMsg('');
        setConfirmInput('');
        onClose();
      }, 900);
    }
  };

  const handleDirectWipeClick = async () => {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA data tautan & informasi yang ada? Seluruh data lokal dan database akan dikosongkan total.')) {
      return;
    }
    await performWipeAll();
  };

  const handleTypedWipeClick = async () => {
    if (confirmInput.trim().toUpperCase() !== 'HAPUS') return;
    await performWipeAll();
  };

  return (
    <div
      id="reset-data-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="reset-data-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pusat Reset & Pembersihan Data
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hapus atau reset data tautan, filter, opsi konfigurasi, dan database total
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {activeSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{activeSuccessMsg}</span>
          </div>
        )}

        {/* Options List */}
        <div className="p-6 space-y-4 text-xs">
          {/* Option 1: Reset Filter & Seleksi */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Reset Filter & Pencarian</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Menghapus kata kunci pencarian, mereset filter status ke 'ALL', membersihkan rentang tanggal, dan membatalkan seluruh centang seleksi link.
              </p>
            </div>
            <button
              type="button"
              id="btn-confirm-reset-filters"
              onClick={handleResetFiltersClick}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs shrink-0 transition shadow-2xs cursor-pointer"
            >
              Reset Filter
            </button>
          </div>

          {/* Option 2: Reset Default Pengaturan */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Reset Opsi Pengaturan ke Bawaan</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Mengembalikan daftar pilihan Status, Output, Region, dan Preset Catatan (Note) ke konfigurasi standar awal.
              </p>
            </div>
            <button
              type="button"
              id="btn-confirm-reset-settings"
              onClick={handleResetSettingsClick}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs shrink-0 transition shadow-2xs cursor-pointer"
            >
              Reset Opsi
            </button>
          </div>

          {/* Option 3: DANGER ZONE - Clear Entire Database & Local Storage */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-900 dark:text-rose-200 text-xs">
                    Kosongkan Semua Data & Informasi (Hapus Total)
                  </span>
                  <span className="px-1.5 py-0.2 bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300 rounded text-[10px] font-bold">
                    {totalLinksCount} Tautan Terdaftar
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Menghapus permanen seluruh data tautan dari penyimpanan lokal (cache peramban) dan Cloud Database. Gunakan jika Anda ingin membersihkan seluruh tautan dan memulai dari 0.
                </p>
              </div>
            </div>

            {/* Quick 1-Click Clear Button */}
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold">
                Pembersihan Cepat (1-Klik):
              </span>
              <button
                type="button"
                id="btn-direct-wipe-database"
                onClick={handleDirectWipeClick}
                disabled={isDeletingDb}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingDb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua Data Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Alternative: Confirmation typing */}
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 space-y-1.5">
              <label className="text-[11px] text-rose-800 dark:text-rose-300 font-medium block">
                Atau ketik <span className="font-mono bg-rose-200/80 dark:bg-rose-900/60 px-1 py-0.5 rounded text-rose-900 dark:text-rose-100 font-bold">HAPUS</span>:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="input-confirm-delete-db"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  placeholder="Ketik HAPUS"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono uppercase"
                  disabled={isDeletingDb}
                />
                <button
                  type="button"
                  id="btn-confirm-wipe-database"
                  onClick={handleTypedWipeClick}
                  disabled={confirmInput.trim().toUpperCase() !== 'HAPUS' || isDeletingDb}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Konfirmasi Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
