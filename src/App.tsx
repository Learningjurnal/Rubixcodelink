/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Download,
  Search,
  RefreshCw,
  Sliders,
  Sparkles,
  BarChart3,
  User as UserIcon,
  LogIn,
  LogOut,
  Database,
  CloudCheck,
  CheckCircle2,
  HardDrive,
  Layers,
  LayoutDashboard,
  FolderOpen,
  Bell,
  Check,
  Sun,
  Moon,
  ArrowUpDown,
  ChevronDown,
  Clock,
  Calendar,
  RotateCcw,
  Shield,
} from 'lucide-react';
import {
  LinkItem,
  LinkStatus,
  FilterStatus,
  AppSettings,
  SortField,
  SortDirection,
  StorageFolder,
  StorageSubfolder,
  StorageFile,
  StorageOverviewStats,
  CommandCenterTab,
  HardDriveProfile,
  HddTransferPlan,
  AuditLogEntry,
} from './types';
import { INITIAL_LINKS } from './data/initialData';
import { INITIAL_FOLDERS, INITIAL_STORAGE_OVERVIEW } from './data/initialStorageData';
import { DEFAULT_HARD_DRIVES } from './utils/storageExcelHelper';
import { CommandCenterKPIs } from './components/CommandCenterKPIs';
import { StorageManagementCard } from './components/StorageManagementCard';
import { LinkManagementCard } from './components/LinkManagementCard';
import { FolderDetailModal } from './components/FolderDetailModal';
import { SubfolderDetailModal } from './components/SubfolderDetailModal';
import { NewFolderModal } from './components/NewFolderModal';
import { AuditLogModal } from './components/AuditLogModal';
import { StatsCards } from './components/StatsCards';
import { LinkTable } from './components/LinkTable';
import { UploadExcelModal } from './components/UploadExcelModal';
import { AddLinkModal } from './components/AddLinkModal';
import { BatchActionsBar } from './components/BatchActionsBar';
import { SettingsModal } from './components/SettingsModal';
import { ResetDataModal } from './components/ResetDataModal';
import { AuthModal } from './components/AuthModal';
import { ExtractLinkModal } from './components/ExtractLinkModal';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { Tooltip } from './components/Tooltip';
import { ToastContainer, ToastMessage } from './components/Toast';
import { exportToExcel, downloadTemplateExcel, formatDateNow } from './utils/excelHelper';
import { exportDatabaseBackupJson } from './lib/indexedDbStorage';
import { isWithinPeriod, formatToISODate } from './utils/dateHelper';
import { checkSingleUrlStatus } from './utils/urlChecker';
import { DashboardHubLanding } from './components/DashboardHubLanding';
import { AuthScreen, AppUser } from './components/AuthScreen';
import {
  auth,
  onAuthStateChanged,
  signOut,
  User,
  subscribeToUserFolders,
  addUserFolderToFirestore,
  batchAddUserFoldersToFirestore,
  clearAllUserFoldersFromFirestore,
  updateUserFolderInFirestore,
  deleteUserFolderFromFirestore,
  addFileToUserFolderInFirestore,
  deleteFileFromUserFolderInFirestore,
  subscribeToUserLinks,
  addUserLinkToFirestore,
  batchAddUserLinksToFirestore,
  updateUserLinkInFirestore,
  deleteUserLinkFromFirestore,
  batchUpdateUserLinkStatusInFirestore,
  batchUpdateUserLinkTagInFirestore,
  batchUpdateItemsInFirestore,
  batchDeleteUserLinksFromFirestore,
  clearAllUserLinksFromFirestore,
  subscribeToUserSettings,
  saveUserSettingsToFirestore,
  DEFAULT_SETTINGS,
} from './lib/supabase';

export default function App() {
  // Command Center Mode: 'dashboard_hub' | 'storage_management' | 'link_management' | 'command_center'
  const [activeTab, setActiveTab] = useState<CommandCenterTab>('dashboard_hub');

  // Auth State (Single-User Workspace)
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('command_center_active_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Guards the one-time self-healing pass in repairMissingSubfolderIds
  // (defined below) against re-entry: writing the repaired data back to
  // Supabase itself triggers a realtime refetch, which would otherwise
  // call the same repair pass again on its own output.
  const idRepairAttemptedRef = useRef(false);

  // Storage Management State - Isolated per authenticated user
  const [folders, setFolders] = useState<StorageFolder[]>(() => {
    // Previously fell back to INITIAL_SAMPLE_FOLDERS (a hardcoded demo
    // dataset — "Koleksi Film 4K & Series", "3D Render & Asset Library",
    // etc., none of it backed by any real database row) whenever there
    // was no cached local copy yet. That's indistinguishable from real
    // data in the UI, and it IS what a user with a genuinely empty
    // Supabase user_folders table sees and tries to manage — confirmed
    // live: every "delete" attempt against it fails because these
    // subfolder objects have no `id` field and no backing row to delete,
    // which is exactly the "tidak punya id database yang valid" report
    // this was traced back to. An empty array here (and in the live
    // subscription callback below) lets the real "no folders yet" empty
    // state render honestly instead.
    try {
      const saved = localStorage.getItem('rubixxx_folders_active');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // 4 External Hard Drives State
  const [hardDrives, setHardDrives] = useState<HardDriveProfile[]>(() => {
    // Same bug class as the folders fallback fixed earlier: requiring
    // `parsed.length > 0` meant a user who deliberately deleted every HDD
    // entry and saved (a legitimate empty configuration) got the
    // hardcoded DEFAULT_HARD_DRIVES sample profiles back on the next
    // load instead — indistinguishable from a delete/reset that silently
    // didn't take. `saved` being present at all (even as `[]`) means the
    // user has already made a real, explicit choice here; only fall back
    // to the bundled defaults when there is truly no saved value yet
    // (first-ever visit).
    try {
      const saved = localStorage.getItem('rubixxx_hard_drives');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_HARD_DRIVES;
  });

  // Transfer plans for HDD health rebalancing
  const [transferPlans, setTransferPlans] = useState<HddTransferPlan[]>(() => {
    try {
      const saved = localStorage.getItem('rubixxx_hdd_transfer_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'plan-sample-1',
        itemType: 'folder',
        name: 'Wedding Footage 2025',
        path: 'E:\\Wedding Footage 2025',
        sizeBytes: 80.5 * 1024 * 1024 * 1024,
        sizeFormatted: '80.5 GB',
        sourceHddId: 'hdd-2',
        targetHddId: 'hdd-3',
        status: 'planned',
        createdAt: Date.now(),
        reason: 'Mengurangi beban kapasitas HDD 2 (89%) ke HDD 3 yang lebih luang',
      },
    ];
  });
  const [selectedFolderForDetail, setSelectedFolderForDetail] = useState<StorageFolder | null>(null);
  const [isFolderDetailModalOpen, setIsFolderDetailModalOpen] = useState(false);
  const [selectedSubfolderForDetail, setSelectedSubfolderForDetail] = useState<StorageSubfolder | null>(null);
  const [isSubfolderDetailModalOpen, setIsSubfolderDetailModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);

  // Dynamic calculation of Overview Stats derived purely from user's actual folders
  const dynamicOverviewStats: StorageOverviewStats = useMemo(() => {
    const totalBytes = folders.reduce((sum, f) => sum + (f.usedBytes || 0), 0);
    const totalCapacity = folders.reduce((sum, f) => sum + (f.capacityBytes || 2 * 1024 * 1024 * 1024), 0);
    const usedPercentage = totalCapacity > 0 ? Math.min(100, Math.round((totalBytes / totalCapacity) * 100)) : 0;

    let docBytes = 0;
    let mediaBytes = 0;
    let videoBytes = 0;
    let archiveBytes = 0;

    folders.forEach(f => {
      f.files?.forEach(file => {
        const type = (file.type || '').toLowerCase();
        if (type.includes('pdf') || type.includes('doc') || type.includes('xls') || type.includes('txt')) {
          docBytes += file.size;
        } else if (type.includes('png') || type.includes('jpg') || type.includes('image')) {
          mediaBytes += file.size;
        } else if (type.includes('mp4') || type.includes('video') || type.includes('mov')) {
          videoBytes += file.size;
        } else {
          archiveBytes += file.size;
        }
      });
    });

    return {
      usedStorageTB: (totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2),
      totalStorageTB: (totalCapacity / (1024 * 1024 * 1024 * 1024)).toFixed(1),
      usedPercentage,
      totalFolders: folders.length,
      totalFiles: folders.reduce((s, f) => s + (f.filesCount || (f.files?.length || 0)), 0),
      documentsSizeGB: Math.round((docBytes / (1024 * 1024 * 1024)) * 100) / 100,
      imagesMediaSizeGB: Math.round((mediaBytes / (1024 * 1024 * 1024)) * 100) / 100,
      videosSizeGB: Math.round((videoBytes / (1024 * 1024 * 1024)) * 100) / 100,
      archivesSizeGB: Math.round((archiveBytes / (1024 * 1024 * 1024)) * 100) / 100,
    };
  }, [folders]);

  // Ref to scroll to Link Table
  const tableRef = useRef<HTMLDivElement | null>(null);

  // State for Links - Clean, isolated per user
  const [items, setItems] = useState<LinkItem[]>([]);
  const [duplicatesPreventedCount, setDuplicatesPreventedCount] = useState<number>(0);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetCenterOpen, setIsResetCenterOpen] = useState(false);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('rubixxx_audit_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'log-initial-1',
        action: 'CREATE',
        targetType: 'system',
        targetName: 'Rubixxxlink CommandCenter',
        details: 'Sistem diinisialisasi dengan Automated Health Monitor, AI Smart Categorization, dan Audit Trail.',
        timestamp: Date.now() - 3600000,
        formattedTime: new Date(Date.now() - 3600000).toLocaleString('id-ID'),
      },
    ];
  });

  const addAuditLog = (
    action: AuditLogEntry['action'],
    targetType: AuditLogEntry['targetType'],
    targetName: string,
    details: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      targetType,
      targetName,
      details,
      userEmail: currentUser?.email || undefined,
      timestamp: Date.now(),
      formattedTime: new Date().toLocaleString('id-ID'),
    };
    setAuditLogs(prev => {
      const next = [newLog, ...prev].slice(0, 500);
      try {
        localStorage.setItem('rubixxx_audit_logs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Link Health Score calculation
  const linkHealthStats = useMemo(() => {
    if (items.length === 0) return { score: 100, active: 0, broken: 0 };
    const brokenCount = items.filter(
      i => i.status === 'Blank' || i.note.toLowerCase().includes('404') || i.note.toLowerCase().includes('inactive')
    ).length;
    const activeCount = items.length - brokenCount;
    const score = Math.round((activeCount / items.length) * 100);
    return { score, active: activeCount, broken: brokenCount };
  }, [items]);

  // Filters and UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // URL Status Check background process state
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState<{ current: number; total: number } | null>(null);

  // Date Range Period Filter (Periode XXX ke XXX)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Name-presence filter — added after user feedback: many imported links
  // intentionally have no Nama value (confirmed against the real source
  // file — the app was rendering it correctly), but with search alone
  // there was no quick way to isolate "which rows actually have a name"
  // versus the much larger set that don't, to sample-check or fill them in.
  const [nameFilter, setNameFilter] = useState<'all' | 'named' | 'unnamed'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('diperbarui');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isQuickSortMenuOpen, setIsQuickSortMenuOpen] = useState(false);
  const quickSortMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener for quick sort dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickSortMenuRef.current && !quickSortMenuRef.current.contains(e.target as Node)) {
        setIsQuickSortMenuOpen(false);
      }
    };
    if (isQuickSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickSortMenuOpen]);

  // Tambah Link / Upload Excel / Export Excel used to be 3 separate
  // always-visible buttons in the toolbar — consolidated into one "Kelola
  // Data" dropdown so the action bar reads as one control instead of a row
  // of near-identical buttons.
  const [isDataActionMenuOpen, setIsDataActionMenuOpen] = useState(false);
  const dataActionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dataActionMenuRef.current && !dataActionMenuRef.current.contains(e.target as Node)) {
        setIsDataActionMenuOpen(false);
      }
    };
    if (isDataActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDataActionMenuOpen]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme State: Light / Dark mode with local storage persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      addToast('info', `Tema diubah ke mode ${nextTheme === 'dark' ? 'Gelap (Dark)' : 'Terang (Light)'}.`);
      return nextTheme;
    });
  };

  // 1. Supabase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem(
            'command_center_active_user',
            JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
            })
          );
        } catch {}
      } else {
        const stored = localStorage.getItem('command_center_active_user');
        if (!stored) {
          setCurrentUser(null);
        }
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Self-heals subfolders that were persisted without a real database `id`
  // (data imported by an older version of the Excel-import code, before id
  // generation was solidified — confirmed live: a user's bulk-delete hit
  // exactly this case, 18/18 selected subfolders with no id, so the
  // backend correctly refused to touch them). Every subfolder-targeting
  // action (edit, delete, move) needs a real id to find its target inside
  // the parent folder's `subfolders` JSONB array, so these rows are
  // otherwise permanently stuck — unselectable for bulk actions and
  // undeletable one at a time. Runs once per session (guarded by
  // idRepairAttemptedRef), assigns each id-less subfolder a fresh unique
  // id, and writes the repaired array back to Supabase per affected
  // folder — same one-write-per-parent batching as the bulk handlers
  // below, for the same stale-closure reason.
  const repairMissingSubfolderIds = async (foldersToCheck: StorageFolder[]) => {
    if (idRepairAttemptedRef.current || !currentUser) return;
    idRepairAttemptedRef.current = true;

    const patches: { folderId: string; subfolders: StorageSubfolder[] }[] = [];
    let repairedCount = 0;

    foldersToCheck.forEach(folder => {
      const subs = folder.subfolders || [];
      if (subs.length === 0 || subs.every(s => s.id)) return;
      const repaired = subs.map((s, idx) =>
        s.id ? s : { ...s, id: `sub-repair-${folder.id}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
      );
      repairedCount += repaired.length - subs.filter(s => s.id).length;
      patches.push({ folderId: folder.id, subfolders: repaired });
    });

    if (patches.length === 0) return;

    try {
      for (const p of patches) {
        await updateUserFolderInFirestore(currentUser.uid, p.folderId, { subfolders: p.subfolders });
      }
      setFolders(prev =>
        prev.map(f => {
          const p = patches.find(x => x.folderId === f.id);
          return p ? { ...f, subfolders: p.subfolders } : f;
        })
      );
      addToast(
        'success',
        `${repairedCount} subfolder lama tanpa ID database berhasil diperbaiki di ${patches.length} folder — sekarang bisa dihapus/diedit normal.`
      );
    } catch (e: any) {
      console.error('Failed to repair missing subfolder ids:', e);
      idRepairAttemptedRef.current = false; // allow retry on the next folders refetch
      addToast('error', `Gagal memperbaiki ID subfolder lama: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  // 2. User-isolated Supabase Data Subscriptions
  useEffect(() => {
    if (!currentUser) {
      setFolders([]);
      setItems([]);
      return;
    }

    setIsDbLoading(true);

    // Subscribe to current user's folders
    const unsubFolders = subscribeToUserFolders(
      currentUser.uid,
      userFolders => {
        if (userFolders && userFolders.length > 0) {
          setFolders(userFolders);
          repairMissingSubfolderIds(userFolders);
        } else {
          // Genuinely zero folders in this user's Supabase user_folders
          // table is a real, valid state (a brand new account, or an
          // account that hasn't imported/created anything yet) — show
          // that honestly instead of substituting the hardcoded demo
          // dataset (see the useState initializer above for the full
          // story on why that substitution was actively harmful).
          setFolders([]);
        }
      },
      err => {
        console.warn('Error subscribing to user folders:', err);
        addToast(
          'error',
          `Gagal memuat data folder dari database: ${err?.message || 'periksa koneksi/sesi login Anda.'} — data yang tampil mungkin tidak akurat.`
        );
      }
    );

    // Subscribe to current user's links
    const unsubLinks = subscribeToUserLinks(
      currentUser.uid,
      userLinks => {
        setIsDbConnected(true);
        setIsDbLoading(false);
        setItems(userLinks);
      },
      err => {
        console.warn('Error subscribing to user links:', err);
        setIsDbConnected(false);
        setIsDbLoading(false);
      }
    );

    // Subscribe to current user's settings
    const unsubSettings = subscribeToUserSettings(currentUser.uid, newSettings => {
      setSettings(newSettings);
    });

    return () => {
      unsubFolders();
      unsubLinks();
      unsubSettings();
    };
  }, [currentUser]);

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Quick Period Setter
  const handleSetQuickPeriod = (days: number | 'today' | 'thisMonth') => {
    const now = new Date();
    if (days === 'today') {
      const todayStr = formatToISODate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (days === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatToISODate(firstDay));
      setEndDate(formatToISODate(now));
    } else if (typeof days === 'number') {
      const past = new Date();
      past.setDate(past.getDate() - days);
      setStartDate(formatToISODate(past));
      setEndDate(formatToISODate(now));
    }
  };

  const handleResetPeriod = () => {
    setStartDate('');
    setEndDate('');
  };

  // Count of links with no Nama value at all, for the name-presence filter
  // badge below — independent of any active filter, always reflects the
  // full dataset so the badge doesn't move around as other filters change.
  const unnamedLinksCount = useMemo(
    () => items.filter(i => !i.name || i.name.trim() === '').length,
    [items]
  );

  // Filter and Sort Items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (activeFilter === 'Blank') {
      result = result.filter(i => i.status === 'Blank');
    } else if (activeFilter === 'Sudah Terunduh') {
      result = result.filter(i => i.status === 'Sudah Terunduh');
    } else if (activeFilter === 'Web Inactive') {
      result = result.filter(
        i => i.note.toLowerCase().includes('inactive') || i.status === 'Gagal' || i.status === 'Web Inactive'
      );
    } else if (activeFilter !== 'ALL') {
      result = result.filter(i => i.status === activeFilter);
    }

    // Name-presence filter
    if (nameFilter === 'named') {
      result = result.filter(i => i.name && i.name.trim() !== '');
    } else if (nameFilter === 'unnamed') {
      result = result.filter(i => !i.name || i.name.trim() === '');
    }

    // Date Range Period filter (Periode XXX ke XXX)
    if (startDate || endDate) {
      result = result.filter(item =>
        isWithinPeriod(item.diperbarui, item.createdAt, startDate, endDate)
      );
    }

    // Search query (matches link, name, note, tag, region, or output)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        i =>
          i.link.toLowerCase().includes(q) ||
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.tag && i.tag.toLowerCase().includes(q)) ||
          i.note.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q) ||
          i.output.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'counta' || sortField === 'createdAt') {
          const numA = Number(valA || 0);
          const numB = Number(valB || 0);
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [items, activeFilter, nameFilter, searchQuery, sortField, sortDirection, startDate, endDate]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Shift+click range-select: adds every id in the range to the existing
  // selection (a union), matching spreadsheet behavior rather than
  // replacing whatever was already selected.
  const handleSelectRange = (ids: string[]) => {
    setSelectedIds(prev => new Set([...prev, ...ids]));
  };

  // Status and data update handlers with Firestore sync
  const handleUpdateStatus = async (id: string, newStatus: LinkStatus) => {
    const today = formatDateNow();
    const previous = items.find(item => item.id === id);
    const updates: Partial<LinkItem> = {
      status: newStatus,
      diperbarui: today,
      ...(newStatus === 'Sudah Terunduh' ? { downloadedAt: today } : {}),
    };

    // Optimistic UI update
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );

    if (currentUser) {
      try {
        await updateUserLinkInFirestore(currentUser.uid, id, updates);
        addToast('success', `Status tautan diperbarui menjadi "${newStatus}".`);
      } catch (e: any) {
        console.error('Firestore update error:', e);
        // Previously this just showed a soft "disimpan secara lokal" info
        // toast and left the optimistic update in place — meaning the row
        // visibly showed the new status, the user believed it stuck, and
        // it silently reverted to the old value on the next refetch/reload
        // with nothing in the UI ever having said so. Revert the optimistic
        // change and show a real error instead: the status genuinely did
        // not change.
        if (previous) {
          setItems(prev => prev.map(item => (item.id === id ? previous : item)));
        }
        addToast('error', `Gagal menyimpan perubahan status: ${e?.message || 'periksa koneksi/sesi login Anda.'} Status dikembalikan ke semula.`);
      }
    }
  };

  const handleUpdateOutput = async (id: string, newOutput: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, output: newOutput } : item))
    );
    if (currentUser) {
      try {
        await updateUserLinkInFirestore(currentUser.uid, id, { output: newOutput });
        addToast('info', `Output diubah menjadi "${newOutput}".`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan output: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleUpdateRegion = async (id: string, newRegion: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, region: newRegion } : item))
    );
    if (currentUser) {
      try {
        await updateUserLinkInFirestore(currentUser.uid, id, { region: newRegion });
        addToast('info', `Region diubah menjadi "${newRegion}".`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan region: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleUpdateNote = async (id: string, newNote: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, note: newNote } : item))
    );
    if (currentUser) {
      try {
        await updateUserLinkInFirestore(currentUser.uid, id, { note: newNote });
        addToast('info', 'Catatan diperbarui.');
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan catatan: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleDeleteLink = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (currentUser) {
      try {
        await deleteUserLinkFromFirestore(currentUser.uid, id);
        addToast('info', 'Tautan dihapus dari database.');
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menghapus tautan dari database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  // One-click Download & Mark as Downloaded
  const handleDownloadAndMark = (item: LinkItem) => {
    window.open(item.link, '_blank', 'noopener,noreferrer');
    handleUpdateStatus(item.id, 'Sudah Terunduh');
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    addToast('info', 'Tautan disalin ke papan klip.');
  };

  // Batch Operations with User-isolated Firestore
  const handleBatchUpdateStatus = async (status: LinkStatus) => {
    const today = formatDateNow();
    const ids = Array.from(selectedIds) as string[];

    setItems(prev =>
      prev.map(i =>
        selectedIds.has(i.id)
          ? {
              ...i,
              status,
              diperbarui: today,
              downloadedAt: status === 'Sudah Terunduh' ? today : i.downloadedAt,
            }
          : i
      )
    );
    setSelectedIds(new Set());

    if (currentUser) {
      try {
        await batchUpdateUserLinkStatusInFirestore(currentUser.uid, ids, status, today);
        addToast('success', `${ids.length} link diubah statusnya menjadi "${status}".`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan status ke database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  // Bulk-apply a single Output/Region value to every currently selected
  // link. BatchActionsBar's dropdowns for these were previously wired to
  // handleUpdateOutput/handleUpdateRegion — single-item handlers shaped
  // (id, value) => void — but BatchActionsBar calls them as (value) => void
  // (it has no per-item id; it means "apply to the whole selection"). That
  // mismatch meant the value string landed in the `id` parameter and the
  // real id resolved to undefined, so the .map(item => item.id === id ? ...)
  // never matched anything: nothing visibly changed, and the resulting
  // Supabase call targeted a row id that doesn't exist. Reported as "belum
  // ada fitur edit region bulk" — the control was there, just inert.
  const handleBatchUpdateOutput = async (output: string) => {
    const ids = Array.from(selectedIds) as string[];
    if (ids.length === 0) return;

    setItems(prev => prev.map(i => (selectedIds.has(i.id) ? { ...i, output } : i)));
    setSelectedIds(new Set());

    if (currentUser) {
      try {
        await batchUpdateItemsInFirestore(
          ids.map(id => ({ id, changes: { output } })),
          currentUser.uid
        );
        addToast('success', `${ids.length} link diubah output-nya menjadi "${output}".`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan output massal: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleBatchUpdateRegion = async (region: string) => {
    const ids = Array.from(selectedIds) as string[];
    if (ids.length === 0) return;

    setItems(prev => prev.map(i => (selectedIds.has(i.id) ? { ...i, region } : i)));
    setSelectedIds(new Set());

    if (currentUser) {
      try {
        await batchUpdateItemsInFirestore(
          ids.map(id => ({ id, changes: { region } })),
          currentUser.uid
        );
        addToast('success', `${ids.length} link diubah region-nya menjadi "${region}".`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan region massal: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleBatchApplyTag = async (tag: string) => {
    const ids = Array.from(selectedIds) as string[];
    const trimmedTag = tag.trim();

    setItems(prev =>
      prev.map(i =>
        selectedIds.has(i.id)
          ? {
              ...i,
              tag: trimmedTag,
            }
          : i
      )
    );

    if (currentUser) {
      try {
        await batchUpdateUserLinkTagInFirestore(currentUser.uid, ids, trimmedTag);
        if (trimmedTag) {
          addToast('success', `Tag "${trimmedTag}" berhasil diterapkan ke ${ids.length} tautan.`);
        } else {
          addToast('info', `Tag berhasil dihapus dari ${ids.length} tautan.`);
        }
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan perubahan tag ke database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleBulkTagEdit = async (
    mode: 'append' | 'replace' | 'remove',
    targetTag: string,
    newTag: string
  ) => {
    const ids = Array.from(selectedIds) as string[];
    if (ids.length === 0) return;

    setItems(prev =>
      prev.map(item => {
        if (!selectedIds.has(item.id)) return item;
        const currentTag = (item.tag || '').trim();
        let updatedTag = currentTag;

        if (mode === 'append') {
          if (!currentTag) {
            updatedTag = newTag.trim();
          } else if (!currentTag.toLowerCase().includes(newTag.trim().toLowerCase())) {
            updatedTag = `${currentTag}, ${newTag.trim()}`;
          }
        } else if (mode === 'replace') {
          if (targetTag && currentTag) {
            const tagsList = currentTag.split(',').map(t => t.trim());
            const replaced = tagsList.map(t => (t.toLowerCase() === targetTag.trim().toLowerCase() ? newTag.trim() : t));
            updatedTag = replaced.filter(Boolean).join(', ');
          }
        } else if (mode === 'remove') {
          if (targetTag && currentTag) {
            const tagsList = currentTag.split(',').map(t => t.trim());
            const filtered = tagsList.filter(t => t.toLowerCase() !== targetTag.trim().toLowerCase());
            updatedTag = filtered.join(', ');
          }
        }

        return { ...item, tag: updatedTag };
      })
    );

    if (currentUser) {
      try {
        for (const id of ids) {
          const item = items.find(i => i.id === id);
          if (item) {
            const currentTag = (item.tag || '').trim();
            let updatedTag = currentTag;
            if (mode === 'append') {
              if (!currentTag) updatedTag = newTag.trim();
              else if (!currentTag.toLowerCase().includes(newTag.trim().toLowerCase())) updatedTag = `${currentTag}, ${newTag.trim()}`;
            } else if (mode === 'replace') {
              const tagsList = currentTag.split(',').map(t => t.trim());
              const replaced = tagsList.map(t => (t.toLowerCase() === targetTag.trim().toLowerCase() ? newTag.trim() : t));
              updatedTag = replaced.filter(Boolean).join(', ');
            } else if (mode === 'remove') {
              const tagsList = currentTag.split(',').map(t => t.trim());
              const filtered = tagsList.filter(t => t.toLowerCase() !== targetTag.trim().toLowerCase());
              updatedTag = filtered.join(', ');
            }
            await batchUpdateUserLinkTagInFirestore(currentUser.uid, [id], updatedTag);
          }
        }
        addToast('success', `Bulk Tag Editor berhasil memperbarui ${ids.length} tautan.`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menyimpan Bulk Tag Editor ke database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  const handleBatchOpenSelected = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    if (selectedItems.length > 8) {
      const confirmed = window.confirm(
        `Anda akan membuka ${selectedItems.length} tautan sekaligus di tab baru.\n\nTips: Pastikan browser mengizinkan 'Pop-up and redirects' untuk situs ini jika ada tab yang terblokir.\n\nLanjutkan?`
      );
      if (!confirmed) return;
    }

    selectedItems.forEach((item, index) => {
      if (index === 0) {
        window.open(item.link, '_blank', 'noopener,noreferrer');
      } else {
        setTimeout(() => {
          window.open(item.link, '_blank', 'noopener,noreferrer');
        }, index * 80);
      }
    });

    addToast('info', `${selectedItems.length} link sedang dibuka di tab baru.`);
  };

  const handleBatchCopySelected = () => {
    const selectedUrls = items
      .filter(i => selectedIds.has(i.id))
      .map(i => i.link)
      .join('\n');
    navigator.clipboard.writeText(selectedUrls);
    addToast('info', `${selectedIds.size} link berhasil disalin ke clipboard.`);
  };

  const handleBatchDeleteSelected = async () => {
    const ids = Array.from(selectedIds) as string[];
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    setSelectedIds(new Set());

    if (currentUser) {
      try {
        await batchDeleteUserLinksFromFirestore(currentUser.uid, ids);
        addToast('info', `${ids.length} tautan dihapus dari database.`);
      } catch (e: any) {
        console.error(e);
        addToast('error', `Gagal menghapus tautan dari database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }
  };

  // Background Process: Ping selected URLs and flag 404 errors
  const handleBatchCheckStatus = async () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    setIsCheckingStatus(true);
    setCheckingProgress({ current: 0, total: selectedItems.length });
    addToast('info', `Mengecek status ${selectedItems.length} tautan di latar belakang...`);

    const flagged404Ids: string[] = [];
    let syncFailedCount = 0;
    const today = formatDateNow();

    for (let index = 0; index < selectedItems.length; index++) {
      const item = selectedItems[index];
      setCheckingProgress({ current: index + 1, total: selectedItems.length });

      const checkResult = await checkSingleUrlStatus(item.link);

      if (checkResult.is404) {
        flagged404Ids.push(item.id);
        const updatedNote = item.note ? `${item.note} | 404 Not Found` : '404 Not Found (Web Inactive)';

        // Update local state immediately
        setItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'Blank',
                  note: updatedNote,
                  diperbarui: today,
                }
              : i
          )
        );

        // Sync with User-isolated Firestore
        if (currentUser) {
          try {
            await updateUserLinkInFirestore(currentUser.uid, item.id, {
              status: 'Blank',
              note: updatedNote,
              diperbarui: today,
            });
          } catch (err) {
            console.error(`Failed to update Firestore for item ${item.id}:`, err);
            syncFailedCount++;
          }
        }
      }
    }

    setIsCheckingStatus(false);
    setCheckingProgress(null);

    if (flagged404Ids.length > 0) {
      addToast(
        'warning',
        `Pemeriksaan Selesai! ${flagged404Ids.length} dari ${selectedItems.length} link mengembalikan Error 404 dan telah ditandai sebagai 'Blank' / '404 Not Found'.`
      );
    } else {
      addToast(
        'success',
        `Pemeriksaan Selesai! Seluruh ${selectedItems.length} link terpilih dalam keadaan aktif (bebas 404).`
      );
    }

    if (syncFailedCount > 0) {
      addToast(
        'error',
        `${syncFailedCount} perubahan status GAGAL disimpan ke database (hanya tersimpan di tampilan lokal).`
      );
    }
  };

  const handleClearAllData = async () => {
    if (!currentUser) return;
    const confirm = window.confirm(
      'Apakah Anda yakin ingin menghapus SEMUA tautan di akun Anda? Seluruh data tautan Anda akan dibersihkan.'
    );
    if (!confirm) return;

    try {
      const count = await clearAllUserLinksFromFirestore(currentUser.uid);
      setItems([]);
      setSelectedIds(new Set());
      setIsSettingsModalOpen(false);
      addToast('success', `${count} tautan berhasil dihapus. Database Anda kini bersih tanpa data dummy.`);
    } catch (e) {
      console.error(e);
      addToast('error', 'Gagal membersihkan database.');
    }
  };

  // --- Reset & Cleanup Center (ResetDataModal) --------------------------
  // Unlike handleClearAllData above (which has its own window.confirm),
  // these don't confirm on their own — ResetDataModal already gets
  // explicit confirmation (typed "HAPUS", or the 1-click button) before
  // calling onClearDatabase, and renders its own success/error state, so
  // failures here must throw rather than being swallowed silently.
  const handleResetFiltersAction = () => {
    setSearchQuery('');
    setActiveFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedIds(new Set());
  };

  const handleResetSettingsToDefaultAction = async () => {
    setSettings(DEFAULT_SETTINGS);
    if (currentUser) {
      await saveUserSettingsToFirestore(currentUser.uid, DEFAULT_SETTINGS);
    }
  };

  const handleClearDatabaseAction = async () => {
    if (!currentUser) throw new Error('Sesi login tidak ditemukan.');
    await clearAllUserLinksFromFirestore(currentUser.uid);
    setItems([]);
    setSelectedIds(new Set());
  };

  // Import from Excel handler with User-isolated Firestore Batch
  const handleImportComplete = async (
    newItems: LinkItem[],
    updatedCount: number,
    skippedDuplicatesCount: number
  ) => {
    if (skippedDuplicatesCount > 0) {
      setDuplicatesPreventedCount(prev => prev + skippedDuplicatesCount);
    }

    if (!currentUser) {
      setItems(prev => [...newItems, ...prev]);
      addToast('warning', `Disimpan secara lokal (${newItems.length} link).`);
      return;
    }

    try {
      await batchAddUserLinksToFirestore(
        currentUser.uid,
        newItems.map(item => ({
          name: item.name || '',
          link: item.link,
          status: item.status,
          output: item.output,
          region: item.region,
          counta: item.counta,
          note: item.note,
          diperbarui: item.diperbarui,
          createdAt: item.createdAt,
        })),
        currentUser.email || undefined
      );

      let msg = `Berhasil menyimpan ${newItems.length} link baru ke database Cloud privat Anda.`;
      if (skippedDuplicatesCount > 0) {
        msg += ` (${skippedDuplicatesCount} duplikat dicegah)`;
      }
      addToast('success', msg);
    } catch (e: any) {
      console.error(e);
      // Previously this kept the imported items in local state only and
      // showed a soft "disimpan secara lokal" warning — the whole import
      // looked successful, then vanished on the next refresh/refetch since
      // it was never actually written to the database. Don't keep a
      // phantom local copy: show a real error and let the user retry the
      // import (the file/paste is still there, nothing to lose by trying
      // again once the underlying problem — usually the session — is
      // fixed).
      addToast(
        'error',
        `Gagal menyimpan ${newItems.length} link hasil import ke database — TIDAK tersimpan. ${e?.message || 'periksa koneksi/sesi login Anda.'} Coba import ulang.`
      );
    }
  };

  // Add Manual Links handler with User-isolated Firestore
  const handleAddLinks = async (newLinks: Omit<LinkItem, 'id'>[], skippedCount: number) => {
    if (skippedCount > 0) {
      setDuplicatesPreventedCount(prev => prev + skippedCount);
    }

    if (!currentUser) {
      const withIds: LinkItem[] = newLinks.map((l, idx) => ({ ...l, id: `local-${Date.now()}-${idx}` }));
      setItems(prev => [...withIds, ...prev]);
      return;
    }

    try {
      await batchAddUserLinksToFirestore(currentUser.uid, newLinks, currentUser.email || undefined);
      if (skippedCount > 0) {
        addToast(
          'warning',
          `${newLinks.length} tautan disimpan ke database. ${skippedCount} duplikat diabaikan!`
        );
      } else {
        addToast('success', `${newLinks.length} tautan berhasil disimpan ke database Cloud privat Anda.`);
      }
    } catch (e: any) {
      console.error(e);
      addToast(
        'error',
        `Gagal menyimpan tautan ke database — perubahan TIDAK tersimpan. ${e?.message || 'Periksa koneksi/sesi login Anda.'}`
      );
    }
  };

  // Export All Data to JSON (Backup)
  const handleExportJSON = () => {
    try {
      exportDatabaseBackupJson(items, settings);
      addToast('success', `Berhasil mengekspor cadangan ${items.length} tautan ke file JSON.`);
    } catch (err) {
      console.error('Failed to export JSON backup:', err);
      addToast('warning', 'Gagal mengekspor file cadangan JSON.');
    }
  };

  // Import from JSON (Restore / Append)
  const handleImportJSON = async (importedLinks: LinkItem[]) => {
    if (!importedLinks || importedLinks.length === 0) return;

    const existingUrlMap = new Set(items.map(i => i.link.trim().toLowerCase()));
    const newLinks = importedLinks.filter(i => !existingUrlMap.has(i.link.trim().toLowerCase()));
    const duplicatesCount = importedLinks.length - newLinks.length;

    if (duplicatesCount > 0) {
      setDuplicatesPreventedCount(prev => prev + duplicatesCount);
    }

    if (newLinks.length === 0) {
      addToast('warning', `Semua ${importedLinks.length} tautan dari file JSON sudah ada di database.`);
      return;
    }

    const payloadToSave: Omit<LinkItem, 'id'>[] = newLinks.map(item => ({
      name: item.name || '',
      link: item.link,
      status: item.status || 'Blank',
      output: item.output || 'Single',
      region: item.region || 'LIVE',
      counta: item.counta ?? 1,
      note: item.note || '',
      tag: item.tag || '',
      diperbarui: item.diperbarui || formatDateNow(),
      createdAt: item.createdAt || Date.now(),
    }));

    if (currentUser) {
      try {
        await batchAddUserLinksToFirestore(
          currentUser.uid,
          payloadToSave,
          currentUser.email || undefined
        );
        let msg = `Berhasil mengimpor ${newLinks.length} tautan dari file JSON cadangan.`;
        if (duplicatesCount > 0) {
          msg += ` (${duplicatesCount} duplikat diabaikan)`;
        }
        addToast('success', msg);
      } catch (e: any) {
        console.error('Error batch adding imported JSON to Firestore:', e);
        // Previously kept the restored items in local state only with a
        // soft warning toast — the restore looked successful and then
        // vanished on the next refresh, since a backup restore is exactly
        // the moment a user least wants a silent phantom copy. Show a real
        // error and let them retry the restore instead.
        addToast(
          'error',
          `Gagal memulihkan ${newLinks.length} tautan dari file JSON — TIDAK tersimpan ke database. ${e?.message || 'periksa koneksi/sesi login Anda.'} Coba pulihkan ulang.`
        );
      }
    } else {
      const withIds: LinkItem[] = newLinks.map((l, idx) => ({
        ...l,
        id: l.id || `imported-${Date.now()}-${idx}`,
      }));
      setItems(prev => [...withIds, ...prev]);
      let msg = `Berhasil mengimpor ${newLinks.length} tautan secara lokal.`;
      if (duplicatesCount > 0) {
        msg += ` (${duplicatesCount} duplikat diabaikan)`;
      }
      addToast('success', msg);
    }
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Quick Sorting handler for instant toolbar button
  const handleQuickSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setIsQuickSortMenuOpen(false);

    let label = '';
    if (field === 'createdAt') {
      label = direction === 'desc' ? 'Tanggal Ditambahkan (Terbaru)' : 'Tanggal Ditambahkan (Terlama)';
    } else if (field === 'status') {
      label = direction === 'asc' ? 'Status (A-Z)' : 'Status (Z-A)';
    } else if (field === 'diperbarui') {
      label = 'Tanggal Diperbarui (Default)';
    } else {
      label = field;
    }
    addToast('info', `Diurutkan berdasarkan ${label}`);
  };

  const toggleQuickSortDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDir = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDir);

    let label = '';
    if (sortField === 'createdAt') {
      label = newDir === 'desc' ? 'Tanggal Ditambahkan (Terbaru)' : 'Tanggal Ditambahkan (Terlama)';
    } else if (sortField === 'status') {
      label = newDir === 'asc' ? 'Status (A-Z)' : 'Status (Z-A)';
    } else {
      label = `${sortField} (${newDir.toUpperCase()})`;
    }
    addToast('info', `Arah urutan dibalik: ${label}`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    try {
      localStorage.removeItem('command_center_active_user');
    } catch {}
    setCurrentUser(null);
    setFolders([]);
    setItems([]);
    setActiveTab('dashboard_hub');
    idRepairAttemptedRef.current = false; // allow the next signed-in user's folders to be checked too
    addToast('info', 'Anda telah keluar dari akun.');
  };

  // Storage Management Handlers - User Isolated Firestore Sync
  const handleOpenFolder = (folder: StorageFolder) => {
    setSelectedFolderForDetail(folder);
    setIsFolderDetailModalOpen(true);
  };

  const handleCreateFolder = async (newFolder: Omit<StorageFolder, 'id'>) => {
    if (!currentUser) return;
    try {
      const folderData = {
        ...newFolder,
        ownerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Saya',
        ownerEmail: currentUser.email || '',
      };
      await addUserFolderToFirestore(currentUser.uid, folderData);
      addToast('success', `Folder "${newFolder.name}" berhasil dibuat di database.`);
    } catch (e: any) {
      console.error(e);
      // Previously created a folder in local state only, with an id that
      // never existed in Supabase — it would look created, then disappear
      // on the next folders refetch (which overwrites local state with
      // whatever's actually in the database, i.e. not this folder). Don't
      // create a phantom folder: show a real error instead.
      addToast('error', `Folder "${newFolder.name}" GAGAL dibuat — TIDAK tersimpan ke database. ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleAddFileToFolder = async (folderId: string, newFile: Omit<StorageFile, 'id'>) => {
    if (!currentUser) return;
    const fileWithId: StorageFile = {
      ...newFile,
      id: `file-${Date.now()}`,
    };
    const targetFolder = folders.find(f => f.id === folderId);
    if (!targetFolder) return;

    try {
      await addFileToUserFolderInFirestore(currentUser.uid, folderId, fileWithId, targetFolder);
      addToast('success', `Berkas "${newFile.name}" berhasil diunggah.`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal mengunggah berkas — TIDAK tersimpan ke database. ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleDeleteFileFromFolder = async (folderId: string, fileId: string) => {
    if (!currentUser) return;
    const targetFolder = folders.find(f => f.id === folderId);
    if (!targetFolder) return;

    try {
      await deleteFileFromUserFolderInFirestore(currentUser.uid, folderId, fileId, targetFolder);
      addToast('info', 'Berkas berhasil dihapus dari folder.');
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal menghapus berkas dari database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!currentUser) return;
    const confirm = window.confirm('Apakah Anda yakin ingin menghapus folder ini beserta seluruh berkas di dalamnya?');
    if (!confirm) return;

    try {
      await deleteUserFolderFromFirestore(currentUser.uid, folderId);
      setIsFolderDetailModalOpen(false);
      setSelectedFolderForDetail(null);
      addToast('info', 'Folder berhasil dihapus dari penyimpanan.');
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal menghapus folder dari database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleUpdateFolder = async (folderId: string, updatedFields: Partial<StorageFolder>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      await updateUserFolderInFirestore(currentUser.uid, folderId, updatedFields);
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, ...updatedFields } : f)));
      if (selectedFolderForDetail && selectedFolderForDetail.id === folderId) {
        setSelectedFolderForDetail(prev => (prev ? { ...prev, ...updatedFields } : null));
      }
      addToast('success', 'Folder berhasil diperbarui.');
      return true;
    } catch (e: any) {
      // Previously this fell back to applying the change to local state
      // ONLY and still showed a (misleadingly worded) success toast — the
      // exact same class of bug fixed everywhere else in this app: the row
      // (or, via this function, a subfolder delete/move) visibly vanished
      // from the table, the user saw what looked like a success message,
      // and then it reappeared on the next refetch because the database
      // write never actually happened. Surface the real failure instead —
      // this is every subfolder/folder mutation's shared write path
      // (rename, edit, delete, bulk move all route through here), so this
      // one fix covers all of them.
      console.error(e);
      addToast('error', `Gagal memperbarui folder: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      return false;
    }
  };

  const handleOpenSubfolder = (subfolder: StorageSubfolder) => {
    setSelectedSubfolderForDetail(subfolder);
    setIsSubfolderDetailModalOpen(true);
  };

  const handleAddSubfolder = async (parentFolderId: string, newSubfolder: Omit<StorageSubfolder, 'id'>) => {
    const parent = folders.find(f => f.id === parentFolderId);
    if (!parent) return;

    const subId = `sub-${Date.now()}`;
    const fullSub: StorageSubfolder = {
      ...newSubfolder,
      id: subId,
      files: [],
    };

    const updatedSubfolders = [...(parent.subfolders || []), fullSub];
    const ok = await handleUpdateFolder(parentFolderId, {
      subfolders: updatedSubfolders,
      foldersCount: updatedSubfolders.length,
    });
    // handleUpdateFolder already surfaced its own error toast on failure —
    // only announce this specific "added" outcome when the write actually
    // went through, otherwise the user sees a success message right after
    // (or even instead of, depending on toast timing) the error one.
    if (ok) addToast('success', `Subfolder "${newSubfolder.name}" berhasil ditambahkan.`);
  };

  const handleUpdateSubfolder = async (parentFolderId: string, subfolderId: string, updatedFields: Partial<StorageSubfolder>) => {
    const parent = folders.find(f => f.id === parentFolderId);
    if (!parent) return;

    const updatedSubfolders = (parent.subfolders || []).map(sub =>
      sub.id === subfolderId ? { ...sub, ...updatedFields } : sub
    );

    const ok = await handleUpdateFolder(parentFolderId, {
      subfolders: updatedSubfolders,
    });
    if (!ok) return;

    if (selectedSubfolderForDetail && selectedSubfolderForDetail.id === subfolderId) {
      setSelectedSubfolderForDetail(prev => (prev ? { ...prev, ...updatedFields } : null));
    }
    addToast('success', 'Subfolder berhasil diperbarui.');
  };

  const handleDeleteSubfolder = async (parentFolderId: string, subfolderId: string) => {
    const parent = folders.find(f => f.id === parentFolderId);
    if (!parent) {
      // Previously silent — the delete button would visibly do nothing,
      // indistinguishable from being broken. In practice this means the
      // parent folder isn't in local state anymore (e.g. deleted/moved by
      // another tab or refetch) even though the row was still on screen.
      addToast('error', 'Folder induk subfolder ini tidak ditemukan lagi — coba muat ulang halaman.');
      return;
    }

    const targetSub = (parent.subfolders || []).find(s => s.id === subfolderId);
    const updatedSubfolders = (parent.subfolders || []).filter(sub => sub.id !== subfolderId);
    const subFiles = targetSub?.files || [];
    const subBytes = subFiles.reduce((acc, f) => acc + f.size, 0);

    const newUsedBytes = Math.max(0, (parent.usedBytes || 0) - subBytes);
    const newFilesCount = Math.max(0, (parent.filesCount || 0) - subFiles.length);

    const ok = await handleUpdateFolder(parentFolderId, {
      subfolders: updatedSubfolders,
      foldersCount: updatedSubfolders.length,
      filesCount: newFilesCount,
      usedBytes: newUsedBytes,
      usedStorageFormatted: `${(newUsedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`,
    });
    // Previously this ran unconditionally — the "berhasil dihapus" toast
    // and modal close fired even when the underlying database write had
    // failed, which is exactly how a delete could look like it worked
    // (row vanishes from local state, confident success toast) while the
    // row was actually untouched server-side and came back on the next
    // refetch. Only announce/close now when handleUpdateFolder confirms
    // the write actually happened.
    if (!ok) return;

    setIsSubfolderDetailModalOpen(false);
    setSelectedSubfolderForDetail(null);
    addToast('info', 'Subfolder berhasil dihapus.');
  };

  // --- Bulk subfolder operations -------------------------------------------
  // Subfolders live nested inside their parent folder's `subfolders` array,
  // so multiple selected items can share the same parent. Each of these
  // groups selection by parent and computes ONE final array per parent from
  // a single fresh read of `folders`, then issues one Supabase update per
  // affected parent — looping the single-item handlers instead would have
  // each call read the same stale `folders` snapshot and silently overwrite
  // a sibling call's change to the same parent.

  const handleBulkDeleteSubfolders = async (items: { parentFolderId: string; subfolderId: string }[]) => {
    if (items.length === 0) return;
    if (!currentUser) {
      // Previously silent — if this ever fires (e.g. the auth session
      // dropped out from under an already-open dashboard), the delete
      // button visibly does nothing, indistinguishable from it being
      // broken. It should never happen while the dashboard is showing
      // (App.tsx renders AuthScreen instead whenever currentUser is
      // falsy), so seeing this toast is itself a useful signal.
      addToast('error', 'Sesi login tidak terdeteksi — muat ulang halaman dan login kembali sebelum menghapus.');
      return;
    }

    const byParent = new Map<string, Set<string>>();
    items.forEach(({ parentFolderId, subfolderId }) => {
      if (!byParent.has(parentFolderId)) byParent.set(parentFolderId, new Set());
      byParent.get(parentFolderId)!.add(subfolderId);
    });

    let totalDeleted = 0;
    const patches: { folderId: string; subfolders: StorageSubfolder[]; foldersCount: number }[] = [];
    byParent.forEach((subIds, parentId) => {
      const parent = folders.find(f => f.id === parentId);
      if (!parent) return;
      const kept = (parent.subfolders || []).filter(s => !s.id || !subIds.has(s.id));
      totalDeleted += (parent.subfolders?.length || 0) - kept.length;
      patches.push({ folderId: parentId, subfolders: kept, foldersCount: kept.length });
    });

    try {
      for (const p of patches) {
        await updateUserFolderInFirestore(currentUser.uid, p.folderId, { subfolders: p.subfolders, foldersCount: p.foldersCount });
      }
      setFolders(prev =>
        prev.map(f => {
          const p = patches.find(x => x.folderId === f.id);
          return p ? { ...f, subfolders: p.subfolders, foldersCount: p.foldersCount } : f;
        })
      );
      addToast('info', `${totalDeleted} subfolder berhasil dihapus dari database.`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal menghapus sebagian/semua subfolder: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleBulkMoveSubfoldersToHdd = async (
    items: { parentFolderId: string; subfolderId: string }[],
    targetHddId: string,
    targetHddName?: string
  ) => {
    if (!currentUser || items.length === 0) return;

    const byParent = new Map<string, Set<string>>();
    items.forEach(({ parentFolderId, subfolderId }) => {
      if (!byParent.has(parentFolderId)) byParent.set(parentFolderId, new Set());
      byParent.get(parentFolderId)!.add(subfolderId);
    });

    const patches: { folderId: string; subfolders: StorageSubfolder[] }[] = [];
    byParent.forEach((subIds, parentId) => {
      const parent = folders.find(f => f.id === parentId);
      if (!parent) return;
      const updated = (parent.subfolders || []).map(s => (s.id && subIds.has(s.id) ? { ...s, hddId: targetHddId } : s));
      patches.push({ folderId: parentId, subfolders: updated });
    });

    try {
      for (const p of patches) {
        await updateUserFolderInFirestore(currentUser.uid, p.folderId, { subfolders: p.subfolders });
      }
      setFolders(prev =>
        prev.map(f => {
          const p = patches.find(x => x.folderId === f.id);
          return p ? { ...f, subfolders: p.subfolders } : f;
        })
      );
      addToast('success', `${items.length} subfolder berhasil dipindahkan ke ${targetHddName || 'HDD baru'}.`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal memindahkan subfolder ke HDD baru: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleBulkMoveSubfoldersToParent = async (
    items: { parentFolderId: string; subfolderId: string }[],
    targetParentId: string
  ) => {
    if (!currentUser || items.length === 0) return;

    const targetFolder = folders.find(f => f.id === targetParentId);
    if (!targetFolder) {
      addToast('error', 'Folder tujuan tidak ditemukan.');
      return;
    }

    const relevantItems = items.filter(i => i.parentFolderId !== targetParentId);
    if (relevantItems.length === 0) {
      addToast('info', 'Subfolder terpilih sudah berada di folder tujuan.');
      return;
    }

    const byOldParent = new Map<string, Set<string>>();
    relevantItems.forEach(({ parentFolderId, subfolderId }) => {
      if (!byOldParent.has(parentFolderId)) byOldParent.set(parentFolderId, new Set());
      byOldParent.get(parentFolderId)!.add(subfolderId);
    });

    const movedSubfolders: StorageSubfolder[] = [];
    const oldPatches: { folderId: string; subfolders: StorageSubfolder[]; foldersCount: number }[] = [];
    byOldParent.forEach((subIds, parentId) => {
      const parent = folders.find(f => f.id === parentId);
      if (!parent) return;
      const kept = (parent.subfolders || []).filter(s => !s.id || !subIds.has(s.id));
      const moved = (parent.subfolders || []).filter(s => s.id && subIds.has(s.id));
      movedSubfolders.push(...moved);
      oldPatches.push({ folderId: parentId, subfolders: kept, foldersCount: kept.length });
    });

    const newTargetSubfolders = [...(targetFolder.subfolders || []), ...movedSubfolders];

    try {
      for (const p of oldPatches) {
        await updateUserFolderInFirestore(currentUser.uid, p.folderId, { subfolders: p.subfolders, foldersCount: p.foldersCount });
      }
      await updateUserFolderInFirestore(currentUser.uid, targetParentId, {
        subfolders: newTargetSubfolders,
        foldersCount: newTargetSubfolders.length,
      });

      setFolders(prev =>
        prev.map(f => {
          if (f.id === targetParentId) {
            return { ...f, subfolders: newTargetSubfolders, foldersCount: newTargetSubfolders.length };
          }
          const p = oldPatches.find(x => x.folderId === f.id);
          return p ? { ...f, subfolders: p.subfolders, foldersCount: p.foldersCount } : f;
        })
      );

      addToast('success', `${movedSubfolders.length} subfolder berhasil dipindahkan ke "${targetFolder.name}".`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal memindahkan subfolder ke folder baru: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  // --- Bulk top-level folder operations -------------------------------------
  // Each folder is its own row, so no shared-parent race to worry about here.

  const handleBulkDeleteFolders = async (folderIds: string[]) => {
    if (folderIds.length === 0) return;
    if (!currentUser) {
      addToast('error', 'Sesi login tidak terdeteksi — muat ulang halaman dan login kembali sebelum menghapus.');
      return;
    }
    try {
      for (const id of folderIds) {
        await deleteUserFolderFromFirestore(currentUser.uid, id);
      }
      setFolders(prev => prev.filter(f => !folderIds.includes(f.id)));
      addToast('info', `${folderIds.length} folder berhasil dihapus dari penyimpanan.`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal menghapus sebagian/semua folder: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleBulkMoveFoldersToHdd = async (folderIds: string[], targetHddId: string, targetHddName?: string) => {
    if (!currentUser || folderIds.length === 0) return;
    try {
      for (const id of folderIds) {
        await updateUserFolderInFirestore(currentUser.uid, id, { hddId: targetHddId, hddName: targetHddName });
      }
      setFolders(prev =>
        prev.map(f => (folderIds.includes(f.id) ? { ...f, hddId: targetHddId, hddName: targetHddName } : f))
      );
      addToast('success', `${folderIds.length} folder berhasil dipindahkan ke ${targetHddName || 'HDD baru'}.`);
    } catch (e: any) {
      console.error(e);
      addToast('error', `Gagal memindahkan folder ke HDD baru: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
    }
  };

  const handleAddFileToSubfolder = async (parentFolderId: string, subfolderId: string, newFile: Omit<StorageFile, 'id'>) => {
    const parent = folders.find(f => f.id === parentFolderId);
    if (!parent) return;

    const fileWithId: StorageFile = {
      ...newFile,
      id: `file-${Date.now()}`,
    };

    const updatedSubfolders = (parent.subfolders || []).map(sub => {
      if (sub.id === subfolderId) {
        const newFiles = [fileWithId, ...(sub.files || [])];
        const newBytes = (sub.sizeBytes || 0) + fileWithId.size;
        return {
          ...sub,
          files: newFiles,
          filesCount: newFiles.length,
          sizeBytes: newBytes,
          sizeFormatted: `${(newBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`,
        };
      }
      return sub;
    });

    const totalFiles = updatedSubfolders.reduce((acc, s) => acc + (s.files?.length || 0), 0);
    const totalBytes = updatedSubfolders.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);

    const ok = await handleUpdateFolder(parentFolderId, {
      subfolders: updatedSubfolders,
      filesCount: totalFiles,
      usedBytes: totalBytes,
      usedStorageFormatted: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`,
    });
    if (!ok) return;

    if (selectedSubfolderForDetail && selectedSubfolderForDetail.id === subfolderId) {
      const updatedSub = updatedSubfolders.find(s => s.id === subfolderId);
      if (updatedSub) setSelectedSubfolderForDetail(updatedSub);
    }

    addToast('success', `Media "${newFile.name}" berhasil diunggah ke subfolder.`);
  };

  const handleDeleteFileFromSubfolder = async (parentFolderId: string, subfolderId: string, fileId: string) => {
    const parent = folders.find(f => f.id === parentFolderId);
    if (!parent) return;

    const updatedSubfolders = (parent.subfolders || []).map(sub => {
      if (sub.id === subfolderId) {
        const targetFile = sub.files?.find(f => f.id === fileId);
        const reducedBytes = targetFile?.size || 0;
        const newFiles = (sub.files || []).filter(f => f.id !== fileId);
        const newBytes = Math.max(0, (sub.sizeBytes || 0) - reducedBytes);
        return {
          ...sub,
          files: newFiles,
          filesCount: newFiles.length,
          sizeBytes: newBytes,
          sizeFormatted: `${(newBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`,
        };
      }
      return sub;
    });

    const totalFiles = updatedSubfolders.reduce((acc, s) => acc + (s.files?.length || 0), 0);
    const totalBytes = updatedSubfolders.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);

    const ok = await handleUpdateFolder(parentFolderId, {
      subfolders: updatedSubfolders,
      filesCount: totalFiles,
      usedBytes: totalBytes,
      usedStorageFormatted: `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`,
    });
    if (!ok) return;

    if (selectedSubfolderForDetail && selectedSubfolderForDetail.id === subfolderId) {
      const updatedSub = updatedSubfolders.find(s => s.id === subfolderId);
      if (updatedSub) setSelectedSubfolderForDetail(updatedSub);
    }

    addToast('info', 'Media berhasil dihapus dari subfolder.');
  };

  // 4 External HDD Management Handlers
  const handleSaveDrives = (newDrives: HardDriveProfile[]) => {
    setHardDrives(newDrives);
    try {
      localStorage.setItem('rubixxx_hard_drives', JSON.stringify(newDrives));
    } catch {}
    addToast('success', 'Konfigurasi 4 hardisk eksternal berhasil disimpan.');
  };

  const handleAddCustomFolder = async (newFolder: StorageFolder) => {
    const updated = [newFolder, ...folders];
    setFolders(updated);
    try {
      localStorage.setItem('rubixxx_folders_active', JSON.stringify(updated));
    } catch {}

    let savedToCloud = true;
    if (currentUser) {
      try {
        await addUserFolderToFirestore(currentUser.uid, newFolder);
      } catch (e: any) {
        console.error('Failed to persist custom folder to Supabase:', e);
        savedToCloud = false;
        addToast('error', `Folder "${newFolder.name}" GAGAL tersimpan ke database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
      }
    }

    // Recalculate used capacity on target HDD
    setHardDrives(prev =>
      prev.map(d => {
        if (d.id === newFolder.hddId) {
          const used = d.usedBytes + newFolder.usedBytes;
          const cap = (d.totalCapacityGB || 1) * 1024 * 1024 * 1024;
          const pct = (used / cap) * 100;
          return {
            ...d,
            usedBytes: used,
            healthStatus: pct >= 85 ? 'critical' : pct >= (d.warningThresholdPercent || 80) ? 'warning' : 'good',
          };
        }
        return d;
      })
    );
    if (savedToCloud) {
      addToast('success', `Folder "${newFolder.name}" berhasil ditambahkan ke ${newFolder.hddName || 'HDD'}.`);
    }
  };

  const handleImportExcelComplete = async (importedFolders: StorageFolder[], updatedDrives: HardDriveProfile[]) => {
    setFolders(importedFolders);
    setHardDrives(updatedDrives);
    try {
      localStorage.setItem('rubixxx_folders_active', JSON.stringify(importedFolders));
      localStorage.setItem('rubixxx_hard_drives', JSON.stringify(updatedDrives));
    } catch {}

    if (!currentUser) {
      addToast('warning', `Manifest diimpor secara lokal (${importedFolders.length} folder) — masuk akun untuk menyimpan ke cloud.`);
      return;
    }

    try {
      // Import replaces the whole folder set (matches the local setFolders
      // above), so the cloud copy must be replaced the same way, not merged.
      await clearAllUserFoldersFromFirestore(currentUser.uid);
      await batchAddUserFoldersToFirestore(currentUser.uid, importedFolders);
      addToast('success', `Berhasil mengimpor manifest! ${importedFolders.length} folder 4 HDD tersimpan ke database Cloud.`);
    } catch (e: any) {
      console.error('Failed to persist imported Excel manifest to Supabase:', e);
      addToast(
        'error',
        `Manifest diimpor tapi GAGAL disimpan ke database (hanya tersimpan di tampilan lokal, hilang saat refresh). ${e?.message || ''}`
      );
    }
  };

  const handleAddTransferPlan = (plan: Omit<HddTransferPlan, 'id' | 'createdAt'>) => {
    const newPlan: HddTransferPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      createdAt: Date.now(),
    };
    const updated = [newPlan, ...transferPlans];
    setTransferPlans(updated);
    try {
      localStorage.setItem('rubixxx_hdd_transfer_plans', JSON.stringify(updated));
    } catch {}
    addToast('success', `"${plan.name}" ditambahkan ke Checklist Pemindahan File.`);
  };

  const handleRemoveTransferPlan = (planId: string) => {
    const updated = transferPlans.filter(p => p.id !== planId);
    setTransferPlans(updated);
    try {
      localStorage.setItem('rubixxx_hdd_transfer_plans', JSON.stringify(updated));
    } catch {}
    addToast('info', 'Item dihapus dari checklist rencana pemindahan.');
  };

  const handleTogglePlanStatus = (planId: string) => {
    const updated = transferPlans.map(p => {
      if (p.id === planId) {
        const nextStatus: 'planned' | 'in_progress' | 'completed' =
          p.status === 'completed' ? 'planned' : 'completed';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    setTransferPlans(updated);
    try {
      localStorage.setItem('rubixxx_hdd_transfer_plans', JSON.stringify(updated));
    } catch {}
  };

  const handleClearCompletedPlans = () => {
    const updated = transferPlans.filter(p => p.status !== 'completed');
    setTransferPlans(updated);
    try {
      localStorage.setItem('rubixxx_hdd_transfer_plans', JSON.stringify(updated));
    } catch {}
    addToast('info', 'Rencana yang telah selesai telah dibersihkan.');
  };

  const handleScrollToFullTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculation for downloaded links count
  const downloadedLinksCount = useMemo(() => {
    return items.filter(
      i => i.status.toLowerCase().includes('download') || i.status.toLowerCase().includes('selesai')
    ).length;
  }, [items]);

  // If Auth state is still initializing from Supabase
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4 animate-pulse">
          <Database className="w-7 h-7" />
        </div>
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">Menghubungkan ke Command Center...</p>
      </div>
    );
  }

  // If not logged in: Single-user Authentication Landing Portal
  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <AuthScreen
          onSuccess={email => {
            addToast('success', `Selamat datang! Masuk sebagai ${email}.`);
            setActiveTab('dashboard_hub');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] dark:bg-[#0B0F19] dark:text-slate-100 flex flex-col font-sans w-full transition-colors duration-200">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navbar - Command Center Header with TOP BAR AS PRIMARY SELECTOR */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* App Brand */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveTab('dashboard_hub')}
                className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer hover:bg-indigo-700 transition"
              >
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    onClick={() => setActiveTab('dashboard_hub')}
                    className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-tight cursor-pointer tracking-tight"
                  >
                    Command Center
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                    Single-User
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Supabase Privat</span>
                  </span>
                  <span>•</span>
                  <span>{items.length} Links</span>
                  <span>•</span>
                  <span>{folders.length} Folders</span>
                </div>
              </div>
            </div>

            {/* Top Bar Navigation (Pilihan Utama: Dashboard Hub, Storage Management, Link Management) */}
            <nav className="hidden md:flex items-center p-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-2xl border border-slate-200/70 dark:border-slate-700">
              <button
                type="button"
                id="tab-btn-dashboard-hub"
                onClick={() => setActiveTab('dashboard_hub')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard_hub' || activeTab === 'command_center'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Hub</span>
              </button>

              <button
                type="button"
                id="tab-btn-storage-management"
                onClick={() => setActiveTab('storage_management')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'storage_management'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Storage Management</span>
              </button>

              <button
                type="button"
                id="tab-btn-link-management"
                onClick={() => setActiveTab('link_management')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'link_management'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Link Management</span>
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Dynamic Theme Toggle Button */}
              <button
                type="button"
                id="btn-toggle-theme"
                onClick={toggleTheme}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
                aria-label="Toggle light and dark theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 transition group-hover:rotate-45" />
                    <span className="hidden xl:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600 transition group-hover:-rotate-12" />
                    <span className="hidden xl:inline">Dark</span>
                  </>
                )}
              </button>

              {/* Analytics Chart Toggle */}
              <button
                type="button"
                id="btn-toggle-charts"
                onClick={() => setShowCharts(prev => !prev)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  showCharts
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="Tampilkan / Sembunyikan Grafik Analitik"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden xl:inline">Grafik</span>
              </button>

              {/* Extract Embedded Link Button */}
              <button
                type="button"
                id="btn-open-extract-modal"
                onClick={() => setIsExtractModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Ekstrak Link yang tertanam di nama atau teks"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="hidden xl:inline">Ekstrak</span>
              </button>

              {/* Audit Logs Button */}
              <button
                type="button"
                id="btn-open-audit-logs"
                onClick={() => setIsAuditModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer relative"
                title="Lihat riwayat aktivitas & audit log sistem"
              >
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xl:inline">Audit Log</span>
                {auditLogs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {auditLogs.length > 99 ? '99+' : auditLogs.length}
                  </span>
                )}
              </button>

              {/* Dropdown Options Settings */}
              <button
                type="button"
                id="btn-open-settings-modal"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Atur pilihan dropdown Status, Output, Region, dan Note"
              >
                <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="hidden xl:inline">Opsi</span>
              </button>

              {/* Reset & Cleanup Data Center */}
              <button
                type="button"
                id="btn-open-reset-center"
                onClick={() => setIsResetCenterOpen(true)}
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Reset filter, opsi pengaturan, atau bersihkan seluruh data tautan"
              >
                <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="hidden xl:inline">Reset Data</span>
              </button>

              {/* Authenticated User Profile (Strictly Real User, No Dummy Data) */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight max-w-[140px] truncate">
                    {currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">User Aktif</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Keluar (Logout)"
                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition ml-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Top Bar Navigation Tabs */}
          <div className="flex md:hidden items-center justify-center p-1 border-t border-slate-200/60 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('dashboard_hub')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'dashboard_hub' || activeTab === 'command_center'
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('storage_management')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'storage_management'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Storage
            </button>
            <button
              onClick={() => setActiveTab('link_management')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'link_management'
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Links
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
        {/* VIEW 1: LANDING PAGE DASHBOARD HUB (Visualisasi Gabungan 2 Opsi) */}
        {(activeTab === 'dashboard_hub' || activeTab === 'command_center') && (
          <DashboardHubLanding
            folders={folders}
            links={items}
            overviewStats={dynamicOverviewStats}
            duplicatesPreventedCount={duplicatesPreventedCount}
            userEmail={currentUser.email || undefined}
            onSelectTab={tab => setActiveTab(tab)}
            onOpenNewFolderModal={() => setIsNewFolderModalOpen(true)}
            onOpenAddLinkModal={() => setIsAddModalOpen(true)}
            onOpenUploadExcelModal={() => setIsUploadModalOpen(true)}
          />
        )}

        {/* VIEW 2: STORAGE MANAGEMENT FOCUSED VIEW */}
        {activeTab === 'storage_management' && (
          <StorageManagementCard
            folders={folders}
            overviewStats={dynamicOverviewStats}
            drives={hardDrives}
            transferPlans={transferPlans}
            onOpenFolder={handleOpenFolder}
            onOpenSubfolder={handleOpenSubfolder}
            onUpdateSubfolder={handleUpdateSubfolder}
            onDeleteSubfolder={handleDeleteSubfolder}
            onBulkDeleteSubfolders={handleBulkDeleteSubfolders}
            onBulkMoveSubfoldersToHdd={handleBulkMoveSubfoldersToHdd}
            onBulkMoveSubfoldersToParent={handleBulkMoveSubfoldersToParent}
            onDeleteFolder={handleDeleteFolder}
            onBulkDeleteFolders={handleBulkDeleteFolders}
            onBulkMoveFoldersToHdd={handleBulkMoveFoldersToHdd}
            onOpenNewFolderModal={() => setIsNewFolderModalOpen(true)}
            onSaveDrives={handleSaveDrives}
            onAddCustomFolder={handleAddCustomFolder}
            onImportExcelComplete={handleImportExcelComplete}
            onAddTransferPlan={handleAddTransferPlan}
            onRemoveTransferPlan={handleRemoveTransferPlan}
            onTogglePlanStatus={handleTogglePlanStatus}
            onClearCompletedPlans={handleClearCompletedPlans}
          />
        )}

        {/* VIEW 3: LINK MANAGEMENT FOCUSED VIEW */}
        {activeTab === 'link_management' && (
          <>
            {/* Section Header with Title & Visual Progress Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-6 shadow-xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      Link Management
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Monitoring & Pengelolaan Tautan Database Cloud Terpadu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    Total: <span className="font-bold text-slate-900 dark:text-slate-100">{items.length}</span> Tautan
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Terunduh: <span className="font-bold">{downloadedLinksCount}</span>
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar beneath Link Management title */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Progress Unduhan: {downloadedLinksCount} dari {items.length} tautan sudah terunduh</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                    {items.length > 0 ? Math.min(100, Math.round((downloadedLinksCount / items.length) * 100)) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${items.length > 0 ? Math.min(100, Math.round((downloadedLinksCount / items.length) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bento Top Grid: Action Bar & Search Filter Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-6 shadow-xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="relative flex-1 max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="search-input-field-tab"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari tautan, nama berkas, catatan, wilayah, atau output..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Nama: isolates rows that DO / DON'T have a Nama
                    value, since a search-only approach makes it hard to
                    tell "no matches" apart from "this link just has no
                    name" when most of the list is unnamed on purpose. */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    id="btn-name-filter-all"
                    onClick={() => setNameFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      nameFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Tampilkan semua link, terlepas dari ada/tidaknya nama"
                  >
                    Semua Nama
                  </button>
                  <button
                    type="button"
                    id="btn-name-filter-named"
                    onClick={() => setNameFilter('named')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      nameFilter === 'named'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Hanya tampilkan link yang sudah punya nama"
                  >
                    Ada Nama
                  </button>
                  <button
                    type="button"
                    id="btn-name-filter-unnamed"
                    onClick={() => setNameFilter('unnamed')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      nameFilter === 'unnamed'
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Hanya tampilkan link yang belum punya nama"
                  >
                    <span>Tanpa Nama</span>
                    {unnamedLinksCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          nameFilter === 'unnamed'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {unnamedLinksCount}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {/* Kelola Data dropdown — replaces 3 separate always-visible
                      buttons (Upload Excel, Tambah Link, Export Excel) with
                      one trigger, so the toolbar reads as one control. */}
                  <div className="relative" ref={dataActionMenuRef}>
                    <button
                      type="button"
                      id="btn-data-action-menu"
                      onClick={() => setIsDataActionMenuOpen(prev => !prev)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Kelola Data</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isDataActionMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isDataActionMenuOpen && (
                      <div
                        id="data-action-dropdown-popover"
                        className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          type="button"
                          id="btn-menu-add-link"
                          onClick={() => {
                            setIsAddModalOpen(true);
                            setIsDataActionMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Tambah Link Manual</span>
                        </button>
                        <button
                          type="button"
                          id="btn-menu-upload-excel"
                          onClick={() => {
                            setIsUploadModalOpen(true);
                            setIsDataActionMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Upload Excel</span>
                        </button>
                        <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            id="btn-menu-export-excel"
                            onClick={() => {
                              exportToExcel(filteredItems);
                              setIsDataActionMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            title="Ekspor seluruh baris terfilter ke spreadsheet Excel (.xlsx)"
                          >
                            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Export Excel</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instant Quick Sort Button & Popover */}
                  <div className="relative" ref={quickSortMenuRef}>
                    <Tooltip
                      content="Urutkan Tautan Cepat"
                      subtitle="Urutkan berdasarkan tanggal ditambahkan atau status secara instan"
                      position="top"
                    >
                      <button
                        type="button"
                        id="btn-quick-sort-link-management"
                        onClick={() => setIsQuickSortMenuOpen(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition shadow-2xs border cursor-pointer ${
                          sortField === 'createdAt' || sortField === 'status'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                        title="Urutkan tautan berdasarkan tanggal ditambahkan atau status"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Sort</span>
                        {sortField === 'createdAt' && (
                          <span
                            onClick={toggleQuickSortDirection}
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                            title="Klik untuk membalik arah urutan (Terbaru ↔ Terlama)"
                          >
                            Tanggal {sortDirection === 'desc' ? 'Terbaru ↓' : 'Terlama ↑'}
                          </span>
                        )}
                        {sortField === 'status' && (
                          <span
                            onClick={toggleQuickSortDirection}
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
                            title="Klik untuk membalik arah urutan (A-Z ↔ Z-A)"
                          >
                            Status {sortDirection === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                            isQuickSortMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </Tooltip>

                    {/* Instant Dropdown Popover */}
                    {isQuickSortMenuOpen && (
                      <div
                        id="quick-sort-dropdown-popover"
                        className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <ArrowUpDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            Urutkan Instan
                          </span>
                          <span className="text-[10px] text-slate-400">Pilih 1-Klik</span>
                        </div>

                        {/* Tanggal Ditambahkan Group */}
                        <div className="space-y-1">
                          <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Tanggal Ditambahkan
                          </div>
                          <button
                            type="button"
                            id="btn-sort-created-desc"
                            onClick={() => handleQuickSort('createdAt', 'desc')}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                              sortField === 'createdAt' && sortDirection === 'desc'
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              <div className="text-left">
                                <div className="font-semibold">Tanggal Ditambahkan</div>
                                <div className="text-[10px] text-slate-400">Terbaru ke Terlama (Newest)</div>
                              </div>
                            </div>
                            {sortField === 'createdAt' && sortDirection === 'desc' ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">DESC ↓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            id="btn-sort-created-asc"
                            onClick={() => handleQuickSort('createdAt', 'asc')}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                              sortField === 'createdAt' && sortDirection === 'asc'
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              <div className="text-left">
                                <div className="font-semibold">Tanggal Ditambahkan</div>
                                <div className="text-[10px] text-slate-400">Terlama ke Terbaru (Oldest)</div>
                              </div>
                            </div>
                            {sortField === 'createdAt' && sortDirection === 'asc' ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">ASC ↑</span>
                            )}
                          </button>
                        </div>

                        {/* Status Group */}
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Status Tautan
                          </div>
                          <button
                            type="button"
                            id="btn-sort-status-asc"
                            onClick={() => handleQuickSort('status', 'asc')}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                              sortField === 'status' && sortDirection === 'asc'
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <div className="text-left">
                                <div className="font-semibold">Status Tautan</div>
                                <div className="text-[10px] text-slate-400">Abjad A ke Z (Ascending)</div>
                              </div>
                            </div>
                            {sortField === 'status' && sortDirection === 'asc' ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">A-Z ↑</span>
                            )}
                          </button>

                          <button
                            type="button"
                            id="btn-sort-status-desc"
                            onClick={() => handleQuickSort('status', 'desc')}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                              sortField === 'status' && sortDirection === 'desc'
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                              <div className="text-left">
                                <div className="font-semibold">Status Tautan</div>
                                <div className="text-[10px] text-slate-400">Abjad Z ke A (Descending)</div>
                              </div>
                            </div>
                            {sortField === 'status' && sortDirection === 'desc' ? (
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Z-A ↓</span>
                            )}
                          </button>
                        </div>

                        {/* Reset Option */}
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            id="btn-sort-reset-default"
                            onClick={() => handleQuickSort('diperbarui', 'desc')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-400" />
                            <span>Reset ke Default (Tanggal Diperbarui)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bento KPI Stats Section */}
            <StatsCards
              items={items}
              duplicatesPreventedCount={duplicatesPreventedCount}
              onFilterChange={setActiveFilter}
              activeFilter={activeFilter}
            />

            {/* Analytics Charts Section */}
            {showCharts && <AnalyticsCharts items={filteredItems} />}

            {/* Sticky Floating Batch Action Bar */}
            <BatchActionsBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              onUpdateStatus={handleBatchUpdateStatus}
              onApplyTag={handleBatchApplyTag}
              onBulkTagEdit={handleBulkTagEdit}
              onOpenSelected={handleBatchOpenSelected}
              onCopySelected={handleBatchCopySelected}
              onDeleteSelected={handleBatchDeleteSelected}
              onCheckStatusSelected={handleBatchCheckStatus}
              isCheckingStatus={isCheckingStatus}
              checkingProgress={checkingProgress}
              availableTags={Array.from(new Set(items.map(i => i.tag).filter(Boolean))) as string[]}
            />

            {/* Main Spreadsheet Table */}
            <LinkTable
              items={filteredItems}
              totalAllItemsCount={items.length}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onSelectRange={handleSelectRange}
              onUpdateStatus={handleUpdateStatus}
              onUpdateOutput={handleBatchUpdateOutput}
              onUpdateRegion={handleBatchUpdateRegion}
              onUpdateNote={handleUpdateNote}
              onDownloadAndMark={handleDownloadAndMark}
              onCopyLink={handleCopyLink}
              onDeleteLink={handleDeleteLink}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              settings={settings}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onResetPeriod={handleResetPeriod}
              onSetQuickPeriod={handleSetQuickPeriod}
            />
          </>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-slate-800 mt-8 bg-white dark:bg-slate-900 transition-colors">
        Command Center • Storage Management & Link Management System • Supabase Realtime Sync
      </footer>

      {/* Storage Modals */}
      <FolderDetailModal
        folder={selectedFolderForDetail}
        isOpen={isFolderDetailModalOpen}
        onClose={() => setIsFolderDetailModalOpen(false)}
        onAddFile={handleAddFileToFolder}
        onDeleteFile={handleDeleteFileFromFolder}
        onDeleteFolder={handleDeleteFolder}
        onUpdateFolder={handleUpdateFolder}
        onOpenSubfolder={handleOpenSubfolder}
        onAddSubfolder={handleAddSubfolder}
        onUpdateSubfolder={handleUpdateSubfolder}
        onDeleteSubfolder={handleDeleteSubfolder}
      />

      <SubfolderDetailModal
        subfolder={selectedSubfolderForDetail}
        parentFolder={selectedFolderForDetail}
        isOpen={isSubfolderDetailModalOpen}
        onClose={() => setIsSubfolderDetailModalOpen(false)}
        onBackToFolder={() => setIsSubfolderDetailModalOpen(false)}
        onAddFile={handleAddFileToSubfolder}
        onDeleteFile={handleDeleteFileFromSubfolder}
        onUpdateSubfolder={handleUpdateSubfolder}
        onDeleteSubfolder={handleDeleteSubfolder}
        hardDrives={hardDrives}
      />

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
        defaultOwnerName={currentUser.displayName || currentUser.email?.split('@')[0] || 'Saya'}
      />

      {/* Upload Excel Modal */}
      <UploadExcelModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        existingLinks={items}
        onImportComplete={handleImportComplete}
      />

      {/* Add Manual Link Modal */}
      <AddLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingLinks={items}
        settings={settings}
        onAddLinks={handleAddLinks}
      />

      {/* Dropdown Options Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={async newSettings => {
          setSettings(newSettings);
          if (currentUser) {
            try {
              await saveUserSettingsToFirestore(currentUser.uid, newSettings);
            } catch (e: any) {
              console.error(e);
              addToast('error', `Gagal menyimpan pengaturan ke database: ${e?.message || 'periksa koneksi/sesi login Anda.'}`);
            }
          }
        }}
        onClearAllData={handleClearAllData}
        totalLinksCount={items.length}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onNotify={(type, msg) => addToast(type, msg)}
      />

      {/* Reset & Cleanup Data Center */}
      <ResetDataModal
        isOpen={isResetCenterOpen}
        onClose={() => setIsResetCenterOpen(false)}
        onResetFilters={handleResetFiltersAction}
        onResetSettings={handleResetSettingsToDefaultAction}
        onClearDatabase={handleClearDatabaseAction}
        totalLinksCount={items.length}
      />

      {/* Auth Modal (Email Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={userEmail => {
          addToast('success', `Berhasil masuk sebagai ${userEmail}!`);
        }}
      />

      {/* Extract Embedded Link Modal */}
      <ExtractLinkModal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        existingItems={items}
        onNotify={(msg, type) => addToast(type, msg)}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        onClearLogs={() => {
          setAuditLogs([]);
          try {
            localStorage.removeItem('rubixxx_audit_logs');
          } catch {}
          addToast('info', 'Riwayat audit log dibersihkan.');
        }}
      />
    </div>
  );
}
