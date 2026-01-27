/**
 * =============================================================================
 * Fichier      : components/settings/AccountDataSection.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-27)
 * Objet        : Section "Données et compte" — Export RGPD + Suppression compte
 * -----------------------------------------------------------------------------
 * Description  :
 * - Bouton "Exporter mes données" → appel GET /api/account/export (download ZIP)
 * - Bouton "Supprimer mon compte" → modal confirmation + vérif password → POST /api/account/delete
 * - UX claire : messages succès/erreur, loading states, modals de confirmation
 * - SAFE : double confirmation pour suppression (modal + mot de passe)
 * - DESIGN : aligné sur le glassmorphism EchoWorld (slate-200, white/70, backdrop-blur)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-27)
 * - [IMPROVED] Design aligné sur ProfileSettings (slate-200, glassmorphism, subtle colors)
 * - [IMPROVED] Icônes Download/Trash2 + style cohérent avec le reste
 * - [IMPROVED] Modal avec glassmorphism + fond backdrop-blur
 * 1.0.0 (2026-01-27)
 * - [NEW] Export données RGPD (ZIP download)
 * - [NEW] Suppression compte (soft delete + double confirmation)
 * - [SAFE] Messages UX clairs + loading states
 * =============================================================================
 */

'use client';

import { useState } from 'react';
import { Download, Trash2, AlertTriangle, X } from 'lucide-react';

export default function AccountDataSection() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Export données
  // --------------------------------------------------------------------------
  const handleExport = async () => {
    setExportLoading(true);
    setExportError(null);

    try {
      const res = await fetch('/api/account/export', { method: 'GET' });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'EXPORT_FAILED');
      }

      // Download ZIP
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echoworld-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('[Export error]', err);
      setExportError(err instanceof Error ? err.message : 'EXPORT_FAILED');
    } finally {
      setExportLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Suppression compte
  // --------------------------------------------------------------------------
  const handleDelete = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('PASSWORD_REQUIRED');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'DELETE_FAILED');
      }

      // Succès : redirect vers home (l'utilisateur est déjà sign out par l'API)
      window.location.href = '/';
    } catch (err: unknown) {
      console.error('[Delete error]', err);
      const errMsg = err instanceof Error ? err.message : 'DELETE_FAILED';

      if (errMsg === 'INVALID_PASSWORD') {
        setDeleteError('Mot de passe incorrect');
      } else {
        setDeleteError('Erreur lors de la suppression');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* Export données */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-600" />
              Exporter mes données
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Télécharge une archive ZIP de tes données (profil, echoes, messages).
            </div>
          </div>
        </div>

        {exportError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Erreur : {exportError}
          </div>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? 'Génération en cours…' : 'Télécharger'}
        </button>
      </div>

      {/* Suppression compte */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Supprimer mon compte
            </div>
            <div className="mt-1 text-xs text-rose-700/80">
              Action irréversible. Conservation 30j puis suppression définitive.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Supprimer mon compte
        </button>
      </div>

      {/* Modal confirmation suppression */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative rounded-3xl border border-slate-200 bg-white/90 backdrop-blur-xl p-6 max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Supprimer le compte
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-900">
                ⚠️ Cette action est <strong>irréversible</strong>. Tes données seront supprimées 
                définitivement après 30 jours.
              </p>
            </div>

            {/* Password input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Confirme avec ton mot de passe
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Ton mot de passe"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-300"
              />
            </div>

            {deleteError && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || !deletePassword.trim()}
                className="flex-1 rounded-xl border border-rose-300 bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}