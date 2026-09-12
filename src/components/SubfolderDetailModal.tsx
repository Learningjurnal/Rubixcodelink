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
  Video,
  File,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { StorageFolder, StorageSubfolder, StorageFile, HardDriveProfile } from '../types';

interface SubfolderDetailModalProps {
  subfolder: StorageSubfolder | null;
  parentFolder: StorageFolder | null;
  isOpen: boolean;
  onClose: () => void;
  onBackToFolder: () => void;
  onAddFile: (parentFolderId: string, subfolderId: string, newFile: Omit<StorageFile, 'id'>) => void;
  onDeleteFile: (parentFolderId: string, subfolderId: string, fileId: string) => void;
  onUpdateSubfolder: (parentFolderId: string, subfolderId: string, updatedFields: Partial<StorageSubfolder>) => void;
  onDeleteSubfolder: (parentFolderId: string, subfolderId: string) => void;
  hardDrives?: HardDriveProfile[];
}

export const SubfolderDetailModal: React.FC<SubfolderDetailModalProps> = ({
  subfolder,
  parentFolder,
  isOpen,
  onClose,
  onBackToFolder,
  onAddFile,
  onDeleteFile,
  onUpdateSubfolder,
  onDeleteSubfolder,
  hardDrives = [],
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('image');
  const [newFileSizeMB, setNewFileSizeMB] = useState('8.4');

  // Inline edit subfolder
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSampleUrl, setEditSampleUrl] = useState('');
  const [editSampleHidden, setEditSampleHidden] = useState(false);
  const [editHddId, setEditHddId] = useState('');

  // Selected file preview modal
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  useEffect(() => {
    if (subfolder) {
      setEditName(subfolder.name);
      setEditDesc(subfolder.description || '');
      setEditSampleUrl(subfolder.sampleImageUrl || '');
      setEditSampleHidden(subfolder.sampleImageHidden || false);
      setEditHddId(subfolder.hddId || parentFolder?.hddId || 'hdd-1');
      setIsEditing(false);
    }
  }, [subfolder, parentFolder]);

  if (!isOpen || !subfolder || !subfolder.id || !parentFolder) return null;
  const subfolderId = subfolder.id;

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const sizeNum = parseFloat(newFileSizeMB) || 5;
    const bytes = Math.round(sizeNum * 1024 * 1024);

    onAddFile(parentFolder.id, subfolderId, {
      name: newFileName.trim(),
      size: bytes,
      sizeFormatted: `${sizeNum >= 1024 ? (sizeNum / 1024).toFixed(2) + ' GB' : sizeNum.toFixed(1) + ' MB'}`,
      type: newFileType,
      updatedAt: new Date().toISOString().split('T')[0],
      downloadUrl: '#',
    });

    setNewFileName('');
    setIsUploading(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedHdd = hardDrives.find(h => h.id === editHddId);
    onUpdateSubfolder(parentFolder.id, subfolderId, {
      name: editName.trim() || subfolder.name,
      description: editDesc.trim(),
      sampleImageUrl: editSampleUrl.trim(),
      sampleImageHidden: editSampleHidden,
      hddId: editHddId,
      relativePath: `${parentFolder.name}\\${editName.trim() || subfolder.name}`,
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
    if (type === 'video' || type === 'mp4' || type === 'mov') {
      return <Video className="w-4 h-4 text-purple-600" />;
    }
    if (type === 'image' || type === 'jpg' || type === 'png') {
      return <ImageIcon className="w-4 h-4 text-emerald-600" />;
    }
    return <FileText className="w-4 h-4 text-indigo-600" />;
  };

  const filesList = subfolder.files || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToFolder}
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Kembali ke Folder Induk"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{parentFolder.name}</span>
                <span>/</span>
                <span className="text-indigo-600 font-bold">{subfolder.name}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                <span>Subfolder: {subfolder.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {filesList.length} files • {subfolder.sizeFormatted || '0 MB'}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition cursor-pointer border border-indigo-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Subfolder</span>
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
          {subfolder.sampleImageUrl && !subfolder.sampleImageHidden && !isEditing && (
            <div className="relative w-full h-44 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={subfolder.sampleImageUrl}
                alt={subfolder.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>Sampel Media Subfolder</span>
              </div>
            </div>
          )}

          {/* Inline Edit Subfolder Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Subfolder & Gambar Sampel</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Subfolder</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Lokasi HDD Eksternal</label>
                  <select
                    value={editHddId}
                    onChange={e => setEditHddId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    {hardDrives.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.driveLetterOrMount})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Deskripsi / Keterangan</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Keterangan subfolder..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">Gambar Sampel Subfolder (URL atau File)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editSampleUrl}
                    onChange={e => setEditSampleUrl(e.target.value)}
                    placeholder="https://example.com/sample.jpg"
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
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">{subfolder.description || 'Subfolder penyimpanan media foto dan video.'}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Path: {subfolder.relativePath || `${parentFolder.name}\\${subfolder.name}`}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploading(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Media ke Subfolder Ini</span>
              </button>
            </div>
          )}

          {/* Upload Form Accordion */}
          {isUploading && (
            <form
              onSubmit={handleUploadSubmit}
              className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Upload Foto / Video ke Subfolder "{subfolder.name}"
                </span>
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Batal
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama File Media</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="contoh: IMG_20260912_001.jpg atau Video_Akad.mp4"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tipe Media</label>
                  <select
                    value={newFileType}
                    onChange={e => setNewFileType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="image">Foto (.jpg, .png, .webp)</option>
                    <option value="video">Video (.mp4, .mkv, .mov)</option>
                    <option value="pdf">Dokumen PDF (.pdf)</option>
                    <option value="archive">Arsip (.zip, .rar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ukuran (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newFileSizeMB}
                    onChange={e => setNewFileSizeMB(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
                >
                  Mulai Upload
                </button>
              </div>
            </form>
          )}

          {/* Media Grid Preview & Files List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                Daftar Media / Berkas ({filesList.length})
              </h3>
              <span className="text-[11px] text-slate-500">🔒 Terproteksi No-Download</span>
            </div>

            {filesList.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Subfolder ini belum memiliki media.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol 'Upload Media' di atas untuk menambahkan foto atau video.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filesList.map(file => (
                  <div
                    key={file.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span>{file.sizeFormatted}</span>
                            <span>•</span>
                            <span>{file.updatedAt}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>Dilindungi</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onDeleteFile(parentFolder.id, subfolderId, file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Media"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Apakah Anda yakin ingin menghapus subfolder "${subfolder.name}" beserta seluruh isinya?`)) {
                onDeleteSubfolder(parentFolder.id, subfolderId);
                onBackToFolder();
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Hapus Subfolder Ini</span>
          </button>

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
