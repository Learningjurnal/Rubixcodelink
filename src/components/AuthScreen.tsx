import React, { useState } from 'react';
import {
  Mail,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Database,
  HardDrive,
  FileSpreadsheet,
} from 'lucide-react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithGoogle,
} from '../lib/supabase';

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

interface AuthScreenProps {
  onSuccess?: (email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Google 1-Click Sign-In (Primary configured Supabase OAuth provider)
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    try {
      const cred = await signInWithGoogle();
      if (onSuccess) onSuccess(cred.user.email || 'Akun Google');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Jendela login Google ditutup sebelum proses selesai.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Popup browser diblokir. Izinkan popup untuk situs ini, atau gunakan Email/Password di bawah.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In belum diaktifkan di Supabase (Authentication > Providers). Gunakan Email/Password di bawah.');
      } else {
        setErrorMsg(err.message || 'Gagal masuk dengan Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (onSuccess) onSuccess(cred.user.email || email);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (onSuccess) onSuccess(cred.user.email || email);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Metode Login Email/Password belum diaktifkan di project Supabase ini (Authentication > Providers), atau pendaftaran akun baru sedang ditutup (Authentication > Sign In / Providers > "Allow new users to sign up"). Hubungi admin project ini.'
        );
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setErrorMsg('Email atau kata sandi tidak cocok. Jika belum punya akun, klik tab "Daftar Akun Baru".');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Email ini sudah terdaftar. Silakan pilih tab "Masuk (Login)".');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Kata sandi terlalu pendek. Masukkan minimal 6 karakter.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Format email tidak valid.');
      } else {
        setErrorMsg(err.message || 'Terjadi kendala saat otentikasi akun.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand & App Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
            <Database className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Command Center Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            Sistem Single-User untuk manajemen terpadu <strong className="text-blue-400">Penyimpanan Berkas</strong> dan{' '}
            <strong className="text-indigo-400">Tautan Spreadsheet</strong> dengan database Cloud Supabase privat.
          </p>

          {/* Single User Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
              <HardDrive className="w-3 h-3 text-blue-400" />
              Storage Management
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700">
              <FileSpreadsheet className="w-3 h-3 text-indigo-400" />
              Link Management
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-emerald-300 border border-emerald-800/60">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Data Terisolasi per Akun
            </span>
          </div>
        </div>

        {/* Authentication Form Card */}
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100/90 overflow-hidden">
          {/* Primary Quick Google Login Option */}
          <div className="p-6 sm:p-7 bg-slate-50 border-b border-slate-200/80">
            <p className="text-xs font-bold text-slate-700 mb-3 text-center">
              Masuk Cepat dengan Satu Klik
            </p>
            <button
              type="button"
              id="btn-google-signin"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-3 cursor-pointer hover:border-slate-400 disabled:opacity-60"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Masuk dengan Akun Google</span>
            </button>
          </div>

          {/* Mode Switcher Tabs for Email */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Email</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2.5 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alamat Email Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email.anda@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Command Center Pribadi</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Buat Akun & Inisialisasi Dashboard</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Autentikasi Aman & Database Terisolasi per User</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
