import React, { useState } from 'react';
import {
  X,
  Settings,
  HardDrive,
  Plus,
  Trash2,
  Check,
  Save,
  RotateCcw,
  ShieldCheck,
  FolderPlus,
  Info,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import { HardDriveProfile, StorageFolder, StorageSubfolder } from '../types';
import { DEFAULT_HARD_DRIVES, formatBytes } from '../utils/storageExcelHelper';

interface HddSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  drives: HardDriveProfile[];
  onSaveDrives: (newDrives: HardDriveProfile[]) => void;
  onAddCustomFolder: (newFolder: StorageFolder) => void;
}

export const HddSettingsModal: React.FC<HddSettingsModalProps> = ({
  isOpen,
  onClose,
  drives,
  onSaveDrives,
  onAddCustomFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'drives' | 'custom_form'>('drives');
  const [editableDrives, setEditableDrives] = useState<HardDriveProfile[]>(drives);

  // Form states for manual custom folder
  const [customHddId, setCustomHddId] = useState<string>(drives[0]?.id || 'hdd-1');
  const [customFolderName, setCustomFolderName] = useState('');
  const [customSubfolderName, setCustomSubfolderName] = useState('');
  const [customSizeValue, setCustomSizeValue] = useState('15');
  const [customSizeUnit, setCustomSizeUnit] = useState<'MB' | 'GB'>('GB');
  const [customCategory, setCustomCategory] = useState('video');
  const [customTags, setCustomTags] = useState('Koleksi, Media');
  const [customDescription, setCustomDescription] = useState('');

  if (!isOpen) return null;

  const handleDriveChange = (id: string, field: keyof HardDriveProfile, value: any) => {
    setEditableDrives(prev =>
      prev.map(d => {
        if (d.id === id) {
          const updated = { ...d, [field]: value };
          // Re-evaluate health status
          const capacityBytes = (updated.totalCapacityGB || 1) * 1024 * 1024 * 1024;
          const usagePercent = (updated.usedBytes / capacityBytes) * 100;
          if (usagePercent >= 85) {
            updated.healthStatus = 'critical';
          } else if (usagePercent >= (updated.warningThresholdPercent || 80)) {
            updated.healthStatus = 'warning';
          } else {
            updated.healthStatus = 'good';
          }
          return updated;
        }
        return d;
      })
    );
  };

  const handleAddNewDrive = () => {
    const newId = `hdd-${editableDrives.length + 1}`;
    const newDrive: HardDriveProfile = {
      id: newId,
      name: `HDD ${editableDrives.length + 1} - External Drive (${editableDrives.length + 1})`,
      driveLetterOrMount: `${String.fromCharCode(68 + editableDrives.length)}:\\`,
      totalCapacityGB: 2000,
      usedBytes: 0,
      brand: 'External USB 3.0',
      warningThresholdPercent: 80,
      healthStatus: 'good',
      color: 'indigo',
      notes: 'Drive tambahan',
      foldersCount: 0,
      filesCount: 0,
    };
    setEditableDrives(prev => [...prev, newDrive]);
  };

  const handleDeleteDrive = (id: string) => {
    if (editableDrives.length <= 1) return;
    setEditableDrives(prev => prev.filter(d => d.id !== id));
  };

  const handleResetDefaults = () => {
    setEditableDrives(DEFAULT_HARD_DRIVES);
  };

  const handleSaveAllDrives = () => {
    onSaveDrives(editableDrives);
    onClose();
  };

  const handleSubmitCustomFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFolderName.trim()) return;

    const targetDrive = editableDrives.find(d => d.id === customHddId) || editableDrives[0];
    const sizeMultiplier = customSizeUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
    const numSize = parseFloat(customSizeValue) || 1;
    const bytes = Math.round(numSize * sizeMultiplier);

    const subfolders: StorageSubfolder[] = customSubfolderName.trim()
      ? [
          {
            id: `sub-${Date.now()}`,
            name: customSubfolderName.trim(),
            path: `${customFolderName.trim()}\\${customSubfolderName.trim()}`,
            sizeBytes: bytes,
            sizeFormatted: `${numSize} ${customSizeUnit}`,
            filesCount: 1,
            subfoldersCount: 0,
            hddId: targetDrive.id,
            files: [
              {
                id: `file-custom-${Date.now()}`,
                name: `${customSubfolderName.trim()}_sample.dat`,
                size: bytes,
                sizeFormatted: `${numSize} ${customSizeUnit}`,
                type: customCategory,
                updatedAt: new Date().toISOString().split('T')[0],
                path: `${targetDrive.driveLetterOrMount}${customFolderName.trim()}\\${customSubfolderName.trim()}\\sample.dat`,
                subfolder: customSubfolderName.trim(),
                hddId: targetDrive.id,
              },
            ],
          },
        ]
      : [];

    const newFolder: StorageFolder = {
      id: `folder-custom-${Date.now()}`,
      name: customFolderName.trim(),
      hddId: targetDrive.id,
      hddName: targetDrive.name,
      path: `${targetDrive.driveLetterOrMount}${customFolderName.trim()}`,
      description: customDescription || `Folder kustom pada ${targetDrive.name}`,
      themeColor:
        targetDrive.color === 'rose'
          ? 'rose'
          : targetDrive.color === 'amber'
          ? 'amber'
          : targetDrive.color === 'emerald'
          ? 'emerald'
          : targetDrive.color === 'purple'
          ? 'purple'
          : targetDrive.color === 'cyan'
          ? 'cyan'
          : 'blue',
      usedBytes: bytes,
      capacityBytes: targetDrive.totalCapacityGB * 1024 * 1024 * 1024,
      usedStorageFormatted: `${numSize} ${customSizeUnit}`,
      totalCapacityFormatted: `${targetDrive.totalCapacityGB} GB`,
      filesCount: 1,
      foldersCount: subfolders.length,
      sharedCount: 0,
      tags: customTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      ownerName: 'Admin',
      createdAt: new Date().toISOString().split('T')[0],
      subfolders,
      files: [
        {
          id: `file-root-${Date.now()}`,
          name: `${customFolderName.trim()}_readme.txt`,
          size: 1024 * 50,
          sizeFormatted: '50 KB',
          type: 'docx',
          updatedAt: new Date().toISOString().split('T')[0],
          path: `${targetDrive.driveLetterOrMount}${customFolderName.trim()}\\readme.txt`,
          hddId: targetDrive.id,
        },
      ],
    };

    onAddCustomFolder(newFolder);
    setCustomFolderName('');
    setCustomSubfolderName('');
    setCustomDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Setting Storage Management & Form Kustom
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Konfigurasi 4 Hardisk Eksternal, batas kapasitas, & form pengisian folder kustom
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={() => setActiveTab('drives')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'drives'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Pengaturan 4 Hardisk Eksternal ({editableDrives.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_form')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'custom_form'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Form Pengisian Folder & Subfolder Kustom</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'drives' ? (
            <div className="space-y-4">
              {/* Alert Tips */}
              <div className="flex items-start gap-2.5 p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <div>
                  <p className="font-bold">Manajemen Kesehatan 4 Hardisk:</p>
                  <p className="mt-0.5 text-[11px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
                    Setiap hardisk memiliki batas peringatan kapasitas (default 80%). Jika kapasitas melewati batas ini, sistem akan memberikan rekomendasi relokasi file ke HDD yang lebih luang untuk mencegah fragmentasi, overheating, dan menjaga kesehatan motor spindle/NAND.
                  </p>
                </div>
              </div>

              {/* Drives List */}
              <div className="space-y-3">
                {editableDrives.map((drive, idx) => {
                  const usagePercent = Math.round(
                    (drive.usedBytes / ((drive.totalCapacityGB || 1) * 1024 * 1024 * 1024)) * 100
                  );
                  return (
                    <div
                      key={drive.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {drive.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              usagePercent >= 85
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : usagePercent >= (drive.warningThresholdPercent || 80)
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            Terpakai: {formatBytes(drive.usedBytes)} ({usagePercent}%)
                          </span>

                          {editableDrives.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDrive(drive.id)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center transition cursor-pointer"
                              title="Hapus hardisk ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Nama Label HDD:
                          </label>
                          <input
                            type="text"
                            value={drive.name}
                            onChange={e => handleDriveChange(drive.id, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Drive Letter / Mount:
                          </label>
                          <input
                            type="text"
                            value={drive.driveLetterOrMount}
                            onChange={e =>
                              handleDriveChange(drive.id, 'driveLetterOrMount', e.target.value)
                            }
                            placeholder="D:\"
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Total Kapasitas (GB):
                          </label>
                          <input
                            type="number"
                            min="100"
                            step="100"
                            value={drive.totalCapacityGB}
                            onChange={e =>
                              handleDriveChange(
                                drive.id,
                                'totalCapacityGB',
                                parseFloat(e.target.value) || 1000
                              )
                            }
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Batas Waspada (%):
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="95"
                            value={drive.warningThresholdPercent}
                            onChange={e =>
                              handleDriveChange(
                                drive.id,
                                'warningThresholdPercent',
                                parseInt(e.target.value) || 80
                              )
                            }
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Merk & Model Hardware:
                          </label>
                          <input
                            type="text"
                            value={drive.brand || ''}
                            onChange={e => handleDriveChange(drive.id, 'brand', e.target.value)}
                            placeholder="e.g. Toshiba Canvio Advance / WD My Passport"
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Catatan / Fungsi Drive:
                          </label>
                          <input
                            type="text"
                            value={drive.notes || ''}
                            onChange={e => handleDriveChange(drive.id, 'notes', e.target.value)}
                            placeholder="e.g. Arsip media video, rendering, dan backup"
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons inside tab */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddNewDrive}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Hardisk (HDD Ke-{editableDrives.length + 1})</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Standar 4 HDD</span>
                </button>
              </div>
            </div>
          ) : (
            /* Custom Folder & Subfolder Creation Form */
            <form onSubmit={handleSubmitCustomFolder} className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Entri Manual Folder & Subfolder</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan form ini jika Anda ingin mendata folder tertentu secara langsung tanpa perlu menjalankan script Python terlebih dahulu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target HDD */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pilih Hardisk Tujuan *
                  </label>
                  <select
                    value={customHddId}
                    onChange={e => setCustomHddId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none text-slate-800 dark:text-slate-200"
                  >
                    {editableDrives.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driveLetterOrMount}) - {d.totalCapacityGB} GB
                      </option>
                    ))}
                  </select>
                </div>

                {/* Folder Name */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Folder Utama *
                  </label>
                  <input
                    type="text"
                    required
                    value={customFolderName}
                    onChange={e => setCustomFolderName(e.target.value)}
                    placeholder="e.g. Master Video Library, Foto Event 2026"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Subfolder Name */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Subfolder (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customSubfolderName}
                    onChange={e => setCustomSubfolderName(e.target.value)}
                    placeholder="e.g. Episode 01-10, RAW Camera"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Size & Unit */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Estimasi Ukuran Data *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={customSizeValue}
                      onChange={e => setCustomSizeValue(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
                    <select
                      value={customSizeUnit}
                      onChange={e => setCustomSizeUnit(e.target.value as 'MB' | 'GB')}
                      className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none text-slate-800 dark:text-slate-200"
                    >
                      <option value="GB">GB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>

                {/* File Category */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Kategori Berkas
                  </label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="video">Video / Film / Render (.mp4, .mkv)</option>
                    <option value="image">Foto / RAW / Desain (.jpg, .cr2, .psd)</option>
                    <option value="docx">Dokumen / Spreadsheet (.pdf, .docx, .xlsx)</option>
                    <option value="archive">Arsip Kompresi (.zip, .rar, .iso)</option>
                    <option value="audio">Audio / Musik (.flac, .mp3, .wav)</option>
                    <option value="code">Source Code / Database (.sql, .zip)</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                {/* Custom Tags */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Label / Tags (Pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={customTags}
                    onChange={e => setCustomTags(e.target.value)}
                    placeholder="Arsip, Penting, Backup"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  placeholder="e.g. Master backup hasil transfer kamera Sony A7IV"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Folder ke Storage</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            Tutup
          </button>

          {activeTab === 'drives' && (
            <button
              type="button"
              onClick={handleSaveAllDrives}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Hardisk</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
