import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FileText,
  Upload,
  Lock,
  Trash2,
  HardDrive,
  Plus,
  Edit3,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowUpRight,
  FolderPlus,
} from 'lucide-react';
import { StorageFolder, StorageSubfolder, StorageFile } from '../types';

interface FolderDetailModalProps {
  folder: StorageFolder | null;
  isOpen: boolean;
  onClose: () => void;
  onAddFile: (folderId: string, newFile: Omit<StorageFile, 'id'>) => void;
  onDeleteFile: (folderId: string, fileId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateFolder?: (folderId: string, updatedFields: Partial<StorageFolder>) => void;
  onOpenSubfolder: (subfolder: StorageSubfolder) => void;
  onAddSubfolder: (parentFolderId: string, newSubfolder: Omit<StorageSubfolder, 'id'>) => void;
  onUpdateSubfolder: (parentFolderId: string, subfolderId: string, updatedFields: Partial<StorageSubfolder>) => void;
  onDeleteSubfolder: (parentFolderId: string, subfolderId: string) => void;
}

export const FolderDetailModal: React.FC<FolderDetailModalProps> = ({
  folder,
  isOpen,
  onClose,
  onAddFile,
  onDeleteFile,
  onDeleteFolder,
  onUpdateFolder,
  onOpenSubfolder,
  onAddSubfolder,
  onUpdateSubfolder,
  onDeleteSubfolder,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('image');
  const [newFileSizeMB, setNewFileSizeMB] = useState('10.5');

  // New subfolder creation state
  const [isAddingSubfolder, setIsAddingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [newSubfolderDesc, setNewSubfolderDesc] = useState('');
  const [newSubfolderSampleUrl, setNewSubfolderSampleUrl] = useState('');

  // Inline edit folder states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSampleUrl, setEditSampleUrl] = useState('');
  const [editSampleHidden, setEditSampleHidden] = useState(false);

  useEffect(() => {
    if (folder) {
      setEditName(folder.name);
      setEditDesc(folder.description || '');
      setEditSampleUrl(folder.sampleImageUrl || '');
      setEditSampleHidden(folder.sampleImageHidden || false);
      setIsEditing(false);
      setIsAddingSubfolder(false);
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const sizeNum = parseFloat(newFileSizeMB) || 5;
    const bytes = Math.round(sizeNum * 1024 * 1024);

    onAddFile(folder.id, {
      name: newFileName.trim(),
      size: bytes,
      sizeFormatted: `${sizeNum.toFixed(1)} MB`,
      type: newFileType,
      updatedAt: new Date().toISOString().split('T')[0],
      downloadUrl: '#',
    });

    setNewFileName('');
    setIsUploading(false);
  };

  const handleCreateSubfolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubfolderName.trim()) return;

    onAddSubfolder(folder.id, {
      id: `sub-${Date.now()}`,
      name: newSubfolderName.trim(),
      description: newSubfolderDesc.trim(),
      filesCount: 0,
      sizeBytes: 0,
      sizeFormatted: '0 MB',
      sampleImageUrl: newSubfolderSampleUrl.trim(),
      sampleImageHidden: false,
      relativePath: `${folder.name}\\${newSubfolderName.trim()}`,
      hddId: folder.hddId,
      files: [],
    });

    setNewSubfolderName('');
    setNewSubfolderDesc('');
    setNewSubfolderSampleUrl('');
    setIsAddingSubfolder(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateFolder) return;
    onUpdateFolder(folder.id, {
      name: editName.trim() || folder.name,
      description: editDesc.trim(),
      sampleImageUrl: editSampleUrl.trim(),
      sampleImageHidden: editSampleHidden,
    });
    setIsEditing(false);
  };

  const handleSampleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditSampleUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getFileIcon = (type: string) => {
    return <FileText className="w-4 h-4 text-indigo-600" />;
  };

  const subfolders = folder.subfolders || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{folder.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>Dibuat oleh {folder.ownerName}</span>
                <span>•</span>
                <span>{folder.createdAt}</span>
                <span>•</span>
                <span className="font-semibold text-indigo-600">
                  {folder.usedStorageFormatted} / {folder.totalCapacityFormatted}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onUpdateFolder && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition cursor-pointer border border-indigo-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Folder Induk</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer border border-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Sample Image Preview Banner (if present and not hidden) */}
          {folder.sampleImageUrl && !folder.sampleImageHidden && !isEditing && (
            <div className="relative w-full h-40 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={folder.sampleImageUrl}
                alt={folder.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-indigo-400" />
                <span>Sampel Folder Induk</span>
              </div>
            </div>
          )}

          {/* Inline Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Detail Folder Induk</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Batal
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Folder Induk</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">Gambar Sampel Folder (URL atau File)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editSampleUrl}
                    onChange={e => setEditSampleUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                  <label className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shrink-0 transition">
                    📁 Pilih File
                    <input type="file" accept="image/*" onChange={handleSampleImageFile} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editSampleHidden}
                    onChange={e => setEditSampleHidden(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    {editSampleHidden ? <EyeOff className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                    Sembunyikan Gambar Sampel
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2">
              <p className="text-xs text-slate-600">{folder.description || 'Tidak ada deskripsi khusus.'}</p>
              {folder.path && (
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200/80 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{folder.path}</span>
                  {folder.hddName && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 whitespace-nowrap">
                      {folder.hddName}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subfolders List Section (Primary Hierarchy) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Daftar Subfolder ({subfolders.length})
                </h3>
                <p className="text-[11px] text-slate-500">Pilih subfolder untuk membuka galeri media atau mengunggah foto/video.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingSubfolder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow-xs"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Tambah Subfolder</span>
              </button>
            </div>

            {/* Create Subfolder Form */}
            {isAddingSubfolder && (
              <form onSubmit={handleCreateSubfolderSubmit} className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between font-bold text-xs text-indigo-950">
                  <span>Buat Subfolder Baru di "{folder.name}"</span>
                  <button type="button" onClick={() => setIsAddingSubfolder(false)} className="text-slate-400 hover:text-slate-600">Batal</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newSubfolderName}
                    onChange={e => setNewSubfolderName(e.target.value)}
                    placeholder="Nama Subfolder (misal: Akad, Resepsi)"
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                  <input
                    type="text"
                    value={newSubfolderSampleUrl}
                    onChange={e => setNewSubfolderSampleUrl(e.target.value)}
                    placeholder="URL Sampel Foto (opsional)"
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setIsAddingSubfolder(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl">Batal</button>
                  <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs">Simpan Subfolder</button>
                </div>
              </form>
            )}

            {subfolders.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada subfolder.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Klik 'Tambah Subfolder' untuk mulai mengorganisasi foto dan video.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subfolders.map(sub => {
                  const sfFilesCount = sub.files?.length || sub.filesCount || 0;
                  const sfSize = sub.sizeFormatted || '0 MB';
                  return (
                    <div
                      key={sub.id || sub.name}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                    >
                      {sub.sampleImageUrl && !sub.sampleImageHidden && (
                        <div className="relative w-full h-28 bg-slate-900 rounded-xl overflow-hidden mb-3">
                          <img src={sub.sampleImageUrl} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                            <span className="text-[9px] font-bold text-white bg-black/70 px-2 py-0.5 rounded">🖼️ Sampel</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Folder className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">{sub.name}</h4>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {sfFilesCount} files • {sfSize}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenSubfolder(sub)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <span>Buka Media</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus subfolder "${sub.name}" beserta seluruh isinya?`)) {
                              onDeleteSubfolder(folder.id, sub.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Subfolder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onDeleteFolder ? (
            <button
              type="button"
              onClick={() => onDeleteFolder(folder.id)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Folder Induk Ini</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
