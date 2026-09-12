import React from 'react';
import { HardDrive, PieChart, Folder, Files, Link2, ArrowUpRight } from 'lucide-react';
import { StorageOverviewStats } from '../types';

interface CommandCenterKPIsProps {
  stats: StorageOverviewStats;
  totalLinksCount: number;
  downloadedLinksCount: number;
}

export const CommandCenterKPIs: React.FC<CommandCenterKPIsProps> = ({
  stats,
  totalLinksCount,
  downloadedLinksCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Storage */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Total Storage</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalStorageTB} <span className="text-sm font-semibold text-slate-500">TB</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kapasitas Cloud & Local Drive</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <HardDrive className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Used Storage */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Used Storage</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.usedStorageTB} <span className="text-sm font-semibold text-slate-500">TB</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {stats.usedPercentage}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">720 GB tersisa bebas</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
          <PieChart className="w-6 h-6" />
        </div>
      </div>

      {/* 3. Total Folders */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Folder className="w-4 h-4 text-indigo-600" />
            <span>Total Folders</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalFolders.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Struktur direktori aktif</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Folder className="w-6 h-6" />
        </div>
      </div>

      {/* 4. Total Files & Links */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Files className="w-4 h-4 text-amber-600" />
            <span>Total Files & Links</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {(stats.totalFiles / 1000).toFixed(1)}K
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {totalLinksCount} Links
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {downloadedLinksCount} tautan selesai diunduh
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
          <Files className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
