// =============================================================================
// Fichier      : app/share/page.tsx
// Auteur       : Régis KREMER (Baithz) — EchoWorld
// Version      : 3.3.0 (2026-01-22)
// Objet        : Publier un écho — Version complète avec émojis + géoloc + photos
// -----------------------------------------------------------------------------
// FIX v3.3.0
// - [NEW] Géocodage ville/pays → remplissage echoes.location en GeoJSON Point
// - [SAFE] Fallback géocodage sur pays seul si la ville est vide ou non trouvée
// - [SAFE] Emotion obligatoirement renseignée + contrôlée (type Emotion + isEmotion)
// -----------------------------------------------------------------------------
// FIX v3.2.0
// - [FIX] Émotions alignées sur la contrainte BDD echoes.emotion_check (8 valeurs autorisées)
// - [NEW] Émotion obligatoire (UI + validation + blocage du bouton publier)
// - [SAFE] Blocage publication si authLoading / userId absent (évite echoes.user_id = null)
// - [SAFE] Cleanup géoloc renforcé (AbortController + unmount)
// - [SAFE] Aucune régression UI (structure et styles conservés)
// =============================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPin, Smile, ImagePlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { uploadEchoMedia } from '@/lib/echo/uploadEchoMedia';

type Visibility = 'world' | 'local' | 'private' | 'semi_anonymous';
type Status = 'draft' | 'published' | 'archived' | 'deleted';

// GeoJSON Point pour echoes.location
type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

// IMPORTANT : aligné avec la contrainte echoes_emotion_check (BDD)
type Emotion =
  | 'joy'
  | 'hope'
  | 'love'
  | 'resilience'
  | 'gratitude'
  | 'courage'
  | 'peace'
  | 'wonder';

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
  emotion: Emotion; // obligatoire et contrôlé
  language: string | null;
  country: string | null;
  city: string | null;
  is_anonymous: boolean;
  visibility: Visibility;
  status: Status;
  location: GeoPoint | null; // ✅ NEW : GeoJSON Point [lng, lat]
};

type PgErr = { message?: string } | null;
type PgRes<T> = { data: T | null; error: PgErr };

type EchoesInsertSelectSingleLike = {
  select: (columns: string) => { single: () => Promise<PgRes<{ id: string }>> };
};

type EchoesTableLike = {
  insert: (values: EchoInsert) => EchoesInsertSelectSingleLike;
};

const EMOTIONS: Array<{ emoji: string; label: string; value: Emotion }> = [
  { emoji: '😊', label: 'Joie', value: 'joy' },
  { emoji: '🌟', label: 'Espoir', value: 'hope' },
  { emoji: '❤️', label: 'Amour', value: 'love' },
  { emoji: '💪', label: 'Résilience', value: 'resilience' },
  { emoji: '🙏', label: 'Gratitude', value: 'gratitude' },
  { emoji: '✨', label: 'Courage', value: 'courage' },
  { emoji: '🕊️', label: 'Paix', value: 'peace' },
  { emoji: '🌍', label: 'Émerveillement', value: 'wonder' },
];

function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || fallback;
  const e = err as { message?: unknown };
  if (typeof e?.message === 'string') return e.message;
  return fallback;
}

function isEmotion(value: string): value is Emotion {
  return EMOTIONS.some((e) => e.value === value);
}

// Géocodage ville/pays via Nominatim → GeoJSON Point [lng, lat]
async function geocodeCityCountry(city: string, country: string): Promise<GeoPoint | null> {
  const q = [city?.trim(), country?.trim()].filter(Boolean).join(', ');
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data?.[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      type: 'Point',
      coordinates: [lng, lat],
    };
  } catch {
    return null;
  }
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
  const [emotion, setEmotion] = useState<string>(''); // stocké en string (UI), validé avant insert
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

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const MAX_PHOTOS = 6;
  const MAX_MB = 5;

  const echoesTable = useMemo(() => {
    return (supabase.from('echoes') as unknown) as EchoesTableLike;
  }, []);

  const geoAbortRef = useRef<AbortController | null>(null);

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

    void loadAuth();

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

  // Cleanup geoloc fetch on unmount
  useEffect(() => {
    return () => {
      if (geoAbortRef.current) {
        try {
          geoAbortRef.current.abort();
        } catch {
          // noop
        } finally {
          geoAbortRef.current = null;
        }
      }
    };
  }, []);

  // Detect country via Geolocation API
  const detectCountry = async () => {
    if (geoLoading) return;

    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par votre navigateur.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    if (geoAbortRef.current) {
      geoAbortRef.current.abort();
      geoAbortRef.current = null;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const ctrl = new AbortController();
          geoAbortRef.current = ctrl;

          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
            String(latitude)
          )}&lon=${encodeURIComponent(String(longitude))}&zoom=10&addressdetails=1`;

          const response = await fetch(url, {
            signal: ctrl.signal,
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) throw new Error('Erreur lors de la géolocalisation.');

          const data = (await response.json()) as { address?: { country?: string } };
          const detectedCountry = data.address?.country || '';

          setCountry(detectedCountry);
          setGeoLoading(false);
          geoAbortRef.current = null;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') {
            setGeoLoading(false);
            return;
          }
          setGeoError('Impossible de détecter le pays automatiquement.');
          setGeoLoading(false);
          geoAbortRef.current = null;
        }
      },
      () => {
        setGeoError('Géolocalisation refusée. Le pays ne sera pas renseigné.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  };

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

        void detectCountry();
      } catch (e) {
        if (!mounted) return;
        setError(getErrorMessage(e, 'Erreur de chargement.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Photo helpers
  const revokeAllPreviews = (urls: string[]) => {
    urls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // noop
      }
    });
  };

  const onSelectPhotos = (files: FileList | null) => {
    if (!files || saving) return;

    setError(null);
    setOk(null);

    const incoming = Array.from(files);

    const remaining = Math.max(0, MAX_PHOTOS - photos.length);
    if (remaining <= 0) {
      setError(`Maximum atteint (${MAX_PHOTOS} photos).`);
      return;
    }

    const next = incoming.slice(0, remaining);

    const nonImages = next.find((f) => !String(f.type || '').startsWith('image/'));
    if (nonImages) {
      setError('Formats acceptés : images uniquement.');
      return;
    }

    const invalid = next.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (invalid) {
      setError(`Image trop lourde : max ${MAX_MB} Mo par photo.`);
      return;
    }

    const nextPreviews = next.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...next]);
    setPhotoPreviews((prev) => [...prev, ...nextPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const url = prev[index];
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // noop
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // cleanup previews on unmount + when list changes (cleanup = revoke previous list)
  useEffect(() => {
    return () => {
      revokeAllPreviews(photoPreviews);
    };
  }, [photoPreviews]);

  const canPublish = useMemo(() => {
    const c = content.trim();
    return !authLoading && !!userId && c.length >= 20 && isEmotion(emotion);
  }, [authLoading, userId, content, emotion]);

  const submit = async () => {
    if (saving) return;

    setError(null);
    setOk(null);

    // SAFE: empêche la création d'un echo avec user_id null
    if (authLoading || !userId) {
      router.replace('/login');
      return;
    }

    const c = content.trim();
    if (c.length < 20) {
      setError('Ton écho est trop court (minimum 20 caractères).');
      return;
    }

    // Emotion réellement obligatoire (message clair)
    if (!emotion) {
      setError('Choisis une émotion pour publier.');
      return;
    }

    if (!isEmotion(emotion)) {
      setError("Choisis une émotion pour publier l'écho.");
      return;
    }

    // Géocodage ville + pays, puis fallback sur pays seul si besoin
    const geoPoint =
      (await geocodeCityCountry(city, country)) ||
      (country ? await geocodeCityCountry('', country) : null);

    const payload: EchoInsert = {
      user_id: userId,
      title: title.trim() ? title.trim() : null,
      content: c,
      emotion, // Emotion typée et validée
      language: language.trim() ? language.trim() : null,
      country: country.trim() ? country.trim() : null,
      city: city.trim() ? city.trim() : null,
      is_anonymous: !!isAnonymous,
      visibility,
      status,
      location: geoPoint,
    };

    setSaving(true);
    try {
      const res = await echoesTable.insert(payload).select('id').single();
      if (res.error) throw res.error;

      const echoId = res.data?.id ?? null;
      if (!echoId) throw new Error('Écho créé, mais identifiant introuvable.');

      await uploadEchoMedia(echoId, photos);

      setOk(status === 'draft' ? 'Brouillon enregistré.' : 'Écho publié.');

      setTitle('');
      setContent('');
      setEmotion('');
      setCity('');

      revokeAllPreviews(photoPreviews);
      setPhotos([]);
      setPhotoPreviews([]);

      if (status !== 'draft') {
        router.push(`/explore?focus=${encodeURIComponent(echoId)}`);
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Erreur lors de la publication.'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <div className="h-10 w-64 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
        <div className="mt-6 h-72 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
      </main>
    );
  }

  const selectedEmotion = isEmotion(emotion) ? EMOTIONS.find((e) => e.value === emotion) ?? null : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Partager un écho</h1>
          <p className="mt-2 text-slate-600">Une histoire courte. Un point sur la carte. Un souffle humain.</p>
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

        {/* Emotion selector (obligatoire) */}
        <div className="mt-6">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Smile className="h-4 w-4" />
            Émotion <span className="text-xs font-medium text-rose-600">(obligatoire)</span>
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

          {!isEmotion(emotion) && (
            <div className="mt-2 text-xs text-slate-500">Choisis une émotion pour activer le bouton “Publier”.</div>
          )}
        </div>

        {/* Photos */}
        <div className="mt-6">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ImagePlus className="h-4 w-4" />
            Photos (optionnel)
            <span className="text-xs font-medium text-slate-500">
              — {photos.length}/{MAX_PHOTOS} • max {MAX_MB}Mo/photo
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 ${
                saving || photos.length >= MAX_PHOTOS ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              Ajouter
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onSelectPhotos(e.target.files)}
              />
            </label>

            {photos.length > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  revokeAllPreviews(photoPreviews);
                  setPhotos([]);
                  setPhotoPreviews([]);
                }}
                className={`rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 ${
                  saving ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                Tout retirer
              </button>
            )}
          </div>

          {photoPreviews.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photoPreviews.map((src, i) => (
                <div key={src} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="relative aspect-square">
                    <Image
                      src={src}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    disabled={saving}
                    className={`absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-black/70 p-2 text-white transition hover:bg-black ${
                      saving ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                    aria-label="Supprimer la photo"
                    title="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {content.trim().length >= 20 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5">
            <div className="text-xs font-semibold text-slate-500">Aperçu</div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="whitespace-pre-wrap text-sm text-slate-900">{content.trim()}</div>

              {selectedEmotion && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                  <span className="text-lg">{selectedEmotion.emoji}</span>
                  <span>{selectedEmotion.label}</span>
                </div>
              )}

              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {photoPreviews.slice(0, 3).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                    >
                      <Image src={src} alt="" fill unoptimized className="object-cover" sizes="33vw" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 text-xs text-slate-500">
                {country ? `Pays : ${country}` : 'Pays : (non détecté)'}
                {city.trim() ? ` • Ville : ${city.trim()}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Location (auto country + manual city) */}
        <div className="mt-6">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4" />
            Localisation
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Pays (détecté automatiquement)</label>
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
              {geoError && <div className="mt-1 text-xs text-slate-500">{geoError}</div>}

              <button
                type="button"
                disabled={saving || geoLoading}
                onClick={() => void detectCountry()}
                className={`mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 ${
                  saving || geoLoading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                Relancer la détection
              </button>
            </div>

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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
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
            Défauts appliqués : visibilité <span className="font-semibold">{settings.default_echo_visibility}</span> •
            anonyme <span className="font-semibold">{settings.default_anonymous ? 'oui' : 'non'}</span>
          </div>
        )}
      </section>
    </main>
  );
}
