import React, { useState } from 'react';
import { X, Link2, Sparkles, Check, ArrowRight, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { LinkItem, ExtractedLinkResult } from '../types';
import { extractLinkFromText, extractLinksFromMultiLineText } from '../utils/linkExtractor';
import { formatDateNow } from '../utils/excelHelper';
import {
  batchAddUserLinksToFirestore,
  batchUpdateItemsInFirestore,
} from '../lib/supabase';

interface ExtractLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: LinkItem[];
  onNotify: (msg: string, type: 'success' | 'info' | 'error') => void;
  userId?: string;
}

export const ExtractLinkModal: React.FC<ExtractLinkModalProps> = ({
  isOpen,
  onClose,
  existingItems,
  onNotify,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'newText' | 'scanExisting'>('newText');
  const [rawTextInput, setRawTextInput] = useState(
    `Video Episode 1 - https://firestream.to/v/sampleEp1\n[Download Episode 2 Full HD](https://listeamed.net/e/sampleEp2)\n<a href="https://file-upload.com/sample3">Episode 3 Final</a>\nBerkas Batch 4: https://example.com/batch4`
  );
  const [extractedList, setExtractedList] = useState<ExtractedLinkResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Scan existing database items for embedded links
  const existingEmbeddedItems = React.useMemo(() => {
    return existingItems.filter(item => {
      // Check if item's link or name has embedded markers
      const inLink = extractLinkFromText(item.link);
      const inName = item.name ? extractLinkFromText(item.name) : { url: null, name: '' };
      return (
        (inLink.url && inLink.url !== item.link) ||
        (inName.url && inName.url !== item.link) ||
        item.link.includes('[') ||
        item.link.includes('<a') ||
        item.link.includes(' ')
      );
    });
  }, [existingItems]);

  if (!isOpen) return null;

  const handleParseText = () => {
    const results = extractLinksFromMultiLineText(rawTextInput);
    setExtractedList(results);
  };

  const handleImportExtracted = async () => {
    const validItems = extractedList.filter(i => i.status === 'valid' && i.extractedUrl);
    if (validItems.length === 0) {
      onNotify('Tidak ada link valid yang dapat diimpor.', 'error');
      return;
    }

    if (!userId) {
      onNotify('Sesi pengguna tidak ditemukan. Silakan masuk ulang.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const now = Date.now();
      const today = formatDateNow();
      const itemsToSave = validItems.map(item => ({
        name: item.extractedName || '',
        link: item.extractedUrl,
        status: 'Blank' as const,
        output: 'Single',
        region: 'LIVE',
        note: '',
        diperbarui: today,
        createdAt: now,
      }));

      await batchAddUserLinksToFirestore(userId, itemsToSave);
      onNotify(`Berhasil mengekstrak dan menyimpan ${itemsToSave.length} link baru ke database!`, 'success');
      onClose();
    } catch (e: any) {
      console.error('Extraction import error:', e);
      onNotify('Gagal menyimpan hasil ekstraksi ke database.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixExistingItems = async () => {
    if (existingEmbeddedItems.length === 0) return;
    if (!userId) {
      onNotify('Sesi pengguna tidak ditemukan. Silakan masuk ulang.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const today = formatDateNow();
      const updates = existingEmbeddedItems.map(item => {
        let cleanUrl = item.link;
        let cleanName = item.name || '';

        const fromLink = extractLinkFromText(item.link);
        if (fromLink.url) {
          cleanUrl = fromLink.url;
          if (!cleanName && fromLink.name) cleanName = fromLink.name;
        }

        if (item.name) {
          const fromName = extractLinkFromText(item.name);
          if (fromName.url) {
            cleanUrl = fromName.url;
            if (fromName.name) cleanName = fromName.name;
          }
        }

        return {
          id: item.id,
          changes: {
            link: cleanUrl,
            name: cleanName,
            diperbarui: today,
          },
        };
      });

      await batchUpdateItemsInFirestore(updates, userId);
      onNotify(`Berhasil memperbaiki ${updates.length} data yang memiliki link tersemat di nama!`, 'success');
      onClose();
    } catch (e) {
      console.error('Failed to fix existing items:', e);
      onNotify('Gagal memperbaiki data tautan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="extract-link-modal-card"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Ekstraktor Tautan Tertanam (Embedded Links)
              </h3>
              <p className="text-xs text-slate-300">
                Ubah link yang tertanam di dalam nama atau teks menjadi tautan URL aktif
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('newText')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'newText'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ekstrak dari Teks / Nama Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scanExisting')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'scanExisting'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              Perbaiki Data Database ({existingEmbeddedItems.length})
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'newText' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tempelkan Teks atau Nama Berisi Tautan
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Mendukung format Markdown <code>[Nama](https://...)</code>, tag HTML <code>&lt;a href="..."&gt;</code>, atau teks biasa bercampur URL.
                </p>
                <textarea
                  rows={5}
                  value={rawTextInput}
                  onChange={e => setRawTextInput(e.target.value)}
                  placeholder="Tempel teks di sini..."
                  className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Deteksi & Ekstrak Link Sekarang</span>
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {extractedList.length > 0 && `${extractedList.filter(i => i.status === 'valid').length} link terdeteksi`}
                </span>
              </div>

              {/* Extraction Preview Table */}
              {extractedList.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-3">
                  <div className="bg-slate-100/80 dark:bg-slate-800/80 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Hasil Pratinjau Ekstraksi
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {extractedList.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                            <span className="text-indigo-600 dark:text-indigo-400">Nama:</span>
                            <span>{item.extractedName || '(Tanpa Nama)'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 underline truncate">
                              {item.extractedUrl || '(Link tidak ditemukan)'}
                            </span>
                          </div>
                        </div>
                        {item.status === 'valid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex-shrink-0">
                            Gagal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl mb-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Pindai Otomatis Database
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                      Fitur ini memeriksa seluruh data di database yang kolom link-nya masih tertanam teks nama atau format Markdown/HTML, dan secara otomatis memisahkannya menjadi nama bersih dan URL yang dapat langsung diunduh.
                    </p>
                  </div>
                </div>
              </div>

              {existingEmbeddedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                  <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">Semua Link Sudah Bersih</p>
                  <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                    Tidak ditemukan link tertanam di dalam nama pada database saat ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ditemukan {existingEmbeddedItems.length} data dengan link tertanam:
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {existingEmbeddedItems.map(item => {
                      const extracted = extractLinkFromText(item.link);
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                        >
                          <div className="text-slate-500 dark:text-slate-400 line-through truncate text-[11px]">
                            Asli: {item.link}
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold mt-1 truncate">
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="truncate">URL: {extracted.url || item.link}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>

          {activeTab === 'newText' ? (
            <button
              type="button"
              onClick={handleImportExtracted}
              disabled={extractedList.filter(i => i.status === 'valid').length === 0 || isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan ke Database</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFixExistingItems}
              disabled={existingEmbeddedItems.length === 0 || isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Perbaiki Data Database</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
