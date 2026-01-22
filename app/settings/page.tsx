/**
 * =============================================================================
 * Fichier      : app/settings/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.2 (2026-01-22)
 * Objet        : Paramètres utilisateur (EchoWorld) — confidentialité + préférences
 * -----------------------------------------------------------------------------
 * Description  :
 * - Lecture/édition de user_settings (theme, privacy, defaults, notifications soft)
 * - Lecture/édition minimale de profiles (handle, bio, identity_mode)
 * - UX non toxique : pas de métriques, contrôle clair, feedback discret
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.2 (2026-01-22)
 * - [FIX] Toggles décalés : thumb ancré (left-1) + translate correct (translate-x-6)
 * - [FIX] Sauvegarde fiable : upsert profiles/user_settings (évite update=0 rows si ligne absente)
 * - [NO-REGRESSION] UI/UX, logique et routes inchangées
 * 2.0.1 (2026-01-22)
 * - [FIX] ESLint react/no-unescaped-entities : apostrophes échappées dans le JSX
 * - [NO-REGRESSION] Logique, UX et routes inchangées
 * 2.0.0 (2026-01-22)
 * - [NEW] Header navigation intégré (consistance UI)
 * - [FIX] Max-width harmonisé (max-w-6xl) + padding-top pour sticky header
 * - [IMPROVED] Design moderne : transitions, hover states
 * 1.0.2 (2026-01-21)
 * - [FIX] TS "never" persistant : typage forcé sur maybeSingle<T>() + payloads Update
 * - [FIX] Database local conforme supabase-js
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
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
};

type UserSettingsRow = {
  user_id: string;
  public_profile_enabled: boolean;
  default_echo_visibility: Visibility;
  default_anonymous: boolean;
  allow_responses: boolean;
  allow_mirrors: boolean;
  notifications_soft: boolean;
  theme: Theme;
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

function normalizeHandle(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
  return cleaned.slice(0, 24);
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

  // Form state
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [identityMode, setIdentityMode] = useState<IdentityMode>('symbolic');

  const [theme, setTheme] = useState<Theme>('system');
  const [publicProfile, setPublicProfile] = useState(false);

  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>('world');
  const [defaultAnonymous, setDefaultAnonymous] = useState(false);

  const [allowResponses, setAllowResponses] = useState(true);
  const [allowMirrors, setAllowMirrors] = useState(true);
  const [notificationsSoft, setNotificationsSoft] = useState(true);

  const canSave = useMemo(() => {
    if (!userId) return false;
    if (saving) return false;
    const h = handle.trim();
    if (h && normalizeHandle(h).length < 3) return false;
    return true;
  }, [userId, saving, handle]);

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

        setTheme(s?.theme ?? 'system');
        setPublicProfile(!!s?.public_profile_enabled);

        setDefaultVisibility(s?.default_echo_visibility ?? 'world');
        setDefaultAnonymous(!!s?.default_anonymous);

        setAllowResponses(s?.allow_responses ?? true);
        setAllowMirrors(s?.allow_mirrors ?? true);
        setNotificationsSoft(s?.notifications_soft ?? true);
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

  const save = async () => {
    if (!userId) return;
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const nextHandle = handle.trim() ? normalizeHandle(handle) : null;

      // Upsert profile (évite update=0 rows si la ligne n'existe pas encore)
      const profilePatch: Database['public']['Tables']['profiles']['Insert'] = {
        id: userId,
        handle: nextHandle,
        bio: bio.trim() ? bio.trim() : null,
        identity_mode: identityMode,
      };

      const pUpsert = await sb.from('profiles').upsert(profilePatch, { onConflict: 'id' });
      if (pUpsert.error) throw pUpsert.error;

      // Upsert settings (évite update=0 rows si la ligne n'existe pas encore)
      const settingsPatch: Database['public']['Tables']['user_settings']['Insert'] = {
        user_id: userId,
        theme,
        public_profile_enabled: publicProfile,
        default_echo_visibility: defaultVisibility,
        default_anonymous: defaultAnonymous,
        allow_responses: allowResponses,
        allow_mirrors: allowMirrors,
        notifications_soft: notificationsSoft,
      };

      const sUpsert = await sb.from('user_settings').upsert(settingsPatch, { onConflict: 'user_id' });
      if (sUpsert.error) throw sUpsert.error;

      // Refresh after save (affichage cohérent)
      const [pRefresh, sRefresh] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>(),
        sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle<UserSettingsRow>(),
      ]);

      setProfile(pRefresh.data ?? null);
      setSettings(sRefresh.data ?? null);

      setOk('Paramètres enregistrés avec succès.');
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
      <>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
          <div className="h-10 w-64 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
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
            <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
            <p className="mt-2 text-slate-600">
              Contrôle calme de ton identité, ta confidentialité, et ton expérience.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
            >
              Mon espace
            </Link>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform ${
                canSave
                  ? 'bg-slate-900 text-white hover:scale-[1.01]'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
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
                placeholder="ex: night_river"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                maxLength={24}
                inputMode="text"
                autoComplete="off"
              />
              <div className="mt-2 text-xs text-slate-500">
                {handle.trim()
                  ? `Format appliqué : ${normalizeHandle(handle)}`
                  : 'Tu peux rester sans pseudo si tu veux.'}
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
          <p className="mt-1 text-sm text-slate-600">
            Pas de followers, pas de scores. Juste des choix de visibilité.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ToggleRow
              label="Profil public"
              hint="Autorise l'accès à une page publique (si activée plus tard)."
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
                <option value="local">Local (public local)</option>
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

        {/* Experience */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
          <h2 className="text-lg font-bold text-slate-900">Expérience</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sobriété et douceur : peu de notifications, pas de pression.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-900">Thème</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-300"
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
    </>
  );
}

function ToggleRow(props: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
          className={`relative shrink-0 h-7 w-12 rounded-full border transition-colors ${
            checked ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
          }`}
        >
          <span
            className={`absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-0'
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
        className={`relative shrink-0 h-7 w-12 rounded-full border transition-colors ${
          checked ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
        }`}
      >
        <span
          className={`absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
