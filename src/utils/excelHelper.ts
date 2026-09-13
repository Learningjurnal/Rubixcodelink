import * as XLSX from 'xlsx';
import { ImportPreviewItem, LinkItem, LinkStatus } from '../types';
import { extractLinkFromText, extractAllLinksFromText, cleanUrl } from './linkExtractor';

export function normalizeUrl(url: string): string {
  if (!url) return '';
  let trimmed = cleanUrl(url);
  trimmed = trimmed.replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${parsed.pathname}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

export function formatDateNow(): string {
  const date = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => {
    const clean = String(h || '').trim().toLowerCase();
    return candidates.some(c => clean === c.toLowerCase() || clean.includes(c.toLowerCase()));
  });
}

/**
 * Parse Excel with support for:
 * 1. Cell Hyperlinks (cell.l.Target where link is embedded inside a text cell)
 * 2. Excel Formulas (=HYPERLINK("https://...", "Label"))
 * 3. Embedded links in cell text (e.g. "[Name](https://...)" or "Name - https://...")
 * 4. Multiple URLs in single cell or multiple columns
 * 5. Separate Name, Link, and Tag columns
 */
export async function parseExcelFile(
  file: File,
  existingLinks: LinkItem[],
  options: { deepExtractAllCells?: boolean } = { deepExtractAllCells: true }
): Promise<{
  previewItems: ImportPreviewItem[];
  duplicatesCount: number;
  newCount: number;
  extractedFromNamesCount: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellFormula: true });
  
  if (!workbook.SheetNames.length) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  if (rows.length === 0) {
    throw new Error('File Excel kosong.');
  }

  // Identify header row
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    if (row.some(c => c.includes('link') || c.includes('url') || c.includes('nama') || c.includes('name') || c.includes('status'))) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (rows[headerRowIndex] || []).map(h => String(h || '').trim());
  const nameCol = findHeaderIndex(headers, ['nama', 'name', 'title', 'judul', 'label']);
  const linkCol = findHeaderIndex(headers, ['link', 'url', 'tautan', 'download']);
  const statusCol = findHeaderIndex(headers, ['status', 'kondisi']);
  const outputCol = findHeaderIndex(headers, ['output', 'tipe', 'type']);
  const regionCol = findHeaderIndex(headers, ['region', 'wilayah', 'lokasi']);
  const noteCol = findHeaderIndex(headers, ['note', 'catatan', 'keterangan', 'pesan']);
  const tagCol = findHeaderIndex(headers, ['tag', 'kategori', 'category', 'label_tag', 'tags']);
  const countaCol = findHeaderIndex(headers, ['counta', 'jumlah', 'count']);
  const dateCol = findHeaderIndex(headers, ['diperbarui', 'updated', 'tanggal', 'date']);

  const actualLinkCol = linkCol !== -1 ? linkCol : (nameCol !== -1 ? nameCol : 0);

  const existingMap = new Map<string, string>();
  existingLinks.forEach(item => {
    existingMap.set(normalizeUrl(item.link), item.id);
  });

  const previewItems: ImportPreviewItem[] = [];
  let duplicatesCount = 0;
  let newCount = 0;
  let extractedFromNamesCount = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Metadata columns
    let statusVal: LinkStatus = 'Blank';
    if (statusCol !== -1 && row[statusCol]) {
      const s = String(row[statusCol]).trim().toLowerCase();
      if (s.includes('sudah') || s.includes('terunduh') || s.includes('downloaded') || s.includes('selesai')) {
        statusVal = 'Sudah Terunduh';
      } else if (s.includes('proses') || s.includes('process')) {
        statusVal = 'Proses';
      } else if (s.includes('gagal') || s.includes('fail')) {
        statusVal = 'Gagal';
      } else if (s.includes('inactive') || s.includes('mati')) {
        statusVal = 'Web Inactive';
      } else {
        statusVal = String(row[statusCol]).trim() || 'Blank';
      }
    }

    const outputVal = outputCol !== -1 && row[outputCol] ? String(row[outputCol]).trim() : 'Single';
    // Uppercased to match the app's own convention for region codes
    // (LIVE, ASIA, US, EU, ID, GLOBAL — and Settings force-uppercases any
    // custom region a user adds there too). Excel data keeps whatever case
    // was actually typed ("Cosplay"), which a native <select> only
    // highlights on an exact, case-sensitive match — normalizing here
    // keeps imported data consistent with every region value added any
    // other way, rather than relying solely on the display-layer
    // case-insensitive fallback in LinkTable.
    const regionVal = regionCol !== -1 && row[regionCol] ? String(row[regionCol]).trim().toUpperCase() : 'LIVE';
    const noteVal = noteCol !== -1 && row[noteCol] ? String(row[noteCol]).trim() : '';
    const tagVal = tagCol !== -1 && row[tagCol] ? String(row[tagCol]).trim() : '';
    const rawCounta = countaCol !== -1 && row[countaCol] !== undefined ? Number(row[countaCol]) : 1;
    const countaVal = !isNaN(rawCounta) && rawCounta > 0 ? rawCounta : 1;
    const dateVal = dateCol !== -1 && row[dateCol] ? String(row[dateCol]).trim() : formatDateNow();
    const defaultName = nameCol !== -1 && row[nameCol] ? String(row[nameCol]).trim() : '';

    // Extracted targets array for this row
    const rowExtractedLinks: { name: string; url: string; hasExtracted: boolean }[] = [];

    // Check main link cell
    const cellAddress = XLSX.utils.encode_cell({ r, c: actualLinkCol });
    const cellObj = worksheet[cellAddress];
    let rawLinkValue = String(row[actualLinkCol] || '').trim();

    // Check 1: Native cell hyperlink (cell.l.Target)
    if (cellObj && cellObj.l && cellObj.l.Target) {
      const targetUrl = cleanUrl(String(cellObj.l.Target));
      // An explicit Nama column always wins over the link cell's own
      // displayed text. Previously this was `rawLinkValue || defaultName`
      // — but rawLinkValue is the Link cell's own display text, which for
      // a native Excel hyperlink is virtually always the URL itself (that
      // is what Excel shows by default when you paste/auto-link a URL).
      // Since that's truthy, defaultName never won, so every row where
      // the Link column happened to be a real Excel hyperlink silently
      // lost its Nama column value and showed the raw URL as the name
      // instead — reported live as "nama hilang, muncul link-nya saja".
      // rawLinkValue is still the right fallback for a hyperlink with
      // custom display text and no separate Nama column at all.
      const cellText = defaultName || rawLinkValue;
      rowExtractedLinks.push({
        url: targetUrl,
        name: cellText,
        hasExtracted: true,
      });
      extractedFromNamesCount++;
    }

    // Check 2: Cell formula (=HYPERLINK(...))
    if (cellObj && cellObj.f && cellObj.f.includes('HYPERLINK')) {
      const formulaExtracted = extractLinkFromText(`=${cellObj.f}`);
      if (formulaExtracted.url) {
        rowExtractedLinks.push({
          url: formulaExtracted.url,
          name: formulaExtracted.name || defaultName || rawLinkValue,
          hasExtracted: true,
        });
        extractedFromNamesCount++;
      }
    }

    // Check 3: Raw link value (could have multiple URLs or embedded markdown/HTML)
    if (rawLinkValue && rowExtractedLinks.length === 0) {
      const multiple = extractAllLinksFromText(rawLinkValue);
      if (multiple.length > 0) {
        multiple.forEach(item => {
          const isDeepExtracted = item.name !== '' || rawLinkValue !== item.url;
          if (isDeepExtracted) extractedFromNamesCount++;
          rowExtractedLinks.push({
            url: item.url,
            name: item.name || defaultName,
            hasExtracted: isDeepExtracted,
          });
        });
      } else if (rawLinkValue.startsWith('http://') || rawLinkValue.startsWith('https://')) {
        rowExtractedLinks.push({
          url: cleanUrl(rawLinkValue),
          name: defaultName,
          hasExtracted: false,
        });
      }
    }

    // Check 4: If name column has embedded URLs
    if (nameCol !== -1 && row[nameCol] && rowExtractedLinks.length === 0) {
      const nameRaw = String(row[nameCol]).trim();
      const fromName = extractAllLinksFromText(nameRaw);
      if (fromName.length > 0) {
        fromName.forEach(item => {
          extractedFromNamesCount++;
          rowExtractedLinks.push({
            url: item.url,
            name: item.name || nameRaw.replace(item.url, '').trim(),
            hasExtracted: true,
          });
        });
      }
    }

    // Check 5: Deep extraction across other cells in this row if nothing found yet
    if (rowExtractedLinks.length === 0 && options.deepExtractAllCells) {
      for (let c = 0; c < row.length; c++) {
        if (c === actualLinkCol || c === nameCol) continue;
        const otherCellAddr = XLSX.utils.encode_cell({ r, c });
        const otherCell = worksheet[otherCellAddr];
        if (otherCell && otherCell.l && otherCell.l.Target) {
          rowExtractedLinks.push({
            url: cleanUrl(String(otherCell.l.Target)),
            name: String(row[c] || defaultName).trim(),
            hasExtracted: true,
          });
          extractedFromNamesCount++;
          break;
        }

        const cellText = String(row[c] || '').trim();
        const extracted = extractAllLinksFromText(cellText);
        if (extracted.length > 0) {
          extracted.forEach(item => {
            extractedFromNamesCount++;
            rowExtractedLinks.push({
              url: item.url,
              name: item.name || defaultName || `Link Baris ${r}`,
              hasExtracted: true,
            });
          });
          break;
        }
      }
    }

    // Fallback: If rawLinkValue looks like any text at all
    if (rowExtractedLinks.length === 0 && rawLinkValue && rawLinkValue.toLowerCase() !== 'link' && rawLinkValue.toLowerCase() !== 'url') {
      rowExtractedLinks.push({
        url: cleanUrl(rawLinkValue),
        name: defaultName,
        hasExtracted: false,
      });
    }

    // Append to preview items
    for (const extracted of rowExtractedLinks) {
      const finalLink = extracted.url;
      if (!finalLink || finalLink.toLowerCase() === 'link' || finalLink.toLowerCase() === 'url') {
        continue;
      }

      const norm = normalizeUrl(finalLink);
      const isDuplicate = existingMap.has(norm);
      const duplicateMatchId = existingMap.get(norm);

      if (isDuplicate) {
        duplicatesCount++;
      } else {
        newCount++;
        existingMap.set(norm, `import-temp-${r}`);
      }

      previewItems.push({
        name: extracted.name || defaultName,
        link: finalLink,
        status: statusVal,
        output: outputVal || 'Single',
        region: regionVal || 'LIVE',
        counta: countaVal,
        note: noteVal,
        tag: tagVal,
        diperbarui: dateVal,
        isDuplicate,
        duplicateMatchId,
        hasExtractedLink: extracted.hasExtracted,
      });
    }
  }

  return {
    previewItems,
    duplicatesCount,
    newCount,
    extractedFromNamesCount,
  };
}

export function exportToExcel(items: LinkItem[], filename = 'Management_Link_Export.xlsx') {
  const exportData = items.map(item => ({
    Nama: item.name || '',
    Link: item.link,
    Tag: item.tag || '',
    Status: item.status,
    Output: item.output,
    Region: item.region,
    Note: item.note,
    Diperbarui: item.diperbarui,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 25 }, // Nama
    { wch: 55 }, // Link
    { wch: 15 }, // Tag
    { wch: 18 }, // Status
    { wch: 14 }, // Output
    { wch: 12 }, // Region
    { wch: 20 }, // Note
    { wch: 16 }, // Diperbarui
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Table1');
  XLSX.writeFile(workbook, filename);
}

export function exportToCsv(items: LinkItem[], filename = 'Selected_Links_Export.csv') {
  const exportData = items.map(item => ({
    Nama: item.name || '',
    Link: item.link,
    Tag: item.tag || '',
    Status: item.status,
    Output: item.output,
    Region: item.region,
    Note: item.note,
    Diperbarui: item.diperbarui,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  // Prepend UTF-8 BOM for perfect Microsoft Excel and spreadsheet software compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadTemplateExcel() {
  const templateData = [
    {
      Nama: 'Video Episode 1 (Tautan Langsung)',
      Link: 'https://firestream.to/v/sample1',
      Tag: 'Video',
      Status: 'Blank',
      Output: 'Single',
      Region: 'LIVE',
      Note: '',
      Diperbarui: formatDateNow(),
    },
    {
      Nama: 'Contoh Embedded [Episode 2](https://firestream.to/v/sample2)',
      Link: '',
      Status: 'Blank',
      Output: 'Single',
      Region: 'LIVE',
      Note: 'Web Inactive',
      Diperbarui: formatDateNow(),
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 45 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Table1');
  XLSX.writeFile(workbook, 'Template_Input_Link_Dengan_Nama.xlsx');
}
