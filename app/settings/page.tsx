/**
 * =============================================================================
 * Fichier      : app/settings/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.1 (2026-01-26)
 * Objet        : Paramètres utilisateur (EchoWorld) — confidentialité + préférences
 * -----------------------------------------------------------------------------
 * Description  :
 * - Lecture/édition de user_settings (theme, defaults, notifications soft, pour-moi MVP)
 * - Lecture/édition de profiles (handle, bio, identity_mode, lang_primary, public_profile_enabled)
 * - Source de vérité “Profil public” = profiles.public_profile_enabled (aligné RLS + search)
 * - FAIL-SOFT : si colonnes "for_me_*" absentes en BDD, sauvegarde fallback sans casser
 * - Validation + disponibilité pseudo (handle) via /api/handle/check (fail-soft, unique constraint garde le dernier mot)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.1 (2026-01-26)
 * - [CLEAN] Refactor léger (ordre des checks, dépendances, msgs) sans changement fonctionnel
 * - [SAFE] Validation handle + check dispo conservés, aucune régression UX
 * 2.3.0 (2026-01-26)
 * - [NEW] Validation locale + check disponibilité handle via /api/handle/check (fail-soft si route absente)
 * - [SAFE] Bloque uniquement les handles invalides ou déjà pris (fallback sur contrainte unique BDD)
 * 2.2.0 (2026-01-23)
 * - [FIX] Profil public: lecture + écriture sur profiles.public_profile_enabled
 * - [FIX] user_settings.public_profile_enabled n’est plus utilisé pour la visibilité publique
 * - [KEEP] UX/toasts/fail-soft “Pour moi” inchangés
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type IdentityMode = 'real' | 'symbolic' | 'anonymous';
type Theme = 'system' | 'light' | 'dark';
type Visibility = 'world' | 'local' | 'private' | 'semi_anonymous';

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: IdentityMode;
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  lang_primary: string;
  lang_secondary: string[];
  location_mode: 'precise' | 'fuzzy' | 'hidden';
  location_fuzzy: string | null;

  // ---------------------------------------------------------------------------
  // VISIBILITÉ PROFIL PUBLIC (source de vérité)
  // ---------------------------------------------------------------------------
  public_profile_enabled: boolean;
};

type UserSettingsRow = {
  user_id: string;

  // NOTE: ce champ peut exister en base mais n’est plus la source de vérité
  // pour l’accès public aux profils (désormais dans profiles.public_profile_enabled).
  public_profile_enabled: boolean;

  default_echo_visibility: Visibility;
  default_anonymous: boolean;
  allow_responses: boolean;
  allow_mirrors: boolean;
  notifications_soft: boolean;
  theme: Theme;

  // ---------------------------------------------------------------------------
  // MVP "Pour moi" (FAIL-SOFT: colonnes optionnelles)
  // ---------------------------------------------------------------------------
  for_me_enabled?: boolean | null;
  for_me_use_likes?: boolean | null;
  for_me_use_mirrors?: boolean | null;
  for_me_include_fresh?: boolean | null;
  for_me_max_items?: number | null;
};

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Partial<UserSettingsRow> & { user_id: string };
        Update: Partial<UserSettingsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const sb = supabase as unknown as SupabaseClient<Database>;

const LANGS = [
  { value: 'en', label: 'English (en)' },
  { value: 'fr', label: 'Français (fr)' },
  { value: 'es', label: 'Español (es)' },
  { value: 'de', label: 'Deutsch (de)' },
  { value: 'it', label: 'Italiano (it)' },
];

function normalizeHandle(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  return cleaned.slice(0, 24);
}

// -----------------------------------------------------------------------------
// Validation + disponibilité handle
// -----------------------------------------------------------------------------
const HANDLE_MIN = 3;
const HANDLE_MAX = 24;

// Réservés (routes + mots sensibles / courts)
const RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'account',
  'settings',
  'login',
  'signup',
  'register',
  'explore',
  'map',
  'u',
  'me',
  'support',
  'terms',
  'privacy',
]);

type HandleCheckState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown';

function validateHandle(raw: string): { ok: boolean; normalized: string; reason?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, normalized: '' }; // handle facultatif

  const normalized = normalizeHandle(trimmed);

  if (normalized.length < HANDLE_MIN) {
    return { ok: false, normalized, reason: `Minimum ${HANDLE_MIN} caractères.` };
  }
  if (normalized.length > HANDLE_MAX) {
    return {
      ok: false,
      normalized: normalized.slice(0, HANDLE_MAX),
      reason: `Maximum ${HANDLE_MAX} caractères.`,
    };
  }
  if (RESERVED_HANDLES.has(normalized)) {
    return { ok: false, normalized, reason: 'Pseudo réservé.' };
  }
  return { ok: true, normalized };
}

function safeLang(v: string | null | undefined): string {
  const x = (v || '').trim().toLowerCase();
  if (!x) return 'en';
  return LANGS.some((l) => l.value === x) ? x : 'en';
}

function looksLikeMissingColumnError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (m.includes('does not exist') || m.includes('unknown column') || m.includes('not exist')) && m.includes('for_me_');
}

export default function SettingsPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Auto-hide OK toast (UX)
  const okTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!ok) return;
    if (okTimerRef.current) window.clearTimeout(okTimerRef.current);
    okTimerRef.current = window.setTimeout(() => setOk(null), 3500);
    return () => {
      if (okTimerRef.current) window.clearTimeout(okTimerRef.current);
      okTimerRef.current = null;
    };
  }, [ok]);

  // Form state
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [identityMode, setIdentityMode] = useState<IdentityMode>('symbolic');
  const [langPrimary, setLangPrimary] = useState<string>('en');

  const [theme, setTheme] = useState<Theme>('system');

  // IMPORTANT: ce toggle pilote profiles.public_profile_enabled
  const [publicProfile, setPublicProfile] = useState(false);

  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>('world');
  const [defaultAnonymous, setDefaultAnonymous] = useState(false);

  const [allowResponses, setAllowResponses] = useState(true);
  const [allowMirrors, setAllowMirrors] = useState(true);
  const [notificationsSoft, setNotificationsSoft] = useState(true);

  // ---------------------------------------------------------------------------
  // "Pour moi" — réglages MVP
  // ---------------------------------------------------------------------------
  const [forMeEnabled, setForMeEnabled] = useState(true);
  const [forMeUseLikes, setForMeUseLikes] = useState(true);
  const [forMeUseMirrors, setForMeUseMirrors] = useState(true);
  const [forMeIncludeFresh, setForMeIncludeFresh] = useState(true);
  const [forMeMaxItems, setForMeMaxItems] = useState<number>(18);

  // ---------------------------------------------------------------------------
  // Handle availability (FAIL-SOFT)
  // ---------------------------------------------------------------------------
  const [handleState, setHandleState] = useState<HandleCheckState>('idle');
  const [handleHint, setHandleHint] = useState<string | null>(null);
  const lastCheckedHandleRef = useRef<string>('');

  const canSave = useMemo(() => {
    if (authLoading || loading) return false;
    if (!userId) return false;
    if (saving) return false;

    const v = validateHandle(handle);
    if (!v.ok) return false;
    if (handleState === 'taken') return false;

    if (Number.isNaN(forMeMaxItems) || forMeMaxItems < 6 || forMeMaxItems > 60) return false;

    return true;
  }, [userId, saving, handle, handleState, loading, authLoading, forMeMaxItems]);

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

    void loadAuth();

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

  // Load profile/settings
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);
      setOk(null);

      try {
        const [pRes, sRes] = await Promise.all([
          sb.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>(),
          sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle<UserSettingsRow>(),
        ]);

        if (!mounted) return;

        const p = pRes.data ?? null;
        const s = sRes.data ?? null;

        setProfile(p);
        setSettings(s);

        setHandle(p?.handle ?? '');
        setBio(p?.bio ?? '');
        setIdentityMode(p?.identity_mode ?? 'symbolic');
        setLangPrimary(safeLang(p?.lang_primary ?? 'en'));

        // IMPORTANT: lecture depuis profiles (source de vérité)
        setPublicProfile(!!p?.public_profile_enabled);

        setTheme(s?.theme ?? 'system');

        setDefaultVisibility(s?.default_echo_visibility ?? 'world');
        setDefaultAnonymous(!!s?.default_anonymous);

        setAllowResponses(s?.allow_responses ?? true);
        setAllowMirrors(s?.allow_mirrors ?? true);
        setNotificationsSoft(s?.notifications_soft ?? true);

        // Pour moi defaults (si colonnes absentes -> on garde nos defaults UI)
        setForMeEnabled(s?.for_me_enabled ?? true);
        setForMeUseLikes(s?.for_me_use_likes ?? true);
        setForMeUseMirrors(s?.for_me_use_mirrors ?? true);
        setForMeIncludeFresh(s?.for_me_include_fresh ?? true);
        setForMeMaxItems(
          typeof s?.for_me_max_items === 'number' && s.for_me_max_items >= 6 ? s.for_me_max_items : 18
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // ---------------------------------------------------------------------------
  // Handle availability (FAIL-SOFT)
  // - Si l’API n’existe pas / erreur réseau : state = 'unknown' (n’empêche pas save)
  // - Si handle vide : idle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || loading) return;
    if (!userId) return;

    const { ok: isValid, normalized, reason } = validateHandle(handle);

    if (!handle.trim()) {
      setHandleState('idle');
      setHandleHint(null);
      lastCheckedHandleRef.current = '';
      return;
    }

    if (!isValid) {
      setHandleState('invalid');
      setHandleHint(reason || 'Pseudo invalide.');
      lastCheckedHandleRef.current = '';
      return;
    }

    // Si inchangé vs DB (handle actuel du profil) => pas besoin de checker
    const current = (profile?.handle ?? '') || '';
    if (normalized && normalized === current) {
      setHandleState('available');
      setHandleHint('Pseudo actuel.');
      lastCheckedHandleRef.current = normalized;
      return;
    }

    setHandleState('checking');
    setHandleHint('Vérification…');

    const t = window.setTimeout(async () => {
      try {
        // évite double-check
        if (lastCheckedHandleRef.current === normalized) return;

        const res = await fetch(`/api/handle/check?handle=${encodeURIComponent(normalized)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        // FAIL-SOFT : si route non créée (404) ou autre -> unknown
        if (!res.ok) {
          setHandleState('unknown');
          setHandleHint('Disponibilité non vérifiée (OK).');
          return;
        }

        const json = (await res.json().catch(() => ({}))) as { available?: boolean };
        const available = !!json.available;

        setHandleState(available ? 'available' : 'taken');
        setHandleHint(available ? 'Pseudo disponible.' : 'Pseudo déjà utilisé.');
        lastCheckedHandleRef.current = normalized;
      } catch {
        setHandleState('unknown');
        setHandleHint('Disponibilité non vérifiée (OK).');
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [handle, userId, authLoading, loading, profile?.handle]);

  const save = async () => {
    if (!userId || !canSave) return;

    const vHandle = validateHandle(handle);
    if (!vHandle.ok) {
      setError(vHandle.reason || 'Pseudo invalide.');
      return;
    }
    if (handleState === 'taken') {
      setError('Ce pseudo est déjà utilisé. Essayez une autre variante.');
      return;
    }

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const nextHandle = vHandle.normalized ? vHandle.normalized : null;
      const nextBio = bio.trim() ? bio.trim() : null;
      const nextLang = safeLang(langPrimary);

      // -----------------------------------------------------------------------
      // PROFILES (inclut public_profile_enabled)
      // -----------------------------------------------------------------------
      const profilePatch: Database['public']['Tables']['profiles']['Insert'] = {
        id: userId,
        handle: nextHandle,
        bio: nextBio,
        identity_mode: identityMode,
        lang_primary: nextLang,
        public_profile_enabled: publicProfile,
      };

      const pUpsert = await sb.from('profiles').upsert(profilePatch, { onConflict: 'id' });
      if (pUpsert.error) throw pUpsert.error;

      // -----------------------------------------------------------------------
      // USER_SETTINGS (ne pilote plus la visibilité du profil public)
      // -----------------------------------------------------------------------
      const baseSettingsPatch: Database['public']['Tables']['user_settings']['Insert'] = {
        user_id: userId,
        theme,
        // on ne touche plus à user_settings.public_profile_enabled (désormais obsolète)
        default_echo_visibility: defaultVisibility,
        default_anonymous: defaultAnonymous,
        allow_responses: allowResponses,
        allow_mirrors: allowMirrors,
        notifications_soft: notificationsSoft,
      };

      const extendedSettingsPatch: Database['public']['Tables']['user_settings']['Insert'] = {
        ...baseSettingsPatch,
        for_me_enabled: forMeEnabled,
        for_me_use_likes: forMeUseLikes,
        for_me_use_mirrors: forMeUseMirrors,
        for_me_include_fresh: forMeIncludeFresh,
        for_me_max_items: Math.max(6, Math.min(60, Math.round(forMeMaxItems))),
      };

      const sTry = await sb.from('user_settings').upsert(extendedSettingsPatch, { onConflict: 'user_id' });

      if (sTry.error) {
        const msg = String(sTry.error.message ?? sTry.error);
        if (looksLikeMissingColumnError(msg)) {
          const sRetry = await sb.from('user_settings').upsert(baseSettingsPatch, { onConflict: 'user_id' });
          if (sRetry.error) throw sRetry.error;

          setOk('Paramètres enregistrés. (Les options "Pour moi" seront actives après migration BDD.)');
        } else {
          throw sTry.error;
        }
      } else {
        setOk('Paramètres enregistrés avec succès.');
      }

      const [pRefresh, sRefresh] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>(),
        sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle<UserSettingsRow>(),
      ]);

      const p = pRefresh.data ?? null;
      const s = sRefresh.data ?? null;

      setProfile(p);
      setSettings(s);

      setHandle(p?.handle ?? '');
      setBio(p?.bio ?? '');
      setIdentityMode(p?.identity_mode ?? 'symbolic');
      setLangPrimary(safeLang(p?.lang_primary ?? 'en'));

      // IMPORTANT: resync depuis profiles
      setPublicProfile(!!p?.public_profile_enabled);

      setTheme(s?.theme ?? theme);

      setDefaultVisibility(s?.default_echo_visibility ?? defaultVisibility);
      setDefaultAnonymous(!!s?.default_anonymous);

      setAllowResponses(s?.allow_responses ?? allowResponses);
      setAllowMirrors(s?.allow_mirrors ?? allowMirrors);
      setNotificationsSoft(s?.notifications_soft ?? notificationsSoft);

      setForMeEnabled(s?.for_me_enabled ?? forMeEnabled);
      setForMeUseLikes(s?.for_me_use_likes ?? forMeUseLikes);
      setForMeUseMirrors(s?.for_me_use_mirrors ?? forMeUseMirrors);
      setForMeIncludeFresh(s?.for_me_include_fresh ?? forMeIncludeFresh);
      setForMeMaxItems(
        typeof s?.for_me_max_items === 'number' && s.for_me_max_items >= 6 ? s.for_me_max_items : forMeMaxItems
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setError('Ce pseudo est déjà utilisé. Essayez une autre variante.');
      } else {
        setError(msg || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <div className="h-10 w-64 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
          <p className="mt-2 text-slate-600">Contrôle calme de ton identité, ta confidentialité, et ton expérience.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Mon profil
          </Link>

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform ${
              canSave ? 'bg-slate-900 text-white hover:scale-[1.01]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
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

      {/* Identity */}
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        <h2 className="text-lg font-bold text-slate-900">Identité</h2>
        <p className="mt-1 text-sm text-slate-600">
          EchoWorld privilégie une identité symbolique. L&apos;email n&apos;est pas exposé.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-900">Pseudo (handle)</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onBlur={() => {
                const h = handle.trim();
                if (!h) return;
                const v = validateHandle(h);
                if (v.normalized !== handle) setHandle(v.normalized);
              }}
              placeholder="ex: night_river"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
              maxLength={24}
              inputMode="text"
              autoComplete="off"
            />
            <div className="mt-2 space-y-1 text-xs">
              <div className="text-slate-500">
                {handle.trim()
                  ? `Format appliqué : ${validateHandle(handle).normalized}`
                  : 'Tu peux rester sans pseudo si tu veux.'}
              </div>

              {handle.trim() && (
                <div
                  className={
                    handleState === 'available'
                      ? 'text-emerald-700'
                      : handleState === 'taken' || handleState === 'invalid'
                        ? 'text-rose-700'
                        : 'text-slate-500'
                  }
                >
                  {handleHint || '—'}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Mode d&apos;identité</label>
            <select
              value={identityMode}
              onChange={(e) => setIdentityMode(e.target.value as IdentityMode)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              <option value="symbolic">Symbolique (recommandé)</option>
              <option value="anonymous">Anonyme</option>
              <option value="real">Réel (non recommandé)</option>
            </select>
            <div className="mt-2 text-xs text-slate-500">
              {identityMode === 'anonymous'
                ? 'Ton écho apparaîtra sans identité publique.'
                : 'Tu gardes une présence narrative sans métriques.'}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Langue principale</label>
            <select
              value={langPrimary}
              onChange={(e) => setLangPrimary(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-slate-500">Utilisée par défaut pour ton expérience et tes écrans.</div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-900">Bio (facultative)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Une phrase douce. Rien d'obligatoire."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
              rows={3}
              maxLength={240}
            />
            <div className="mt-2 text-xs text-slate-500">{bio.length}/240</div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        <h2 className="text-lg font-bold text-slate-900">Confidentialité</h2>
        <p className="mt-1 text-sm text-slate-600">Pas de followers, pas de scores. Juste des choix de visibilité.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ToggleRow
            label="Profil public"
            hint="Autorise ta découverte via la recherche et l’accès à /u/[handle] (si handle défini)."
            checked={publicProfile}
            onChange={setPublicProfile}
          />

          <ToggleRow
            label="Anonymat par défaut"
            hint="Nouvel écho : identité masquée (peut être modifié à la publication)."
            checked={defaultAnonymous}
            onChange={setDefaultAnonymous}
          />

          <div>
            <label className="text-sm font-semibold text-slate-900">Visibilité par défaut</label>
            <select
              value={defaultVisibility}
              onChange={(e) => setDefaultVisibility(e.target.value as Visibility)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              <option value="world">Monde (public)</option>
              <option value="local">Local (public)</option>
              <option value="semi_anonymous">Semi-anonyme</option>
              <option value="private">Privé</option>
            </select>
            <div className="mt-2 text-xs text-slate-500">Tu peux toujours choisir au moment de publier.</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Interactions</div>
            <div className="mt-3 space-y-3">
              <ToggleInline label="Autoriser les réponses" checked={allowResponses} onChange={setAllowResponses} />
              <ToggleInline label="Autoriser les échos miroirs" checked={allowMirrors} onChange={setAllowMirrors} />
            </div>
          </div>
        </div>
      </section>

      {/* "Pour moi" */}
      <section
        id="for-me"
        className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5"
      >
        <h2 className="text-lg font-bold text-slate-900">Pour moi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ajuste la résonance : basé sur tes interactions (likes/miroirs) + sujets associés. Rien d’intrusif.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ToggleRow
            label="Activer la résonance"
            hint="Si désactivé, la page “Pour moi” montrera uniquement des échos récents."
            checked={forMeEnabled}
            onChange={setForMeEnabled}
          />

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Sources prises en compte</div>
            <div className="mt-3 space-y-3">
              <ToggleInline label="Likes" checked={forMeUseLikes} onChange={setForMeUseLikes} />
              <ToggleInline label="Miroirs" checked={forMeUseMirrors} onChange={setForMeUseMirrors} />
              <div className="text-xs text-slate-500">
                Si “Miroirs” est désactivé ici ou dans “Interactions”, ils ne compteront pas dans le calcul.
              </div>
            </div>
          </div>

          <ToggleRow
            label="Inclure des échos récents"
            hint="Ajoute une section “Nouveaux” en complément de la résonance."
            checked={forMeIncludeFresh}
            onChange={setForMeIncludeFresh}
          />

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <label className="text-sm font-semibold text-slate-900">Quantité (max)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min={6}
                max={60}
                value={Number.isNaN(forMeMaxItems) ? 18 : forMeMaxItems}
                onChange={(e) => setForMeMaxItems(Number(e.target.value))}
                className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
              />
              <div className="text-xs text-slate-500">Entre 6 et 60 (MVP).</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Note : si les colonnes “for_me_*” ne sont pas encore présentes en base, la sauvegarde restera OK (fallback).
        </div>
      </section>

      {/* Experience */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        <h2 className="text-lg font-bold text-slate-900">Expérience</h2>
        <p className="mt-1 text-sm text-slate-600">Sobriété et douceur : peu de notifications, pas de pression.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-900">Thème</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              <option value="system">Système</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
            <div className="mt-2 text-xs text-slate-500">
              (Le switch global sera appliqué via layout à l&apos;étape suivante.)
            </div>
          </div>

          <ToggleRow
            label="Notifications soft"
            hint="Rappels calmes et non intrusifs (désactivable)."
            checked={notificationsSoft}
            onChange={setNotificationsSoft}
          />
        </div>
      </section>

      {/* RGPD */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        <h2 className="text-lg font-bold text-slate-900">Données & RGPD</h2>
        <p className="mt-1 text-sm text-slate-600">
          Export et suppression complète seront ajoutés ensuite (prévu dans la roadmap).
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
          >
            Exporter mes données (bientôt)
          </button>
          <button
            type="button"
            disabled
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-300 cursor-not-allowed"
          >
            Supprimer / anonymiser (bientôt)
          </button>
        </div>
      </section>

      <div className="mt-10 text-xs text-slate-400">
        {loading ? 'Chargement…' : `Profil: ${profile ? 'ok' : 'null'} • Settings: ${settings ? 'ok' : 'null'}`}
      </div>
    </main>
  );
}

function ToggleRow(props: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { label, hint, checked, onChange } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>
        </div>

        <button
          type="button"
          onClick={() => onChange(!checked)}
          aria-pressed={checked}
          className={`shrink-0 inline-flex h-7 w-12 items-center rounded-full border p-0 leading-none transition-colors appearance-none ${
            checked ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-6.5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function ToggleInline(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { label, checked, onChange } = props;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-800">{label}</div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`shrink-0 inline-flex h-7 w-12 items-center rounded-full border p-0 leading-none transition-colors appearance-none ${
          checked ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6.5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
