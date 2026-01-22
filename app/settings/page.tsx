/**
 * =============================================================================
 * Fichier      : app/share/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-22)
 * Objet        : Publier un écho — Version complète avec émojis + géoloc
 * -----------------------------------------------------------------------------
 * Description  :
 * - Header navigation intégré
 * - Guard auth (redirige /login)
 * - Charge profiles + user_settings (défauts)
 * - Sélecteur émojis pour émotions (sync avec PulseHeart)
 * - Géolocalisation automatique (supprime champ Pays)
 * - Ville optionnelle
 * - Insert echoes avec refresh globe automatique
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-22)
 * - [NEW] Header navigation intégré (consistance UI)
 * - [NEW] Sélecteur émojis pour émotions (6 émotions principales)
 * - [NEW] Géolocalisation automatique (détection pays)
 * - [REMOVED] Champ Pays manuel (remplacé par géoloc auto)
 * - [FIX] Max-width harmonisé (max-w-6xl) + padding-top pour sticky header
 * - [IMPROVED] Design moderne : transitions, hover states
 * =============================================================================
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Smile } from 'lucide-react';
import Header from '@/components/layout/Header';
import { supabase } from '@/lib/supabase/client';

type Visibility = 'world' | 'local' | 'private' | 'semi_anonymous';
type Status = 'draft' | 'published' | 'archived' | 'deleted';

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  identity_mode: 'real' | 'symbolic' | 'anonymous';
  avatar_type: 'image' | 'symbol' | 'color' | 'constellation';
  avatar_url: string | null;
  avatar_seed: string | null;
  lang_primary: string;
};

type UserSettingsRow = {
  user_id: string;
  public_profile_enabled: boolean;
  default_echo_visibility: Visibility;
  default_anonymous: boolean;
  allow_responses: boolean;
  allow_mirrors: boolean;
  notifications_soft: boolean;
  theme: 'system' | 'light' | 'dark';
};

type EchoInsert = {
  user_id: string;
  title: string | null;
  content: string;
  emotion: string | null;
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean;
  visibility: Visibility;
  status: Status;
};

type PostgrestErrorLike = { message?: string } | null;
type InsertResultLike = { data: unknown; error: PostgrestErrorLike };

type EchoesTableLike = {
  insert: (values: unknown) => Promise<InsertResultLike>;
};

// Émotions principales - Spectre complet (positives + négatives)
const EMOTIONS = [
  // Positives
  { emoji: '😊', label: 'Joie', value: 'joy' },
  { emoji: '🌟', label: 'Espoir', value: 'hope' },
  { emoji: '❤️', label: 'Amour', value: 'love' },
  { emoji: '💪', label: 'Résilience', value: 'resilience' },
  { emoji: '🙏', label: 'Gratitude', value: 'gratitude' },
  { emoji: '✨', label: 'Courage', value: 'courage' },
  
  // Négatives/Difficiles
  { emoji: '😢', label: 'Tristesse', value: 'sadness' },
  { emoji: '😰', label: 'Anxiété', value: 'anxiety' },
  { emoji: '😔', label: 'Solitude', value: 'loneliness' },
  { emoji: '😞', label: 'Mélancolie', value: 'melancholy' },
  { emoji: '😨', label: 'Peur', value: 'fear' },
  { emoji: '😤', label: 'Frustration', value: 'frustration' },
  { emoji: '😣', label: 'Douleur', value: 'pain' },
  { emoji: '😶', label: 'Vide', value: 'emptiness' },
];

function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || fallback;
  const e = err as { message?: unknown };
  if (typeof e?.message === 'string') return e.message;
  return fallback;
}

export default function SharePage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<string>('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const [visibility, setVisibility] = useState<Visibility>('world');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>('published');
  const [language, setLanguage] = useState<string>('en');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Geolocation
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const echoesTable = useMemo(() => {
    return (supabase.from('echoes') as unknown) as EchoesTableLike;
  }, []);

  // Auth guard
  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
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

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      if (!u) router.replace('/login');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  // Load profile + user_settings + auto-geoloc
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const [pRes, sRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase
            .from('user_settings')
            .select(
              'user_id,public_profile_enabled,default_echo_visibility,default_anonymous,allow_responses,allow_mirrors,notifications_soft,theme'
            )
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        const nextProfile = (pRes.data as ProfileRow | null) ?? null;
        const nextSettings = (sRes.data as UserSettingsRow | null) ?? null;

        setProfile(nextProfile);
        setSettings(nextSettings);

        setVisibility(nextSettings?.default_echo_visibility ?? 'world');
        setIsAnonymous(nextSettings?.default_anonymous ?? false);
        setLanguage(nextProfile?.lang_primary ?? 'en');

        // Auto-detect country via geolocation
        detectCountry();
      } catch (e) {
        if (!mounted) return;
        setError(getErrorMessage(e, 'Erreur de chargement.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Detect country via Geolocation API
  const detectCountry = async () => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par votre navigateur.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Reverse geocoding via API (exemple: Nominatim OpenStreetMap)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'EchoWorld/1.0',
              },
            }
          );

          if (!response.ok) throw new Error('Erreur lors de la géolocalisation.');

          const data = await response.json();
          const detectedCountry = data.address?.country || '';

          setCountry(detectedCountry);
          setGeoLoading(false);
        } catch {
          setGeoError('Impossible de détecter le pays automatiquement.');
          setGeoLoading(false);
        }
      },
      () => {
        setGeoError('Géolocalisation refusée. Le pays ne sera pas renseigné.');
        setGeoLoading(false);
      }
    );
  };

  const canPublish = useMemo(() => {
    const c = content.trim();
    return !!userId && c.length >= 20;
  }, [userId, content]);

  const submit = async () => {
    setError(null);
    setOk(null);

    if (!userId) {
      router.push('/login');
      return;
    }

    const c = content.trim();
    if (c.length < 20) {
      setError('Ton écho est trop court (minimum 20 caractères).');
      return;
    }

    const payload: EchoInsert = {
      user_id: userId,
      title: title.trim() ? title.trim() : null,
      content: c,
      emotion: emotion ? emotion : null,
      language: language.trim() ? language.trim() : null,
      country: country.trim() ? country.trim() : null,
      city: city.trim() ? city.trim() : null,
      is_anonymous: !!isAnonymous,
      visibility,
      status,
    };

    setSaving(true);
    try {
      const res = await echoesTable.insert(payload);
      if (res.error) throw res.error;

      setOk(status === 'draft' ? 'Brouillon enregistré.' : 'Écho publié.');
      setTitle('');
      setContent('');
      setEmotion('');
      setCity('');

      // Redirect to account after successful publish
      if (status !== 'draft') {
        setTimeout(() => router.push('/account'), 1500);
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Erreur lors de la publication.'));
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
          <div className="mt-6 h-72 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
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
            <h1 className="text-3xl font-bold text-slate-900">Partager un écho</h1>
            <p className="mt-2 text-slate-600">
              Une histoire courte. Un point sur la carte. Un souffle humain.
            </p>
          </div>

          <Link
            href="/account"
            className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Mon espace
          </Link>
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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur-md shadow-lg shadow-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              {loading ? 'Chargement…' : profile?.handle || profile?.display_name || 'Ton écho'}
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                aria-label="Statut"
                disabled={saving}
              >
                <option value="published">Publier</option>
                <option value="draft">Brouillon</option>
              </select>

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                aria-label="Visibilité"
                disabled={saving}
              >
                <option value="world">Monde</option>
                <option value="local">Local</option>
                <option value="semi_anonymous">Semi-anonyme</option>
                <option value="private">Privé</option>
              </select>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                aria-label="Langue"
                disabled={saving}
              >
                <option value="en">en</option>
                <option value="fr">fr</option>
                <option value="es">es</option>
                <option value="de">de</option>
                <option value="it">it</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-900" htmlFor="title">
              Titre (optionnel)
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              maxLength={120}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Une phrase qui ouvre…"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-900" htmlFor="content">
              Ton écho
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
              rows={7}
              maxLength={2200}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Reste simple. Reste vrai. 5–15 lignes suffisent."
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Minimum conseillé : 20 caractères</span>
              <span>{content.length}/2200</span>
            </div>
          </div>

          {/* Emotion selector (emojis) */}
          <div className="mt-6">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Smile className="h-4 w-4" />
              Émotion (optionnel)
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEmotion(emotion === e.value ? '' : e.value)}
                  disabled={saving}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    emotion === e.value
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-md'
                  } ${saving ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="text-lg">{e.emoji}</span>
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location (auto country + manual city) */}
          <div className="mt-6">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4" />
              Localisation
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Country (auto-detected, read-only) */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Pays (détecté automatiquement)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={country}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    placeholder={geoLoading ? 'Détection en cours…' : 'Non détecté'}
                  />
                  {geoLoading && (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  )}
                </div>
                {geoError && (
                  <div className="mt-1 text-xs text-slate-500">{geoError}</div>
                )}
              </div>

              {/* City (manual, optional) */}
              <div>
                <label className="text-xs font-medium text-slate-600" htmlFor="city">
                  Ville (optionnel)
                </label>
                <input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={saving}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Nancy, Paris, Berlin…"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300"
              />
              Publier en anonyme (soft)
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={!canPublish || saving}
              className={`rounded-xl px-5 py-2 text-sm font-semibold shadow-lg transition-transform ${
                canPublish && !saving
                  ? 'bg-slate-900 text-white hover:scale-[1.01]'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Envoi…' : status === 'draft' ? 'Enregistrer' : 'Publier'}
            </button>
          </div>

          {settings && (
            <div className="mt-4 text-xs text-slate-500">
              Défauts appliqués : visibilité{' '}
              <span className="font-semibold">{settings.default_echo_visibility}</span> • anonyme{' '}
              <span className="font-semibold">{settings.default_anonymous ? 'oui' : 'non'}</span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}