# Link Management Dashboard (Rubixxxlink)

A modern, responsive link and download management dashboard built with React 19, Vite, Tailwind CSS, and Supabase.

## Features

- **Link Organization**: Manage bookmark/download URLs with status, categorization tags, regions, and custom notes.
- **Excel & Bulk Import**: Fast import from XLSX / CSV spreadsheets with smart URL extraction and duplicate detection.
- **Duplicate Prevention**: Detects existing links to prevent redundant entries.
- **Real-Time Database**: Powered by Supabase (Postgres + Realtime) for instantaneous synchronization across devices.
- **URL Status Checker**: Batch HTTP status verification for active / broken links.
- **Error Resilient**: Integrated Error Boundary to catch and handle UI runtime issues gracefully.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons, Motion
- **Data & Auth**: Supabase (Postgres + Auth + Realtime), `@google/genai`
- **Spreadsheets**: SheetJS (`xlsx`)

## Getting Started Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Learningjurnal/Rubixxxlink.git
   cd Rubixxxlink
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Supabase:**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the schema in `supabase/migrations/0001_init.sql` (Supabase dashboard → SQL Editor, or `supabase db push` with the Supabase CLI).
   - Under Authentication → Providers, enable Email and (optionally) Google sign-in.
   - Copy `.env.example` to `.env` and fill in your project's API credentials (Project Settings → API):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Deployment to GitHub Pages

This project includes an automated GitHub Actions workflow at `.github/workflows/deploy.yml`.

To deploy successfully:
1. In your GitHub repository, navigate to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push changes to the `main` branch. GitHub Actions will automatically compile the application and publish it.
