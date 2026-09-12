import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Download,
  Folder,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { HardDriveProfile, StorageFolder } from '../types';
import {
  parseStorageManifestExcel,
  generateSampleHddExcel,
  formatBytes,
} from '../utils/storageExcelHelper';

interface StorageExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrives: HardDriveProfile[];
  onImportComplete: (folders: StorageFolder[], drives: HardDriveProfile[]) => void;
  onOpenPythonModal: () => void;
}

export const StorageExcelUploadModal: React.FC<StorageExcelUploadModalProps> = ({
  isOpen,
  onClose,
  currentDrives,
  onImportComplete,
  onOpenPythonModal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<{
    folders: StorageFolder[];
    drives: HardDriveProfile[];
    totalFilesParsed: number;
    totalBytesParsed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('Format file harus berupa spreadsheet Excel (.xlsx atau .xls)');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await parseStorageManifestExcel(file, currentDrives);
      setParsedResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memproses file Excel.');
      setParsedResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;
    onImportComplete(parsedResult.folders, parsedResult.drives);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Upload Manifest Hasil Scanner Excel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Impor file Excel hasil pemindaian Python atau template manual 4 HDD
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
          {/* Dropzone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-2xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Drag & Drop file Excel (.xlsx) di sini
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              atau klik untuk memilih file dari komputer Anda
            </p>

            <div className="flex items-center gap-2 mt-4 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              <span>Mendukung file keluaran hdd_inventory_scanner.py</span>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Memproses struktur folder, subfolder, & berkas 4 HDD...
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Mengimpor:</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>File Excel Berhasil Dianalisis!</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {formatBytes(parsedResult.totalBytesParsed)} total
                </span>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-slate-400 text-[10px]">Total Berkas</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {parsedResult.totalFilesParsed}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-slate-400 text-[10px]">Folder Utama</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {parsedResult.folders.length}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-slate-400 text-[10px]">Subfolder</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {parsedResult.folders.reduce((s, f) => s + (f.subfolders?.length || 0), 0)}
                  </div>
                </div>
              </div>

              {/* Per-Drive Breakdown */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Alokasi per Hardisk Eksternal:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedResult.drives.map(drive => {
                    const usagePercent = Math.round(
                      (drive.usedBytes / (drive.totalCapacityGB * 1024 * 1024 * 1024)) * 100
                    );
                    return (
                      <div
                        key={drive.id}
                        className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {drive.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatBytes(drive.usedBytes)} / {drive.totalCapacityGB} GB ({usagePercent}%)
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            usagePercent >= 85
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : usagePercent >= 75
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {usagePercent >= 85 ? 'Kritis' : usagePercent >= 75 ? 'Waspada' : 'Aman'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quick Helper Links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={generateSampleHddExcel}
              className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Contoh File Excel (Sample 4 HDD)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPythonModal();
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline cursor-pointer"
            >
              Belum punya script Python? Lihat di sini →
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parsedResult}
            onClick={handleConfirmImport}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
              parsedResult
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Terapkan ke Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
