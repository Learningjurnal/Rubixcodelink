export interface DetectedFileType {
  extension: string;
  label: string;
  bgClass: string;
}

export function detectFileExtensionType(link: string = '', name: string = ''): DetectedFileType | null {
  const combined = `${link} ${name}`.toLowerCase();

  if (combined.includes('.pdf')) {
    return {
      extension: 'pdf',
      label: 'PDF',
      bgClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800',
    };
  }
  if (combined.includes('.zip') || combined.includes('.rar') || combined.includes('.tar') || combined.includes('.7z')) {
    return {
      extension: 'zip',
      label: 'ZIP',
      bgClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    };
  }
  if (combined.includes('.mp4') || combined.includes('.mov') || combined.includes('.avi') || combined.includes('.mkv')) {
    return {
      extension: 'mp4',
      label: 'MP4',
      bgClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    };
  }
  if (combined.includes('.jpg') || combined.includes('.jpeg') || combined.includes('.png') || combined.includes('.webp') || combined.includes('.gif')) {
    return {
      extension: 'jpg',
      label: 'IMG',
      bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (combined.includes('.xlsx') || combined.includes('.xls') || combined.includes('.csv')) {
    return {
      extension: 'xlsx',
      label: 'XLS',
      bgClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
    };
  }
  if (combined.includes('.docx') || combined.includes('.doc') || combined.includes('.txt')) {
    return {
      extension: 'docx',
      label: 'DOC',
      bgClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    };
  }

  return null;
}
