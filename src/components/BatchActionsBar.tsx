import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Copy,
  Trash2,
  Tag,
  Check,
  X,
  SearchCheck,
  Loader2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { LinkStatus, AppSettings } from '../types';

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onUpdateStatus: (status: string) => void;
  onUpdateOutput?: (output: string) => void;
  onUpdateRegion?: (region: string) => void;
  settings?: AppSettings;
  onApplyTag: (tag: string) => void;
  onBulkTagEdit?: (mode: 'append' | 'replace' | 'remove', targetTag: string, newTag: string) => void;
  onOpenSelected: () => void;
  onCopySelected: () => void;
  onDeleteSelected: () => void;
  onExportSelectedCsv?: () => void;
  onCheckStatusSelected?: () => void;
  isCheckingStatus?: boolean;
  checkingProgress?: { current: number; total: number } | null;
  availableTags?: string[];
}

const DEFAULT_PRESET_TAGS = ['Penting', 'Prioritas', 'Video', 'Dokumen', 'Arsip', 'Review'];

export const BatchActionsBar: React.FC<BatchActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onUpdateStatus,
  onUpdateOutput,
  onUpdateRegion,
  settings,
  onApplyTag,
  onBulkTagEdit,
  onOpenSelected,
  onCopySelected,
  onDeleteSelected,
  onExportSelectedCsv,
  onCheckStatusSelected,
  isCheckingStatus = false,
  checkingProgress = null,
  availableTags = [],
}) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Bulk Tag Editor modal states
  const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'append' | 'replace' | 'remove'>('append');
  const [bulkTargetTag, setBulkTargetTag] = useState('');
  const [bulkNewTag, setBulkNewTag] = useState('');

  // Close tag popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTagPopoverOpen(false);
      }
    }
    if (isTagPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagPopoverOpen]);

  if (selectedCount === 0) return null;

  const handleApply = (tagToApply: string) => {
    onApplyTag(tagToApply.trim());
    setCustomTagInput('');
    setIsTagPopoverOpen(false);
  };

  // Combine default presets with existing tags without duplicates
  const combinedTags = Array.from(
    new Set([...availableTags.filter(Boolean), ...DEFAULT_PRESET_TAGS])
  ).slice(0, 10);

  return (
    <div
      id="batch-actions-floating-bar"
      className="sticky top-20 z-30 mb-5 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">
          {selectedCount}
        </span>
        <span className="text-xs text-slate-200 font-semibold flex items-center gap-1">
          <span>⚡ Quick Action Menu</span>
          <span className="text-slate-400 font-normal">({selectedCount} baris dipilih)</span>
        </span>
        <button
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white text-xs underline ml-2 cursor-pointer"
        >
          Batal Pilih
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 relative">
        {/* Check Status (Ping 404) Button */}
        {onCheckStatusSelected && (
          <button
            type="button"
            id="btn-batch-check-status"
            onClick={onCheckStatusSelected}
            disabled={isCheckingStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white transition shadow-xs cursor-pointer ${
              isCheckingStatus
                ? 'bg-amber-600/80 cursor-wait'
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
            title="Ping URL terpilih di latar belakang dan tandai tautan yang 404 Not Found"
          >
            {isCheckingStatus ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-100" />
            ) : (
              <SearchCheck className="w-3.5 h-3.5 text-amber-200" />
            )}
            <span>
              {isCheckingStatus && checkingProgress
                ? `Mengecek (${checkingProgress.current}/${checkingProgress.total})...`
                : 'Cek Status (Ping 404)'}
            </span>
          </button>
        )}

        {/* Tandai Sudah Terunduh */}
        <button
          type="button"
          id="btn-batch-mark-downloaded"
          onClick={() => onUpdateStatus('Sudah Terunduh')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
          title="Shortcut 1-klik: Ubah status menjadi Sudah Terunduh"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tandai Sudah Terunduh</span>
        </button>

        {/* Tandai Gagal (Quick Action Shortcut) */}
        <button
          type="button"
          id="btn-batch-mark-failed"
          onClick={() => onUpdateStatus('Gagal')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition shadow-xs cursor-pointer"
          title="Shortcut 1-klik: Ubah status menjadi Gagal"
        >
          <X className="w-3.5 h-3.5" />
          <span>Tandai Gagal</span>
        </button>

        {/* Tandai Blank / Belum */}
        <button
          type="button"
          id="btn-batch-mark-blank"
          onClick={() => onUpdateStatus('Blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Tandai Blank</span>
        </button>

        {/* Batch Status Selector */}
        {settings?.statusOptions && settings.statusOptions.length > 0 && (
          <div className="relative inline-flex items-center">
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onUpdateStatus(e.target.value);
                  e.target.value = '';
                }
              }}
              className="appearance-none text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 pr-7 cursor-pointer outline-none transition"
              title="Ubah status semua tautan terpilih sekaligus"
            >
              <option value="" disabled>Ubah Status...</option>
              {settings.statusOptions.map((st, idx) => (
                <option key={idx} value={st} className="bg-slate-900 text-white">
                  ● {st}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        )}

        {/* Batch Output Selector */}
        {onUpdateOutput && settings?.outputOptions && settings.outputOptions.length > 0 && (
          <div className="relative inline-flex items-center">
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onUpdateOutput(e.target.value);
                  e.target.value = '';
                }
              }}
              className="appearance-none text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 pr-7 cursor-pointer outline-none transition"
              title="Ubah output semua tautan terpilih sekaligus"
            >
              <option value="" disabled>Ubah Output...</option>
              {settings.outputOptions.map((out, idx) => (
                <option key={idx} value={out} className="bg-slate-900 text-white">
                  {out}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        )}

        {/* Batch Region Selector */}
        {onUpdateRegion && settings?.regionOptions && settings.regionOptions.length > 0 && (
          <div className="relative inline-flex items-center">
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onUpdateRegion(e.target.value);
                  e.target.value = '';
                }
              }}
              className="appearance-none text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 pr-7 cursor-pointer outline-none transition"
              title="Ubah region semua tautan terpilih sekaligus"
            >
              <option value="" disabled>Ubah Region...</option>
              {settings.regionOptions.map((reg, idx) => (
                <option key={idx} value={reg} className="bg-slate-900 text-white">
                  {reg}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        )}

        {/* Custom Tag / Category Popover Button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            id="btn-batch-tag-toggle"
            onClick={() => setIsTagPopoverOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer ${
              isTagPopoverOpen
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Terapkan Tag</span>
          </button>

          {/* Tag Popover Dropdown */}
          {isTagPopoverOpen && (
            <div
              id="batch-tag-popover"
              className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Terapkan Tag ({selectedCount} Link)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagPopoverOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Custom Input */}
              <div className="space-y-2 mb-3">
                <label className="text-[11px] font-medium text-slate-400">Nama Tag Kustom:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="batch-custom-tag-input"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customTagInput.trim()) {
                        handleApply(customTagInput);
                      }
                    }}
                    placeholder="Misal: Video, Dokumen, Top..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    id="btn-apply-custom-tag-submit"
                    onClick={() => customTagInput.trim() && handleApply(customTagInput)}
                    disabled={!customTagInput.trim()}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
                    title="Terapkan Tag ke link terpilih"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Preset Tags */}
              <div className="space-y-1.5 mb-3">
                <span className="text-[11px] text-slate-400 block">Pilih Cepat Tag:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {combinedTags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApply(tag)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 border border-slate-700/80 transition cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option to clear tag */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  id="btn-batch-clear-tag"
                  onClick={() => handleApply('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                >
                  Hapus Tag dari Terpilih
                </button>
                <span className="text-[10px] text-slate-500">1-Klik Terapkan</span>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Tag Editor Button */}
        {onBulkTagEdit && (
          <button
            type="button"
            id="btn-bulk-tag-editor"
            onClick={() => setIsBulkEditorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-xs cursor-pointer"
            title="Buka Editor Tag Massal (Multi-Replace & Append)"
          >
            <Tag className="w-3.5 h-3.5 text-purple-200" />
            <span>Editor Tag Massal</span>
          </button>
        )}

        {/* Export Filtered CSV */}
        {onExportSelectedCsv && (
          <button
            type="button"
            id="btn-batch-export-csv"
            onClick={onExportSelectedCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition shadow-xs cursor-pointer"
            title="Download tautan terpilih sebagai file CSV"
          >
            <Download className="w-3.5 h-3.5 text-teal-100" />
            <span>Export Filtered CSV</span>
          </button>
        )}

        {/* Buka Tautan Sekaligus */}
        <button
          type="button"
          id="btn-batch-open-links"
          onClick={onOpenSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
          title="Buka seluruh tautan terpilih sekaligus di tab baru (Shortcut: Ctrl+Shift+O)"
        >
          <ExternalLink className="w-3.5 h-3.5 text-indigo-100" />
          <span>Buka Semua ({selectedCount} Tab)</span>
        </button>

        {/* Salin Tautan */}
        <button
          type="button"
          id="btn-batch-copy-links"
          onClick={onCopySelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Link</span>
        </button>

        {/* Hapus */}
        <button
          type="button"
          id="btn-batch-delete-links"
          onClick={onDeleteSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/60 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>
      </div>

      {/* Bulk Tag Editor Modal */}
      {isBulkEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Bulk Tag Editor</h3>
                  <p className="text-xs text-slate-400">Operasi massal untuk {selectedCount} tautan terpilih</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800/80 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBulkMode('append')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkMode === 'append' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tambah Tag
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('replace')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkMode === 'replace' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ganti Tag (Replace)
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('remove')}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkMode === 'remove' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Hapus Tag
              </button>
            </div>

            {/* Mode specific inputs */}
            <div className="space-y-4">
              {bulkMode === 'append' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Tag Baru yang Ditambahkan:</label>
                  <input
                    type="text"
                    value={bulkNewTag}
                    onChange={e => setBulkNewTag(e.target.value)}
                    placeholder="Misal: Penting, Arsip, Update..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400">Tag ini akan digabungkan ke tag yang sudah ada pada {selectedCount} link terpilih.</p>
                </div>
              )}

              {bulkMode === 'replace' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Cari Tag Lama (Target):</label>
                    <input
                      type="text"
                      value={bulkTargetTag}
                      onChange={e => setBulkTargetTag(e.target.value)}
                      placeholder="Tag yang ingin diganti..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Ganti dengan Tag Baru:</label>
                    <input
                      type="text"
                      value={bulkNewTag}
                      onChange={e => setBulkNewTag(e.target.value)}
                      placeholder="Tag pengganti..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {bulkMode === 'remove' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Tag yang Ingin Dihapus:</label>
                  <input
                    type="text"
                    value={bulkTargetTag}
                    onChange={e => setBulkTargetTag(e.target.value)}
                    placeholder="Nama tag spesifik yang dihapus..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    autoFocus
                  />
                  <p className="text-[11px] text-rose-400">Tag ini akan dihapus dari daftar tag pada {selectedCount} link terpilih.</p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  (bulkMode === 'append' && !bulkNewTag.trim()) ||
                  (bulkMode === 'replace' && (!bulkTargetTag.trim() || !bulkNewTag.trim())) ||
                  (bulkMode === 'remove' && !bulkTargetTag.trim())
                }
                onClick={() => {
                  if (onBulkTagEdit) {
                    onBulkTagEdit(bulkMode, bulkTargetTag, bulkNewTag);
                    setIsBulkEditorOpen(false);
                    setBulkNewTag('');
                    setBulkTargetTag('');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  bulkMode === 'remove' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                Terapkan ke {selectedCount} Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
