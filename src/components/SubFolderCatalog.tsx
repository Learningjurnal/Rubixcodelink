import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Folder,
  HardDrive,
  ArrowUpRight,
  LayoutGrid,
  Table as TableIcon,
  ListFilter,
  Edit2,
  Trash2,
  Move,
  FolderInput,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
} from 'lucide-react';
import { StorageFolder, StorageSubfolder, HardDriveProfile } from '../types';
import { formatBytes } from '../utils/storageExcelHelper';

interface FlatSubfolderItem extends StorageSubfolder {
  parentFolder: StorageFolder;
  // Computed once when flattening (below) and carried through filtering/
  // sorting/pagination unchanged. Every place that needs to key a subfolder
  // for selection (header "select all", toggle-one, Shift+click range,
  // row rendering) reads this SAME value — previously three different
  // ad-hoc fallbacks (`item.id || item.name` in some places, a
  // `${parentId}-${name}-${idx}` computed fresh in others) could disagree
  // with each other whenever a subfolder had no real `.id`, so an item
  // could be added to selectedIds under one key while its checkbox checked
  // state was read under a different key — making it look unresponsive.
  selectionKey: string;
}

interface SubFolderCatalogProps {
  folders: StorageFolder[];
  drives: HardDriveProfile[];
  onOpenSubfolder: (subfolder: StorageSubfolder, parentFolder: StorageFolder) => void;
  onUpdateSubfolder: (parentFolderId: string, subfolderId: string, updatedFields: Partial<StorageSubfolder>) => void;
  onDeleteSubfolder: (parentFolderId: string, subfolderId: string) => void;
  onBulkDelete: (items: { parentFolderId: string; subfolderId: string }[]) => void;
  onBulkMoveToHdd: (items: { parentFolderId: string; subfolderId: string }[], targetHddId: string, targetHddName?: string) => void;
  onBulkMoveToParent: (items: { parentFolderId: string; subfolderId: string }[], targetParentId: string) => void;
}

export const SubFolderCatalog: React.FC<SubFolderCatalogProps> = ({
  folders,
  drives,
  onOpenSubfolder,
  onUpdateSubfolder,
  onDeleteSubfolder,
  onBulkDelete,
  onBulkMoveToHdd,
  onBulkMoveToParent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size-desc' | 'size-asc' | 'name-asc' | 'name-desc' | 'files-desc'>('size-desc');
  const [viewMode, setViewMode] = useState<'standard' | 'compact' | 'catalog'>('standard');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Edit Subfolder Modal State
  const [editingItem, setEditingItem] = useState<FlatSubfolderItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editImgUrl, setEditImgUrl] = useState('');

  // Bulk Move Modal State (either move to a different parent folder, or a different HDD)
  const [bulkMoveMode, setBulkMoveMode] = useState<'parent' | 'hdd' | null>(null);
  const [bulkMoveTargetId, setBulkMoveTargetId] = useState('');

  // Flatten all subfolders
  const allSubfolders = useMemo(() => {
    const list: FlatSubfolderItem[] = [];
    folders.forEach(folder => {
      if (folder.subfolders && folder.subfolders.length > 0) {
        folder.subfolders.forEach((sub, subIdx) => {
          list.push({
            ...sub,
            parentFolder: folder,
            selectionKey: sub.id || `${folder.id}-${sub.name}-${subIdx}`,
          });
        });
      }
    });
    return list;
  }, [folders]);

  // Max size for relative progress
  const maxSubSizeBytes = useMemo(() => {
    if (allSubfolders.length === 0) return 1;
    return Math.max(...allSubfolders.map(s => s.sizeBytes || 1));
  }, [allSubfolders]);

  // Filter and sort
  const filteredSubfolders = useMemo(() => {
    let result = [...allSubfolders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.parentFolder.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.relativePath && item.relativePath.toLowerCase().includes(q)) ||
          (item.hddId && item.hddId.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const sizeA = a.sizeBytes || 0;
      const sizeB = b.sizeBytes || 0;
      const countA = a.filesCount || a.files?.length || 0;
      const countB = b.filesCount || b.files?.length || 0;

      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'size-desc') return sizeB - sizeA;
      if (sortBy === 'size-asc') return sizeA - sizeB;
      if (sortBy === 'files-desc') return countB - countA;
      return 0;
    });

    return result;
  }, [allSubfolders, searchQuery, sortBy]);

  // Pagination
  const totalItems = filteredSubfolders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubfolders.slice(start, start + itemsPerPage);
  }, [filteredSubfolders, currentPage, itemsPerPage]);

  const allSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.selectionKey));

  const toggleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    if (allSelected) {
      paginatedItems.forEach(item => newSelected.delete(item.selectionKey));
    } else {
      paginatedItems.forEach(item => newSelected.add(item.selectionKey));
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Excel/spreadsheet-style selection: Shift+click selects the contiguous
  // range (within the current page) from the last clicked row to this one,
  // added to the existing selection rather than replacing it.
  const handleRowCheckboxClick = (e: React.MouseEvent, id: string, index: number) => {
    e.preventDefault();
    if (e.shiftKey && lastClickedIndex !== null) {
      const [start, end] = [lastClickedIndex, index].sort((a, b) => a - b);
      const rangeIds = paginatedItems.slice(start, end + 1).map(item => item.selectionKey);
      setSelectedIds(prev => new Set([...prev, ...rangeIds]));
    } else {
      toggleSelectOne(id);
      setLastClickedIndex(index);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editingItem.id) return;
    onUpdateSubfolder(editingItem.parentFolder.id, editingItem.id, {
      name: editName,
      description: editDesc,
      sampleImageUrl: editImgUrl,
    });
    setEditingItem(null);
  };

  // Resolve the current selection into {parentFolderId, subfolderId} pairs
  // for the bulk handlers, which need the parent to locate each subfolder.
  // Filters by selectionKey (what's actually tracked as selected) but the
  // payload itself must carry the real `.id` — a synthetic fallback key
  // would never match anything server-side, so an item without a real id
  // (extremely unlikely in practice; every creation path assigns one) is
  // silently excluded from bulk actions rather than sent as a bad id.
  const getSelectedPayload = () =>
    allSubfolders
      .filter(s => selectedIds.has(s.selectionKey) && s.id)
      .map(s => ({ parentFolderId: s.parentFolder.id, subfolderId: s.id as string }));

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDeleteClick = () => {
    const payload = getSelectedPayload();
    if (payload.length === 0) return;
    if (window.confirm(`Hapus ${payload.length} subfolder terpilih beserta seluruh isinya? Tindakan ini tidak dapat dibatalkan.`)) {
      onBulkDelete(payload);
      clearSelection();
    }
  };

  const openBulkMoveModal = (mode: 'parent' | 'hdd') => {
    setBulkMoveMode(mode);
    setBulkMoveTargetId('');
  };

  const handleConfirmBulkMove = () => {
    if (!bulkMoveTargetId) return;
    const payload = getSelectedPayload();
    if (bulkMoveMode === 'parent') {
      onBulkMoveToParent(payload, bulkMoveTargetId);
    } else if (bulkMoveMode === 'hdd') {
      const targetDrive = drives.find(d => d.id === bulkMoveTargetId);
      onBulkMoveToHdd(payload, bulkMoveTargetId, targetDrive?.name);
    }
    setBulkMoveMode(null);
    setBulkMoveTargetId('');
    clearSelection();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Controls Toolbar (Link Management Style) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari subfolder, induk, path, atau HDD..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>

        {/* View Mode & Sorting */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Urutkan:</span>
            </span>
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
            >
              <option value="size-desc">Ukuran Terbesar (Max → Min)</option>
              <option value="size-asc">Ukuran Terkecil (Min → Max)</option>
              <option value="name-asc">Nama Subfolder (A - Z)</option>
              <option value="name-desc">Nama Subfolder (Z - A)</option>
              <option value="files-desc">Jumlah Berkas Terbanyak</option>
            </select>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Standar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Compact Dense</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Katalog Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary status / Bulk Action Toolbar */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-indigo-600 rounded-2xl shadow-md shadow-indigo-200/60 dark:shadow-none animate-fade-in">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.size} subfolder dipilih</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openBulkMoveModal('parent')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Pindah Folder Induk</span>
            </button>
            <button
              type="button"
              onClick={() => openBulkMoveModal('hdd')}
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
      ) : (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            Total Subfolder: <strong className="text-slate-900 dark:text-slate-100">{totalItems.toLocaleString()}</strong> item (Mendukung performa 8,000+ data)
          </span>
        </div>
      )}

      {/* VIEWS */}
      {viewMode === 'standard' && (
        /* STANDARD TABLE (Link Management Style) */
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
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </th>
                  <th className="py-3.5 px-4 w-16 text-center">Foto</th>
                  <th className="py-3.5 px-4 text-center">Nama Subfolder &amp; Induk</th>
                  <th className="py-3.5 px-4 w-52 text-center">Ukuran &amp; Rasio Kapasitas</th>
                  <th className="py-3.5 px-4 text-center">Lokasi Penyimpanan &amp; Path</th>
                  <th className="py-3.5 px-4 w-32 text-center">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada subfolder yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((sub, idx) => {
                    const subId = sub.selectionKey;
                    const isSelected = selectedIds.has(subId);
                    const sizeB = sub.sizeBytes || 0;
                    const sizeFormatted = sub.sizeFormatted || formatBytes(sizeB);
                    const fileCount = sub.filesCount || sub.files?.length || 0;
                    const parentCapacity = sub.parentFolder.capacityBytes || sub.parentFolder.usedBytes || 1;
                    const ratio = (sizeB / parentCapacity) * 100;
                    const pct = Math.min(100, Math.max(1, Number(ratio.toFixed(1))));
                    const isCritical = ratio > 90;
                    const isWarning = ratio > 75 && !isCritical;

                    return (
                      <tr
                        key={subId}
                        className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition ${
                          isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={e => handleRowCheckboxClick(e, subId, idx)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 mx-auto shadow-2xs">
                            {sub.sampleImageUrl && !sub.sampleImageHidden ? (
                              <img
                                src={sub.sampleImageUrl}
                                alt={sub.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {sub.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                              {sub.parentFolder.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {fileCount} files • {sub.description || 'Subfolder media terstruktur'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {sizeFormatted}
                            </span>
                            <div className="flex items-center gap-1">
                              {isCritical && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
                                  <span>&gt;90%</span>
                                </span>
                              )}
                              <span className={`text-[10px] font-mono font-bold ${isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-500'}`}>
                                {pct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCritical ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 text-xs">
                            <HardDrive className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="font-bold truncate">{sub.parentFolder.hddName || 'HDD 1'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                            {sub.relativePath || `${sub.parentFolder.name}\\${sub.name}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenSubfolder(sub, sub.parentFolder)}
                              className="p-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg transition"
                              title="Detail & File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem({ ...sub, parentFolder: sub.parentFolder });
                                setEditName(sub.name);
                                setEditDesc(sub.description || '');
                                setEditImgUrl(sub.sampleImageUrl || '');
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition"
                              title="Edit Subfolder"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!sub.id) return;
                                if (window.confirm(`Hapus subfolder "${sub.name}"?`)) {
                                  onDeleteSubfolder(sub.parentFolder.id, sub.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg transition"
                              title="Hapus Subfolder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'compact' && (
        /* COMPACT DENSE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Subfolder / Induk</th>
                  <th className="py-2.5 px-3 w-32">Ukuran</th>
                  <th className="py-2.5 px-3 w-36">Lokasi HDD</th>
                  <th className="py-2.5 px-3 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedItems.map((sub, idx) => {
                  const subId = sub.selectionKey;
                  const sizeB = sub.sizeBytes || 0;
                  const sizeFormatted = sub.sizeFormatted || formatBytes(sizeB);

                  return (
                    <tr key={subId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {sub.name} <span className="font-normal text-slate-400">({sub.parentFolder.name})</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sizeFormatted}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {sub.parentFolder.hddName || 'HDD 1'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenSubfolder(sub, sub.parentFolder)}
                            className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[11px] font-bold"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem({ ...sub, parentFolder: sub.parentFolder });
                              setEditName(sub.name);
                              setEditDesc(sub.description || '');
                              setEditImgUrl(sub.sampleImageUrl || '');
                            }}
                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold"
                          >
                            Edit
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
      )}

      {viewMode === 'catalog' && (
        /* CATALOG CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((sub, idx) => {
            const subId = sub.selectionKey;
            const sizeB = sub.sizeBytes || 0;
            const sizeFormatted = sub.sizeFormatted || formatBytes(sizeB);
            const fileCount = sub.filesCount || sub.files?.length || 0;

            return (
              <div
                key={subId}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:shadow-xl transition flex flex-col justify-between group"
              >
                <div>
                  <div className="relative w-full h-36 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800 mb-3">
                    {sub.sampleImageUrl && !sub.sampleImageHidden ? (
                      <img
                        src={sub.sampleImageUrl}
                        alt={sub.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-indigo-400">
                        <Folder className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                      {sub.parentFolder.name}
                    </div>
                    <div className="absolute top-2.5 right-2.5 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                      {sizeFormatted}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {sub.description || 'Subfolder media tersimpan.'}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 mt-2">
                    {fileCount} files • {sub.parentFolder.hddName || 'HDD 1'}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({ ...sub, parentFolder: sub.parentFolder });
                      setEditName(sub.name);
                      setEditDesc(sub.description || '');
                      setEditImgUrl(sub.sampleImageUrl || '');
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenSubfolder(sub, sub.parentFolder)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({totalItems.toLocaleString()} subfolder)
            </span>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
            >
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
              <option value={500}>500 / hal</option>
            </select>
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition flex items-center gap-1"
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* BULK MOVE MODAL (Parent Folder or HDD) */}
      {bulkMoveMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {bulkMoveMode === 'parent' ? (
                  <FolderInput className="w-5 h-5 text-indigo-600" />
                ) : (
                  <HardDrive className="w-5 h-5 text-indigo-600" />
                )}
                <span>
                  {bulkMoveMode === 'parent' ? 'Pindah ke Folder Induk Lain' : 'Pindah ke HDD Lain'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkMoveMode(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.size} subfolder terpilih akan dipindahkan. Pilih tujuan di bawah ini.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {bulkMoveMode === 'parent' ? 'Folder Induk Tujuan' : 'HDD Tujuan'}
              </label>
              <select
                value={bulkMoveTargetId}
                onChange={e => setBulkMoveTargetId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">— Pilih tujuan —</option>
                {bulkMoveMode === 'parent'
                  ? folders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.hddName || 'HDD 1'})
                      </option>
                    ))
                  : drives.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBulkMoveMode(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!bulkMoveTargetId}
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

      {/* EDIT SUBFOLDER MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Subfolder: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Subfolder
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  URL Gambar Sampel (Thumbnail)
                </label>
                <input
                  type="text"
                  value={editImgUrl}
                  onChange={e => setEditImgUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
