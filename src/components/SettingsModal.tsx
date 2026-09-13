import React, { useState, useRef } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Tag,
  Download,
  Upload,
  FileJson,
  Loader2,
} from 'lucide-react';
import { AppSettings, LinkItem } from '../types';
import { DEFAULT_SETTINGS } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData?: () => void;
  totalLinksCount?: number;
  onExportJSON?: () => void;
  onImportJSON?: (items: LinkItem[]) => Promise<void> | void;
  onNotify?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

type ActiveTab = 'status' | 'output' | 'region' | 'note';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
  totalLinksCount = 0,
  onExportJSON,
  onImportJSON,
  onNotify,
}) => {
  // Falls back to a plain alert() only if the caller didn't wire up
  // onNotify — every real usage in this app does, so this keeps the
  // component safely standalone without silently swallowing the message.
  const notify = (type: 'success' | 'warning' | 'info' | 'error', message: string) => {
    if (onNotify) onNotify(type, message);
    else alert(message);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [statusList, setStatusList] = useState<string[]>(settings.statusOptions);
  const [outputList, setOutputList] = useState<string[]>(settings.outputOptions);
  const [regionList, setRegionList] = useState<string[]>(settings.regionOptions);
  const [noteList, setNoteList] = useState<string[]>(settings.notePresets);

  const [newStatus, setNewStatus] = useState('');
  const [newOutput, setNewOutput] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isImportingJSON, setIsImportingJSON] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if settings prop changes
  React.useEffect(() => {
    setStatusList(settings.statusOptions);
    setOutputList(settings.outputOptions);
    setRegionList(settings.regionOptions);
    setNoteList(settings.notePresets);
  }, [settings]);

  if (!isOpen) return null;

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.trim() || statusList.includes(newStatus.trim())) return;
    setStatusList([...statusList, newStatus.trim()]);
    setNewStatus('');
  };

  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutput.trim() || outputList.includes(newOutput.trim())) return;
    setOutputList([...outputList, newOutput.trim()]);
    setNewOutput('');
  };

  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegion.trim() || regionList.includes(newRegion.trim())) return;
    setRegionList([...regionList, newRegion.trim().toUpperCase()]);
    setNewRegion('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || noteList.includes(newNote.trim())) return;
    setNoteList([...noteList, newNote.trim()]);
    setNewNote('');
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua pilihan opsi ke pengaturan standar bawaan?')) {
      setStatusList(DEFAULT_SETTINGS.statusOptions);
      setOutputList(DEFAULT_SETTINGS.outputOptions);
      setRegionList(DEFAULT_SETTINGS.regionOptions);
      setNoteList(DEFAULT_SETTINGS.notePresets);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const newConfig: AppSettings = {
      statusOptions: statusList.length > 0 ? statusList : DEFAULT_SETTINGS.statusOptions,
      outputOptions: outputList.length > 0 ? outputList : DEFAULT_SETTINGS.outputOptions,
      regionOptions: regionList.length > 0 ? regionList : DEFAULT_SETTINGS.regionOptions,
      notePresets: noteList.length > 0 ? noteList : DEFAULT_SETTINGS.notePresets,
    };

    try {
      await onSaveSettings(newConfig);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save settings:', err);
      notify('error', 'Gagal menyimpan pengaturan ke database.');
    } finally {
      setSaving(false);
    }
  };

  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingJSON(true);
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let linksArray: any[] = [];
        if (Array.isArray(parsed)) {
          linksArray = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.links)) {
          linksArray = parsed.links;
        } else {
          notify('error', 'Format JSON tidak valid. File harus berupa array tautan atau objek dengan properti "links".');
          setIsImportingJSON(false);
          return;
        }

        const validLinks: LinkItem[] = linksArray
          .filter(
            item =>
              item &&
              typeof item === 'object' &&
              typeof item.link === 'string' &&
              item.link.trim().length > 0
          )
          .map((item, idx) => ({
            id: item.id || `imported-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            name: item.name || '',
            link: item.link.trim(),
            status: item.status || 'Blank',
            output: item.output || 'Single',
            region: item.region || 'LIVE',
            counta: typeof item.counta === 'number' ? item.counta : 1,
            note: item.note || '',
            tag: item.tag || '',
            diperbarui: item.diperbarui || new Date().toISOString().slice(0, 10),
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          }));

        if (validLinks.length === 0) {
          notify('error', 'Tidak ditemukan tautan yang valid di dalam file JSON tersebut.');
          setIsImportingJSON(false);
          return;
        }

        if (onImportJSON) {
          await onImportJSON(validLinks);
        }
      } catch (err) {
        console.error('Error parsing JSON backup file:', err);
        notify('error', 'Gagal membaca file JSON. Pastikan format file valid.');
      } finally {
        setIsImportingJSON(false);
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="settings-modal-card"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Pengaturan Pilihan Dropdown & Opsi
              </h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Atur pilihan Status, Output, Region, Note, serta Cadangan JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Status ({statusList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'output'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Output ({outputList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('region')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'region'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Region ({regionList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'note'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pilihan Note ({noteList.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan Status
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Status ini akan tampil di menu dropdown pada setiap baris tabel link dan modal tambah link.
                </p>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddStatus} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah status baru (contoh: Menunggu Antrean)..."
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newStatus.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Item List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {statusList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusList(statusList.filter((_, i) => i !== idx))}
                      title="Hapus opsi status ini"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output Tab */}
          {activeTab === 'output' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan Output
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tipe output pengunduhan (Single, Batch, Folder, Mirror, dll.)
                </p>
              </div>

              <form onSubmit={handleAddOutput} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah output baru (contoh: Multi-Part)..."
                  value={newOutput}
                  onChange={e => setNewOutput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newOutput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {outputList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item}</span>
                    <button
                      type="button"
                      onClick={() => setOutputList(outputList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Region Tab */}
          {activeTab === 'region' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan Region
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Label wilayah server (LIVE, ASIA, US, EU, ID, GLOBAL, dll.)
                </p>
              </div>

              <form onSubmit={handleAddRegion} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah kode region (contoh: SG, JPN, LIVE)..."
                  value={newRegion}
                  onChange={e => setNewRegion(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition uppercase"
                />
                <button
                  type="submit"
                  disabled={!newRegion.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {regionList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item}</span>
                    <button
                      type="button"
                      onClick={() => setRegionList(regionList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Tab */}
          {activeTab === 'note' && (
            <div>
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Kustomisasi Pilihan Note (Preset Catatan Cepat)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preset catatan cepat yang dapat dipilih pengguna saat mengisi kolom Note.
                </p>
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Tambah preset catatan (contoh: Link Kadaluarsa)..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {noteList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                    <button
                      type="button"
                      onClick={() => setNoteList(noteList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backup & Restore Data (JSON) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Cadangan & Pemulihan Koleksi (JSON)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cadangkan seluruh koleksi tautan ke file JSON lokal atau pulihkan dari cadangan sebelumnya.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full shrink-0">
                  {totalLinksCount} item
                </span>
              </div>

              {/* Hidden file input for JSON import */}
              <input
                type="file"
                ref={jsonFileInputRef}
                onChange={handleJSONFileChange}
                accept=".json,application/json"
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Export All Data to JSON */}
                <button
                  type="button"
                  id="btn-export-json"
                  onClick={onExportJSON}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                  title="Download seluruh data tautan dalam format file JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export All Data to JSON</span>
                </button>

                {/* Import from JSON */}
                <button
                  type="button"
                  id="btn-import-json"
                  disabled={isImportingJSON}
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Pulihkan atau tambahkan tautan dari file JSON cadangan"
                >
                  {isImportingJSON ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{isImportingJSON ? 'Mengimpor JSON...' : 'Import from JSON'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Clear all database records */}
          {onClearAllData && (
            <div className="pt-2">
              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Kosongkan Semua Data Link</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Menghapus seluruh tautan yang tersimpan di Supabase ({totalLinksCount} data aktif).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearAllData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Tersimpan di Cloud</span>
                </>
              ) : saving ? (
                <span>Menyimpan...</span>
              ) : (
                <span>Simpan Pengaturan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
