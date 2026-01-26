/**
 * =============================================================================
 * Fichier      : app/settings/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.3.3 (2026-01-26)
 * Objet        : Paramètres utilisateur (EchoWorld) — confidentialité + préférences
 * -----------------------------------------------------------------------------
 * Description  :
 * - Lecture/édition de user_settings (theme, defaults, notifications soft, pour-moi MVP)
 * - Lecture/édition de profiles (handle, bio, identity_mode, lang_primary, public_profile_enabled)
 * - Source de vérité “Profil public” = profiles.public_profile_enabled (aligné RLS + search)
 * - FAIL-SOFT : si colonnes "for_me_*" absentes en BDD, sauvegarde fallback sans casser
 * - Validation pseudo (handle) via UI dédiée (ProfileHandleForm) dans ProfileSettingsView
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.3.3 (2026-01-26)
 * - [REFACTOR] Extraction complète de la UI vers components/settings/ProfileSettings (ProfileSettingsView)
 * - [SAFE] Toute la logique Supabase (auth, load, save, fail-soft, canSave) reste dans la page
 * 2.3.2 (2026-01-26)
 * - [REFACTOR] Extraction de toute la logique handleState/handleHint/check dispo vers ProfileHandleForm
 * - [SAFE] Le bouton Enregistrer conserve la même logique d’upsert (profiles.handle + unique BDD)
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
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import ProfileSettingsView from '@/components/settings/ProfileSettings';

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
// Validation handle (côté page)
// -----------------------------------------------------------------------------
// Le composant ProfileHandleForm (dans ProfileSettingsView) gère la validation UX
// + check disponibilité, mais on garde un filet de sécurité ici pour éviter
// d’enregistrer un format complètement invalide si jamais la UI est contournée.
function validateHandle(raw: string): { ok: boolean; normalized: string; reason?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, normalized: '' }; // handle facultatif

  const normalized = normalizeHandle(trimmed);

  if (normalized.length < 3) {
    return { ok: false, normalized, reason: 'Minimum 3 caractères.' };
  }
  if (normalized.length > 24) {
    return {
      ok: false,
      normalized: normalized.slice(0, 24),
      reason: 'Maximum 24 caractères.',
    };
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

  const canSave = useMemo(() => {
    if (authLoading || loading) return false;
    if (!userId) return false;
    if (saving) return false;

    const v = validateHandle(handle);
    if (!v.ok) return false;

    if (Number.isNaN(forMeMaxItems) || forMeMaxItems < 6 || forMeMaxItems > 60) return false;

    return true;
  }, [userId, saving, handle, loading, authLoading, forMeMaxItems]);

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

  const save = async () => {
    if (!userId || !canSave) return;

    const vHandle = validateHandle(handle);
    if (!vHandle.ok) {
      setError(vHandle.reason || 'Pseudo invalide.');
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
    <ProfileSettingsView
      // header / actions
      canSave={canSave}
      saving={saving}
      onSave={save}
      // infos debug footer + data
      loading={loading}
      profile={profile}
      settings={settings}
      // toasts
      error={error}
      ok={ok}
      // langs
      langs={LANGS}
      // form state
      handle={handle}
      setHandle={setHandle}
      bio={bio}
      setBio={setBio}
      identityMode={identityMode}
      setIdentityMode={setIdentityMode}
      langPrimary={langPrimary}
      setLangPrimary={setLangPrimary}
      // privacy + prefs
      publicProfile={publicProfile}
      setPublicProfile={setPublicProfile}
      defaultVisibility={defaultVisibility}
      setDefaultVisibility={setDefaultVisibility}
      defaultAnonymous={defaultAnonymous}
      setDefaultAnonymous={setDefaultAnonymous}
      allowResponses={allowResponses}
      setAllowResponses={setAllowResponses}
      allowMirrors={allowMirrors}
      setAllowMirrors={setAllowMirrors}
      // experience
      theme={theme}
      setTheme={setTheme}
      notificationsSoft={notificationsSoft}
      setNotificationsSoft={setNotificationsSoft}
      // "Pour moi"
      forMeEnabled={forMeEnabled}
      setForMeEnabled={setForMeEnabled}
      forMeUseLikes={forMeUseLikes}
      setForMeUseLikes={setForMeUseLikes}
      forMeUseMirrors={forMeUseMirrors}
      setForMeUseMirrors={setForMeUseMirrors}
      forMeIncludeFresh={forMeIncludeFresh}
      setForMeIncludeFresh={setForMeIncludeFresh}
      forMeMaxItems={forMeMaxItems}
      setForMeMaxItems={setForMeMaxItems}
    />
  );
}
