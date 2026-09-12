import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  Copy,
  Tag,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { LinkItem } from '../types';

interface UrlHoverCardProps {
  item: LinkItem;
  onCopyLink: (link: string) => void;
  onDownloadAndMark?: () => void;
  isDownloaded?: boolean;
  searchQuery?: string;
}

export const UrlHoverCard: React.FC<UrlHoverCardProps> = ({
  item,
  onCopyLink,
  onDownloadAndMark,
  isDownloaded,
  searchQuery = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset favicon error when link changes
  useEffect(() => {
    setFaviconError(false);
  }, [item.link]);

  // Extract hostname / domain safely with http/https fallback
  const domain = React.useMemo(() => {
    if (!item.link) return '';
    try {
      const formatted = item.link.startsWith('http://') || item.link.startsWith('https://')
        ? item.link
        : `https://${item.link}`;
      const url = new URL(formatted);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [item.link]);

  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : '';

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const displayText =
    item.name && item.name !== item.link && !item.name.startsWith('http')
      ? item.name
      : item.link;

  const renderHighlightedText = (text: string) => {
    if (!searchQuery || !searchQuery.trim() || !text) return text;
    const cleanQ = searchQuery.trim();
    const lowerQuery = cleanQ.toLowerCase();
    const lowerText = text.toLowerCase();

    const parts: React.ReactNode[] = [];
    let startIndex = 0;
    let matchIndex = lowerText.indexOf(lowerQuery, startIndex);
    let keyIdx = 0;

    while (matchIndex !== -1) {
      if (matchIndex > startIndex) {
        parts.push(text.substring(startIndex, matchIndex));
      }
      parts.push(
        <mark
          key={`uhc-hl-${keyIdx++}`}
          className="bg-amber-300 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-0.5 rounded font-bold"
        >
          {text.substring(matchIndex, matchIndex + cleanQ.length)}
        </mark>
      );
      startIndex = matchIndex + cleanQ.length;
      matchIndex = lowerText.indexOf(lowerQuery, startIndex);
    }

    if (startIndex < text.length) {
      parts.push(text.substring(startIndex));
    }

    return <>{parts}</>;
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block max-w-full truncate"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Target Link */}
      <a
        href={item.link}
        target="_blank"
        rel="noreferrer noopener"
        onClick={e => {
          if (onDownloadAndMark) {
            e.preventDefault();
            onDownloadAndMark();
          }
        }}
        className={`truncate block underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-indigo-600 dark:hover:decoration-indigo-400 transition text-[12.5px] cursor-pointer ${
          isDownloaded
            ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-medium'
            : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium'
        }`}
        title={item.name ? `${item.name} (${item.link})` : item.link}
      >
        {renderHighlightedText(displayText)}
      </a>

      {/* Popover Hover Card */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 w-80 max-w-[90vw] p-4 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700 dark:border-slate-800 rounded-2xl shadow-2xl z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          style={{ minWidth: '280px' }}
        >
          {/* Header with Favicon + Domain Title */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-1.5">
              {!faviconError && faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt={domain}
                  className="w-full h-full object-contain rounded-md"
                  onError={() => setFaviconError(true)}
                  loading="lazy"
                />
              ) : (
                <Globe className="w-5 h-5 text-indigo-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {item.name || domain || 'Tautan Target'}
                </span>
              </div>
              {domain && (
                <span className="text-[11px] text-indigo-400 font-mono block truncate">
                  {domain}
                </span>
              )}
            </div>
          </div>

          {/* Full Link Preview Box */}
          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80 mb-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
              Full Destination URL
            </span>
            <p className="text-[11px] font-mono text-slate-300 break-all line-clamp-3 leading-relaxed">
              {item.link}
            </p>
          </div>

          {/* Metadata Badges Grid */}
          <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
            {/* Status */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                item.status === 'Sudah Terunduh'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : item.status === 'Blank'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : item.status === 'Proses'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {item.status === 'Sudah Terunduh' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span>{item.status}</span>
            </span>

            {/* Region */}
            {item.region && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                Reg: {item.region}
              </span>
            )}

            {/* Output */}
            {item.output && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
                {item.output}
              </span>
            )}

            {/* Tag */}
            {item.tag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-700 font-semibold">
                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                <span>{item.tag}</span>
              </span>
            )}
          </div>

          {/* Note or Last Updated info */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              {item.note ? (
                <>
                  <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{item.note}</span>
                </>
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </span>

            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{item.diperbarui}</span>
            </span>
          </div>

          {/* Quick Action Footer Buttons */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onCopyLink(item.link);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Salin URL</span>
            </button>

            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              onClick={e => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Web</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
