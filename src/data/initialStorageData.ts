import { StorageFolder, StorageOverviewStats } from '../types';

export const INITIAL_STORAGE_OVERVIEW: StorageOverviewStats = {
  totalStorageTB: '1.0',
  usedStorageTB: '0',
  usedPercentage: 0,
  totalFolders: 0,
  totalFiles: 0,
  documentsSizeGB: 0,
  imagesMediaSizeGB: 0,
  videosSizeGB: 0,
  archivesSizeGB: 0,
};

// Data dummy dikosongkan agar sistem bersih dan sepenuhnya dikelola per user di database Supabase
export const INITIAL_FOLDERS: StorageFolder[] = [];

