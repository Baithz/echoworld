/**
 * =============================================================================
 * Fichier      : components/settings/ProfileSettings.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.2.2 (2026-01-27)
 * Objet        : Settings — Profil & Préférences (UI modulaire) (SAFE, anti-régression)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Extrait la UI de app/settings/page.tsx en un composant unique et réutilisable
 * - Ne touche pas à Supabase / BDD : aucune requête ici (UI-only)
 * - Reçoit tout via props : states + setters + flags (loading/saving/canSave)
 * - Intègre ProfileHandleForm (UI-only) sans logique réseau dans la page
 * - Intègre ProfileAvatarForm (UI-only) sans logique réseau (Phase 4)
 * - SAFE : aucune logique métier nouvelle, aucun effet de bord
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.2.2 (2026-01-27)
 * - [FIX] Alignement du type de ProfileAvatarForm (import vers components/profile/ProfileAvatarForm)
 * - [SAFE] Aucune modification de contrat de props côté Settings/page
 * 1.2.1 (2026-01-27)
 * - [FIX] Suppression de la prop non typée profileId sur ProfileAvatarForm (TS2322)
 * - [CLEAN] handle source de vérité pour ProfileAvatarForm (plus de fallback DB implicite)
 * 1.2.0 (2026-01-27)
 * - [NEW] Intégration ProfileAvatarForm (UI-only) + props avatar_* (source de vérité = page)
 * - [SAFE] Aucune requête, aucune mutation : setters uniquement
 * 1.1.0 (2026-01-27)
 * - [FIX] handle utilisé comme source de vérité pour ProfileHandleForm (plus d’unused-vars, UI cohérente)
 * 1.0.0 (2026-01-26)
 * - [NEW] Composant ProfileSettings (UI-only) + intégration ProfileHandleForm
 * =============================================================================
 */

'use client';

import Link from 'next/link';
import ProfileHandleForm from '@/components/settings/ProfileHandleForm';
import ProfileAvatarForm from '@/components/settings/ProfileAvatarForm';
import AccountDataSection from '@/components/settings/AccountDataSection';

export type IdentityMode = 'real' | 'symbolic' | 'anonymous';
export type Theme = 'system' | 'light' | 'dark';
export type Visibility = 'world' | 'local' | 'private' | 'semi_anonymous';

export type AvatarType = 'image' | 'symbol' | 'color' | 'constellation';

export type ProfileSettingsProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: IdentityMode;
  public_profile_enabled: boolean;
};

export type ProfileSettingsUserSettings = {
  user_id: string;
  default_echo_visibility: Visibility;
  default_anonymous: boolean;
  allow_responses: boolean;
  allow_mirrors: boolean;
  notifications_soft: boolean;
  theme: Theme;

  // FAIL-SOFT : colonnes optionnelles côté DB
  for_me_enabled?: boolean | null;
  for_me_use_likes?: boolean | null;
  for_me_use_mirrors?: boolean | null;
  for_me_include_fresh?: boolean | null;
  for_me_max_items?: number | null;
};

type LangOption = { value: string; label: string };

type Props = {
  // header / actions
  canSave: boolean;
  saving: boolean;
  onSave: () => void;

  // infos lecture (debug footer)
  loading: boolean;
  profile: ProfileSettingsProfile | null;
  settings: ProfileSettingsUserSettings | null;

  // toasts
  error: string | null;
  ok: string | null;

  // langs
  langs: LangOption[];

  // form state + setters
  handle: string;
  setHandle: (v: string) => void;

  bio: string;
  setBio: (v: string) => void;

  identityMode: IdentityMode;
  setIdentityMode: (v: IdentityMode) => void;

  langPrimary: string;
  setLangPrimary: (v: string) => void;

  // Avatar (Phase 4) — source de vérité côté page
  avatarType: AvatarType | null;
  setAvatarType: (v: AvatarType | null) => void;

  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;

  avatarSeed: string | null;
  setAvatarSeed: (v: string | null) => void;

  // privacy + prefs
  publicProfile: boolean;
  setPublicProfile: (v: boolean) => void;

  defaultVisibility: Visibility;
  setDefaultVisibility: (v: Visibility) => void;

  defaultAnonymous: boolean;
  setDefaultAnonymous: (v: boolean) => void;

  allowResponses: boolean;
  setAllowResponses: (v: boolean) => void;

  allowMirrors: boolean;
  setAllowMirrors: (v: boolean) => void;

  // experience
  theme: Theme;
  setTheme: (v: Theme) => void;

  notificationsSoft: boolean;
  setNotificationsSoft: (v: boolean) => void;

  // "Pour moi"
  forMeEnabled: boolean;
  setForMeEnabled: (v: boolean) => void;

  forMeUseLikes: boolean;
  setForMeUseLikes: (v: boolean) => void;

  forMeUseMirrors: boolean;
  setForMeUseMirrors: (v: boolean) => void;

  forMeIncludeFresh: boolean;
  setForMeIncludeFresh: (v: boolean) => void;

  forMeMaxItems: number;
  setForMeMaxItems: (v: number) => void;
};

export default function ProfileSettingsView(props: Props) {
  const {
    canSave,
    saving,
    onSave,
    loading,
    profile,
    settings,
    error,
    ok,
    langs,

    handle,
    setHandle,
    bio,
    setBio,
    identityMode,
    setIdentityMode,
    langPrimary,
    setLangPrimary,

    avatarType,
    setAvatarType,
    avatarUrl,
    setAvatarUrl,
    avatarSeed,
    setAvatarSeed,

    publicProfile,
    setPublicProfile,
    defaultVisibility,
    setDefaultVisibility,
    defaultAnonymous,
    setDefaultAnonymous,
    allowResponses,
    setAllowResponses,
    allowMirrors,
    setAllowMirrors,

    theme,
    setTheme,
    notificationsSoft,
    setNotificationsSoft,

    forMeEnabled,
    setForMeEnabled,
    forMeUseLikes,
    setForMeUseLikes,
    forMeUseMirrors,
    setForMeUseMirrors,
    forMeIncludeFresh,
    setForMeIncludeFresh,
    forMeMaxItems,
    setForMeMaxItems,
  } = props;

  return (
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
            Mon profil
          </Link>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform ${
              canSave
                ? 'bg-slate-900 text-white hover:scale-[1.01]'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
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
          <div className="md:col-span-2">
            <ProfileHandleForm
              initialHandle={handle || profile?.handle || null}
              disabled={saving}
              onCommit={(next) => setHandle(next ?? '')}
              label="Pseudo (handle)"
              hint="Visible sur ton profil public et dans les URLs : /u/[handle]."
              commitOnBlur={false}
            />
          </div>

          {/* Avatar (Phase 4) */}
          <div className="md:col-span-2">
            <ProfileAvatarForm
              disabled={saving}
              id={profile?.id ?? null}
              handle={handle.trim() ? handle.trim() : profile?.handle ?? null}
              displayName={profile?.display_name ?? null}
              initialType={avatarType ?? null}
              initialUrl={avatarUrl ?? null}
              initialSeed={avatarSeed ?? null}
              onCommit={(patch) => {
                setAvatarType(patch.avatar_type);
                setAvatarUrl(patch.avatar_url);
                setAvatarSeed(patch.avatar_seed);
              }}
            />
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
              {langs.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-slate-500">
              Utilisée par défaut pour ton expérience et tes écrans.
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
            <div className="mt-2 text-xs text-slate-500">
              Tu peux toujours choisir au moment de publier.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="text-sm font-semibold text-slate-900">Interactions</div>
            <div className="mt-3 space-y-3">
              <ToggleInline
                label="Autoriser les réponses"
                checked={allowResponses}
                onChange={setAllowResponses}
              />
              <ToggleInline
                label="Autoriser les échos miroirs"
                checked={allowMirrors}
                onChange={setAllowMirrors}
              />
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
          Ajuste la résonance : basé sur tes interactions (likes/miroirs) + sujets associés. Rien
          d’intrusif.
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
                Si “Miroirs” est désactivé ici ou dans “Interactions”, ils ne compteront pas dans le
                calcul.
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
          Note : si les colonnes “for_me_*” ne sont pas encore présentes en base, la sauvegarde
          restera OK (fallback).
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

      {/* RGPD - Données et compte */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-lg shadow-black/5">
        <AccountDataSection />
      </section>

      <div className="mt-10 text-xs text-slate-400">
        {loading ? 'Chargement…' : `Profil: ${profile ? 'ok' : 'null'} • Settings: ${settings ? 'ok' : 'null'}`}
      </div>
    </main>
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
          className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0 leading-none appearance-none transition-colors ${
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
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0 leading-none appearance-none transition-colors ${
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
