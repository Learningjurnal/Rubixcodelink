import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  subtitle?: string;
  hotkey?: string;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  subtitle,
  hotkey,
  position = 'top',
  delay = 120,
  disabled = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPosition: TooltipPosition;
  }>({ top: 0, left: 0, actualPosition: position });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let resolvedPosition = position;
    // Flip vertical if tight space
    if (position === 'top' && rect.top < 50) {
      resolvedPosition = 'bottom';
    } else if (position === 'bottom' && viewportHeight - rect.bottom < 50) {
      resolvedPosition = 'top';
    }

    let top = 0;
    let left = 0;

    switch (resolvedPosition) {
      case 'top':
        top = rect.top - 7;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 7;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 7;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 7;
        break;
    }

    // Horizontal bounds clamping for center alignment
    if (resolvedPosition === 'top' || resolvedPosition === 'bottom') {
      left = Math.max(80, Math.min(left, viewportWidth - 80));
    }

    setCoords({
      top,
      left,
      actualPosition: resolvedPosition,
    });
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    calculatePosition();
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleClick = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      setIsVisible(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Motion animation transforms according to actual orientation
  const getTransformOrigin = (pos: TooltipPosition) => {
    switch (pos) {
      case 'top':
        return 'bottom center';
      case 'bottom':
        return 'top center';
      case 'left':
        return 'center right';
      case 'right':
        return 'center left';
    }
  };

  const getTranslateStyle = (pos: TooltipPosition) => {
    switch (pos) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </span>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                role="tooltip"
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: coords.actualPosition === 'top' ? 3 : coords.actualPosition === 'bottom' ? -3 : 0,
                  x: coords.actualPosition === 'left' ? 3 : coords.actualPosition === 'right' ? -3 : 0,
                }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.1 } }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: getTranslateStyle(coords.actualPosition),
                  transformOrigin: getTransformOrigin(coords.actualPosition),
                }}
                className="z-[9999] pointer-events-none whitespace-nowrap"
              >
                <div className="relative px-2.5 py-1.5 rounded-lg bg-slate-900/95 dark:bg-slate-800/95 text-slate-100 text-[11px] font-medium leading-tight shadow-lg shadow-black/25 border border-slate-700/70 dark:border-slate-650 backdrop-blur-xs flex items-center gap-1.5 max-w-xs">
                  <span>{content}</span>
                  {hotkey && (
                    <kbd className="px-1 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-slate-600 text-slate-300">
                      {hotkey}
                    </kbd>
                  )}
                  {subtitle && (
                    <span className="text-[10px] text-slate-400 font-normal border-l border-slate-700/60 pl-1.5 ml-0.5">
                      {subtitle}
                    </span>
                  )}

                  {/* Tiny arrow pointer */}
                  {coords.actualPosition === 'top' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800/95 border-r border-b border-slate-700/70 dark:border-slate-650" />
                  )}
                  {coords.actualPosition === 'bottom' && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800/95 border-l border-t border-slate-700/70 dark:border-slate-650" />
                  )}
                  {coords.actualPosition === 'left' && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800/95 border-r border-t border-slate-700/70 dark:border-slate-650" />
                  )}
                  {coords.actualPosition === 'right' && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800/95 border-l border-b border-slate-700/70 dark:border-slate-650" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
