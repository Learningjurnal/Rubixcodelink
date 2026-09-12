import React, { useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Download,
  Check,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { HardDriveProfile, StorageFolder, HddTransferPlan } from '../types';
import { formatBytes } from '../utils/storageExcelHelper';

interface HddHealthRebalanceAdvisorProps {
  drives: HardDriveProfile[];
  folders: StorageFolder[];
  transferPlans: HddTransferPlan[];
  onAddTransferPlan: (plan: Omit<HddTransferPlan, 'id' | 'createdAt'>) => void;
  onRemoveTransferPlan: (planId: string) => void;
  onTogglePlanStatus: (planId: string) => void;
  onClearCompleted: () => void;
}

export const HddHealthRebalanceAdvisor: React.FC<HddHealthRebalanceAdvisorProps> = ({
  drives,
  folders,
  transferPlans,
  onAddTransferPlan,
  onRemoveTransferPlan,
  onTogglePlanStatus,
  onClearCompleted,
}) => {
  // Find overloaded drives (> warning threshold or >85%)
  const overloadedDrives = useMemo(() => {
    return drives.filter(d => {
      const cap = (d.totalCapacityGB || 1) * 1024 * 1024 * 1024;
      const usage = (d.usedBytes / cap) * 100;
      return usage >= (d.warningThresholdPercent || 80);
    });
  }, [drives]);

  // Find most spacious drives (lowest usage %)
  const healthyDrives = useMemo(() => {
    return [...drives].sort((a, b) => {
      const capA = (a.totalCapacityGB || 1) * 1024 * 1024 * 1024;
      const capB = (b.totalCapacityGB || 1) * 1024 * 1024 * 1024;
      const freeA = capA - a.usedBytes;
      const freeB = capB - b.usedBytes;
      return freeB - freeA; // Most free bytes first
    });
  }, [drives]);

  // Generate automatic smart recommendations
  const smartRecommendations = useMemo(() => {
    const recs: {
      id: string;
      sourceDrive: HardDriveProfile;
      targetDrive: HardDriveProfile;
      folder: StorageFolder;
      reason: string;
    }[] = [];

    overloadedDrives.forEach(ovDrive => {
      // Find largest folders in this drive
      const driveFolders = folders
        .filter(f => f.hddId === ovDrive.id)
        .sort((a, b) => b.usedBytes - a.usedBytes);

      const target = healthyDrives.find(d => d.id !== ovDrive.id);
      if (driveFolders.length > 0 && target) {
        const topFolder = driveFolders[0];
        // Check if not already in plans
        const inPlan = transferPlans.some(
          p => p.name === topFolder.name && p.status !== 'completed'
        );
        if (!inPlan) {
          recs.push({
            id: `rec-${ovDrive.id}-${topFolder.id}`,
            sourceDrive: ovDrive,
            targetDrive: target,
            folder: topFolder,
            reason: `Kapasitas ${ovDrive.name} mencapai ${Math.round(
              (ovDrive.usedBytes / (ovDrive.totalCapacityGB * 1024 * 1024 * 1024)) * 100
            )}%. Pindahkan untuk mencegah fragmentasi dan menjaga kesehatan mekanis.`,
          });
        }
      }
    });

    return recs;
  }, [overloadedDrives, healthyDrives, folders, transferPlans]);

  // Export checklist as text file
  const handleExportChecklist = () => {
    let content = `=====================================================\n`;
    content += `RUBIXXLINK - CHECKLIST PEMINDAHAN FILE UNTUK KESEHATAN HDD\n`;
    content += `Tanggal: ${new Date().toLocaleString()}\n`;
    content += `=====================================================\n\n`;

    transferPlans.forEach((p, idx) => {
      const src = drives.find(d => d.id === p.sourceHddId)?.name || p.sourceHddId;
      const dst = drives.find(d => d.id === p.targetHddId)?.name || p.targetHddId;
      content += `[${idx + 1}] [${p.status === 'completed' ? 'SUDAH' : 'BELUM'}] ${p.name}\n`;
      content += `    - Tipe: ${p.itemType.toUpperCase()} (${p.sizeFormatted})\n`;
      content += `    - Dari: ${src}\n`;
      content += `    - Ke  : ${dst}\n`;
      content += `    - Path Asal: ${p.path}\n`;
      content += `    - Alasan: ${p.reason || '-'}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist_pemindahan_hdd_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HDD Health Status Bar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {drives.map(drive => {
          const capBytes = (drive.totalCapacityGB || 1) * 1024 * 1024 * 1024;
          const usagePercent = Math.round((drive.usedBytes / capBytes) * 100);
          const freeBytes = Math.max(0, capBytes - drive.usedBytes);
          const isCritical = usagePercent >= 85;
          const isWarning = usagePercent >= (drive.warningThresholdPercent || 80);

          return (
            <div
              key={drive.id}
              className={`p-4 rounded-3xl border transition shadow-2xs ${
                isCritical
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : isWarning
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {drive.driveLetterOrMount}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isCritical
                      ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300'
                      : isWarning
                      ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isCritical ? 'Kritis' : isWarning ? 'Waspada' : 'Sehat & Aman'}
                </span>
              </div>

              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                {drive.name}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-2 my-2 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                  className={`h-full transition-all duration-300 ${
                    isCritical
                      ? 'bg-rose-500'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Terpakai: {usagePercent}%</span>
                <span>Sisa: {formatBytes(freeBytes)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart Rebalance Recommendations */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Rekomendasi Pemindahan Berkas Otomatis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saran cerdas untuk menyeimbangkan kapasitas 4 HDD demi memperpanjang umur hardware
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {smartRecommendations.length} Saran Aktif
          </span>
        </div>

        {smartRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {smartRecommendations.map(rec => (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Beban Berat Terdeteksi:
                    </span>
                    <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                      {rec.folder.name}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {rec.folder.usedStorageFormatted || formatBytes(rec.folder.usedBytes)}
                  </span>
                </div>

                {/* Transfer Path Indicator */}
                <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <div className="truncate mr-1 text-slate-700 dark:text-slate-300 font-medium">
                    {rec.sourceDrive.name.split('-')[0]}
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mx-1" />
                  <div className="truncate ml-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    {rec.targetDrive.name.split('-')[0]} (Sisa Luang)
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {rec.reason}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    onAddTransferPlan({
                      itemType: 'folder',
                      name: rec.folder.name,
                      path: rec.folder.path || `${rec.sourceDrive.driveLetterOrMount}${rec.folder.name}`,
                      sizeBytes: rec.folder.usedBytes,
                      sizeFormatted: rec.folder.usedStorageFormatted || formatBytes(rec.folder.usedBytes),
                      sourceHddId: rec.sourceDrive.id,
                      targetHddId: rec.targetDrive.id,
                      status: 'planned',
                      reason: rec.reason,
                    })
                  }
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Tambahkan ke Checklist Pemindahan</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-slate-700 dark:text-slate-200">
              Kondisi Kapasitas Semua Hardisk Optimal!
            </div>
            <p className="text-slate-400 mt-1 max-w-md mx-auto text-[11px]">
              Tidak ada hardisk yang melebihi batas waspada (&gt;80%). Anda juga bisa menandai folder secara manual lewat tab "Hirarki Folder & Subfolder".
            </p>
          </div>
        )}
      </div>

      {/* Transfer Planner Checklist (Planned Moves) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Checklist Rencana Pemindahan File</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {transferPlans.length} Rencana
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gunakan daftar ini sebagai panduan saat memindahkan file antar hardisk di komputer Anda
            </p>
          </div>

          <div className="flex items-center gap-2">
            {transferPlans.some(p => p.status === 'completed') && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Hapus Selesai
              </button>
            )}

            {transferPlans.length > 0 && (
              <button
                type="button"
                onClick={handleExportChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Checklist (.txt)</span>
              </button>
            )}
          </div>
        </div>

        {transferPlans.length > 0 ? (
          <div className="space-y-2.5">
            {transferPlans.map(plan => {
              const srcDrive = drives.find(d => d.id === plan.sourceHddId);
              const dstDrive = drives.find(d => d.id === plan.targetHddId);
              const isDone = plan.status === 'completed';

              return (
                <div
                  key={plan.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={() => onTogglePlanStatus(plan.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                      }`}
                    >
                      {isDone && <Check className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate ${
                            isDone ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {plan.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {plan.sizeFormatted}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          Dari: {srcDrive?.name.split('-')[0] || plan.sourceHddId}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          Ke: {dstDrive?.name.split('-')[0] || plan.targetHddId}
                        </span>
                        {plan.path && (
                          <>
                            <span>•</span>
                            <span className="font-mono truncate max-w-xs">{plan.path}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Plan */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {isDone ? 'Sudah Dipindahkan' : 'Rencana Aktif'}
                    </span>

                    <button
                      type="button"
                      onClick={() => onRemoveTransferPlan(plan.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center transition cursor-pointer"
                      title="Hapus dari rencana"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Belum ada berkas atau folder yang ditandai untuk dipindahkan. Klik tombol "Pindahkan" pada folder di tab "Hirarki Folder & Subfolder".
          </div>
        )}
      </div>
    </div>
  );
};
