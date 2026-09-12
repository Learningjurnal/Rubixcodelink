import React, { useState, useMemo } from 'react';
import { Plus, X, AlertTriangle, Sparkles } from 'lucide-react';
import { LinkItem, AppSettings } from '../types';
import { normalizeUrl, formatDateNow } from '../utils/excelHelper';
import { extractLinkFromText } from '../utils/linkExtractor';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLinks: LinkItem[];
  settings: AppSettings;
  onAddLinks: (newLinks: Omit<LinkItem, 'id'>[], skippedCount: number) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  onClose,
  existingLinks,
  settings,
  onAddLinks,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [status, setStatus] = useState<string>(settings.statusOptions[0] || 'Blank');
  const [output, setOutput] = useState(settings.outputOptions[0] || 'Single');
  const [region, setRegion] = useState(settings.regionOptions[0] || 'LIVE');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);

  const existingMap = useMemo(() => {
    const map = new Set<string>();
    existingLinks.forEach(i => map.add(normalizeUrl(i.link)));
    return map;
  }, [existingLinks]);

  if (!isOpen) return null;

  // Split input into lines
  const rawLines = urlInput
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Process lines (auto extracting names if embedded)
  const processedItems = rawLines.map(line => {
    if (autoExtractEnabled) {
      const extracted = extractLinkFromText(line);
      return {
        name: extracted.name || nameInput.trim() || '',
        link: extracted.url || line,
      };
    }
    return {
      name: nameInput.trim() || '',
      link: line,
    };
  });

  const duplicateLinks = processedItems.filter(item => existingMap.has(normalizeUrl(item.link)));
  const newLinks = processedItems.filter(item => !existingMap.has(normalizeUrl(item.link)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (processedItems.length === 0) return;

    const now = Date.now();
    const dateStr = formatDateNow();

    const itemsToInsert = skipDuplicates ? newLinks : processedItems;
    const skipped = processedItems.length - itemsToInsert.length;

    const createdItems: Omit<LinkItem, 'id'>[] = itemsToInsert.map(item => ({
      name: item.name,
      link: item.link,
      status,
      output: output || 'Single',
      region: region || 'LIVE',
      note,
      tag: tag.trim(),
      diperbarui: dateStr,
      createdAt: now,
    }));

    onAddLinks(createdItems, skipped);
    setUrlInput('');
    setNameInput('');
    setNote('');
    setTag('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="add-link-modal-content"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-slate-900 dark:text-white">Tambah Tautan Baru</h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">Input link satu per satu atau multi-baris sekaligus</p>
            </div>
          </div>
          <button
            id="btn-close-add-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Optional Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama / Judul File (Opsional)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Contoh: Video Dokumenter Episode 1"
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                URL / Link Unduhan (Bisa Multi-Baris)
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={autoExtractEnabled}
                  onChange={e => setAutoExtractEnabled(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <Sparkles className="w-3 h-3" />
                <span>Ekstrak link jika tertanam di nama</span>
              </label>
            </div>
            <textarea
              id="input-urls-textarea"
              rows={4}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Contoh:&#10;https://listeamed.net/e/example1&#10;[Video 2](https://firestream.to/v/example2)&#10;Episode 3 - https://example.com/file3"
              className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-mono bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 transition"
              required
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Terdeteksi: {processedItems.length} tautan input
            </p>
          </div>

          {/* Real-time duplicate warning */}
          {duplicateLinks.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">
                  Peringatan Duplikasi: {duplicateLinks.length} link sudah ada di database!
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  {skipDuplicates
                    ? 'Sistem otomatis mengabaikan tautan duplikat untuk menjaga integritas data.'
                    : 'Link duplikat akan tetap dimasukkan.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Awal</label>
              <select
                id="select-initial-status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              >
                {settings.statusOptions.map((st, idx) => (
                  <option key={idx} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipe Output</label>
              <select
                id="select-initial-output"
                value={output}
                onChange={e => setOutput(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              >
                {settings.outputOptions.map((out, idx) => (
                  <option key={idx} value={out}>
                    {out}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Wilayah (Region)</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              >
                {settings.regionOptions.map((reg, idx) => (
                  <option key={idx} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan (Note)</label>
              <input
                type="text"
                placeholder="Contoh: Web Inactive"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tag / Kategori (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Penting, Video, Prioritas"
                value={tag}
                onChange={e => setTag(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              />
            </div>
          </div>

          {/* Quick note presets */}
          {settings.notePresets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Pilihan Cepat Note:</span>
              {settings.notePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote(preset)}
                  className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                id="check-skip-dup-manual"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Cegah Duplikasi: Hanya simpan link baru yang belum pernah ada</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              id="btn-cancel-add"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-add-link"
              disabled={processedItems.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none rounded-xl transition disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan ke Database</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
