import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Globe, Layers } from 'lucide-react';
import { LinkItem } from '../types';
import { ActivityHeatmap } from './ActivityHeatmap';

interface AnalyticsChartsProps {
  items: LinkItem[];
}

const STATUS_COLORS: Record<string, string> = {
  'Blank': '#f43f5e',           // rose-500
  'Sudah Terunduh': '#10b981',  // emerald-500
  'Proses': '#f59e0b',          // amber-500
  'Gagal': '#64748b',           // slate-500
  'Web Inactive': '#ef4444',    // red-500
};

const DEFAULT_COLOR = '#6366f1'; // indigo-500

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ items }) => {
  // 1. Status Data
  const statusCounts: Record<string, number> = {};
  items.forEach(item => {
    const s = item.status || 'Blank';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || DEFAULT_COLOR,
  }));

  // 2. Output Data
  const outputCounts: Record<string, number> = {};
  items.forEach(item => {
    const out = item.output || 'Single';
    outputCounts[out] = (outputCounts[out] || 0) + 1;
  });

  const outputData = Object.entries(outputCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 3. Region Data
  const regionCounts: Record<string, number> = {};
  items.forEach(item => {
    const reg = item.region || 'LIVE';
    regionCounts[reg] = (regionCounts[reg] || 0) + 1;
  });

  const regionData = Object.entries(regionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 4. Date/Timeline Trend Data (Grouping by diperbarui date string)
  const dateCounts: Record<string, number> = {};
  items.forEach(item => {
    const d = item.diperbarui || 'Lainnya';
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });

  const timelineData = Object.entries(dateCounts)
    .map(([date, total]) => ({ date, total }))
    .slice(-7); // last 7 distinct dates

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 shadow-xs mb-6">
        <BarChart3 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Belum Ada Data untuk Grafik</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Tambahkan atau impor link terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Visualisasi Data & Analitik Tautan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Metrik distribusi status, output, dan linimasa pembaruan
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Charts (Full screen bento width) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Chart 1: Donut Status Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Distribusi Status</h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {items.length} link
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={65}
                  paddingAngle={3}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 justify-center">
            {statusData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium">{entry.name}</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Output Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Tipe Output</h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {outputData.length} tipe
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outputData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            Sebaran tipe unduhan file
          </p>
        </div>

        {/* Chart 3: Region Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Distribusi Wilayah (Region)</h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {regionData.length} region
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            Server lokasi penyimpanan
          </p>
        </div>

        {/* Chart 4: Timeline / Trend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Linimasa Pembaruan</h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Terbaru</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    fontSize: '11px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            Aktivitas pengelompokan tanggal
          </p>
        </div>
      </div>

      {/* Heatmap Aktivitas (Sebulan Terakhir) */}
      <ActivityHeatmap items={items} />
    </div>
  );
};
