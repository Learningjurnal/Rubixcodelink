import { PresetColor } from '../types';

export interface ColorDef {
  name: string;
  hex: string;
  dot: string;
  badgeLight: string;
  badgeDark: string;
  selectClass: string;
}

export const PRESET_COLORS: Record<PresetColor, ColorDef> = {
  rose: {
    name: 'Merah (Rose)',
    hex: '#f43f5e',
    dot: 'bg-rose-500',
    badgeLight: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeDark: 'dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80',
    selectClass: 'bg-rose-50/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  emerald: {
    name: 'Hijau (Emerald)',
    hex: '#10b981',
    dot: 'bg-emerald-500',
    badgeLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeDark: 'dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80',
    selectClass: 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  amber: {
    name: 'Kuning / Oranye (Amber)',
    hex: '#f59e0b',
    dot: 'bg-amber-500',
    badgeLight: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeDark: 'dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80',
    selectClass: 'bg-amber-50/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  blue: {
    name: 'Biru (Blue)',
    hex: '#3b82f6',
    dot: 'bg-blue-500',
    badgeLight: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeDark: 'dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/80',
    selectClass: 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  indigo: {
    name: 'Indigo (Ungu Biru)',
    hex: '#6366f1',
    dot: 'bg-indigo-500',
    badgeLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeDark: 'dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/80',
    selectClass: 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  purple: {
    name: 'Ungu (Purple)',
    hex: '#a855f7',
    dot: 'bg-purple-500',
    badgeLight: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeDark: 'dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80',
    selectClass: 'bg-purple-50/80 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  cyan: {
    name: 'Biru Muda (Cyan)',
    hex: '#06b6d4',
    dot: 'bg-cyan-500',
    badgeLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    badgeDark: 'dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/80',
    selectClass: 'bg-cyan-50/80 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  teal: {
    name: 'Teal (Hijau Toska)',
    hex: '#14b8a6',
    dot: 'bg-teal-500',
    badgeLight: 'bg-teal-50 text-teal-700 border-teal-200',
    badgeDark: 'dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/80',
    selectClass: 'bg-teal-50/80 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  pink: {
    name: 'Merah Muda (Pink)',
    hex: '#ec4899',
    dot: 'bg-pink-500',
    badgeLight: 'bg-pink-50 text-pink-700 border-pink-200',
    badgeDark: 'dark:bg-pink-950/70 dark:text-pink-300 dark:border-pink-800/80',
    selectClass: 'bg-pink-50/80 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  },
  slate: {
    name: 'Abu-abu (Slate)',
    hex: '#64748b',
    dot: 'bg-slate-400',
    badgeLight: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeDark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    selectClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

export const COLOR_KEYS = Object.keys(PRESET_COLORS) as PresetColor[];

/**
 * Default color assignments for out-of-the-box experience
 */
export const DEFAULT_STATUS_COLORS: Record<string, PresetColor> = {
  'Blank': 'rose',
  'Sudah Terunduh': 'emerald',
  'Proses': 'amber',
  'Gagal': 'slate',
  'Web Inactive': 'rose',
};

export const DEFAULT_OUTPUT_COLORS: Record<string, PresetColor> = {
  'Single': 'blue',
  'Batch': 'indigo',
  'Bulk': 'purple',
  'Folder': 'cyan',
  'Mirror': 'teal',
};

export const DEFAULT_REGION_COLORS: Record<string, PresetColor> = {
  'LIVE': 'emerald',
  'ASIA': 'amber',
  'US': 'blue',
  'EU': 'purple',
  'ID': 'rose',
  'GLOBAL': 'cyan',
};

export function getOptionColor(
  value: string | undefined | null,
  colorMap?: Record<string, PresetColor>,
  defaultMap?: Record<string, PresetColor>
): PresetColor {
  const cleanVal = (value || '').trim();

  // 1. Direct exact match
  if (colorMap && colorMap[cleanVal]) {
    return colorMap[cleanVal];
  }
  if (defaultMap && defaultMap[cleanVal]) {
    return defaultMap[cleanVal];
  }

  // 2. Case-insensitive match in user colorMap
  if (colorMap && cleanVal) {
    const lower = cleanVal.toLowerCase();
    for (const [k, v] of Object.entries(colorMap)) {
      if (k.trim().toLowerCase() === lower) {
        return v;
      }
    }
  }

  // 3. Case-insensitive match in defaultMap
  if (defaultMap && cleanVal) {
    const lower = cleanVal.toLowerCase();
    for (const [k, v] of Object.entries(defaultMap)) {
      if (k.trim().toLowerCase() === lower) {
        return v;
      }
    }
  }

  // 4. Semantic Heuristics Fallbacks (prevent unwanted slate/grey pills)
  const lower = cleanVal.toLowerCase();
  if (!cleanVal || lower === 'blank' || lower === 'empty' || lower.includes('belum')) {
    if (colorMap && colorMap['Blank']) return colorMap['Blank'];
    if (defaultMap && defaultMap['Blank']) return defaultMap['Blank'];
    return 'rose';
  }
  if (lower.includes('terunduh') || lower.includes('download') || lower.includes('selesai') || lower.includes('done')) {
    if (colorMap && colorMap['Sudah Terunduh']) return colorMap['Sudah Terunduh'];
    if (defaultMap && defaultMap['Sudah Terunduh']) return defaultMap['Sudah Terunduh'];
    return 'emerald';
  }
  if (lower.includes('proses') || lower.includes('process') || lower.includes('pending') || lower.includes('antri')) {
    if (colorMap && colorMap['Proses']) return colorMap['Proses'];
    if (defaultMap && defaultMap['Proses']) return defaultMap['Proses'];
    return 'amber';
  }
  if (lower.includes('inactive') || lower.includes('mati') || lower.includes('rusak') || lower.includes('gagal') || lower.includes('fail') || lower.includes('error')) {
    if (colorMap && colorMap['Web Inactive']) return colorMap['Web Inactive'];
    if (defaultMap && defaultMap['Web Inactive']) return defaultMap['Web Inactive'];
    return 'rose';
  }

  // Output heuristics
  if (lower.includes('single')) return colorMap?.['Single'] || defaultMap?.['Single'] || 'blue';
  if (lower.includes('batch')) return colorMap?.['Batch'] || defaultMap?.['Batch'] || 'indigo';
  if (lower.includes('bulk')) return colorMap?.['Bulk'] || defaultMap?.['Bulk'] || 'purple';
  if (lower.includes('folder')) return colorMap?.['Folder'] || defaultMap?.['Folder'] || 'cyan';
  if (lower.includes('mirror')) return colorMap?.['Mirror'] || defaultMap?.['Mirror'] || 'teal';

  // Region heuristics
  if (lower.includes('live')) return colorMap?.['LIVE'] || defaultMap?.['LIVE'] || 'emerald';
  if (lower.includes('asia')) return colorMap?.['ASIA'] || defaultMap?.['ASIA'] || 'amber';
  if (lower.includes('us')) return colorMap?.['US'] || defaultMap?.['US'] || 'blue';
  if (lower.includes('eu')) return colorMap?.['EU'] || defaultMap?.['EU'] || 'purple';
  if (lower.includes('id')) return colorMap?.['ID'] || defaultMap?.['ID'] || 'rose';
  if (lower.includes('global')) return colorMap?.['GLOBAL'] || defaultMap?.['GLOBAL'] || 'cyan';

  return 'slate';
}

export function getColorClasses(colorKey: PresetColor): string {
  const def = PRESET_COLORS[colorKey] || PRESET_COLORS.slate;
  return `${def.badgeLight} ${def.badgeDark}`;
}
