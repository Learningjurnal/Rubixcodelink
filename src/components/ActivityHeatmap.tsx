import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Flame,
  CheckCircle2,
  PlusCircle,
  Activity,
  ArrowUpRight,
  ExternalLink,
  X,
  Sparkles,
  TrendingUp,
  Download,
  Link as LinkIcon,
} from 'lucide-react';
import { LinkItem } from '../types';
import { parseDateToTimestamp, formatToISODate } from '../utils/dateHelper';

interface ActivityHeatmapProps {
  items: LinkItem[];
}

type HeatmapMode = 'all' | 'downloads' | 'additions';

interface DayActivity {
  dateStr: string; // 'YYYY-MM-DD'
  dateObj: Date;
  dayOfMonth: number;
  dayOfWeekName: string; // 'Sen', 'Sel', etc.
  monthName: string; // 'Jan', 'Feb', etc.
  formattedDateIndo: string; // 'Senin, 10 Maret 2026'
  downloadsCount: number;
  additionsCount: number;
  totalCount: number;
  items: LinkItem[];
}

const INDO_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const INDO_DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ items }) => {
  const [mode, setMode] = useState<HeatmapMode>('all');
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  // Generate 31 days data for the past month (up to today or latest item date)
  const heatmapData = useMemo(() => {
    // Determine the anchor date: either today, or the latest item date if items are in the future/past
    let anchorDate = new Date();

    // Check if items have later dates
    let maxItemTime = 0;
    items.forEach(item => {
      const t = parseDateToTimestamp(item.diperbarui) ?? item.createdAt ?? 0;
      if (t > maxItemTime) maxItemTime = t;
    });

    if (maxItemTime > anchorDate.getTime()) {
      anchorDate = new Date(maxItemTime);
    }

    // Normalize anchorDate to midnight
    anchorDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());

    // Map each item to a 'YYYY-MM-DD' date string
    const itemsByDate: Record<string, { additions: LinkItem[]; downloads: LinkItem[] }> = {};

    items.forEach(item => {
      let itemDateObj: Date | null = null;
      const t = parseDateToTimestamp(item.diperbarui) ?? item.createdAt ?? null;
      if (t) {
        itemDateObj = new Date(t);
      } else {
        itemDateObj = new Date();
      }

      const isoDate = formatToISODate(itemDateObj);
      if (!itemsByDate[isoDate]) {
        itemsByDate[isoDate] = { additions: [], downloads: [] };
      }

      // It counts as an addition
      itemsByDate[isoDate].additions.push(item);

      // If status is 'Sudah Terunduh', also record as a download activity
      if (item.status === 'Sudah Terunduh') {
        itemsByDate[isoDate].downloads.push(item);
      }
    });

    // Create array for past 30 days (chronological: oldest to newest)
    const days: DayActivity[] = [];
    const TOTAL_DAYS = 30;

    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);

      const isoStr = formatToISODate(d);
      const dayRecord = itemsByDate[isoStr] || { additions: [], downloads: [] };

      // Deduplicate items on this day for drilldown
      const dayItemsMap = new Map<string, LinkItem>();
      dayRecord.additions.forEach(it => dayItemsMap.set(it.id, it));
      dayRecord.downloads.forEach(it => dayItemsMap.set(it.id, it));
      const allDayItems = Array.from(dayItemsMap.values());

      const dayOfWeek = d.getDay();
      const dayName = INDO_DAYS[dayOfWeek];
      const dayFullName = INDO_DAYS_FULL[dayOfWeek];
      const monthName = INDO_MONTHS[d.getMonth()];

      days.push({
        dateStr: isoStr,
        dateObj: d,
        dayOfMonth: d.getDate(),
        dayOfWeekName: dayName,
        monthName: monthName.slice(0, 3),
        formattedDateIndo: `${dayFullName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`,
        downloadsCount: dayRecord.downloads.length,
        additionsCount: dayRecord.additions.length,
        totalCount: dayRecord.additions.length + dayRecord.downloads.length,
        items: allDayItems,
      });
    }

    return days;
  }, [items]);

  // Activity calculation based on active mode
  const getActivityValue = (day: DayActivity): number => {
    if (mode === 'downloads') return day.downloadsCount;
    if (mode === 'additions') return day.additionsCount;
    return day.totalCount;
  };

  // High-level summary metrics
  const stats = useMemo((): {
    totalActivity: number;
    peakDay: DayActivity | null;
    peakValue: number;
    activeDaysCount: number;
    totalDays: number;
    averagePerDay: string;
  } => {
    let totalActivity = 0;
    let peakDay: DayActivity | null = null;
    let peakValue = 0;
    let activeDaysCount = 0;

    heatmapData.forEach(day => {
      const val = getActivityValue(day);
      totalActivity += val;
      if (val > 0) activeDaysCount++;
      if (val > peakValue) {
        peakValue = val;
        peakDay = day;
      }
    });

    const averagePerDay = (totalActivity / (heatmapData.length || 1)).toFixed(1);

    return {
      totalActivity,
      peakDay,
      peakValue,
      activeDaysCount,
      totalDays: heatmapData.length,
      averagePerDay,
    };
  }, [heatmapData, mode]);

  // Color tier mapping for heatmap tiles
  const getColorClass = (val: number, isSelected: boolean) => {
    if (val === 0) {
      return isSelected
        ? 'bg-slate-200 dark:bg-slate-700 ring-2 ring-indigo-500 text-slate-400 dark:text-slate-500'
        : 'bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50';
    }
    if (val <= 2) {
      return isSelected
        ? 'bg-emerald-200 dark:bg-emerald-900 ring-2 ring-indigo-500 text-emerald-900 dark:text-emerald-200 font-semibold'
        : 'bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 font-medium';
    }
    if (val <= 6) {
      return isSelected
        ? 'bg-emerald-400 dark:bg-emerald-700 ring-2 ring-indigo-500 text-emerald-950 dark:text-white font-bold'
        : 'bg-emerald-300/90 dark:bg-emerald-800 hover:bg-emerald-400 dark:hover:bg-emerald-700 text-emerald-900 dark:text-emerald-100 border border-emerald-400/60 dark:border-emerald-700 font-semibold';
    }
    if (val <= 12) {
      return isSelected
        ? 'bg-emerald-500 dark:bg-emerald-600 ring-2 ring-indigo-500 text-white font-bold shadow-xs'
        : 'bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white border border-emerald-600 dark:border-emerald-500 font-bold';
    }
    // High peak
    return isSelected
      ? 'bg-emerald-600 dark:bg-emerald-500 ring-2 ring-indigo-500 text-white font-extrabold shadow-sm'
      : 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 text-white border border-emerald-700 dark:border-emerald-400 font-extrabold shadow-2xs';
  };

  return (
    <div
      id="activity-heatmap-container"
      className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Heatmap Aktivitas (Sebulan Terakhir)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                30 Hari
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisasi intensitas hari-hari unduhan dan penambahan tautan terbaru
            </p>
          </div>
        </div>

        {/* Mode Segmented Controls */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setMode('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'all'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Semua</span>
          </button>
          <button
            onClick={() => setMode('downloads')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'downloads'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Terunduh</span>
          </button>
          <button
            onClick={() => setMode('additions')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'additions'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Penambahan</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Hari Tersibuk</span>
          </div>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
            {stats.peakDay ? `${stats.peakDay.dayOfMonth} ${stats.peakDay.monthName}` : '-'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {stats.peakValue > 0 ? `${stats.peakValue} aktivitas tercatat` : 'Belum ada'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Total Aktivitas</span>
          </div>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            {stats.totalActivity} <span className="text-xs font-normal text-slate-500">tindakan</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Dalam 30 hari kalender
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Hari Aktif</span>
          </div>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            {stats.activeDaysCount} <span className="text-xs font-normal text-slate-500">/ {stats.totalDays} hari</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {Math.round((stats.activeDaysCount / (stats.totalDays || 1)) * 100)}% konsistensi
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Rata-Rata Harian</span>
          </div>
          <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
            {stats.averagePerDay} <span className="text-xs font-normal text-slate-500">aktivitas/hari</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Laju produktivitas
          </div>
        </div>
      </div>

      {/* 30-Day Heatmap Grid (Scrollable on small devices, responsive on desktop) */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Matriks Kalender Harian (Klik salah satu kotak untuk rincian)</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {heatmapData[0]?.formattedDateIndo} — {heatmapData[heatmapData.length - 1]?.formattedDateIndo}
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2 min-w-[540px] sm:min-w-0">
            {heatmapData.map(day => {
              const val = getActivityValue(day);
              const isSelected = selectedDay?.dateStr === day.dateStr;
              const isPeak = stats.peakDay?.dateStr === day.dateStr && val > 0;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  title={`${day.formattedDateIndo}: ${val} aktivitas (${day.additionsCount} ditambahkan, ${day.downloadsCount} terunduh)`}
                  className={`relative p-2 rounded-2xl flex flex-col items-center justify-between transition-all duration-200 cursor-pointer h-20 ${getColorClass(
                    val,
                    isSelected
                  )}`}
                >
                  {/* Top indicator: Day of week */}
                  <div className="text-[9px] font-medium opacity-80 uppercase tracking-wider">
                    {day.dayOfWeekName}
                  </div>

                  {/* Day Number */}
                  <div className="text-base font-extrabold leading-none my-0.5">
                    {day.dayOfMonth}
                  </div>

                  {/* Bottom: Activity Count Pill */}
                  <div
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                      val > 0
                        ? 'bg-black/20 text-white dark:bg-black/30'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {val > 0 ? `${val}` : '—'}
                  </div>

                  {/* Peak Flame Badge */}
                  {isPeak && (
                    <span
                      title="Hari Tersibuk"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs text-[9px]"
                    >
                      🔥
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Filter Guide */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Kepadatan:</span>
          <span className="text-[10px] text-slate-400">Sedikit</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700" title="0 aktivitas" />
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200" title="1-2 aktivitas" />
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-300 dark:bg-emerald-800 border border-emerald-400" title="3-6 aktivitas" />
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 dark:bg-emerald-600 border border-emerald-600" title="7-12 aktivitas" />
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 dark:bg-emerald-500 border border-emerald-700" title="13+ aktivitas" />
          </div>
          <span className="text-[10px] text-slate-400">Banyak</span>
        </div>

        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          Tip: Klik pada kotak hari untuk melihat daftar tautan yang diperbarui
        </div>
      </div>

      {/* Selected Day Drill-down Drawer Panel */}
      {selectedDay && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-indigo-200 dark:border-indigo-900/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Rincian Aktivitas: {selectedDay.formattedDateIndo}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDay.additionsCount} penambahan tautan • {selectedDay.downloadsCount} status unduhan selesai
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Tutup Rincian"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Links list */}
          {selectedDay.items.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Tidak ada aktivitas tercatat pada tanggal ini.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedDay.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.status === 'Sudah Terunduh'
                          ? 'bg-emerald-500'
                          : item.status === 'Proses'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.name || item.link}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-2">
                        <span className="font-mono">{item.link}</span>
                        {item.region && <span>• Wilayah: {item.region}</span>}
                        {item.output && <span>• Output: {item.output}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.status === 'Sudah Terunduh'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'Proses'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.status}
                    </span>

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Buka Tautan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
