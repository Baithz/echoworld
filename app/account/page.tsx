/**
 * =============================================================================
 * Fichier      : app/account/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.2 (2026-01-22)
 * Objet        : Mon compte — Profil utilisateur COMPLET avec avatar/bannière
 * -----------------------------------------------------------------------------
 * Description  :
 * - Client Component avec interactions complètes
 * - Header navigation sticky intégré
 * - Bannière personnalisée (style Instagram/Facebook)
 * - Avatar éditable avec upload Supabase Storage
 * - Section identité EchoWorld (handle, bio, mode)
 * - Liste des derniers échos (12 max) avec actions
 * - Design immersif et cohérent avec le reste de l'app
 *
 * DIFFÉRENCE AVEC /me :
 * - /me = Server Component minimaliste (V1, pas d'échos)
 * - /account = Client Component complet (V2, upload + échos)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.2 (2026-01-22)
 * - [FIX] ESLint no-explicit-any : suppression totale des "any"
 * - [FIX] Supabase typings : wrapper minimal typé pour éviter les "never" sans modifier l'infra
 * - [NO-REGRESSION] UI/UX, logique et routes inchangées
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Edit2, Upload, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import { supabase } from '@/lib/supabase/client';

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: 'real' | 'symbolic' | 'anonymous';
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  banner_url: string | null;
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
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
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
            .select(
              'id,title,content,emotion,language,country,city,is_anonymous,visibility,status,created_at'
            )
            .eq('user_id', userId)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false })
            .limit(12),
        ]);

        if (!mounted) return;

        setProfile((pRes.data as ProfileRow | null) ?? null);
        setEchoes((eRes.data as EchoRow[]) ?? []);
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

  // Identity display
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

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    if (!userId || !file) return;

    // Validation
    const maxSize = 5 * 1024 * 1024; // 5MB
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
      // Upload to Supabase Storage (bucket: avatars)
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = sb.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl: string = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await sb
        .from('profiles')
        .update({
          avatar_type: 'image',
          avatar_url: avatarUrl,
        })
        .eq('id', userId)
        .maybeSingle();

      if (updateError) throw updateError;

      // Refresh profile
      const { data: refreshed } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      setProfile((refreshed as ProfileRow | null) ?? null);
      setOk('Avatar mis à jour avec succès.');
      setShowAvatarUpload(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'upload.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Upload banner
  const uploadBanner = async (file: File) => {
    if (!userId || !file) return;

    // Validation
    const maxSize = 10 * 1024 * 1024; // 10MB
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
      // Upload to Supabase Storage (bucket: banners)
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = sb.storage.from('banners').getPublicUrl(fileName);
      const bannerUrl: string = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await sb
        .from('profiles')
        .update({ banner_url: bannerUrl })
        .eq('id', userId)
        .maybeSingle();

      if (updateError) throw updateError;

      // Refresh profile
      const { data: refreshed } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      setProfile((refreshed as ProfileRow | null) ?? null);
      setOk('Bannière mise à jour avec succès.');
      setShowBannerUpload(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'upload.");
    } finally {
      setUploadingBanner(false);
    }
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
        {/* Header section */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mon espace</h1>
            <p className="mt-2 text-slate-600">Ta présence, tes récits, et une navigation calme.</p>
          </div>

          <Link
            href="/settings"
            className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Paramètres
          </Link>
        </div>

        {/* Feedback messages */}
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

        {/* Profile Card (Banner + Avatar + Identity) */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md shadow-lg shadow-black/5">
          {/* Banner */}
          <div className="relative h-48 w-full overflow-hidden bg-linear-to-br from-violet-500/20 via-sky-500/15 to-emerald-500/10">
            {profile?.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.banner_url} alt="Bannière" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-sm font-semibold text-slate-400">Aucune bannière</div>
              </div>
            )}

            {/* Banner edit button */}
            <button
              type="button"
              onClick={() => setShowBannerUpload((v) => !v)}
              className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60"
            >
              <Camera className="h-4 w-4" />
              Modifier bannière
            </button>

            {/* Banner upload modal */}
            {showBannerUpload && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                  <button
                    type="button"
                    onClick={() => setShowBannerUpload(false)}
                    className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <h3 className="text-lg font-bold text-slate-900">Changer la bannière</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Format JPG, PNG ou WEBP • Max 10 MB • Recommandé : 1500x500px
                  </p>

                  <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition-colors hover:border-slate-400 hover:bg-slate-100">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-900">
                        {uploadingBanner ? 'Upload en cours...' : 'Choisir une image'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">ou glisser-déposer ici</div>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingBanner}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadBanner(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Avatar + Identity */}
          <div className="relative px-6 pb-6">
            {/* Avatar (overlap banner) */}
            <div className="relative -mt-16 mb-4">
              <div className="relative inline-block">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
                  {profile?.avatar_type === 'image' && profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-slate-900">{avatarLabel}</span>
                  )}
                </div>

                {/* Avatar edit button */}
                <button
                  type="button"
                  onClick={() => setShowAvatarUpload((v) => !v)}
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Camera className="h-4 w-4 text-slate-900" />
                </button>
              </div>

              {/* Avatar upload modal */}
              {showAvatarUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
                  <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setShowAvatarUpload(false)}
                      className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <h3 className="text-lg font-bold text-slate-900">Changer l&apos;avatar</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Format JPG, PNG, WEBP ou GIF • Max 5 MB • Recommandé : 512x512px
                    </p>

                    <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 transition-colors hover:border-slate-400 hover:bg-slate-100">
                      <Upload className="h-8 w-8 text-slate-400" />
                      <div className="text-center">
                        <div className="text-sm font-semibold text-slate-900">
                          {uploadingAvatar ? 'Upload en cours...' : 'Choisir une image'}
                        </div>
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
              )}
            </div>

            {/* Identity info */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">{identity}</h2>
                <Link
                  href="/settings"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  title="Modifier le profil"
                >
                  <Edit2 className="h-4 w-4" />
                </Link>
              </div>

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
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  {profile.bio}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Echoes section */}
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
              <div className="text-lg font-semibold text-slate-700">
                Aucun écho pour l&apos;instant.
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Commence à partager tes histoires pour voir apparaître tes échos ici.
              </p>
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

                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-slate-700">
                    {e.content}
                  </p>

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
