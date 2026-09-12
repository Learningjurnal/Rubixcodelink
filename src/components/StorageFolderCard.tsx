import React from 'react';
import {
  Folder,
  HardDrive,
  Share2,
  FileText,
  MoreVertical,
  ArrowUpRight,
  User,
  Clock,
  FolderOpen,
} from 'lucide-react';
import { StorageFolder } from '../types';

interface StorageFolderCardProps {
  folder: StorageFolder;
  onOpenFolder: (folder: StorageFolder) => void;
  onDeleteFolder?: (folderId: string) => void;
}

export const StorageFolderCard: React.FC<StorageFolderCardProps> = ({
  folder,
  onOpenFolder,
  onDeleteFolder,
}) => {
  // Theme color styles
  const themeMap = {
    blue: {
      headerBg: 'bg-blue-50/90 border-blue-100 text-blue-700',
      iconBg: 'bg-blue-600 text-white',
      badgeBg: 'bg-blue-100/70 text-blue-700 border-blue-200/60',
      progressFill: 'bg-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    },
    emerald: {
      headerBg: 'bg-emerald-50/90 border-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-600 text-white',
      badgeBg: 'bg-emerald-100/70 text-emerald-700 border-emerald-200/60',
      progressFill: 'bg-emerald-600',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    },
    amber: {
      headerBg: 'bg-amber-50/90 border-amber-100 text-amber-800',
      iconBg: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-100/80 text-amber-800 border-amber-200/60',
      progressFill: 'bg-amber-500',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    },
    purple: {
      headerBg: 'bg-purple-50/90 border-purple-100 text-purple-700',
      iconBg: 'bg-purple-600 text-white',
      badgeBg: 'bg-purple-100/70 text-purple-700 border-purple-200/60',
      progressFill: 'bg-purple-600',
      btnBg: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200',
    },
    rose: {
      headerBg: 'bg-rose-50/90 border-rose-100 text-rose-700',
      iconBg: 'bg-rose-600 text-white',
      badgeBg: 'bg-rose-100/70 text-rose-700 border-rose-200/60',
      progressFill: 'bg-rose-600',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    },
    cyan: {
      headerBg: 'bg-cyan-50/90 border-cyan-100 text-cyan-800',
      iconBg: 'bg-cyan-600 text-white',
      badgeBg: 'bg-cyan-100/70 text-cyan-800 border-cyan-200/60',
      progressFill: 'bg-cyan-600',
      btnBg: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-200',
    },
  };

  const currentTheme = themeMap[folder.themeColor] || themeMap.blue;
  const percentage = Math.min(
    100,
    Math.round((folder.usedBytes / (folder.capacityBytes || 1)) * 100)
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group">
      {/* Sample Image Preview Banner (for image/video folders) */}
      {folder.sampleImageUrl && !folder.sampleImageHidden && (
        <div className="relative w-full h-36 bg-slate-900 overflow-hidden border-b border-slate-100">
          <img
            src={folder.sampleImageUrl}
            alt={folder.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
              🖼️ Sampel Media
            </span>
          </div>
        </div>
      )}

      {/* Colored Top Header Pill Bar (Matches image style) */}
      <div className={`px-5 py-4 ${currentTheme.headerBg} border-b flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${currentTheme.iconBg} flex items-center justify-center shadow-xs`}>
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-indigo-600 transition">
              {folder.name}
            </h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">{folder.description || 'Penyimpanan folder cloud'}</p>
          </div>
        </div>

        <button
          onClick={() => onOpenFolder(folder)}
          className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60 flex items-center justify-center transition cursor-pointer shadow-2xs"
          title="Detail Folder"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Storage Used Progress Section */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">Storage Used</span>
            <span className="font-bold text-slate-800">
              {folder.usedStorageFormatted}{' '}
              <span className="text-slate-400 font-normal">/ {folder.totalCapacityFormatted}</span>
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${currentTheme.progressFill}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 3 Metrics Block (Files, Folders, Shared) */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
          <div className="px-1">
            <div className="text-sm font-bold text-slate-900">{folder.filesCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Files</div>
          </div>
          <div className="px-1 border-x border-slate-100">
            <div className="text-sm font-bold text-slate-900">{folder.foldersCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Folders</div>
          </div>
          <div className="px-1">
            <div className="text-sm font-bold text-slate-900">{folder.sharedCount}</div>
            <div className="text-[10px] text-slate-500 font-medium">Shared</div>
          </div>
        </div>

        {/* File Type Tags & HDD Badge */}
        <div className="flex flex-wrap items-center gap-1.5">
          {folder.hddName && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1">
              <HardDrive className="w-2.5 h-2.5" />
              {folder.hddName}
            </span>
          )}
          {folder.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-700 border border-slate-200/60"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Bottom Row: Owner avatar + Created Date & "Open" Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div className="flex items-center gap-2">
            {folder.ownerAvatar ? (
              <img
                src={folder.ownerAvatar}
                alt={folder.ownerName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                {folder.ownerName.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-900 line-clamp-1">{folder.ownerName}</div>
              <div className="text-[10px] text-slate-400">Created {folder.createdAt}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenFolder(folder)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs ${currentTheme.btnBg} flex items-center gap-1.5`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </div>
      </div>
    </div>
  );
};
