# Link Management Dashboard (Rubixxxlink)

A modern, responsive link and download management dashboard built with React 19, Vite, Tailwind CSS, and Firebase Firestore.

## Features

- **Link Organization**: Manage bookmark/download URLs with status, categorization tags, regions, and custom notes.
- **Excel & Bulk Import**: Fast import from XLSX / CSV spreadsheets with smart URL extraction and duplicate detection.
- **Duplicate Prevention**: Detects existing links to prevent redundant entries.
- **Real-Time Database**: Powered by Firebase Firestore for instantaneous synchronization across devices.
- **URL Status Checker**: Batch HTTP status verification for active / broken links.
- **Error Resilient**: Integrated Error Boundary to catch and handle UI runtime issues gracefully.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons, Motion
- **Data & Auth**: Firebase / Firestore, `@google/genai`
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

3. **Configure Firebase:**
   Copy `.env.example` to `.env` and fill in your Firebase configuration values:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
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
