/**
 * =============================================================================
 * Fichier      : components/settings/AccountDataSection.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Section "Données et compte" — Export RGPD + Suppression compte
 * -----------------------------------------------------------------------------
 * Description  :
 * - Bouton "Exporter mes données" → appel GET /api/account/export (download ZIP)
 * - Bouton "Supprimer mon compte" → modal confirmation + vérif password → POST /api/account/delete
 * - UX claire : messages succès/erreur, loading states, modals de confirmation
 * - SAFE : double confirmation pour suppression (modal + mot de passe)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
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
    <div className="space-y-6">
      {/* Titre section */}
      <div>
        <h2 className="text-lg font-semibold text-white/90 mb-1">Données et compte</h2>
        <p className="text-sm text-white/50">
          Exportez vos données (RGPD) ou supprimez définitivement votre compte.
        </p>
      </div>

      {/* Export données */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-medium text-white/80 mb-1">
              Exporter mes données
            </h3>
            <p className="text-xs text-white/50">
              Téléchargez une archive ZIP contenant toutes vos données (profil, messages, echoes, etc.)
            </p>
          </div>
          <Download className="w-5 h-5 text-violet-400 shrink-0" />
        </div>

        {exportError && (
          <p className="text-xs text-rose-400 mb-2">
            Erreur : {exportError}
          </p>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full py-2 px-4 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 
                     text-violet-300 font-medium text-sm transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportLoading ? 'Génération en cours...' : 'Télécharger mes données'}
        </button>
      </div>

      {/* Suppression compte */}
      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-medium text-rose-300 mb-1">
              Supprimer mon compte
            </h3>
            <p className="text-xs text-white/50">
              Action irréversible : suppression de toutes vos données après 30 jours.
            </p>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        </div>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="w-full py-2 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 
                     text-rose-300 font-medium text-sm transition-all"
        >
          Supprimer mon compte
        </button>
      </div>

      {/* Modal confirmation suppression */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Supprimer le compte
                </h3>
              </div>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-300">
                ⚠️ Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées 
                définitivement après 30 jours.
              </p>
            </div>

            {/* Password input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/70 mb-2">
                Confirmez avec votre mot de passe
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 
                           text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-rose-400 mb-3">
                {deleteError}
              </p>
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
                className="flex-1 py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 
                           text-white/70 font-medium text-sm transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || !deletePassword.trim()}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 
                           text-rose-300 font-medium text-sm transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}