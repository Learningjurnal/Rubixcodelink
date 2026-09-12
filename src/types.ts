export type LinkStatus = string;

export type PresetColor =
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'slate';

export interface LinkItem {
  id: string;
  name?: string;
  link: string;
  status: LinkStatus;
  output: string;
  region: string;
  counta: number;
  note: string;
  tag?: string;
  diperbarui: string;
  createdAt: number;
  downloadedAt?: string;
  userEmail?: string;
}

export type FilterStatus = string;

export interface ImportPreviewItem {
  name?: string;
  link: string;
  status: LinkStatus;
  output: string;
  region: string;
  counta: number;
  note: string;
  tag?: string;
  diperbarui: string;
  isDuplicate: boolean;
  duplicateMatchId?: string;
  hasExtractedLink?: boolean;
}

export interface AppSettings {
  statusOptions: string[];
  outputOptions: string[];
  regionOptions: string[];
  notePresets: string[];
}

export type SortField =
  | 'link'
  | 'name'
  | 'status'
  | 'output'
  | 'region'
  | 'counta'
  | 'note'
  | 'diperbarui'
  | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface DateRangeFilter {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export interface ExtractedLinkResult {
  originalText: string;
  extractedName: string;
  extractedUrl: string;
  status: 'valid' | 'invalid';
}

export type CommandCenterTab =
  | 'dashboard_hub'
  | 'command_center'
  | 'storage_management'
  | 'link_management';

export interface HardDriveProfile {
  id: string; // e.g. 'hdd-1', 'hdd-2', 'hdd-3', 'hdd-4'
  name: string; // e.g. 'HDD 1 - Toshiba Canvio (Master)'
  driveLetterOrMount: string; // e.g. 'D:\', 'E:\', '/Volumes/HDD1'
  totalCapacityGB: number; // e.g. 2000 (2 TB)
  usedBytes: number;
  brand?: string; // Toshiba, Seagate, WD, etc.
  serialNumber?: string;
  warningThresholdPercent: number; // e.g. 80 (%)
  healthStatus: 'good' | 'warning' | 'critical';
  color: 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan' | 'blue';
  notes?: string;
  foldersCount?: number;
  filesCount?: number;
}

export interface StorageFile {
  id: string;
  name: string;
  size: number; // in bytes
  sizeFormatted: string;
  type: string; // 'pdf' | 'docx' | 'image' | 'video' | 'archive' | 'audio' | 'code' | 'other'
  updatedAt: string;
  downloadUrl?: string;
  path?: string; // full directory path, e.g. 'D:\Movies\Action\Movie.mkv'
  subfolder?: string;
  hddId?: string; // which HDD drive it belongs to
  extension?: string;
  markedForMove?: boolean;
  targetHddId?: string;
}

export interface StorageSubfolder {
  id?: string;
  name: string;
  description?: string;
  path?: string;
  relativePath?: string;
  fullPath?: string;
  parentPath?: string;
  sizeBytes?: number;
  usedBytes?: number;
  sizeFormatted: string;
  filesCount: number;
  subfoldersCount?: number;
  hddId?: string;
  files?: StorageFile[];
  sampleImageUrl?: string;
  sampleImageHidden?: boolean;
  markedForMove?: boolean;
  targetHddId?: string;
}

export interface StorageFolder {
  id: string;
  name: string;
  description?: string;
  themeColor: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan';
  usedStorageFormatted: string;
  totalCapacityFormatted: string;
  usedBytes: number;
  capacityBytes: number;
  filesCount: number;
  foldersCount: number;
  sharedCount: number;
  tags: string[];
  ownerName: string;
  ownerAvatar?: string;
  createdAt: string;
  files?: StorageFile[];
  subfolders?: StorageSubfolder[];
  hddId?: string; // Assigned external HDD ID (e.g. 'hdd-1')
  hddName?: string;
  path?: string;
  markedForMove?: boolean;
  targetHddId?: string;
}

export interface HddTransferPlan {
  id: string;
  sourceHddId: string;
  targetHddId: string;
  itemType: 'folder' | 'subfolder' | 'file';
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  status: 'planned' | 'in_progress' | 'completed';
  reason?: string;
  createdAt: string | number;
}

export interface StorageOverviewStats {
  totalStorageTB: number;
  usedStorageTB: number;
  usedPercentage: number;
  totalFolders: number;
  totalFiles: number;
  documentsSizeGB: number;
  imagesMediaSizeGB: number;
  videosSizeGB: number;
  archivesSizeGB: number;
}
