import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Folder,
  HardDrive,
  ArrowUpRight,
  LayoutGrid,
  Table as TableIcon,
  Image as ImageIcon,
  Tag,
  Layers,
  FileText,
} from 'lucide-react';
import { StorageFolder, HardDriveProfile } from '../types';
import { formatBytes } from '../utils/storageExcelHelper';

interface StorageCatalogViewProps {
  folders: StorageFolder[];
  drives: HardDriveProfile[];
  onOpenFolder: (folder: StorageFolder) => void;
}

export const StorageCatalogView: React.FC<StorageCatalogViewProps> = ({
  folders,
  drives,
  onOpenFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('name-asc');
  const [viewMode, setViewMode] = useState<'table' | 'catalog'>('table');

  // Filter and sort folders
  const processedFolders = useMemo(() => {
    let result = [...folders];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.path && f.path.toLowerCase().includes(q)) ||
          (f.hddName && f.hddName.toLowerCase().includes(q)) ||
          f.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'size-desc') {
        return (b.usedBytes || 0) - (a.usedBytes || 0);
      }
      if (sortBy === 'size-asc') {
        return (a.usedBytes || 0) - (b.usedBytes || 0);
      }
      return 0;
    });

    return result;
  }, [folders, searchQuery, sortBy]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Toolbar: Search, Sorting, and View Mode Toggle */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari folder, tag, atau lokasi..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none shadow-2xs"
          />
        </div>

        {/* Sort & View Mode */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Urutkan:</span>
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none shadow-2xs"
            >
              <option value="name-asc">Nama Folder (A - Z)</option>
              <option value="name-desc">Nama Folder (Z - A)</option>
              <option value="size-desc">Ukuran Terbesar (Max → Min)</option>
              <option value="size-asc">Ukuran Terkecil (Min → Max)</option>
            </select>
          </div>

          {/* Toggle Table vs Catalog Card grid */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Katalog"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Tampilan Grid Katalog Produk Jualan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Katalog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Menampilkan <strong className="text-slate-900 dark:text-slate-100">{processedFolders.length}</strong> folder rekap</span>
        <span>Format Katalog [Foto] - [Nama Folder] - [Ukuran] - [Lokasi Penyimpanan]</span>
      </div>

      {/* Empty State */}
      {processedFolders.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
          <Folder className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada folder yang cocok</h3>
          <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau reset filter.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">[Foto]</th>
                  <th className="py-3.5 px-4">[Nama Folder & Deskripsi]</th>
                  <th className="py-3.5 px-4 w-32">[Ukuran]</th>
                  <th className="py-3.5 px-4">[Lokasi Penyimpanan]</th>
                  <th className="py-3.5 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {processedFolders.map(folder => {
                  const subcount = folder.subfolders?.length || folder.foldersCount || 0;
                  const filecount = folder.filesCount || 0;
                  const sizeFormatted = folder.usedStorageFormatted || formatBytes(folder.usedBytes);

                  return (
                    <tr
                      key={folder.id}
                      onClick={() => onOpenFolder(folder)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition cursor-pointer group"
                    >
                      {/* [Foto] */}
                      <td className="py-3 px-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 mx-auto shadow-2xs">
                          {folder.sampleImageUrl && !folder.sampleImageHidden ? (
                            <img
                              src={folder.sampleImageUrl}
                              alt={folder.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Folder className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                      </td>

                      {/* [Nama Folder] */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-sm">
                          {folder.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {folder.description || 'Folder penyimpanan media dan berkas.'}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                            {subcount} Subfolder
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {filecount} Files
                          </span>
                          {folder.tags?.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* [Ukuran] */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="text-indigo-600 dark:text-indigo-400">{sizeFormatted}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          {folder.totalCapacityFormatted ? `Kapasitas: ${folder.totalCapacityFormatted}` : ''}
                        </div>
                      </td>

                      {/* [Lokasi penyimpanan] */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                          <HardDrive className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="font-bold truncate">{folder.hddName || 'HDD 1 - Master Storage'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                          {folder.path || 'D:\\'}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFolder(folder);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1 mx-auto"
                        >
                          <span>Buka</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CATALOG PRODUCT CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedFolders.map(folder => {
            const subcount = folder.subfolders?.length || folder.foldersCount || 0;
            const filecount = folder.filesCount || 0;
            const sizeFormatted = folder.usedStorageFormatted || formatBytes(folder.usedBytes);

            return (
              <div
                key={folder.id}
                onClick={() => onOpenFolder(folder)}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs hover:shadow-xl transition duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* [Foto] Thumbnail Banner */}
                  <div className="relative w-full h-44 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800 mb-3.5">
                    {folder.sampleImageUrl && !folder.sampleImageHidden ? (
                      <img
                        src={folder.sampleImageUrl}
                        alt={folder.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-indigo-400">
                        <Folder className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                      <span>{folder.hddName?.split('-')[0] || 'HDD 1'}</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-xs">
                      {sizeFormatted}
                    </div>
                  </div>

                  {/* [Nama Folder] */}
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-1">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {folder.description || 'Penyimpanan folder terstruktur dan subfolder media.'}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                      {subcount} Subfolder
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {filecount} Files
                    </span>
                  </div>
                </div>

                {/* [Lokasi penyimpanan] & Action */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">{folder.path || 'D:\\'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFolder(folder);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Buka</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
