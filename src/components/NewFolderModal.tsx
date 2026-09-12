import React, { useState } from 'react';
import { X, FolderPlus, Palette, Tag, User, HardDrive } from 'lucide-react';
import { StorageFolder } from '../types';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (newFolder: Omit<StorageFolder, 'id'>) => void;
  defaultOwnerName?: string;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  defaultOwnerName = 'Saya',
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacityGB, setCapacityGB] = useState('2');
  const [themeColor, setThemeColor] = useState<StorageFolder['themeColor']>('blue');
  const [ownerName, setOwnerName] = useState(defaultOwnerName);
  const [tagsInput, setTagsInput] = useState('DOCX, PDF, XLSX');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const capNum = parseFloat(capacityGB) || 2;
    const capacityBytes = capNum * 1024 * 1024 * 1024;
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onCreateFolder({
      name: name.trim(),
      description: description.trim(),
      themeColor,
      usedStorageFormatted: '0 MB',
      totalCapacityFormatted: `${capNum}GB`,
      usedBytes: 0,
      capacityBytes,
      filesCount: 0,
      foldersCount: 0,
      sharedCount: 1,
      tags: tags.length > 0 ? tags : ['General'],
      ownerName: ownerName.trim() || defaultOwnerName || 'Saya',
      createdAt: 'Baru saja',
      files: [],
    });

    setName('');
    setDescription('');
    onClose();
  };

  const colors: { label: string; value: StorageFolder['themeColor']; bg: string }[] = [
    { label: 'Blue', value: 'blue', bg: 'bg-blue-500' },
    { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-500' },
    { label: 'Amber', value: 'amber', bg: 'bg-amber-500' },
    { label: 'Purple', value: 'purple', bg: 'bg-purple-500' },
    { label: 'Rose', value: 'rose', bg: 'bg-rose-500' },
    { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Buat Folder Baru</h2>
              <p className="text-xs text-slate-500">Tambah direktori penyimpanan cloud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer border border-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Folder <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="contoh: Legal & Compliance 2025"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="contoh: Berkas perjanjian kerja sama dan audit"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kapasitas Kuota (GB)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={capacityGB}
                onChange={e => setCapacityGB(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pemilik (Owner)
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="Admin User"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tags / Jenis File (pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="PDF, DOCX, XLSX"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          {/* Color theme selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Warna Tema Folder
            </label>
            <div className="flex items-center gap-2">
              {colors.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setThemeColor(c.value)}
                  className={`w-7 h-7 rounded-xl ${c.bg} transition-all ${
                    themeColor === c.value
                      ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
            >
              Buat Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
