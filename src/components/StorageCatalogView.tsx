import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Folder,
  HardDrive,
  ArrowUpRight,
  LayoutGrid,
  Table as TableIcon,
  Trash2,
  Move,
  Check,
  X,
  CheckSquare,
} from 'lucide-react';
import { StorageFolder, HardDriveProfile } from '../types';
import { formatBytes } from '../utils/storageExcelHelper';

interface StorageCatalogViewProps {
  folders: StorageFolder[];
  drives: HardDriveProfile[];
  onOpenFolder: (folder: StorageFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onBulkDelete: (folderIds: string[]) => void;
  onBulkMoveToHdd: (folderIds: string[], targetHddId: string, targetHddName?: string) => void;
}

export const StorageCatalogView: React.FC<StorageCatalogViewProps> = ({
  folders,
  drives,
  onOpenFolder,
  onDeleteFolder,
  onBulkDelete,
  onBulkMoveToHdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('name-asc');
  const [viewMode, setViewMode] = useState<'table' | 'catalog'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetHddId, setMoveTargetHddId] = useState('');

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

  const allSelected = processedFolders.length > 0 && processedFolders.every(f => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedFolders.map(f => f.id)));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Excel/spreadsheet-style selection: Shift+click selects the contiguous
  // range from the last clicked folder to this one, added to the existing
  // selection rather than replacing it. Used by the card-grid view's select
  // button (a plain <button>, not a native checkbox — safe to preventDefault
  // there, it has no native "checked" activation behavior to fight).
  const handleRowSelectClick = (e: React.MouseEvent, id: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey && lastClickedIndex !== null) {
      const [start, end] = [lastClickedIndex, index].sort((a, b) => a - b);
      const rangeIds = processedFolders.slice(start, end + 1).map(f => f.id);
      setSelectedIds(prev => new Set([...prev, ...rangeIds]));
    } else {
      toggleSelectOne(id);
      setLastClickedIndex(index);
    }
  };

  // Table-row checkbox needs a different wiring than the card-grid button
  // above: it's a real <input type="checkbox">, and using onClick +
  // preventDefault() on a native checkbox fights the browser's own checkbox
  // activation behavior (it flips `checked` natively, then reverts it
  // because of preventDefault, before React's state update even commits) —
  // this left the DOM checkbox's own `checked` property lagging one click
  // behind React's selection state: clicking one row visually did nothing,
  // and only the NEXT click elsewhere made the previous row appear checked.
  // Driving this off a plain onChange (never preventDefault'd) avoids that
  // fight — the shiftKey flag is instead captured on mousedown (always a
  // real MouseEvent) since a checkbox's change event doesn't reliably carry
  // modifier keys.
  const shiftKeyOnMouseDown = React.useRef(false);
  const handleRowCheckboxChange = (id: string, index: number) => {
    if (shiftKeyOnMouseDown.current && lastClickedIndex !== null) {
      const [start, end] = [lastClickedIndex, index].sort((a, b) => a - b);
      const rangeIds = processedFolders.slice(start, end + 1).map(f => f.id);
      setSelectedIds(prev => new Set([...prev, ...rangeIds]));
    } else {
      toggleSelectOne(id);
      setLastClickedIndex(index);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Hapus ${selectedIds.size} folder terpilih beserta seluruh subfolder & berkas di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleConfirmBulkMove = () => {
    if (!moveTargetHddId) return;
    const targetDrive = drives.find(d => d.id === moveTargetHddId);
    onBulkMoveToHdd(Array.from(selectedIds), moveTargetHddId, targetDrive?.name);
    setIsMoveModalOpen(false);
    setMoveTargetHddId('');
    clearSelection();
  };

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

      {/* Results summary — always in normal document flow, at a constant
          height regardless of selection state. The bulk action toolbar
          below is a fixed-position overlay rather than an in-flow sibling
          that swaps in/out here: an in-flow toolbar appearing/disappearing
          changes this section's height and pushes the table below it up or
          down, which is what made row clicks (and the Aksi Operasional
          buttons on the affected row) land on the wrong target. A fixed
          overlay never affects page layout. */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>Menampilkan <strong className="text-slate-900 dark:text-slate-100">{processedFolders.length}</strong> folder rekap</span>
      </div>

      {/* Bulk Action Toolbar — fixed overlay, does not affect table layout */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-900/40 animate-fade-in">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.size} folder dipilih</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMoveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Pindah HDD</span>
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              title="Batalkan pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      onClick={e => e.stopPropagation()}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </th>
                  <th className="py-3.5 px-4 w-16 text-center">Foto</th>
                  <th className="py-3.5 px-4 text-center">Nama Folder &amp; Deskripsi</th>
                  <th className="py-3.5 px-4 w-32 text-center">Ukuran</th>
                  <th className="py-3.5 px-4 text-center">Lokasi Penyimpanan</th>
                  <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {processedFolders.map((folder, rowIndex) => {
                  const subcount = folder.subfolders?.length || folder.foldersCount || 0;
                  const filecount = folder.filesCount || 0;
                  const sizeFormatted = folder.usedStorageFormatted || formatBytes(folder.usedBytes);

                  const isSelected = selectedIds.has(folder.id);

                  return (
                    <tr
                      key={folder.id}
                      onClick={() => onOpenFolder(folder)}
                      className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition cursor-pointer group ${
                        isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onMouseDown={e => { shiftKeyOnMouseDown.current = e.shiftKey; }}
                          onClick={e => e.stopPropagation()}
                          onChange={() => handleRowCheckboxChange(folder.id, rowIndex)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                      </td>
                      {/* Foto */}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFolder(folder);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1"
                          >
                            <span>Buka</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm(`Hapus folder "${folder.name}" beserta seluruh subfolder & berkas di dalamnya?`)) {
                                onDeleteFolder(folder.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg transition"
                            title="Hapus Folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
          {processedFolders.map((folder, cardIndex) => {
            const subcount = folder.subfolders?.length || folder.foldersCount || 0;
            const filecount = folder.filesCount || 0;
            const sizeFormatted = folder.usedStorageFormatted || formatBytes(folder.usedBytes);
            const isSelected = selectedIds.has(folder.id);

            return (
              <div
                key={folder.id}
                onClick={() => onOpenFolder(folder)}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-4 shadow-xs hover:shadow-xl transition duration-300 flex flex-col justify-between cursor-pointer group ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Foto Thumbnail Banner */}
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
                    <button
                      type="button"
                      onClick={e => handleRowSelectClick(e, folder.id, cardIndex)}
                      className={`absolute top-3 left-3 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition shadow-xs cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-black/40 backdrop-blur-xs border-white/70 text-transparent hover:bg-black/60'
                      }`}
                      title={isSelected ? 'Batalkan pilih' : 'Pilih folder'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-xs">
                      {sizeFormatted}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                      <span>{folder.hddName?.split('-')[0] || 'HDD 1'}</span>
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

      {/* BULK MOVE TO HDD MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                <span>Pindah ke HDD Lain</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.size} folder terpilih akan dipindahkan ke HDD tujuan.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                HDD Tujuan
              </label>
              <select
                value={moveTargetHddId}
                onChange={e => setMoveTargetHddId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">— Pilih HDD tujuan —</option>
                {drives.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!moveTargetHddId}
                onClick={handleConfirmBulkMove}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Pindahkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
