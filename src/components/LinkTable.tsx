import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  ChevronDown,
  ArrowUpDown,
  Table as TableIcon,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  DownloadCloud,
  FileText,
  Calendar,
  Sparkles,
  Tag,
  Search,
} from 'lucide-react';
import { LinkItem, LinkStatus, AppSettings, SortField, SortDirection } from '../types';
import { Tooltip } from './Tooltip';
import { detectFileExtensionType } from '../utils/fileTypeHelper';
import {
  getOptionColor,
  PRESET_COLORS,
  DEFAULT_STATUS_COLORS,
  DEFAULT_OUTPUT_COLORS,
  DEFAULT_REGION_COLORS,
} from '../utils/colorHelper';

interface LinkTableProps {
  items: LinkItem[];
  totalAllItemsCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectRange: (ids: string[]) => void;
  onUpdateStatus: (id: string, newStatus: LinkStatus) => void;
  onUpdateOutput?: (id: string, newOutput: string) => void;
  onUpdateRegion?: (id: string, newRegion: string) => void;
  onUpdateNote: (id: string, newNote: string) => void;
  onDownloadAndMark: (item: LinkItem) => void;
  onCopyLink: (link: string) => void;
  onDeleteLink: (id: string) => void;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  settings: AppSettings;
  // Period filter props
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onResetPeriod: () => void;
  onSetQuickPeriod: (days: number | 'today' | 'thisMonth') => void;
}

export const LinkTable: React.FC<LinkTableProps> = ({
  items,
  totalAllItemsCount,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectRange,
  onUpdateStatus,
  onUpdateOutput,
  onUpdateRegion,
  onUpdateNote,
  onDownloadAndMark,
  onCopyLink,
  onDeleteLink,
  sortField,
  sortDirection,
  onSort,
  settings,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetPeriod,
  onSetQuickPeriod,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  // Excel/spreadsheet-style row selection: plain click toggles one row,
  // Shift+click selects the contiguous range from the last clicked row to
  // this one (added to the existing selection, not replacing it), and
  // Ctrl/Cmd+click toggles one row without disturbing the rest — same as
  // a plain click here since these are independent checkboxes, kept for
  // familiarity with spreadsheet muscle memory.
  const handleRowCheckboxClick = (e: React.MouseEvent, id: string, index: number) => {
    e.preventDefault();
    if (e.shiftKey && lastClickedIndex !== null) {
      const [start, end] = [lastClickedIndex, index].sort((a, b) => a - b);
      onSelectRange(items.slice(start, end + 1).map(i => i.id));
    } else {
      onToggleSelect(id);
      setLastClickedIndex(index);
    }
  };

  const startEditNote = (item: LinkItem) => {
    setEditingNoteId(item.id);
    setTempNote(item.note);
  };

  const saveNote = (id: string) => {
    onUpdateNote(id, tempNote);
    setEditingNoteId(null);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
  };

  const hasActivePeriod = Boolean(startDate || endDate);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden w-full transition-colors">
      {/* Table Tab Header (Bento Registry Header + Period Filter Bar) */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 space-y-3.5">
        {/* Top Controls: Table Tab + Sort By Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs shadow-2xs tracking-wide border border-indigo-200/80 dark:border-indigo-800/80">
              <TableIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Data Link Cloud</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-200/60 dark:bg-indigo-900/60 rounded text-indigo-800 dark:text-indigo-200 font-mono font-bold">
                Table1
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Menampilkan {items.length} dari total {totalAllItemsCount} tautan
            </span>
          </div>

          {/* Sort By Dropdown Controller */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sort By:</span>
            </span>
            <select
              id="sort-by-select"
              value={sortField || 'diperbarui'}
              onChange={e => onSort(e.target.value as SortField)}
              className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
            >
              <option value="diperbarui" className="dark:bg-slate-800 dark:text-slate-200">Tanggal Diperbarui</option>
              <option value="createdAt" className="dark:bg-slate-800 dark:text-slate-200">Tanggal Dibuat</option>
              <option value="link" className="dark:bg-slate-800 dark:text-slate-200">Link URL</option>
              <option value="name" className="dark:bg-slate-800 dark:text-slate-200">Nama / Judul</option>
              <option value="status" className="dark:bg-slate-800 dark:text-slate-200">Status</option>
              <option value="output" className="dark:bg-slate-800 dark:text-slate-200">Output</option>
              <option value="region" className="dark:bg-slate-800 dark:text-slate-200">Region</option>
              <option value="counta" className="dark:bg-slate-800 dark:text-slate-200">Counta</option>
              <option value="note" className="dark:bg-slate-800 dark:text-slate-200">Note</option>
            </select>
            <Tooltip
              content="Ubah Arah Urutan"
              subtitle={sortDirection === 'asc' ? 'Urutan saat ini: Naik (A-Z)' : 'Urutan saat ini: Turun (Z-A)'}
              position="top"
            >
              <motion.button
                whileTap={{ scale: 0.9, scaleY: [1, 1.12, 0.94, 1] }}
                transition={{ duration: 0.2 }}
                onClick={() => onSort((sortField || 'diperbarui') as SortField)}
                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>{sortDirection === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}</span>
              </motion.button>
            </Tooltip>
          </div>
        </div>

        {/* Date Range Period Filter (Periode XXX ke XXX) */}
        <div
          id="period-filter-bar"
          className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Filter Periode Tanggal:</span>
            </span>

            {/* Start Date */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Dari:</span>
              <input
                type="date"
                id="period-start-date"
                value={startDate}
                onChange={e => onStartDateChange(e.target.value)}
                className="text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer bg-transparent"
              />
            </div>

            <span className="text-slate-400 dark:text-slate-500 font-bold">ke</span>

            {/* End Date */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Sampai:</span>
              <input
                type="date"
                id="period-end-date"
                value={endDate}
                onChange={e => onEndDateChange(e.target.value)}
                className="text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer bg-transparent"
              />
            </div>

            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => onSetQuickPeriod('today')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => onSetQuickPeriod(7)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs cursor-pointer"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => onSetQuickPeriod('thisMonth')}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-2xs cursor-pointer"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {hasActivePeriod && (
            <button
              onClick={onResetPeriod}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold flex items-center gap-1 underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter Periode</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header row with modern cohesive light and dark styling */}
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-700 dark:text-slate-200 select-none text-[12px] font-bold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              {/* Checkbox */}
              <th className="py-3.5 px-3.5 w-10 text-center border-r border-slate-200/80 dark:border-slate-800">
                <Tooltip content={allSelected ? "Batalkan semua pilihan" : "Pilih semua tautan di halaman ini"} position="right">
                  <input
                    type="checkbox"
                    id="select-all-checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                </Tooltip>
              </th>

              {/* Link Column */}
              <th
                className="py-3.5 px-4 min-w-[320px] max-w-[460px] border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition"
                onClick={() => onSort('link')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="underline decoration-1 underline-offset-4">
                      Nama & Link Unduhan
                    </span>
                    {sortField === 'link' && (
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">
                    {sortField === 'link' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </span>
                </div>
              </th>

              {/* Status Column */}
              <th
                className="py-3.5 px-3 w-44 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition text-center"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    <span>Status</span>
                  </div>
                  {sortField === 'status' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Output Column */}
              <th
                className="py-3.5 px-3 w-28 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition text-center"
                onClick={() => onSort('output')}
              >
                <div className="flex items-center justify-between">
                  <span>Output</span>
                  {sortField === 'output' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Region Column */}
              <th
                className="py-3.5 px-3 w-24 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition text-center"
                onClick={() => onSort('region')}
              >
                <div className="flex items-center justify-between">
                  <span>Region</span>
                  {sortField === 'region' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Counta Column */}
              <th
                className="py-3.5 px-3 w-24 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition text-center"
                onClick={() => onSort('counta')}
              >
                <div className="flex items-center justify-between">
                  <span>Counta</span>
                  {sortField === 'counta' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Note Column */}
              <th
                className="py-3.5 px-4 min-w-[320px] max-w-[500px] border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition"
                onClick={() => onSort('note')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Catatan & Keterangan</span>
                  {sortField === 'note' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Diperbarui Column */}
              <th
                className="py-3.5 px-3 w-36 border-r border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-900/90 transition text-center"
                onClick={() => onSort('diperbarui')}
              >
                <div className="flex items-center justify-between">
                  <span>Diperbarui</span>
                  {sortField === 'diperbarui' && (
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              </th>

              {/* Actions Column */}
              <th className="py-3.5 px-3 w-40 text-center">
                <span>Aksi Download</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center text-slate-400 dark:text-slate-500">
                  <div className="max-w-md mx-auto p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shadow-xs">
                      <Search className="w-8 h-8 animate-pulse" />
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-base text-slate-800 dark:text-slate-100">
                        Tidak Ada Tautan yang Ditemukan
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pencarian atau filter Anda saat ini tidak menghasilkan kecocokan data. Coba ubah kata kunci, reset filter status, atau sesuaikan rentang tanggal.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={onResetPeriod}
                        className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
                      >
                        Reset Filter & Tanggal
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isDownloaded = item.status === 'Sudah Terunduh';

                const statusColorKey = getOptionColor(item.status, undefined, DEFAULT_STATUS_COLORS);
                const statusDef = PRESET_COLORS[statusColorKey] || PRESET_COLORS.slate;

                const outputColorKey = getOptionColor(item.output, undefined, DEFAULT_OUTPUT_COLORS);
                const outputDef = PRESET_COLORS[outputColorKey] || PRESET_COLORS.blue;

                const regionColorKey = getOptionColor(item.region, undefined, DEFAULT_REGION_COLORS);
                const regionDef = PRESET_COLORS[regionColorKey] || PRESET_COLORS.slate;

                const fileTypeInfo = detectFileExtensionType(item.link, item.name);

                return (
                  <tr
                    key={item.id}
                    id={`row-${item.id}`}
                    className={`transition-colors text-[13px] ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                        : isDownloaded
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/20 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                        : index % 2 === 1
                        ? 'bg-slate-50/50 dark:bg-slate-950/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3.5 text-center border-r border-slate-200/80 dark:border-slate-800">
                      <Tooltip content={isSelected ? "Batal pilih baris ini" : "Pilih baris ini (Shift+klik untuk pilih rentang)"} position="right">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={e => handleRowCheckboxClick(e, item.id, index)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </Tooltip>
                    </td>

                    {/* Link & Name Column */}
                    <td className="py-2 px-4 border-r border-slate-200/80 dark:border-slate-800 max-w-[460px]">
                      <div className="flex items-center justify-between gap-2 group">
                        <div className="truncate flex-1">
                          {item.name && (
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 mb-0.5">
                              <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                              <span className="truncate">{item.name}</span>
                              {fileTypeInfo && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-tight shrink-0 ${fileTypeInfo.bgClass}`}>
                                  <span>{fileTypeInfo.label}</span>
                                </span>
                              )}
                              {item.tag && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-bold tracking-tight shrink-0">
                                  <Tag className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                                  <span>{item.tag}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {!item.name && (item.tag || fileTypeInfo) && (
                            <div className="mb-0.5 flex items-center gap-1.5">
                              {fileTypeInfo && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-tight shrink-0 ${fileTypeInfo.bgClass}`}>
                                  <span>{fileTypeInfo.label}</span>
                                </span>
                              )}
                              {item.tag && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-[10px] font-bold tracking-tight">
                                  <Tag className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                                  <span>{item.tag}</span>
                                </span>
                              )}
                            </div>
                          )}
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={`truncate block underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-indigo-600 transition text-[12px] ${
                              isDownloaded
                                ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-normal'
                                : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium'
                            }`}
                          >
                            {item.link}
                          </a>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition flex-shrink-0">
                          <Tooltip content="Salin Tautan" subtitle="Salin URL lengkap ke clipboard" position="top">
                            <button
                              type="button"
                              onClick={() => onCopyLink(item.link)}
                              className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Buka Tautan" subtitle="Buka tujuan di tab baru" position="top">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Tooltip>
                        </div>
                      </div>
                    </td>

                    {/* Status Dropdown (populated from settings) */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800">
                      <Tooltip content="Ubah Status" subtitle="Pilih status pengerjaan tautan" position="top">
                        <div className="relative inline-block">
                          <select
                            value={item.status}
                            onChange={e => onUpdateStatus(item.id, e.target.value)}
                            className={`appearance-none font-bold text-[11px] px-3 py-1 rounded-full cursor-pointer pr-6 shadow-2xs border transition outline-none ${statusDef.selectClass}`}
                          >
                            {settings.statusOptions.map((st, sIdx) => (
                              <option key={sIdx} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {st}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />
                        </div>
                      </Tooltip>
                    </td>

                    {/* Output Dropdown / Pill (populated from settings) */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800">
                      {onUpdateOutput ? (
                        <Tooltip content="Format Output" subtitle="Tentukan jenis file keluaran" position="top">
                          <div className="relative inline-block">
                            <select
                              value={item.output}
                              onChange={e => onUpdateOutput(item.id, e.target.value)}
                              className={`appearance-none inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border pr-5 cursor-pointer outline-none transition ${outputDef.selectClass}`}
                            >
                              {settings.outputOptions.map((out, oIdx) => (
                                <option key={oIdx} value={out} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                  {out}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />
                          </div>
                        </Tooltip>
                      ) : (
                        <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${outputDef.selectClass}`}>
                          {item.output}
                        </div>
                      )}
                    </td>

                    {/* Region Dropdown / Tag (populated from settings) */}
                    <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200/80 dark:border-slate-800">
                      {onUpdateRegion ? (
                        <Tooltip content="Pilih Region" subtitle="Tentukan wilayah target tautan" position="top">
                          <select
                            value={item.region}
                            onChange={e => onUpdateRegion(item.id, e.target.value)}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer outline-none transition ${regionDef.selectClass}`}
                          >
                            {settings.regionOptions.map((reg, rIdx) => (
                              <option key={rIdx} value={reg} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {reg}
                              </option>
                            ))}
                          </select>
                        </Tooltip>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${regionDef.selectClass}`}>
                          {item.region}
                        </span>
                      )}
                    </td>

                    {/* Counta */}
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200/80 dark:border-slate-800">
                      {item.counta}
                    </td>

                    {/* Note (Editable with quick presets from settings) */}
                    <td className="py-2.5 px-4 border-r border-slate-200/80 dark:border-slate-800">
                      {editingNoteId === item.id ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempNote}
                              onChange={e => setTempNote(e.target.value)}
                              className="text-xs p-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveNote(item.id);
                                if (e.key === 'Escape') cancelEditNote();
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => saveNote(item.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditNote}
                              className="p-1 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-400 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Quick preset chips */}
                          <div className="flex flex-wrap gap-1">
                            {settings.notePresets.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setTempNote(preset)}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Tooltip content="Edit Catatan" subtitle="Klik untuk mengubah catatan" position="top" className="w-full">
                          <div
                            className="flex items-center justify-between group cursor-pointer w-full"
                            onClick={() => startEditNote(item)}
                          >
                            <span
                              className={`truncate max-w-[140px] ${
                                item.note === 'Web Inactive'
                                  ? 'text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.note || '-'}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition ml-1" />
                          </div>
                        </Tooltip>
                      )}
                    </td>

                    {/* Diperbarui */}
                    <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap border-r border-slate-200/80 dark:border-slate-800 text-[11px]">
                      {item.diperbarui}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {isDownloaded ? (
                          <Tooltip content="Batalkan Unduh" subtitle="Kembalikan status menjadi Blank" position="top">
                            <button
                              type="button"
                              id={`btn-revert-${item.id}`}
                              onClick={() => onUpdateStatus(item.id, 'Blank')}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>Batal</span>
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Unduh & Tandai Selesai" subtitle="Buka tautan & otomatis ubah status" position="top">
                            <button
                              type="button"
                              id={`btn-download-mark-${item.id}`}
                              onClick={() => onDownloadAndMark(item)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <DownloadCloud className="w-3.5 h-3.5 text-indigo-100" />
                              <span>Unduh & Tandai</span>
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip content="Hapus Tautan" subtitle="Hapus permanen dari database" position="top">
                          <button
                            type="button"
                            id={`btn-delete-${item.id}`}
                            onClick={() => onDeleteLink(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
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
  );
};
