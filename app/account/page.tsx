/**
 * =============================================================================
 * Fichier      : app/account/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.1 (2026-01-22)
 * Objet        : Mon profil — Profil utilisateur + avatar/bannière + édition inline
 * -----------------------------------------------------------------------------
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.1 (2026-01-22)
 * - [UX] Persistance position bannière via BDD (profiles.banner_pos_y) => multi-devices
 * - [NO-REGRESSION] UI 2.3.0 conservée (modal fixed, preview, drag, transparence)
 * - [FIX] Suppression localStorage + sync bannerPosY depuis profile
 * - [FIX] Modales rendues via Portal (plus de clipping par overflow/rounded)
 * - [UI] Déplacement du bloc glass (rounded/border/bg) sur le conteneur -mt-10 (suppression wrapper inutile)
 * =============================================================================
 *
 * NOTE BDD :
 * - Ce fichier suppose que `profiles.banner_url` existe.
 * - Ce fichier suppose que `profiles.banner_pos_y` existe (int, default 0).
 */

'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Camera, Edit2, Save, Upload, X, Settings } from 'lucide-react';
import Header from '@/components/layout/Header';
import { supabase } from '@/lib/supabase/client';

type IdentityMode = 'real' | 'symbolic' | 'anonymous';

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: IdentityMode;
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  banner_url: string | null;
  banner_pos_y: number | null; // ✅ persisté BDD
  lang_primary: string;
};

type EchoRow = {
  id: string;
  title: string | null;
  content: string;
  emotion: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean | null;
  visibility: 'world' | 'local' | 'private' | 'semi_anonymous' | null;
  status: 'draft' | 'published' | 'archived' | 'deleted' | null;
  created_at: string;
};

function safeInitials(input: string): string {
  const clean = (input || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'EW';
  const parts = clean.split(' ');
  const a = parts[0]?.[0] ?? 'E';
  const b = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}

function obfuscateId(id: string): string {
  if (!id) return 'Echoer';
  return `Echoer-${id.slice(0, 4)}`;
}

function formatDateFR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

function normalizeHandle(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  return cleaned.slice(0, 24);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function bannerObjectPosition(offsetY: number): string {
  return `center calc(50% + ${offsetY}px)`;
}

function getErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'Erreur.';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Erreur.';
}

/**
 * Wrapper Supabase minimal (sans any) pour éviter :
 * - les "never" sur .update() lorsque Database n'est pas générée/branchée
 * - la règle eslint no-explicit-any
 */
type SupabaseQueryResult<T> = { data: T | null; error: unknown | null };
type SupabaseQueryListResult<T> = { data: T[] | null; error: unknown | null };

type SupabaseQueryBuilder = {
  select: (columns: string) => SupabaseQueryBuilder;
  eq: (column: string, value: string) => SupabaseQueryBuilder;
  neq: (column: string, value: string) => SupabaseQueryBuilder;
  order: (column: string, opts: { ascending: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => Promise<SupabaseQueryListResult<unknown>>;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  update: (values: Record<string, unknown>) => SupabaseQueryBuilder;
};

type SupabaseStorageBucket = {
  upload: (path: string, file: File, opts: { upsert: boolean }) => Promise<{ data: unknown | null; error: unknown | null }>;
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
};

type SupabaseStorage = {
  from: (bucket: string) => SupabaseStorageBucket;
};

type SupabaseAuth = {
  getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  onAuthStateChange: (
    cb: (event: string, session: { user: { id: string } } | null) => void
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

type SupabaseClientLoose = {
  from: (table: string) => SupabaseQueryBuilder;
  storage: SupabaseStorage;
  auth: SupabaseAuth;
};

const sb = supabase as unknown as SupabaseClientLoose;

const LANG_CHOICES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

const OK_TOAST_MS = 3500;
const BANNER_MIN = -140;
const BANNER_MAX = 140;

function PortalModal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;
  return createPortal(children, document.body);
}

export default function AccountPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [echoes, setEchoes] = useState<EchoRow[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showBannerUpload, setShowBannerUpload] = useState(false);

  // Banner preview + position
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [bannerPosY, setBannerPosY] = useState<number>(0); // appliqué sur la bannière (persisté BDD)
  const [bannerDraftPosY, setBannerDraftPosY] = useState<number>(0); // pendant preview

  // Pointer drag
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartPosRef = useRef(0);

  // Inline edit states
  const [editing, setEditing] = useState(false);
  const [savingInline, setSavingInline] = useState(false);
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLang, setEditLang] = useState('en');

  // ✅ Success messages auto-dismiss
  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(null), OK_TOAST_MS);
    return () => window.clearTimeout(t);
  }, [ok]);

  // Auth guard
  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const { data } = await sb.auth.getUser();
        const u = data.user ?? null;
        if (!mounted) return;

        if (!u) {
          setUserId(null);
          setAuthLoading(false);
          router.replace('/login');
          return;
        }

        setUserId(u.id);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    loadAuth();

    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      if (!u) router.replace('/login');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Load profile + echoes
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const [pRes, eRes] = await Promise.all([
          sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
          sb
            .from('echoes')
            .select('id,title,content,emotion,language,country,city,is_anonymous,visibility,status,created_at')
            .eq('user_id', userId)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false })
            .limit(12),
        ]);

        if (!mounted) return;

        const p = (pRes.data as ProfileRow | null) ?? null;
        setProfile(p);
        setEchoes((eRes.data as EchoRow[]) ?? []);

        // ✅ Sync inline form defaults
        setEditHandle(p?.handle ?? '');
        setEditBio(p?.bio ?? '');
        setEditLang(p?.lang_primary ?? 'en');

        // ✅ Banner position depuis BDD (multi-devices)
        const raw = p?.banner_pos_y;
        const fromDb = Number.isFinite(Number(raw)) ? Number(raw) : 0;
        const val = clamp(fromDb, BANNER_MIN, BANNER_MAX);
        setBannerPosY(val);
        setBannerDraftPosY(val);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const identity = useMemo(() => {
    if (!userId) return 'Account';
    if (profile?.identity_mode === 'anonymous') return 'Anonymous';
    if (profile?.handle) return profile.handle;
    if (profile?.display_name) return profile.display_name;
    return obfuscateId(userId);
  }, [profile, userId]);

  const avatarLabel = useMemo(() => {
    if (!userId) return 'EW';
    if (profile?.avatar_seed) return safeInitials(profile.avatar_seed);
    if (profile?.handle) return safeInitials(profile.handle);
    if (profile?.display_name) return safeInitials(profile.display_name);
    return safeInitials(obfuscateId(userId));
  }, [profile, userId]);

  const canSaveInline = useMemo(() => {
    if (!userId) return false;
    if (savingInline) return false;
    const h = editHandle.trim();
    if (h && normalizeHandle(h).length < 3) return false;
    return true;
  }, [userId, savingInline, editHandle]);

  const startInlineEdit = () => {
    setOk(null);
    setError(null);
    setEditing(true);
    setEditHandle(profile?.handle ?? '');
    setEditBio(profile?.bio ?? '');
    setEditLang(profile?.lang_primary ?? 'en');
  };

  const cancelInlineEdit = () => {
    setEditing(false);
    setEditHandle(profile?.handle ?? '');
    setEditBio(profile?.bio ?? '');
    setEditLang(profile?.lang_primary ?? 'en');
  };

  const saveInlineEdit = async () => {
    if (!userId) return;
    if (!canSaveInline) return;

    setSavingInline(true);
    setOk(null);
    setError(null);

    try {
      const nextHandle = editHandle.trim() ? normalizeHandle(editHandle) : null;
      const nextBio = editBio.trim() ? editBio.trim() : null;
      const nextLang = (editLang || 'en').trim().toLowerCase();

      const upd = await sb
        .from('profiles')
        .update({
          handle: nextHandle,
          bio: nextBio,
          lang_primary: nextLang,
        })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (upd.error) throw upd.error;

      setProfile((upd.data as ProfileRow | null) ?? null);
      setEditing(false);
      setOk('Profil mis à jour.');
    } catch (e) {
      const msg = getErrorMessage(e);
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setError('Ce pseudo est déjà utilisé. Essayez une autre variante.');
      } else {
        setError(msg || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setSavingInline(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!userId || !file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("L'avatar ne peut pas dépasser 5 MB.");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setOk(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const upd = await sb
        .from('profiles')
        .update({ avatar_type: 'image', avatar_url: avatarUrl })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (upd.error) throw upd.error;

      setProfile((upd.data as ProfileRow | null) ?? null);
      setOk('Avatar mis à jour.');
      setShowAvatarUpload(false);
    } catch (e) {
      setError(getErrorMessage(e) || "Erreur lors de l'upload.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadBanner = async (file: File) => {
    if (!userId || !file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La bannière ne peut pas dépasser 10 MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }

    setUploadingBanner(true);
    setError(null);
    setOk(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/banner-${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage.from('banners').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = sb.storage.from('banners').getPublicUrl(path);
      const bannerUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const posToSave = clamp(bannerDraftPosY, BANNER_MIN, BANNER_MAX);

      const upd = await sb
        .from('profiles')
        .update({ banner_url: bannerUrl, banner_pos_y: posToSave })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (upd.error) throw upd.error;

      const row = (upd.data as ProfileRow | null) ?? null;
      setProfile(row);

      setBannerPosY(posToSave);
      setBannerDraftPosY(posToSave);

      setOk('Bannière mise à jour.');
      setShowBannerUpload(false);
      setBannerFile(null);
      setBannerPreviewUrl(null);
    } catch (e) {
      setError(getErrorMessage(e) || "Erreur lors de l'upload.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveBannerPositionToDb = async () => {
    if (!userId) return;

    const posToSave = clamp(bannerDraftPosY, BANNER_MIN, BANNER_MAX);

    setError(null);
    setOk(null);

    try {
      const upd = await sb
        .from('profiles')
        .update({ banner_pos_y: posToSave })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (upd.error) throw upd.error;

      const row = (upd.data as ProfileRow | null) ?? null;
      setProfile(row);

      setBannerPosY(posToSave);
      setBannerDraftPosY(posToSave);

      setOk('Position enregistrée.');
    } catch (e) {
      setError(getErrorMessage(e) || "Erreur lors de l'enregistrement.");
    }
  };

  const openBannerModal = () => {
    setOk(null);
    setError(null);
    setShowBannerUpload(true);
    setBannerFile(null);
    setBannerPreviewUrl(null);
    setBannerDraftPosY(bannerPosY);
  };

  const closeBannerModal = () => {
    setShowBannerUpload(false);
    setBannerFile(null);
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    setBannerPreviewUrl(null);
    setBannerDraftPosY(bannerPosY);
  };

  const onPickBannerFile = (file: File) => {
    setBannerFile(file);
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    const url = URL.createObjectURL(file);
    setBannerPreviewUrl(url);
  };

  const onPointerDownBanner = (clientY: number) => {
    draggingRef.current = true;
    dragStartYRef.current = clientY;
    dragStartPosRef.current = bannerDraftPosY;
  };

  const onPointerMoveBanner = (clientY: number) => {
    if (!draggingRef.current) return;
    const dy = clientY - dragStartYRef.current;
    const next = clamp(dragStartPosRef.current + dy, BANNER_MIN, BANNER_MAX);
    setBannerDraftPosY(next);
  };

  const onPointerUpBanner = () => {
    draggingRef.current = false;
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
          <div className="h-10 w-56 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
          <div className="mt-6 h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mon profil</h1>
            <p className="mt-2 text-slate-600">Ta présence, tes récits, et une navigation calme.</p>
          </div>
          <div />
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {ok && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {ok}
          </div>
        )}

        {/* Card */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white/40 backdrop-blur-md shadow-lg shadow-black/5">
          {/* Banner */}
          <div className="relative h-56 w-full overflow-hidden bg-linear-to-br from-violet-500/20 via-sky-500/15 to-emerald-500/10">
            {profile?.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.banner_url}
                alt="Bannière"
                className="h-full w-full object-cover"
                style={{ objectPosition: bannerObjectPosition(bannerPosY) }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-sm font-semibold text-slate-400">Aucune bannière</div>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openBannerModal();
              }}
              className="absolute bottom-4 right-4 z-20 pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60"
            >
              <Camera className="h-4 w-4" />
              Modifier bannière
            </button>
          </div>

          {/* ✅ Déplacement des styles “glass” ici (et suppression wrapper inutile) */}
          <div className="relative -mt-10 rounded-3xl border border-white/30 bg-white/35 px-6 pb-6 backdrop-blur-md shadow-lg shadow-black/5">
            <div className="px-6 pb-6 pt-14">
              {/* Avatar */}
              <div className="absolute left-6 top-0 -translate-y-1/2">
                <div className="relative inline-block">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
                    {profile?.avatar_type === 'image' && profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-slate-900">{avatarLabel}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOk(null);
                      setError(null);
                      setShowAvatarUpload(true);
                    }}
                    className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                    title="Modifier l’avatar"
                  >
                    <Camera className="h-4 w-4 text-slate-900" />
                  </button>
                </div>
              </div>

              {/* Header identity + actions */}
              <div className="pl-0 md:pl-40">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">{identity}</h2>

                  {!editing ? (
                    <button
                      type="button"
                      onClick={startInlineEdit}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100/70 hover:text-slate-900"
                      title="Modifier le profil"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveInlineEdit}
                        disabled={!canSaveInline}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                          canSaveInline ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`}
                        title="Enregistrer"
                      >
                        <Save className="h-4 w-4" />
                        {savingInline ? 'Enregistrement…' : 'Enregistrer'}
                      </button>

                      <button
                        type="button"
                        onClick={cancelInlineEdit}
                        disabled={savingInline}
                        className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
                        title="Annuler"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  <Link
                    href="/settings"
                    className="ml-1 rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-100/70 hover:text-slate-900"
                    title="Paramètres avancés"
                  >
                    <span className="sr-only">Paramètres avancés</span>
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>

                {!editing ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span>
                        Mode : <span className="font-semibold">{profile?.identity_mode ?? 'symbolic'}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Langue : <span className="font-semibold">{profile?.lang_primary ?? 'en'}</span>
                      </span>
                    </div>

                    {profile?.bio && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800">
                        {profile.bio}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-900">Pseudo (handle)</label>
                      <input
                        value={editHandle}
                        onChange={(e) => setEditHandle(e.target.value)}
                        placeholder="ex: night_river"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                        maxLength={24}
                        autoComplete="off"
                        inputMode="text"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        {editHandle.trim() ? `Format appliqué : ${normalizeHandle(editHandle)}` : 'Optionnel (tu peux rester sans pseudo).'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-900">Langue</label>
                      <select
                        value={editLang}
                        onChange={(e) => setEditLang(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                      >
                        {LANG_CHOICES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label} ({l.code})
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs text-slate-500">Langue principale du profil.</div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-slate-900">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Une phrase douce. Rien d'obligatoire."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                        rows={3}
                        maxLength={240}
                      />
                      <div className="mt-2 text-xs text-slate-500">{editBio.length}/240</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Avatar modal (Portal) */}
          <PortalModal
            open={showAvatarUpload}
            onClose={() => {
              setShowAvatarUpload(false);
            }}
          >
            <div
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setShowAvatarUpload(false);
              }}
            >
              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <button
                  type="button"
                  onClick={() => setShowAvatarUpload(false)}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>

                <h3 className="text-lg font-bold text-slate-900">Changer l&apos;avatar</h3>
                <p className="mt-1 text-sm text-slate-600">JPG/PNG/WEBP/GIF • Max 5 MB • Recommandé : 512×512</p>

                <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition-colors hover:border-slate-400 hover:bg-slate-100">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-900">{uploadingAvatar ? 'Upload en cours…' : 'Choisir une image'}</div>
                    <div className="mt-1 text-xs text-slate-500">ou glisser-déposer ici</div>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </PortalModal>

          {/* Banner modal (Portal) */}
          <PortalModal open={showBannerUpload} onClose={closeBannerModal}>
            <div
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm sm:px-6"
              onPointerUp={onPointerUpBanner}
              onPointerCancel={onPointerUpBanner}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeBannerModal();
              }}
            >
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <button
                  type="button"
                  onClick={closeBannerModal}
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>

                <h3 className="text-lg font-bold text-slate-900">Changer la bannière</h3>
                <p className="mt-1 text-sm text-slate-600">JPG/PNG/WEBP • Max 10 MB • Recommandé : 1500×500 • Glisse pour caler l’image</p>

                <div
                  className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  style={{ height: 220 }}
                  onPointerMove={(e) => onPointerMoveBanner(e.clientY)}
                  onPointerLeave={onPointerUpBanner}
                >
                  {bannerPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bannerPreviewUrl}
                      alt="Preview bannière"
                      className="h-full w-full select-none object-cover"
                      style={{ objectPosition: bannerObjectPosition(bannerDraftPosY) }}
                      draggable={false}
                      onPointerDown={(e) => {
                        (e.currentTarget as HTMLImageElement).setPointerCapture(e.pointerId);
                        onPointerDownBanner(e.clientY);
                      }}
                      onPointerUp={onPointerUpBanner}
                      onPointerCancel={onPointerUpBanner}
                    />
                  ) : profile?.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.banner_url}
                      alt="Bannière actuelle"
                      className="h-full w-full select-none object-cover"
                      style={{ objectPosition: bannerObjectPosition(bannerDraftPosY) }}
                      draggable={false}
                      onPointerDown={(e) => {
                        (e.currentTarget as HTMLImageElement).setPointerCapture(e.pointerId);
                        onPointerDownBanner(e.clientY);
                      }}
                      onPointerUp={onPointerUpBanner}
                      onPointerCancel={onPointerUpBanner}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="text-sm font-semibold text-slate-400">Aucune image sélectionnée</div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    Choisir une image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingBanner}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPickBannerFile(f);
                      }}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBannerDraftPosY(0)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      disabled={uploadingBanner}
                    >
                      Recentrer
                    </button>

                    <button
                      type="button"
                      onClick={saveBannerPositionToDb}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                      disabled={uploadingBanner}
                      title="Enregistre la position sur tous tes appareils"
                    >
                      Sauver position
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!bannerFile) {
                          setError('Choisis une image avant de valider.');
                          return;
                        }
                        uploadBanner(bannerFile);
                      }}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        uploadingBanner ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                      disabled={uploadingBanner}
                    >
                      {uploadingBanner ? 'Upload…' : 'Uploader'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">Astuce : clique/maintien puis glisse verticalement pour caler la bannière.</div>
              </div>
            </div>
          </PortalModal>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Derniers échos</h2>
              <p className="mt-1 text-sm text-slate-600">Pas de compteurs. Juste une trace douce.</p>
            </div>

            <Link
              href="/share"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
            >
              Partager un écho
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
              <div className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
            </div>
          ) : echoes.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-8 text-center backdrop-blur-md">
              <div className="text-lg font-semibold text-slate-700">Aucun écho pour l&apos;instant.</div>
              <p className="mt-2 text-sm text-slate-600">Commence à partager tes histoires pour voir apparaître tes échos ici.</p>
              <Link
                href="/share"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01]"
              >
                Créer mon premier écho
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {echoes.map((e) => (
                <article
                  key={e.id}
                  className="group rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md transition-all hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-slate-900 group-hover:text-violet-600">
                        {e.title?.trim() ? e.title : 'Sans titre'}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span>{formatDateFR(e.created_at)}</span>
                        {e.emotion ? (
                          <>
                            <span>•</span>
                            <span className="font-medium">{e.emotion}</span>
                          </>
                        ) : null}
                        {e.visibility ? (
                          <>
                            <span>•</span>
                            <span className="capitalize">{e.visibility}</span>
                          </>
                        ) : null}
                        {e.is_anonymous ? (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">anonyme</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      href={`/echo/${e.id}`}
                      className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-all hover:border-slate-300 hover:shadow-md"
                    >
                      Ouvrir
                    </Link>
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-slate-700">{e.content}</p>

                  <div className="mt-4 text-xs text-slate-500">
                    {e.city || e.country ? (
                      <span>
                        {e.city ? e.city : ''}
                        {e.city && e.country ? ' — ' : ''}
                        {e.country ? e.country : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">Localisation masquée</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
