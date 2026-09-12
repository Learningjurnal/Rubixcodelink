/**
 * Month names mapping for Indonesian & English
 */
const MONTH_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  agu: 7,
  agustus: 7,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
  december: 11,
};

/**
 * Parses date strings like '28 Jul 2026', '2026-07-28', '28/07/2026', or timestamp
 * Returns timestamp in ms or null
 */
export function parseDateToTimestamp(raw: string | number | undefined): number | null {
  if (!raw) return null;
  if (typeof raw === 'number') return raw;

  const str = String(raw).trim();
  if (!str) return null;

  // Try standard ISO or parseable format first
  const directParse = Date.parse(str);
  if (!isNaN(directParse)) {
    return directParse;
  }

  // Pattern: "28 Jul 2026" or "28-Jul-2026"
  const parts = str.split(/[\s\-\/\.]+/);
  if (parts.length >= 3) {
    // Check if parts[1] is month name
    const mStr = parts[1].toLowerCase();
    if (MONTH_MAP[mStr] !== undefined) {
      const day = parseInt(parts[0], 10);
      const year = parseInt(parts[2], 10);
      const month = MONTH_MAP[mStr];
      if (!isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day).getTime();
      }
    }

    // Check if format is DD/MM/YYYY
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (p2 > 1000) {
        // DD/MM/YYYY
        return new Date(p2, p1 - 1, p0).getTime();
      } else if (p0 > 1000) {
        // YYYY/MM/DD
        return new Date(p0, p1 - 1, p2).getTime();
      }
    }
  }

  return null;
}

/**
 * Check if a date string/item falls within [startDate, endDate] (inclusive)
 * startDate and endDate are in 'YYYY-MM-DD'
 */
export function isWithinPeriod(
  dateVal: string | undefined,
  createdAt: number | undefined,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true;

  const itemTime = parseDateToTimestamp(dateVal) ?? createdAt ?? null;
  if (!itemTime) return false;

  if (startDate) {
    const startObj = new Date(`${startDate}T00:00:00`);
    if (!isNaN(startObj.getTime()) && itemTime < startObj.getTime()) {
      return false;
    }
  }

  if (endDate) {
    const endObj = new Date(`${endDate}T23:59:59.999`);
    if (!isNaN(endObj.getTime()) && itemTime > endObj.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Format timestamp into YYYY-MM-DD for date inputs
 */
export function formatToISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
