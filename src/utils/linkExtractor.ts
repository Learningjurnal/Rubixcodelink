import { ExtractedLinkResult } from '../types';

/**
 * Regex patterns for link detection
 */
const GLOBAL_URL_REGEX = /(https?:\/\/[^\s<>"'()[\]{}]+)/gi;
const URL_REGEX = /(https?:\/\/[^\s<>"'()[\]{}]+)/i;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/i;
const GLOBAL_MD_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi;
const HTML_LINK_REGEX = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/i;
const GLOBAL_HTML_LINK_REGEX = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
const EXCEL_HYPERLINK_REGEX = /=HYPERLINK\(\s*["'](https?:\/\/[^"']+)["'](?:\s*,\s*["']([^"']*)["'])?\s*\)/i;

/**
 * Clean URL from trailing punctuation
 */
export function cleanUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Remove trailing commas, periods, quotes, parentheses if not matched
  cleaned = cleaned.replace(/[,\.;:!?"'\>\]\)]+$/g, '');
  return cleaned;
}

/**
 * Detect if string contains an embedded URL or is a URL
 */
export function containsUrl(text: string): boolean {
  if (!text) return false;
  return (
    URL_REGEX.test(text) ||
    MARKDOWN_LINK_REGEX.test(text) ||
    HTML_LINK_REGEX.test(text) ||
    EXCEL_HYPERLINK_REGEX.test(text)
  );
}

/**
 * Extract a single link and readable display name from any text or name
 */
export function extractLinkFromText(raw: string): { name: string; url: string | null } {
  if (!raw) return { name: '', url: null };
  const trimmed = raw.trim();

  // 1. Check Excel Formula: =HYPERLINK("https://...", "Label")
  const formulaMatch = trimmed.match(EXCEL_HYPERLINK_REGEX);
  if (formulaMatch) {
    return {
      url: cleanUrl(formulaMatch[1]),
      name: (formulaMatch[2] || '').trim(),
    };
  }

  // 2. Check Markdown style: [Label](https://...)
  const mdMatch = trimmed.match(MARKDOWN_LINK_REGEX);
  if (mdMatch) {
    return {
      name: mdMatch[1].trim(),
      url: cleanUrl(mdMatch[2]),
    };
  }

  // 3. Check HTML style: <a href="https://...">Label</a>
  const htmlMatch = trimmed.match(HTML_LINK_REGEX);
  if (htmlMatch) {
    const rawLabel = htmlMatch[2].replace(/<[^>]*>?/gm, '').trim();
    return {
      name: rawLabel || '',
      url: cleanUrl(htmlMatch[1]),
    };
  }

  // 4. Check plain text containing URL
  const urlMatch = trimmed.match(URL_REGEX);
  if (urlMatch) {
    const url = cleanUrl(urlMatch[1]);
    // Remove the URL from the string to get the name/label
    let name = trimmed.replace(urlMatch[1], '').trim();
    // Clean up surrounding punctuation like () [] - :
    name = name
      .replace(/^[\(\[\{<]+|[\)\]\}>]+$/g, '')
      .replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
      .trim();

    return {
      name: name || '',
      url,
    };
  }

  return { name: trimmed, url: null };
}

/**
 * Extract ALL links from any text/cell (handles multiple URLs separated by commas, spaces, or lines)
 */
export function extractAllLinksFromText(raw: string): { name: string; url: string }[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  const results: { name: string; url: string }[] = [];
  const seenUrls = new Set<string>();

  // 1. Check Excel Formula: =HYPERLINK(...)
  const formulaMatch = trimmed.match(EXCEL_HYPERLINK_REGEX);
  if (formulaMatch) {
    const u = cleanUrl(formulaMatch[1]);
    if (u) {
      results.push({ name: (formulaMatch[2] || '').trim(), url: u });
      seenUrls.add(u.toLowerCase());
    }
  }

  // 2. Check Markdown links
  let mdMatch: RegExpExecArray | null;
  const mdRegex = new RegExp(GLOBAL_MD_LINK_REGEX);
  while ((mdMatch = mdRegex.exec(trimmed)) !== null) {
    const u = cleanUrl(mdMatch[2]);
    if (u && !seenUrls.has(u.toLowerCase())) {
      results.push({ name: mdMatch[1].trim(), url: u });
      seenUrls.add(u.toLowerCase());
    }
  }

  // 3. Check HTML links
  let htmlMatch: RegExpExecArray | null;
  const htmlRegex = new RegExp(GLOBAL_HTML_LINK_REGEX);
  while ((htmlMatch = htmlRegex.exec(trimmed)) !== null) {
    const u = cleanUrl(htmlMatch[1]);
    const label = htmlMatch[2].replace(/<[^>]*>?/gm, '').trim();
    if (u && !seenUrls.has(u.toLowerCase())) {
      results.push({ name: label, url: u });
      seenUrls.add(u.toLowerCase());
    }
  }

  // 4. Check all plain URLs
  let urlMatch: RegExpExecArray | null;
  const urlRegex = new RegExp(GLOBAL_URL_REGEX);
  while ((urlMatch = urlRegex.exec(trimmed)) !== null) {
    const u = cleanUrl(urlMatch[1]);
    if (u && !seenUrls.has(u.toLowerCase())) {
      // Find possible label in surrounding context
      let contextualName = '';
      if (results.length === 0) {
        // Use remaining text as name
        contextualName = trimmed.replace(urlMatch[1], '').trim();
        contextualName = contextualName
          .replace(/^[\(\[\{<]+|[\)\]\}>]+$/g, '')
          .replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
          .trim();
      }
      results.push({ name: contextualName, url: u });
      seenUrls.add(u.toLowerCase());
    }
  }

  return results;
}

/**
 * Parse multi-line or block text and extract all links with their names
 */
export function extractLinksFromMultiLineText(content: string): ExtractedLinkResult[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const results: ExtractedLinkResult[] = [];

  for (const line of lines) {
    const all = extractAllLinksFromText(line);
    if (all.length > 0) {
      all.forEach(item => {
        results.push({
          originalText: line.trim(),
          extractedName: item.name || '',
          extractedUrl: item.url,
          status: 'valid',
        });
      });
    } else {
      results.push({
        originalText: line.trim(),
        extractedName: line.trim(),
        extractedUrl: '',
        status: 'invalid',
      });
    }
  }

  return results;
}

