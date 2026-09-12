# DESIGN.md - Rubixxxlink Design System & Direction

## 1. Product Identity & Purpose
- **Application**: Rubixxxlink - Link & Data Management Dashboard (Bento Grid v2.5).
- **Core Utility**: Professional, high-density link curation, batch status tracking, file extraction, and spreadsheet management capable of handling 29,000+ items smoothly at 60 FPS.
- **Personality**: Utilitarian, precise, tactile, reliable, fast. No frivolous decorative AI fluff or generic gradient hero banners.

## 2. Color System & Theme Contrast
- **Light Theme**:
  - Background Canvas: `#F1F5F9` (Slate 100)
  - Surface Cards: `#FFFFFF` with border `border-slate-200/80` and shadow `shadow-2xs`
  - Text Primary: `#0F172A` (Slate 900)
  - Text Secondary: `#64748B` (Slate 500)
- **Dark Theme**:
  - Background Canvas: `#020617` (Slate 950)
  - Surface Cards: `#0F172A` (Slate 900) with border `border-slate-800`
  - Text Primary: `#F8FAFC` (Slate 100)
  - Text Secondary: `#94A3B8` (Slate 400)
- **Primary Brand Accent**:
  - Indigo-600 (`#4F46E5`), hover `#4338CA` / dark `#6366F1`
- **Semantic Accents**:
  - Emerald: Downloaded / Success / Active state (`bg-emerald-50 text-emerald-700` / dark `bg-emerald-950/80 text-emerald-300`)
  - Rose: Error / Deletion / Inactive links (`bg-rose-50 text-rose-700` / dark `bg-rose-950/80 text-rose-300`)
  - Amber: Search Highlight (`bg-amber-300 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200`)

## 3. Typography & Hierarchy
- **Font Family**: System UI stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Data & Numbers**: Tabular figures (`font-mono`) for counts, record ranges, timestamps, and URLs.
- **Scale**:
  - Headers: `text-base` to `text-lg` (compact, no oversized promotional titles).
  - Table Body: `text-xs` (12px - 13px) for maximum information density without sacrificing legibility.
  - Badges & Microcopy: `text-[10px]` to `text-[11px]` font-bold.

## 4. Layout & Interaction Patterns
- **Bento KPI Grid**: 4 full-width responsive metrics cards showing live database health and statistics.
- **Dual Table Density**:
  - `Nyaman` (Comfortable): ~`py-2.5` vertical cell padding.
  - `Rapat` (Compact): ~`py-1.5` vertical cell padding for power users browsing massive datasets.
- **Sticky Glassmorphism Header**:
  - `sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xs`.
- **Row Hover & Actions**:
  - Subtle row hover highlight (`hover:bg-slate-50/80 dark:hover:bg-slate-800/50`).
  - Floating row quick action buttons (Copy Link, External Open, Single-Click Download).
- **Undo Toast**:
  - Destructive single deletions offer an immediate 6-second "Urungkan" (Undo) notification.

## 5. Voice & Microcopy (Indonesian-First)
- Keep UI text concise, functional, and action-driven:
  - *Good*: "UNDUH", "Salin Link", "Buka di Tab Baru", "Urungkan", "Reset Semua Filter".
  - *Bad (AI Slop)*: "Tingkatkan produktivitas pengelolaan link Anda dengan solusi revolusioner ini".
