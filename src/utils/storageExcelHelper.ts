import * as XLSX from 'xlsx';
import { HardDriveProfile, StorageFolder, StorageSubfolder, StorageFile } from '../types';

export const DEFAULT_HARD_DRIVES: HardDriveProfile[] = [
  {
    id: 'hdd-1',
    name: 'HDD 1 - Master Storage (Toshiba 2TB)',
    driveLetterOrMount: 'D:\\',
    totalCapacityGB: 2000,
    usedBytes: 1540 * 1024 * 1024 * 1024, // 1.54 TB (~77% - Waspada)
    brand: 'Toshiba Canvio Advance',
    serialNumber: 'TOS-2024-8891A',
    warningThresholdPercent: 80,
    healthStatus: 'warning',
    color: 'amber',
    notes: 'Drive utama untuk koleksi film, arsip render, dan berkas primer.',
    foldersCount: 4,
    filesCount: 184,
  },
  {
    id: 'hdd-2',
    name: 'HDD 2 - Media & Video Vault (WD 2TB)',
    driveLetterOrMount: 'E:\\',
    totalCapacityGB: 2000,
    usedBytes: 1780 * 1024 * 1024 * 1024, // 1.78 TB (~89% - Kritis!)
    brand: 'Western Digital My Passport',
    serialNumber: 'WD-2023-4122X',
    warningThresholdPercent: 80,
    healthStatus: 'critical',
    color: 'rose',
    notes: 'Kapasitas >85% (Kritis). Perlu memindahkan sebagian subfolder video ke HDD 3.',
    foldersCount: 5,
    filesCount: 310,
  },
  {
    id: 'hdd-3',
    name: 'HDD 3 - Long-Term Backup (Seagate 4TB)',
    driveLetterOrMount: 'F:\\',
    totalCapacityGB: 4000,
    usedBytes: 1120 * 1024 * 1024 * 1024, // 1.12 TB (~28% - Sangat Aman)
    brand: 'Seagate Expansion Desktop',
    serialNumber: 'SEA-2025-9901M',
    warningThresholdPercent: 80,
    healthStatus: 'good',
    color: 'emerald',
    notes: 'Kapasitas sangat luang (2.88 TB tersisa). Cocok sebagai target relokasi file.',
    foldersCount: 3,
    filesCount: 95,
  },
  {
    id: 'hdd-4',
    name: 'HDD 4 - Projects & Working Cache (Samsung 2TB)',
    driveLetterOrMount: 'G:\\',
    totalCapacityGB: 2000,
    usedBytes: 850 * 1024 * 1024 * 1024, // 0.85 TB (~42% - Aman)
    brand: 'Samsung T7 Shield / Portable',
    serialNumber: 'SAM-2024-5510C',
    warningThresholdPercent: 80,
    healthStatus: 'good',
    color: 'indigo',
    notes: 'Drive kerja harian cepat untuk aset desain, RAW photos, dan source code.',
    foldersCount: 3,
    filesCount: 142,
  },
];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(val >= 100 || i < 2 ? 0 : 1)} ${sizes[i]}`;
}

export function getFileTypeFromExtension(ext: string): string {
  const clean = ext.replace(/^\./, '').toLowerCase();
  if (['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm'].includes(clean)) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'raw', 'cr2', 'nef', 'bmp', 'tiff'].includes(clean)) return 'image';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md'].includes(clean)) return 'docx';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(clean)) return 'archive';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(clean)) return 'audio';
  if (['ts', 'tsx', 'js', 'py', 'json', 'html', 'css', 'sql', 'sh'].includes(clean)) return 'code';
  return 'other';
}

/**
 * Returns the Python script text that scans drives on Windows/Mac/Linux
 * and exports to compatible Excel workbook (.xlsx).
 */
export function getPythonScannerScript(): string {
  return `"""
====================================================================
RUBIXXLINK - HDD STORAGE SCANNER SCRIPT (PYTHON)
====================================================================
Deskripsi:
Script ini memindai isi 4 Hardisk Eksternal (atau drive/folder pilihan Anda),
mencatat struktur Folder, Subfolder, Nama File, Ukuran (Bytes), Tipe Berkas,
dan mengekspornya langsung ke format Excel (.xlsx) yang kompatibel dengan
Dashboard Storage Management Rubixxxlink.

Persyaratan:
  pip install openpyxl

Cara Pakai:
  python hdd_inventory_scanner.py
====================================================================
"""

import os
import datetime
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    print("ERROR: Library 'openpyxl' belum terpasang.")
    print("Silakan jalankan perintah ini di terminal:")
    print("    pip install openpyxl")
    exit(1)

# ====================================================================
# PENGATURAN 4 HARDISK EKSTERNAL (Sesuaikan Huruf Drive Anda)
# ====================================================================
DRIVES_TO_SCAN = [
    {
        "hdd_id": "hdd-1",
        "hdd_name": "HDD 1 - Master Storage (Toshiba 2TB)",
        "mount_path": "D:\\\\",      # Sesuaikan path (misal "D:\\\\" di Windows, atau "/Volumes/HDD1" di Mac/Linux)
        "capacity_gb": 2000,
    },
    {
        "hdd_id": "hdd-2",
        "hdd_name": "HDD 2 - Media & Video Vault (WD 2TB)",
        "mount_path": "E:\\\\",
        "capacity_gb": 2000,
    },
    {
        "hdd_id": "hdd-3",
        "hdd_name": "HDD 3 - Long-Term Backup (Seagate 4TB)",
        "mount_path": "F:\\\\",
        "capacity_gb": 4000,
    },
    {
        "hdd_id": "hdd-4",
        "hdd_name": "HDD 4 - Projects & Working Cache (Samsung 2TB)",
        "mount_path": "G:\\\\",
        "capacity_gb": 2000,
    },
]

# Ekstensi yang diabaikan (opsional)
EXCLUDED_EXTENSIONS = {'.tmp', '.crdownload', '.part', '.ds_store', 'thumbs.db'}
EXCLUDED_FOLDERS = {'$recycle.bin', 'system volume information', '.trash-1000', '.git', 'node_modules'}

def categorize_extension(ext):
    ext = ext.lower().lstrip('.')
    if ext in ['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'webm', 'ts', 'm4v']:
        return 'video'
    elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'raw', 'cr2', 'nef', 'bmp', 'tiff', 'psd']:
        return 'image'
    elif ext in ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'epub']:
        return 'docx'
    elif ext in ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'bz2']:
        return 'archive'
    elif ext in ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']:
        return 'audio'
    elif ext in ['py', 'js', 'ts', 'html', 'css', 'json', 'sql', 'sh', 'cpp', 'java']:
        return 'code'
    return 'other'

def format_size(bytes_val):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} PB"

def scan_hdd_drives(output_excel="hdd_inventory_result.xlsx"):
    wb = openpyxl.Workbook()
    # Hapus sheet default pertama
    ws_default = wb.active
    wb.remove(ws_default)

    # Buat Sheet 1: Master Files Manifest
    ws_files = wb.create_sheet(title="File_Manifest")
    headers = [
        "HDD ID",
        "HDD Name",
        "Root Folder",
        "Subfolder",
        "Relative Path",
        "Full Path",
        "File Name",
        "Extension",
        "Category",
        "Size (Bytes)",
        "Size Formatted",
        "Modified Date"
    ]
    ws_files.append(headers)

    # Style Header
    header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for col_num, _ in enumerate(headers, 1):
        cell = ws_files.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    total_scanned_files = 0
    total_scanned_bytes = 0

    print("\\n" + "="*60)
    print("MEMULAI PEMINDAIAN 4 HARDISK EKSTERNAL")
    print("="*60)

    for drive in DRIVES_TO_SCAN:
        hdd_id = drive["hdd_id"]
        hdd_name = drive["hdd_name"]
        mount_path = drive["mount_path"]

        print(f"\\n[+] Memindai {hdd_name} pada '{mount_path}'...")

        if not os.path.exists(mount_path):
            print(f"    [!] PERINGATAN: Path '{mount_path}' tidak terdeteksi / tidak terhubung.")
            print(f"        (Anda tetap dapat memasukkan path folder uji coba)")
            continue

        drive_files_count = 0
        drive_bytes = 0

        for root, dirs, files in os.walk(mount_path):
            # Filter folder yang diabaikan
            dirs[:] = [d for d in dirs if d.lower() not in EXCLUDED_FOLDERS]

            rel_dir = os.path.relpath(root, mount_path)
            parts = Path(rel_dir).parts if rel_dir != '.' else ()

            root_folder = parts[0] if len(parts) > 0 else "(Root)"
            subfolder = "\\\\".join(parts[1:]) if len(parts) > 1 else ""

            for filename in files:
                if filename.lower() in EXCLUDED_EXTENSIONS:
                    continue

                full_path = os.path.join(root, filename)
                try:
                    stats = os.stat(full_path)
                    file_size = stats.st_size
                    mod_time = datetime.datetime.fromtimestamp(stats.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    file_size = 0
                    mod_time = datetime.datetime.now().strftime("%Y-%m-%d")

                ext = os.path.splitext(filename)[1].lower()
                category = categorize_extension(ext)
                size_formatted = format_size(file_size)

                row_data = [
                    hdd_id,
                    hdd_name,
                    root_folder,
                    subfolder,
                    rel_dir if rel_dir != '.' else root_folder,
                    full_path,
                    filename,
                    ext,
                    category,
                    file_size,
                    size_formatted,
                    mod_time
                ]
                ws_files.append(row_data)

                drive_files_count += 1
                drive_bytes += file_size
                total_scanned_files += 1
                total_scanned_bytes += file_size

        print(f"    -> Selesai: {drive_files_count} berkas ({format_size(drive_bytes)})")

    # Atur lebar kolom otomatis
    for col in ws_files.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_files.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

    # Simpan File Excel
    wb.save(output_excel)
    print("\\n" + "="*60)
    print(f"SUKSES! File Excel tersimpan: {output_excel}")
    print(f"Total Berkas: {total_scanned_files} file | Total Ukuran: {format_size(total_scanned_bytes)}")
    print("Silakan upload file ini ke dashboard Rubixxxlink untuk melihat visualisasi kesehatan HDD!")
    print("="*60 + "\\n")

if __name__ == "__main__":
    scan_hdd_drives()
`;
}

/**
 * Parses uploaded Excel workbook from Python scanner or manual template.
 */
export async function parseStorageManifestExcel(
  file: File,
  currentDrives: HardDriveProfile[]
): Promise<{
  folders: StorageFolder[];
  drives: HardDriveProfile[];
  totalFilesParsed: number;
  totalBytesParsed: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames.length) {
    throw new Error('File Excel tidak memiliki lembar sheet yang valid.');
  }

  // Pick sheet: "File_Manifest" or first sheet
  const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('manifest') || s.toLowerCase().includes('file')) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  if (rows.length < 2) {
    throw new Error('File Excel kosong atau tidak memiliki baris data berkas.');
  }

  const rawHeaders = rows[0].map(h => String(h || '').trim().toLowerCase());

  // Helper to find column index
  const findCol = (aliases: string[]) => {
    return rawHeaders.findIndex(h => aliases.some(a => h === a || h.includes(a)));
  };

  const colHddId = findCol(['hdd id', 'hdd_id', 'drive id', 'id hdd', 'drive']);
  const colHddName = findCol(['hdd name', 'hdd_name', 'drive name', 'nama hdd', 'hardisk']);
  const colRootFolder = findCol(['root folder', 'root_folder', 'folder', 'direktori', 'folder utama']);
  const colSubfolder = findCol(['subfolder', 'sub folder', 'sub direktori', 'sub_folder']);
  const colFullPath = findCol(['full path', 'full_path', 'path', 'lokasi', 'relative path']);
  const colFileName = findCol(['file name', 'file_name', 'nama file', 'file', 'berkas']);
  const colExt = findCol(['extension', 'ext', 'ekstensi']);
  const colCategory = findCol(['category', 'kategori', 'type', 'tipe']);
  const colSizeBytes = findCol(['size (bytes)', 'size_bytes', 'bytes', 'ukuran bytes', 'size']);
  const colSizeFormatted = findCol(['size formatted', 'size_formatted', 'ukuran format', 'formatted']);
  const colDate = findCol(['modified date', 'modified', 'tanggal', 'date', 'terakhir diubah']);

  const parsedFoldersMap = new Map<string, StorageFolder>();
  const updatedDrivesMap = new Map<string, HardDriveProfile>();

  // Clone current drives
  currentDrives.forEach(d => {
    updatedDrivesMap.set(d.id, {
      ...d,
      usedBytes: 0,
      foldersCount: 0,
      filesCount: 0,
    });
  });

  let totalFilesParsed = 0;
  let totalBytesParsed = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell)) continue;

    let hddIdVal = colHddId >= 0 ? String(row[colHddId] || '').trim().toLowerCase() : '';
    let hddNameVal = colHddName >= 0 ? String(row[colHddName] || '').trim() : '';
    const rootFolderVal = colRootFolder >= 0 ? String(row[colRootFolder] || '').trim() : 'General Storage';
    const subfolderVal = colSubfolder >= 0 ? String(row[colSubfolder] || '').trim() : '';
    const fullPathVal = colFullPath >= 0 ? String(row[colFullPath] || '').trim() : '';
    const fileNameVal = colFileName >= 0 ? String(row[colFileName] || '').trim() : `file_${i}`;

    let extVal = colExt >= 0 ? String(row[colExt] || '').trim() : '';
    if (!extVal && fileNameVal.includes('.')) {
      extVal = '.' + fileNameVal.split('.').pop()!;
    }

    let categoryVal = colCategory >= 0 ? String(row[colCategory] || '').trim().toLowerCase() : '';
    if (!categoryVal) {
      categoryVal = getFileTypeFromExtension(extVal);
    }

    let sizeBytesVal = 0;
    if (colSizeBytes >= 0) {
      const raw = row[colSizeBytes];
      sizeBytesVal = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
    }

    let sizeFormattedVal = colSizeFormatted >= 0 && row[colSizeFormatted] ? String(row[colSizeFormatted]).trim() : formatBytes(sizeBytesVal);
    const dateVal = colDate >= 0 && row[colDate] ? String(row[colDate]).trim() : new Date().toISOString().split('T')[0];

    // Normalize HDD ID to one of hdd-1, hdd-2, hdd-3, hdd-4 or match by drive letter or name
    let matchedHddId = 'hdd-1';
    if (hddIdVal.includes('1') || hddNameVal.includes('1') || fullPathVal.startsWith('D:')) {
      matchedHddId = 'hdd-1';
    } else if (hddIdVal.includes('2') || hddNameVal.includes('2') || fullPathVal.startsWith('E:')) {
      matchedHddId = 'hdd-2';
    } else if (hddIdVal.includes('3') || hddNameVal.includes('3') || fullPathVal.startsWith('F:')) {
      matchedHddId = 'hdd-3';
    } else if (hddIdVal.includes('4') || hddNameVal.includes('4') || fullPathVal.startsWith('G:')) {
      matchedHddId = 'hdd-4';
    } else if (hddIdVal && updatedDrivesMap.has(hddIdVal)) {
      matchedHddId = hddIdVal;
    }

    // Build unique folder key: hddId + '::' + rootFolder
    const folderKey = `${matchedHddId}::${rootFolderVal || 'General'}`;

    if (!parsedFoldersMap.has(folderKey)) {
      const colors: ('blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan')[] = [
        'blue',
        'emerald',
        'amber',
        'purple',
        'rose',
        'cyan',
      ];
      const themeColor = colors[parsedFoldersMap.size % colors.length];

      parsedFoldersMap.set(folderKey, {
        id: `fld-${matchedHddId}-${Date.now()}-${parsedFoldersMap.size + 1}`,
        name: rootFolderVal || 'General',
        hddId: matchedHddId,
        hddName: updatedDrivesMap.get(matchedHddId)?.name || `HDD ${matchedHddId}`,
        path: fullPathVal ? fullPathVal.split(fileNameVal)[0] : '',
        description: `Folder pada ${updatedDrivesMap.get(matchedHddId)?.name || matchedHddId}`,
        themeColor,
        usedBytes: 0,
        capacityBytes: (updatedDrivesMap.get(matchedHddId)?.totalCapacityGB || 2000) * 1024 * 1024 * 1024,
        usedStorageFormatted: '0 B',
        totalCapacityFormatted: `${updatedDrivesMap.get(matchedHddId)?.totalCapacityGB || 2000} GB`,
        filesCount: 0,
        foldersCount: 0,
        sharedCount: 0,
        tags: [matchedHddId.toUpperCase(), categoryVal || 'Storage'],
        ownerName: 'HDD Scanner',
        createdAt: dateVal.split(' ')[0] || new Date().toISOString().split('T')[0],
        files: [],
        subfolders: [],
      });
    }

    const folder = parsedFoldersMap.get(folderKey)!;

    // Create file item with stable unique ID based on path or name
    const fileItem: StorageFile = {
      id: `file-${matchedHddId}-${fullPathVal ? fullPathVal.replace(/[^a-zA-Z0-9]/g, '_') : i}`,
      name: fileNameVal,
      size: sizeBytesVal,
      sizeFormatted: sizeFormattedVal,
      type: categoryVal,
      updatedAt: dateVal.split(' ')[0],
      path: fullPathVal,
      subfolder: subfolderVal,
      hddId: matchedHddId,
      extension: extVal,
      downloadUrl: '#',
    };

    folder.files = folder.files || [];
    
    // Check if file already exists in folder (by full path or exact filename + subfolder) to prevent double counting / stacking
    const existingFileIndex = folder.files.findIndex(
      f => (f.path && fullPathVal && f.path.toLowerCase() === fullPathVal.toLowerCase()) || 
           (f.name.toLowerCase() === fileNameVal.toLowerCase() && (f.subfolder || '') === (subfolderVal || ''))
    );

    let sizeDiff = sizeBytesVal;
    if (existingFileIndex >= 0) {
      const oldFile = folder.files[existingFileIndex];
      sizeDiff = sizeBytesVal - oldFile.size;
      // Replace existing file in folder
      folder.files[existingFileIndex] = fileItem;
      folder.usedBytes += sizeDiff;
    } else {
      folder.files.push(fileItem);
      folder.usedBytes += sizeBytesVal;
      folder.filesCount += 1;
    }

    // Handle subfolder grouping
    if (subfolderVal) {
      folder.subfolders = folder.subfolders || [];
      let existingSubfolder = folder.subfolders.find(s => s.name.toLowerCase() === subfolderVal.toLowerCase());
      if (!existingSubfolder) {
        existingSubfolder = {
          // Scoped by folder.id (not just hddId) so two different top-level
          // folders on the same HDD with an identically-named subfolder
          // (e.g. both have a "Photos" subfolder) don't end up with the
          // same subfolder id — that collision breaks per-row selection in
          // Storage Management's Subfolder Catalog (SubFolderCatalog.tsx).
          id: `sub-${folder.id}-${subfolderVal.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: subfolderVal,
          path: `${folder.name}\\${subfolderVal}`,
          sizeBytes: 0,
          sizeFormatted: '0 B',
          filesCount: 0,
          subfoldersCount: 0,
          hddId: matchedHddId,
          files: [],
        };
        folder.subfolders.push(existingSubfolder);
        folder.foldersCount = folder.subfolders.length;
      }

      existingSubfolder.files = existingSubfolder.files || [];
      const existingSubFileIndex = existingSubfolder.files.findIndex(
        f => (f.path && fullPathVal && f.path.toLowerCase() === fullPathVal.toLowerCase()) || 
             f.name.toLowerCase() === fileNameVal.toLowerCase()
      );

      if (existingSubFileIndex >= 0) {
        const oldSubFile = existingSubfolder.files[existingSubFileIndex];
        const subSizeDiff = sizeBytesVal - oldSubFile.size;
        existingSubfolder.files[existingSubFileIndex] = fileItem;
        existingSubfolder.sizeBytes = (existingSubfolder.sizeBytes ?? 0) + subSizeDiff;
      } else {
        existingSubfolder.files.push(fileItem);
        existingSubfolder.sizeBytes = (existingSubfolder.sizeBytes ?? 0) + sizeBytesVal;
        existingSubfolder.filesCount += 1;
      }
      existingSubfolder.sizeFormatted = formatBytes(existingSubfolder.sizeBytes ?? 0);
    }

    // Accumulate drive usage with exact size diff
    const targetDrive = updatedDrivesMap.get(matchedHddId);
    if (targetDrive) {
      targetDrive.usedBytes += sizeDiff;
      if (existingFileIndex < 0) {
        targetDrive.filesCount = (targetDrive.filesCount || 0) + 1;
      }
    }

    totalFilesParsed++;
    totalBytesParsed += sizeBytesVal;
  }

  // Format folder sizes and update drive metrics
  const finalFolders = Array.from(parsedFoldersMap.values()).map(f => ({
    ...f,
    usedStorageFormatted: formatBytes(f.usedBytes),
  }));

  // Update drive folder counts and health status
  const finalDrives = Array.from(updatedDrivesMap.values()).map(drive => {
    const driveFolders = finalFolders.filter(f => f.hddId === drive.id);
    const capacityBytes = drive.totalCapacityGB * 1024 * 1024 * 1024;
    const usagePercent = capacityBytes > 0 ? (drive.usedBytes / capacityBytes) * 100 : 0;

    let healthStatus: 'good' | 'warning' | 'critical' = 'good';
    if (usagePercent >= 85) {
      healthStatus = 'critical';
    } else if (usagePercent >= drive.warningThresholdPercent) {
      healthStatus = 'warning';
    }

    return {
      ...drive,
      foldersCount: driveFolders.length,
      healthStatus,
    };
  });

  return {
    folders: finalFolders,
    drives: finalDrives,
    totalFilesParsed,
    totalBytesParsed,
  };
}

/**
 * Generates and triggers download of a ready-to-use sample Excel spreadsheet for testing.
 */
export function generateSampleHddExcel(): void {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    [
      'HDD ID',
      'HDD Name',
      'Root Folder',
      'Subfolder',
      'Relative Path',
      'Full Path',
      'File Name',
      'Extension',
      'Category',
      'Size (Bytes)',
      'Size Formatted',
      'Modified Date',
    ],
    // HDD 1 Samples (Toshiba)
    [
      'hdd-1',
      'HDD 1 - Master Storage (Toshiba 2TB)',
      'Movies',
      'Action 4K',
      'Movies\\Action 4K',
      'D:\\Movies\\Action 4K\\Inception.2010.2160p.mkv',
      'Inception.2010.2160p.mkv',
      '.mkv',
      'video',
      24500000000, // 24.5 GB
      '24.5 GB',
      '2026-01-14 14:20:00',
    ],
    [
      'hdd-1',
      'HDD 1 - Master Storage (Toshiba 2TB)',
      'Movies',
      'Sci-Fi',
      'Movies\\Sci-Fi',
      'D:\\Movies\\Sci-Fi\\Interstellar.2014.1080p.mkv',
      'Interstellar.2014.1080p.mkv',
      '.mkv',
      'video',
      12800000000,
      '12.8 GB',
      '2026-02-01 10:15:00',
    ],
    [
      'hdd-1',
      'HDD 1 - Master Storage (Toshiba 2TB)',
      'Software ISOs',
      'Operating Systems',
      'Software ISOs\\Operating Systems',
      'D:\\Software ISOs\\Operating Systems\\Ubuntu_24_04_LTS.iso',
      'Ubuntu_24_04_LTS.iso',
      '.iso',
      'archive',
      4800000000,
      '4.8 GB',
      '2026-03-05 09:30:00',
    ],

    // HDD 2 Samples (WD - Heavy Video Vault)
    [
      'hdd-2',
      'HDD 2 - Media & Video Vault (WD 2TB)',
      'Wedding Footage 2025',
      'Day 1 - Akad',
      'Wedding Footage 2025\\Day 1 - Akad',
      'E:\\Wedding Footage 2025\\Day 1 - Akad\\CAM_A_CLIP_001.MOV',
      'CAM_A_CLIP_001.MOV',
      '.mov',
      'video',
      42000000000,
      '42.0 GB',
      '2025-11-20 18:00:00',
    ],
    [
      'hdd-2',
      'HDD 2 - Media & Video Vault (WD 2TB)',
      'Wedding Footage 2025',
      'Day 1 - Akad',
      'Wedding Footage 2025\\Day 1 - Akad',
      'E:\\Wedding Footage 2025\\Day 1 - Akad\\CAM_B_CLIP_002.MOV',
      'CAM_B_CLIP_002.MOV',
      '.mov',
      'video',
      38500000000,
      '38.5 GB',
      '2025-11-20 19:10:00',
    ],
    [
      'hdd-2',
      'HDD 2 - Media & Video Vault (WD 2TB)',
      'Drone Master Shots',
      'Bali 2025',
      'Drone Master Shots\\Bali 2025',
      'E:\\Drone Master Shots\\Bali 2025\\DJI_UHD_0088.MP4',
      'DJI_UHD_0088.MP4',
      '.mp4',
      'video',
      18200000000,
      '18.2 GB',
      '2025-12-10 11:45:00',
    ],

    // HDD 3 Samples (Seagate - Backup & Docs)
    [
      'hdd-3',
      'HDD 3 - Long-Term Backup (Seagate 4TB)',
      'Database Dumps',
      'SQL 2025',
      'Database Dumps\\SQL 2025',
      'F:\\Database Dumps\\SQL 2025\\production_backup_dec.sql.gz',
      'production_backup_dec.sql.gz',
      '.gz',
      'archive',
      8500000000,
      '8.5 GB',
      '2025-12-31 23:59:00',
    ],
    [
      'hdd-3',
      'HDD 3 - Long-Term Backup (Seagate 4TB)',
      'Office Documents Archive',
      'Finance & Invoices',
      'Office Documents Archive\\Finance & Invoices',
      'F:\\Office Documents Archive\\Finance & Invoices\\Laporan_Keuangan_Tahunan_2025.xlsx',
      'Laporan_Keuangan_Tahunan_2025.xlsx',
      '.xlsx',
      'docx',
      15800000,
      '15.8 MB',
      '2026-01-10 16:30:00',
    ],

    // HDD 4 Samples (Samsung - Projects & RAWs)
    [
      'hdd-4',
      'HDD 4 - Projects & Working Cache (Samsung 2TB)',
      'Photo Sessions RAW',
      'Landscape Bromo',
      'Photo Sessions RAW\\Landscape Bromo',
      'G:\\Photo Sessions RAW\\Landscape Bromo\\DSC_9801.CR2',
      'DSC_9801.CR2',
      '.cr2',
      'image',
      48500000,
      '48.5 MB',
      '2026-02-18 06:12:00',
    ],
    [
      'hdd-4',
      'HDD 4 - Projects & Working Cache (Samsung 2TB)',
      'Web Development Projects',
      'Rubixxxlink v2',
      'Web Development Projects\\Rubixxxlink v2',
      'G:\\Web Development Projects\\Rubixxxlink v2\\source_code_snapshot.zip',
      'source_code_snapshot.zip',
      '.zip',
      'archive',
      1250000000,
      '1.25 GB',
      '2026-03-01 20:00:00',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'File_Manifest');
  XLSX.writeFile(wb, 'rubixxxlink_hdd_inventory_sample.xlsx');
}

export const INITIAL_SAMPLE_FOLDERS: StorageFolder[] = [
  // HDD 1 - Master Storage (Toshiba 2TB)
  {
    id: 'folder-hdd1-movies',
    name: 'Koleksi Film 4K & Series',
    ownerName: 'Master Archive',
    hddId: 'hdd-1',
    hddName: 'HDD 1 - Master Storage (Toshiba 2TB)',
    path: 'D:\\Koleksi Film 4K & Series',
    description: 'Arsip film bioskop resolusi Ultra HD, dokumenter alam, dan serial pilihan.',
    createdAt: 'Jan 12, 2025',
    themeColor: 'amber',
    usedBytes: 840 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '840 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 92,
    foldersCount: 3,
    sharedCount: 2,
    tags: ['Movies', '4K UHD', 'Entertainment'],
    subfolders: [
      {
        name: 'Sci-Fi & Action',
        relativePath: 'Koleksi Film 4K & Series\\Sci-Fi & Action',
        fullPath: 'D:\\Koleksi Film 4K & Series\\Sci-Fi & Action',
        filesCount: 42,
        usedBytes: 420 * 1024 * 1024 * 1024,
        sizeFormatted: '420 GB',
      },
      {
        name: 'Documentary 2024',
        relativePath: 'Koleksi Film 4K & Series\\Documentary 2024',
        fullPath: 'D:\\Koleksi Film 4K & Series\\Documentary 2024',
        filesCount: 28,
        usedBytes: 260 * 1024 * 1024 * 1024,
        sizeFormatted: '260 GB',
      },
      {
        name: 'Drama Series',
        relativePath: 'Koleksi Film 4K & Series\\Drama Series',
        fullPath: 'D:\\Koleksi Film 4K & Series\\Drama Series',
        filesCount: 22,
        usedBytes: 160 * 1024 * 1024 * 1024,
        sizeFormatted: '160 GB',
      },
    ],
    files: [
      {
        id: 'file-d1',
        name: 'Interstellar.2014.2160p.UHD.Remux.mkv',
        size: 58000000000,
        sizeFormatted: '54.0 GB',
        type: 'video',
        updatedAt: '2025-11-20',
        downloadUrl: '#',
      },
      {
        id: 'file-d2',
        name: 'Dune.Part.Two.2024.4K.HDR.mkv',
        size: 42000000000,
        sizeFormatted: '39.1 GB',
        type: 'video',
        updatedAt: '2025-12-05',
        downloadUrl: '#',
      },
    ],
  },
  {
    id: 'folder-hdd1-3d',
    name: '3D Render & Asset Library',
    ownerName: 'Studio Work',
    hddId: 'hdd-1',
    hddName: 'HDD 1 - Master Storage (Toshiba 2TB)',
    path: 'D:\\3D Render & Asset Library',
    description: 'Pustaka model 3D Blender, materi PBR texture, dan animasi render pipeline.',
    createdAt: 'Feb 04, 2025',
    themeColor: 'blue',
    usedBytes: 700 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '700 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 92,
    foldersCount: 2,
    sharedCount: 0,
    tags: ['3D', 'Blender', 'Textures'],
    subfolders: [
      {
        name: 'Blender Projects',
        relativePath: '3D Render & Asset Library\\Blender Projects',
        fullPath: 'D:\\3D Render & Asset Library\\Blender Projects',
        filesCount: 45,
        usedBytes: 380 * 1024 * 1024 * 1024,
        sizeFormatted: '380 GB',
      },
      {
        name: 'Textures 4K PBR',
        relativePath: '3D Render & Asset Library\\Textures 4K PBR',
        fullPath: 'D:\\3D Render & Asset Library\\Textures 4K PBR',
        filesCount: 47,
        usedBytes: 320 * 1024 * 1024 * 1024,
        sizeFormatted: '320 GB',
      },
    ],
  },

  // HDD 2 - Media & Video Vault (WD 2TB - KRITIS 89%)
  {
    id: 'folder-hdd2-wedding',
    name: 'Wedding Footage 2025',
    ownerName: 'Video Production',
    hddId: 'hdd-2',
    hddName: 'HDD 2 - Media & Video Vault (WD 2TB)',
    path: 'E:\\Wedding Footage 2025',
    description: 'Master raw footage rekaman pernikahan multi-camera 4K ProRes & Sony S-Log.',
    createdAt: 'Jan 15, 2025',
    themeColor: 'rose',
    usedBytes: 980 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '980 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 160,
    foldersCount: 3,
    sharedCount: 1,
    tags: ['Video', 'Raw Footage', 'ProRes', 'Needs-Rebalance'],
    subfolders: [
      {
        name: 'Clip Raw 4K Cam A',
        relativePath: 'Wedding Footage 2025\\Clip Raw 4K Cam A',
        fullPath: 'E:\\Wedding Footage 2025\\Clip Raw 4K Cam A',
        filesCount: 80,
        usedBytes: 520 * 1024 * 1024 * 1024,
        sizeFormatted: '520 GB',
      },
      {
        name: 'Clip Raw 4K Cam B',
        relativePath: 'Wedding Footage 2025\\Clip Raw 4K Cam B',
        fullPath: 'E:\\Wedding Footage 2025\\Clip Raw 4K Cam B',
        filesCount: 60,
        usedBytes: 380 * 1024 * 1024 * 1024,
        sizeFormatted: '380 GB',
      },
      {
        name: 'Audio Multi-track',
        relativePath: 'Wedding Footage 2025\\Audio Multi-track',
        fullPath: 'E:\\Wedding Footage 2025\\Audio Multi-track',
        filesCount: 20,
        usedBytes: 80 * 1024 * 1024 * 1024,
        sizeFormatted: '80 GB',
      },
    ],
  },
  {
    id: 'folder-hdd2-youtube',
    name: 'YouTube Content Archive',
    ownerName: 'Creative Team',
    hddId: 'hdd-2',
    hddName: 'HDD 2 - Media & Video Vault (WD 2TB)',
    path: 'E:\\YouTube Content Archive',
    description: 'Arsip episode video YouTube, aset intro/outro b-roll, dan sound design.',
    createdAt: 'Feb 10, 2025',
    themeColor: 'rose',
    usedBytes: 800 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '800 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 150,
    foldersCount: 2,
    sharedCount: 3,
    tags: ['YouTube', 'B-Roll', 'Episodes'],
    subfolders: [
      {
        name: 'Episodes 2024-2025',
        relativePath: 'YouTube Content Archive\\Episodes 2024-2025',
        fullPath: 'E:\\YouTube Content Archive\\Episodes 2024-2025',
        filesCount: 95,
        usedBytes: 550 * 1024 * 1024 * 1024,
        sizeFormatted: '550 GB',
      },
      {
        name: 'Sound FX & B-Roll Stock',
        relativePath: 'YouTube Content Archive\\Sound FX & B-Roll Stock',
        fullPath: 'E:\\YouTube Content Archive\\Sound FX & B-Roll Stock',
        filesCount: 55,
        usedBytes: 250 * 1024 * 1024 * 1024,
        sizeFormatted: '250 GB',
      },
    ],
  },

  // HDD 3 - Long-Term Backup (Seagate 4TB - AMAN 28%)
  {
    id: 'folder-hdd3-databases',
    name: 'Database Dumps & Server Backups',
    ownerName: 'DevOps / SysAdmin',
    hddId: 'hdd-3',
    hddName: 'HDD 3 - Long-Term Backup (Seagate 4TB)',
    path: 'F:\\Database Dumps & Server Backups',
    description: 'Backup terkompresi berkala basis data PostgreSQL, Firestore snapshots, & log.',
    createdAt: 'Dec 01, 2024',
    themeColor: 'emerald',
    usedBytes: 680 * 1024 * 1024 * 1024,
    capacityBytes: 4000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '680 GB',
    totalCapacityFormatted: '4000 GB',
    filesCount: 65,
    foldersCount: 2,
    sharedCount: 0,
    tags: ['Backups', 'SQL', 'Security'],
    subfolders: [
      {
        name: 'SQL Production 2025',
        relativePath: 'Database Dumps & Server Backups\\SQL Production 2025',
        fullPath: 'F:\\Database Dumps & Server Backups\\SQL Production 2025',
        filesCount: 40,
        usedBytes: 420 * 1024 * 1024 * 1024,
        sizeFormatted: '420 GB',
      },
      {
        name: 'Docker Volume Snapshots',
        relativePath: 'Database Dumps & Server Backups\\Docker Volume Snapshots',
        fullPath: 'F:\\Database Dumps & Server Backups\\Docker Volume Snapshots',
        filesCount: 25,
        usedBytes: 260 * 1024 * 1024 * 1024,
        sizeFormatted: '260 GB',
      },
    ],
  },
  {
    id: 'folder-hdd3-office',
    name: 'Office Documents & Legal Archive',
    ownerName: 'Administration',
    hddId: 'hdd-3',
    hddName: 'HDD 3 - Long-Term Backup (Seagate 4TB)',
    path: 'F:\\Office Documents & Legal Archive',
    description: 'Arsip berkas legal, kontrak kerja sama klien, laporan pajak, dan rekapan akuntansi.',
    createdAt: 'Jan 02, 2025',
    themeColor: 'emerald',
    usedBytes: 440 * 1024 * 1024 * 1024,
    capacityBytes: 4000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '440 GB',
    totalCapacityFormatted: '4000 GB',
    filesCount: 88,
    foldersCount: 2,
    sharedCount: 5,
    tags: ['Finance', 'Legal', 'Contracts'],
    subfolders: [
      {
        name: 'Finance & Invoices',
        relativePath: 'Office Documents & Legal Archive\\Finance & Invoices',
        fullPath: 'F:\\Office Documents & Legal Archive\\Finance & Invoices',
        filesCount: 50,
        usedBytes: 240 * 1024 * 1024 * 1024,
        sizeFormatted: '240 GB',
      },
      {
        name: 'Contracts & MoUs',
        relativePath: 'Office Documents & Legal Archive\\Contracts & MoUs',
        fullPath: 'F:\\Office Documents & Legal Archive\\Contracts & MoUs',
        filesCount: 38,
        usedBytes: 200 * 1024 * 1024 * 1024,
        sizeFormatted: '200 GB',
      },
    ],
  },

  // HDD 4 - Projects & Working Cache (Samsung 2TB - AMAN 32%)
  {
    id: 'folder-hdd4-photos',
    name: 'Photo Sessions RAW (Camera DNG/CR2)',
    ownerName: 'Photographer',
    hddId: 'hdd-4',
    hddName: 'HDD 4 - Projects & Working Cache (Samsung 2TB)',
    path: 'G:\\Photo Sessions RAW (Camera DNG/CR2)',
    description: 'File foto asli berformat RAW dari kamera Canon & Sony untuk proses color grading.',
    createdAt: 'Feb 15, 2025',
    themeColor: 'cyan',
    usedBytes: 390 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '390 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 82,
    foldersCount: 2,
    sharedCount: 1,
    tags: ['Photography', 'RAW', 'Lightroom'],
    subfolders: [
      {
        name: 'Landscape Bromo & Semeru',
        relativePath: 'Photo Sessions RAW\\Landscape Bromo & Semeru',
        fullPath: 'G:\\Photo Sessions RAW\\Landscape Bromo & Semeru',
        filesCount: 46,
        usedBytes: 230 * 1024 * 1024 * 1024,
        sizeFormatted: '230 GB',
      },
      {
        name: 'Commercial Product Shoot',
        relativePath: 'Photo Sessions RAW\\Commercial Product Shoot',
        fullPath: 'G:\\Photo Sessions RAW\\Commercial Product Shoot',
        filesCount: 36,
        usedBytes: 160 * 1024 * 1024 * 1024,
        sizeFormatted: '160 GB',
      },
    ],
  },
  {
    id: 'folder-hdd4-code',
    name: 'Web Development Projects & Cache',
    ownerName: 'Software Engineer',
    hddId: 'hdd-4',
    hddName: 'HDD 4 - Projects & Working Cache (Samsung 2TB)',
    path: 'G:\\Web Development Projects & Cache',
    description: 'Repositori source code, container volumes, asset build, dan dependensi cache.',
    createdAt: 'Mar 01, 2025',
    themeColor: 'cyan',
    usedBytes: 250 * 1024 * 1024 * 1024,
    capacityBytes: 2000 * 1024 * 1024 * 1024,
    usedStorageFormatted: '250 GB',
    totalCapacityFormatted: '2000 GB',
    filesCount: 60,
    foldersCount: 2,
    sharedCount: 2,
    tags: ['Code', 'Docker', 'Cache'],
    subfolders: [
      {
        name: 'Rubixxxlink v2 Full Stack',
        relativePath: 'Web Development Projects & Cache\\Rubixxxlink v2 Full Stack',
        fullPath: 'G:\\Web Development Projects & Cache\\Rubixxxlink v2 Full Stack',
        filesCount: 35,
        usedBytes: 150 * 1024 * 1024 * 1024,
        sizeFormatted: '150 GB',
      },
      {
        name: 'Client Web Apps',
        relativePath: 'Web Development Projects & Cache\\Client Web Apps',
        fullPath: 'G:\\Web Development Projects & Cache\\Client Web Apps',
        filesCount: 25,
        usedBytes: 100 * 1024 * 1024 * 1024,
        sizeFormatted: '100 GB',
      },
    ],
  },
];

