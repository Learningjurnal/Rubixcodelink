import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, RefreshCw, FileText, ArrowRight, Sparkles, Tag, CheckSquare, Layers } from 'lucide-react';
import { ImportPreviewItem, LinkItem, LinkStatus } from '../types';
import { parseExcelFile, downloadTemplateExcel } from '../utils/excelHelper';

interface UploadExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLinks: LinkItem[];
  onImportComplete: (
    newItems: LinkItem[],
    updatedCount: number,
    skippedDuplicatesCount: number
  ) => void;
}

export const UploadExcelModal: React.FC<UploadExcelModalProps> = ({
  isOpen,
  onClose,
  existingLinks,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [extractedFromNamesCount, setExtractedFromNamesCount] = useState(0);
  const [deepExtract, setDeepExtract] = useState(true);
  
  // Strategy: 'skip' | 'update' | 'all'
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'all'>('skip');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (uploadedFile: File, enableDeepExtract = deepExtract) => {
    setError(null);
    setLoading(true);
    try {
      setFile(uploadedFile);
      const res = await parseExcelFile(uploadedFile, existingLinks, { deepExtractAllCells: enableDeepExtract });
      setPreviewItems(res.previewItems);
      setDuplicatesCount(res.duplicatesCount);
      setNewCount(res.newCount);
      setExtractedFromNamesCount(res.extractedFromNamesCount);
    } catch (err: any) {
      setError(err?.message || 'Gagal membaca file Excel. Pastikan format file benar (.xlsx, .xls, .csv).');
      setFile(null);
      setPreviewItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeepExtract = (enabled: boolean) => {
    setDeepExtract(enabled);
    if (file) {
      handleProcessFile(file, enabled);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleProcessFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (previewItems.length === 0) return;

    const itemsToCreate: LinkItem[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    const now = Date.now();

    previewItems.forEach((preview, idx) => {
      if (preview.isDuplicate) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          return;
        } else if (duplicateStrategy === 'update') {
          updatedCount++;
          return;
        }
      }

      // Add as new item (or strategy is 'all')
      itemsToCreate.push({
        id: `link-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: preview.name || '',
        link: preview.link,
        tag: preview.tag || '',
        status: preview.status || 'Blank',
        output: preview.output || 'Single',
        region: preview.region || 'LIVE',
        counta: preview.counta ?? 1,
        note: preview.note || '',
        diperbarui: preview.diperbarui,
        createdAt: now,
      });
    });

    onImportComplete(itemsToCreate, updatedCount, skippedCount);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setPreviewItems([]);
    setError(null);
    setDuplicatesCount(0);
    setNewCount(0);
    setExtractedFromNamesCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="upload-excel-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-white">Upload & Ekstrak Link dari Excel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Pembaruan data massal, ekstraksi tautan cerdas & deteksi duplikasi
              </p>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Deep Extraction Feature Toggle */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-indigo-950">
                  Ekstraksi Link Otomatis & Cerdas (Auto-Extract URLs)
                </p>
                <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                  Otomatis mendeteksi hyperlink tersemat, formula `=HYPERLINK()`, link di dalam nama/catatan, dan multi-URL per sel.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={deepExtract}
                onChange={e => handleToggleDeepExtract(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {!file ? (
            <div>
              {/* Dropzone */}
              <div
                id="excel-dropzone"
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-semibold text-slate-800">
                  Tarik file Excel ke sini, atau klik untuk memilih file
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung format .xlsx, .xls, atau .csv (Maksimal 10 MB)
                </p>
                <p className="text-xs text-indigo-600 font-medium mt-3">
                  Kolom otomatis terdeteksi: Link, Nama, Tag, Status, Output, Region, Note, Diperbarui
                </p>
              </div>

              {/* Download template notice */}
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="text-xs text-slate-600">
                    Belum punya format Excel yang pas? Unduh template resmi sekarang.
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-download-template-modal"
                  onClick={downloadTemplateExcel}
                  className="text-xs font-semibold text-[#7a1b32] hover:text-[#5d1426] underline flex-shrink-0"
                >
                  Download Template .xlsx
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {previewItems.length} total baris tautan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-change-file"
                  onClick={handleReset}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border bg-white shadow-xs cursor-pointer"
                >
                  Ganti File
                </button>
              </div>

              {/* Duplicate & Extraction Analysis Banner */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {newCount}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">Link Baru</p>
                    <p className="text-[11px] text-emerald-700">Siap disimpan</p>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    duplicatesCount > 0
                      ? 'border-amber-300 bg-amber-50/80 text-amber-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      duplicatesCount > 0
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {duplicatesCount}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Duplikat</p>
                    <p className="text-[11px] text-slate-500">
                      {duplicatesCount > 0 ? 'Sudah ada' : 'Tidak ada'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-950 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-sm">
                    {extractedFromNamesCount}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Terekstrak</p>
                    <p className="text-[11px] text-indigo-700">Link tertanam/formula</p>
                  </div>
                </div>
              </div>

              {/* Strategy selector if duplicates found */}
              {duplicatesCount > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Pilihan Penanganan Duplikasi:
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="skip"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="text-[#7a1b32] focus:ring-[#7a1b32]"
                      />
                      <span>
                        <strong>Abaikan duplikat</strong> (Hanya tambahkan {newCount} link baru —{' '}
                        <span className="text-emerald-700 font-medium">Direkomendasikan</span>)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="update"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                        className="text-[#7a1b32] focus:ring-[#7a1b32]"
                      />
                      <span>
                        <strong>Perbarui data link yang sudah ada</strong> (Sinkronkan status dari Excel)
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="all"
                        checked={duplicateStrategy === 'all'}
                        onChange={() => setDuplicateStrategy('all')}
                        className="text-[#7a1b32] focus:ring-[#7a1b32]"
                      />
                      <span>
                        <strong>Tetap tambahkan semua</strong> (Izinkan duplikasi masuk)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">
                    Pratinjau Hasil Pembacaan & Ekstraksi Excel:
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Menampilkan 6 baris pertama
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 text-xs bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 text-[11px]">
                      <tr>
                        <th className="p-2.5">Nama & Link URL</th>
                        <th className="p-2.5">Tag</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Output</th>
                        <th className="p-2.5">Region</th>
                        <th className="p-2.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewItems.slice(0, 6).map((row, idx) => (
                        <tr key={idx} className={row.isDuplicate ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-2.5 max-w-[240px]">
                            {row.name && (
                              <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate">{row.name}</span>
                              </div>
                            )}
                            <div className="text-[11px] text-indigo-600 truncate font-mono">
                              {row.link}
                            </div>
                            {row.hasExtractedLink && (
                              <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                                <Sparkles className="w-2.5 h-2.5" /> Hasil Ekstraksi
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {row.tag ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                <Tag className="w-2.5 h-2.5 text-indigo-500" />
                                {row.tag}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium">{row.status}</td>
                          <td className="p-2.5">{row.output}</td>
                          <td className="p-2.5">{row.region}</td>
                          <td className="p-2.5">
                            {row.isDuplicate ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Duplikat
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Baru
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            id="btn-cancel-upload"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-import-excel"
            onClick={handleExecuteImport}
            disabled={previewItems.length === 0 || loading}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer ${
              previewItems.length === 0 || loading
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses File...</span>
              </>
            ) : (
              <>
                <span>Impor {previewItems.length} Link ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
