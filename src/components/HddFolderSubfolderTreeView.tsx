import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Folder,
  FolderOpen,
  FileText,
  Video,
  Image,
  Archive,
  Music,
  Code,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  HardDriveProfile,
  StorageFolder,
  StorageSubfolder,
  StorageFile,
  HddTransferPlan,
} from '../types';
import { formatBytes } from '../utils/storageExcelHelper';

interface HddFolderSubfolderTreeViewProps {
  folders: StorageFolder[];
  drives: HardDriveProfile[];
  onOpenFolderDetail?: (folder: StorageFolder) => void;
  transferPlans: HddTransferPlan[];
  onAddTransferPlan: (plan: Omit<HddTransferPlan, 'id' | 'createdAt'>) => void;
  onRemoveTransferPlan: (planId: string) => void;
  onTogglePlanStatus: (planId: string) => void;
}

export const HddFolderSubfolderTreeView: React.FC<HddFolderSubfolderTreeViewProps> = ({
  folders,
  drives,
  onOpenFolderDetail,
  transferPlans,
  onAddTransferPlan,
  onRemoveTransferPlan,
  onTogglePlanStatus,
}) => {
  const [selectedHddFilter, setSelectedHddFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'files'>('size');

  // Expanded tree states: set of folder IDs or subfolder IDs
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Expand top 3 folders by default for quick visibility
    return new Set(folders.slice(0, 4).map(f => f.id));
  });

  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(() => {
    return new Set();
  });

  // Modal state for marking item to move
  const [moveItemCandidate, setMoveItemCandidate] = useState<{
    itemType: 'folder' | 'subfolder' | 'file';
    name: string;
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    sourceHddId: string;
  } | null>(null);
  const [selectedTargetHddId, setSelectedTargetHddId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>(
    'Mengurangi beban kapasitas untuk menjaga kesehatan & kecepatan HDD'
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const toggleSubfolder = (subfolderId: string) => {
    setExpandedSubfolders(prev => {
      const next = new Set(prev);
      if (next.has(subfolderId)) {
        next.delete(subfolderId);
      } else {
        next.add(subfolderId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allFld = new Set<string>();
    const allSub = new Set<string>();
    folders.forEach(f => {
      allFld.add(f.id);
      f.subfolders?.forEach(s => {
        if (s.id) allSub.add(s.id);
      });
    });
    setExpandedFolders(allFld);
    setExpandedSubfolders(allSub);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
    setExpandedSubfolders(new Set());
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-rose-500" />;
      case 'image':
        return <Image className="w-3.5 h-3.5 text-emerald-500" />;
      case 'archive':
        return <Archive className="w-3.5 h-3.5 text-amber-500" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-purple-500" />;
      case 'code':
        return <Code className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Group folders by HDD
  const groupedByHdd = useMemo(() => {
    const map = new Map<string, StorageFolder[]>();
    drives.forEach(d => map.set(d.id, []));

    folders.forEach(f => {
      const driveId = f.hddId || 'hdd-1';
      if (!map.has(driveId)) {
        map.set(driveId, []);
      }
      map.get(driveId)!.push(f);
    });

    // Apply sorting to folders within each HDD
    map.forEach((fList, key) => {
      fList.sort((a, b) => {
        if (sortBy === 'size') return b.usedBytes - a.usedBytes;
        if (sortBy === 'files') return (b.filesCount || 0) - (a.filesCount || 0);
        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [folders, drives, sortBy]);

  // Filter drives to render
  const drivesToRender = useMemo(() => {
    if (selectedHddFilter === 'ALL') return drives;
    return drives.filter(d => d.id === selectedHddFilter);
  }, [drives, selectedHddFilter]);

  const openMoveModal = (
    itemType: 'folder' | 'subfolder' | 'file',
    name: string,
    path: string,
    sizeBytes: number,
    sizeFormatted: string,
    sourceHddId: string
  ) => {
    // Pick first different drive as default target
    const defaultTarget = drives.find(d => d.id !== sourceHddId)?.id || drives[0]?.id || 'hdd-3';
    setSelectedTargetHddId(defaultTarget);
    setMoveItemCandidate({
      itemType,
      name,
      path,
      sizeBytes,
      sizeFormatted,
      sourceHddId,
    });
  };

  const handleConfirmMove = () => {
    if (!moveItemCandidate || !selectedTargetHddId) return;

    onAddTransferPlan({
      itemType: moveItemCandidate.itemType,
      name: moveItemCandidate.name,
      path: moveItemCandidate.path,
      sizeBytes: moveItemCandidate.sizeBytes,
      sizeFormatted: moveItemCandidate.sizeFormatted,
      sourceHddId: moveItemCandidate.sourceHddId,
      targetHddId: selectedTargetHddId,
      status: 'planned',
      reason: transferReason,
    });

    setMoveItemCandidate(null);
  };

  // Helper to check if item is in transfer plan
  const isItemInTransferPlan = (name: string, path: string) => {
    return transferPlans.some(p => p.name === name && p.path === path && p.status !== 'completed');
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari folder, subfolder, atau berkas..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-medium"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* HDD Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Filter HDD:</span>
            <select
              value={selectedHddFilter}
              onChange={e => setSelectedHddFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Semua 4 Hardisk</option>
              {drives.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.driveLetterOrMount})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Urutkan:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="size">Ukuran Terbesar (GB/MB)</option>
              <option value="files">Jumlah Berkas</option>
              <option value="name">Nama Folder (A-Z)</option>
            </select>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Expand Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Tree View */}
      <div className="space-y-4">
        {drivesToRender.map(drive => {
          const driveFolders = groupedByHdd.get(drive.id) || [];
          const capacityBytes = (drive.totalCapacityGB || 1) * 1024 * 1024 * 1024;
          const usagePercent = Math.round((drive.usedBytes / capacityBytes) * 100);
          const isOverloaded = usagePercent >= (drive.warningThresholdPercent || 80);

          // Apply search filter
          const filteredFolders = driveFolders.filter(folder => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const matchFolder = folder.name.toLowerCase().includes(q);
            const matchSub = folder.subfolders?.some(s => s.name.toLowerCase().includes(q));
            const matchFile = folder.files?.some(f => f.name.toLowerCase().includes(q));
            return matchFolder || matchSub || matchFile;
          });

          return (
            <div
              key={drive.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs overflow-hidden"
            >
              {/* HDD Drive Header Banner */}
              <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                      drive.healthStatus === 'critical'
                        ? 'bg-rose-600'
                        : drive.healthStatus === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                  >
                    <HardDrive className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                        {drive.driveLetterOrMount}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {drive.name}
                      </h3>
                      {drive.brand && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ({drive.brand})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{driveFolders.length} Folder Utama</span>
                      <span>•</span>
                      <span>
                        {driveFolders.reduce((s, f) => s + (f.subfolders?.length || 0), 0)} Subfolder
                      </span>
                      <span>•</span>
                      <span>
                        {driveFolders.reduce((s, f) => s + (f.filesCount || f.files?.length || 0), 0)}{' '}
                        Berkas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity Gauge & Health Indicator */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formatBytes(drive.usedBytes)} / {drive.totalCapacityGB} GB
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sisa Bebas: {formatBytes(Math.max(0, capacityBytes - drive.usedBytes))}
                    </div>
                  </div>

                  <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, usagePercent)}%` }}
                      className={`h-full transition-all duration-300 ${
                        usagePercent >= 85
                          ? 'bg-rose-500'
                          : usagePercent >= (drive.warningThresholdPercent || 80)
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                      usagePercent >= 85
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                        : usagePercent >= (drive.warningThresholdPercent || 80)
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                    }`}
                  >
                    {usagePercent >= 85 ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Kritis ({usagePercent}%)</span>
                      </>
                    ) : usagePercent >= (drive.warningThresholdPercent || 80) ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Waspada ({usagePercent}%)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Aman ({usagePercent}%)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Overload Notice Banner */}
              {isOverloaded && (
                <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <span className="font-bold">Kesehatan Hardisk Terancam:</span> Kapasitas terpakai sudah mencapai {usagePercent}%. Sangat dianjurkan merelokasi folder berukuran besar ke hardisk lain untuk mencegah fragmentasi dan keausan mekanis.
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    Pilih folder di bawah untuk dipindahkan ↓
                  </span>
                </div>
              )}

              {/* Folders List within HDD */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFolders.map(folder => {
                  const isExpanded = expandedFolders.has(folder.id);
                  const inTransfer = isItemInTransferPlan(folder.name, folder.path || '');
                  const folderPercentOfHdd = Math.min(
                    100,
                    Math.round((folder.usedBytes / capacityBytes) * 100)
                  );

                  return (
                    <div key={folder.id} className="p-3 sm:px-5 sm:py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      {/* Folder Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Chevron toggle button */}
                          <button
                            type="button"
                            onClick={() => toggleFolder(folder.id)}
                            className="w-6 h-6 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Folder Icon */}
                          <div
                            onClick={() => toggleFolder(folder.id)}
                            className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            {isExpanded ? (
                              <FolderOpen className="w-4 h-4" />
                            ) : (
                              <Folder className="w-4 h-4" />
                            )}
                          </div>

                          {/* Folder Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => toggleFolder(folder.id)}
                                className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                {folder.name}
                              </span>

                              {inTransfer && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
                                  Ditandai Pindah
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {folder.path && (
                                <span className="font-mono truncate max-w-xs">{folder.path}</span>
                              )}
                              <span>•</span>
                              <span>{folder.filesCount || folder.files?.length || 0} berkas</span>
                              {folder.subfolders && folder.subfolders.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{folder.subfolders.length} subfolder</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Size & Move Action */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {folder.usedStorageFormatted || formatBytes(folder.usedBytes)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {folderPercentOfHdd}% kapasitas HDD
                            </div>
                          </div>

                          {/* Quick Move Button */}
                          <button
                            type="button"
                            onClick={() =>
                              openMoveModal(
                                'folder',
                                folder.name,
                                folder.path || `${drive.driveLetterOrMount}${folder.name}`,
                                folder.usedBytes,
                                folder.usedStorageFormatted || formatBytes(folder.usedBytes),
                                drive.id
                              )
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                              inTransfer
                                ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                            title="Tandai folder ini untuk dipindahkan ke HDD lain"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="hidden sm:inline">
                              {inTransfer ? 'Atur Pindah' : 'Pindahkan'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Nested Subfolders & Files (Level 2 & 3) */}
                      {isExpanded && (
                        <div className="mt-3 pl-6 sm:pl-10 space-y-2 border-l-2 border-indigo-100 dark:border-indigo-900/60 ml-3 sm:ml-4">
                          {/* Subfolders */}
                          {folder.subfolders && folder.subfolders.length > 0 ? (
                            folder.subfolders.map((sub, sIdx) => {
                              const subId = sub.id || `sub-${folder.id}-${sIdx}`;
                              const subSizeBytes = sub.sizeBytes ?? 0;
                              const isSubExpanded = expandedSubfolders.has(subId);
                              const isSubInTransfer = isItemInTransferPlan(sub.name, sub.path || '');

                              return (
                                <div
                                  key={subId}
                                  className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2"
                                >
                                  {/* Subfolder Header */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleSubfolder(subId)}
                                        className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
                                      >
                                        {isSubExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </button>

                                      <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />

                                      <div className="min-w-0 flex-1 truncate">
                                        <span
                                          onClick={() => toggleSubfolder(subId)}
                                          className="font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 cursor-pointer"
                                        >
                                          {sub.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 ml-2">
                                          ({sub.filesCount} file)
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {sub.sizeFormatted || formatBytes(subSizeBytes)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openMoveModal(
                                            'subfolder',
                                            `${folder.name} > ${sub.name}`,
                                            sub.path || '',
                                            subSizeBytes,
                                            sub.sizeFormatted || formatBytes(subSizeBytes),
                                            drive.id
                                          )
                                        }
                                        className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition cursor-pointer"
                                        title="Pindahkan subfolder ini"
                                      >
                                        <ArrowRight className="w-3 h-3 text-indigo-500" />
                                        <span>Pindah Subfolder</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subfolder Files */}
                                  {isSubExpanded && sub.files && sub.files.length > 0 && (
                                    <div className="pl-6 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                      {sub.files.slice(0, 15).map((file, fIdx) => (
                                        <div
                                          key={file.id || `subfile-${sub.id}-${fIdx}`}
                                          className="flex items-center justify-between text-[11px] py-1 text-slate-600 dark:text-slate-300"
                                        >
                                          <div className="flex items-center gap-2 truncate pr-2">
                                            {getFileIcon(file.type)}
                                            <span className="truncate">{file.name}</span>
                                          </div>
                                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                            {file.sizeFormatted || formatBytes(file.size)}
                                          </span>
                                        </div>
                                      ))}
                                      {sub.files.length > 15 && (
                                        <div className="text-[10px] text-slate-400 italic pt-0.5">
                                          + {sub.files.length - 15} berkas lainnya di dalam subfolder ini
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            /* Files directly under folder */
                            folder.files && folder.files.length > 0 ? (
                              <div className="space-y-1">
                                {folder.files.slice(0, 12).map((file, fIdx) => (
                                  <div
                                    key={file.id || `fldrfile-${folder.id}-${fIdx}`}
                                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200"
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      {getFileIcon(file.type)}
                                      <span className="truncate">{file.name}</span>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                        {file.sizeFormatted || formatBytes(file.size)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openMoveModal(
                                            'file',
                                            file.name,
                                            file.path || `${folder.name}\\${file.name}`,
                                            file.size,
                                            file.sizeFormatted || formatBytes(file.size),
                                            drive.id
                                          )
                                        }
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                      >
                                        Pindah
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {folder.files.length > 12 && (
                                  <div className="text-[11px] text-slate-400 italic pl-2">
                                    + {folder.files.length - 12} berkas lainnya di folder ini
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic py-2">
                                Belum ada daftar berkas terperinci. Jalankan script Python scanner untuk mengindeks seluruh file.
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredFolders.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada folder yang cocok pada {drive.name}.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Move / Relocation Planner Modal */}
      {moveItemCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Rencanakan Pemindahan Berkas (Jaga Kesehatan HDD)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMoveItemCandidate(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Item Details */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Item yang akan dipindahkan:
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {moveItemCandidate.name}
              </div>
              <div className="font-mono text-[11px] text-slate-500 break-all">
                {moveItemCandidate.path}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  Ukuran: {moveItemCandidate.sizeFormatted}
                </span>
                <span>•</span>
                <span className="text-slate-500">
                  Asal:{' '}
                  {drives.find(d => d.id === moveItemCandidate.sourceHddId)?.name ||
                    moveItemCandidate.sourceHddId}
                </span>
              </div>
            </div>

            {/* Select Destination Drive */}
            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Pilih Hardisk Tujuan:
              </label>
              <select
                value={selectedTargetHddId}
                onChange={e => setSelectedTargetHddId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                {drives
                  .filter(d => d.id !== moveItemCandidate.sourceHddId)
                  .map(d => {
                    const capacityBytes = (d.totalCapacityGB || 1) * 1024 * 1024 * 1024;
                    const freeBytes = Math.max(0, capacityBytes - d.usedBytes);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driveLetterOrMount}) - Sisa Bebas: {formatBytes(freeBytes)} (
                        {Math.round((d.usedBytes / capacityBytes) * 100)}% Terpakai)
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Reason */}
            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Alasan / Tujuan Pemindahan:
              </label>
              <input
                type="text"
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Impact Simulation */}
            {selectedTargetHddId && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Simulasi Dampak Kesehatan:
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  Memindahkan {moveItemCandidate.sizeFormatted} akan melegakan kapasitas hardisk asal sehingga terhindar dari batas kritis (&gt;85%) dan meminimalisir fragmentasi file.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMoveItemCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Tambahkan ke Rencana Pemindahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
