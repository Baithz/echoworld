/**
 * =============================================================================
 * Fichier      : app/privacy/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-25)
 * Objet        : Page légale — Politique de confidentialité
 * -----------------------------------------------------------------------------
 * Description  :
 * - Politique globale : RGPD-ready + standards internationaux (transferts, droits, sécurité)
 * - Webdesign EchoWorld : max-w-7xl, sections glass, gradients, rounded-3xl
 * - Sommaire + ancres, lisible, cohérent avec / (Home)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-25)
 * - [UI] Alignement design EchoWorld (largeur/couleurs/rythme/sections)
 * - [CLEAN] Suppression des notes internes (ex: “Point bloquant…”)
 * - [KEEP] Politique complète : finalités, bases légales, droits, transferts, cookies
 * =============================================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — EchoWorld',
  description: 'Politique de confidentialité et protection des données personnelles sur EchoWorld.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '25 janvier 2026';

const sections = [
  { id: 'scope', label: '1. Champ d’application' },
  { id: 'controller', label: '2. Responsable du traitement' },
  { id: 'data', label: '3. Données collectées' },
  { id: 'purposes', label: '4. Finalités & bases légales' },
  { id: 'sharing', label: '5. Partage des données' },
  { id: 'transfers', label: '6. Transferts internationaux' },
  { id: 'retention', label: '7. Conservation' },
  { id: 'security', label: '8. Sécurité' },
  { id: 'rights', label: '9. Vos droits' },
  { id: 'children', label: '10. Mineurs' },
  { id: 'cookies', label: '11. Cookies & traceurs' },
  { id: 'changes', label: '12. Modifications' },
  { id: 'contact', label: '13. Contact' },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
      {children}
    </span>
  );
}

function Card({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-950/18 via-slate-950/50 to-cyan-950/18 px-6 py-8 backdrop-blur-sm md:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10">
        <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300 md:text-base">
          {children}
        </div>
      </div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-slate-300">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <main className="relative">
      {/* Hero (aligné Home) */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-12 md:pt-36 md:pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-950/30 via-slate-950/60 to-cyan-950/30 px-8 py-12 backdrop-blur-sm md:px-12 md:py-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.13),transparent_70%)]" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Juridique</Pill>
              <Pill>Confidentialité</Pill>
              <Pill>Mis à jour : {LAST_UPDATED}</Pill>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
              Politique de confidentialité
            </h1>

            <p className="mt-4 max-w-3xl text-base text-slate-300">
              Cette politique explique quelles données EchoWorld traite, pourquoi, comment elles sont protégées,
              et quels sont vos droits.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/terms"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Conditions d’utilisation
              </Link>

              <a
                href="#toc"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Lire le sommaire
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Corps (aligné Home) */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Sommaire */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div
              id="toc"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-950/16 via-slate-950/45 to-cyan-950/16 p-6 backdrop-blur-sm"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.10),transparent_70%)]" />
              </div>

              <div className="relative z-10">
                <div className="text-sm font-bold text-white">Sommaire</div>

                <nav className="mt-4 space-y-1.5">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block rounded-2xl px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {s.label}
                    </a>
                  ))}
                </nav>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  <div className="font-semibold text-white/90">Liens utiles</div>
                  <div className="mt-2 space-y-2">
                    <Link href="/terms" className="block hover:text-white">
                      Conditions d’utilisation
                    </Link>
                    <Link href="/account" className="block hover:text-white">
                      Mon compte
                    </Link>
                    <Link href="/settings" className="block hover:text-white">
                      Paramètres
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Contenu */}
          <article className="space-y-8">
            <Card id="scope" title="1. Champ d’application">
              <p>
                Cette politique s’applique à l’utilisation d’EchoWorld (site web et fonctionnalités), incluant
                l’authentification, la publication d’Échos, les interactions (réactions, réponses), et la messagerie
                lorsqu’elle est disponible.
              </p>
            </Card>

            <Card id="controller" title="2. Responsable du traitement">
              <p>
                EchoWorld traite les données nécessaires au fonctionnement de la plateforme. Les demandes liées à la
                confidentialité peuvent être adressées via les canaux de support disponibles dans EchoWorld.
              </p>
            </Card>

            <Card id="data" title="3. Données collectées">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-bold text-white">Données fournies par vous</div>
                  <div className="mt-2 text-slate-300">
                    <List>
                      <li>Compte : email, identifiants, éventuellement pseudo/handle.</li>
                      <li>Profil : avatar, bio, préférences, paramètres de visibilité.</li>
                      <li>Contenus : Échos (texte), médias (images), réactions/réponses/messages.</li>
                      <li>Support/signalements : informations transmises lors d’une demande ou d’un signalement.</li>
                    </List>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-bold text-white">Données techniques</div>
                  <div className="mt-2 text-slate-300">
                    <List>
                      <li>Journaux de sécurité et diagnostics (ex. IP, user-agent, horodatages, événements).</li>
                      <li>Données d’usage nécessaires à la qualité et à la sécurité du service.</li>
                      <li>Cookies/traceurs strictement nécessaires (voir section 11).</li>
                    </List>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-bold text-white">Localisation</div>
                  <p className="mt-2 text-slate-300">
                    EchoWorld peut traiter une localisation si vous associez un Écho à un lieu ou activez une
                    fonctionnalité de géolocalisation. Vous pouvez refuser la géolocalisation via les réglages
                    de votre navigateur/appareil.
                  </p>
                </div>
              </div>
            </Card>

            <Card id="purposes" title="4. Finalités & bases légales">
              <p>EchoWorld traite les données pour :</p>
              <List>
                <li>fournir le service (authentification, publication, affichage, interactions, messagerie) ;</li>
                <li>assurer la sécurité et prévenir les abus (fraude, spam, comportements malveillants) ;</li>
                <li>améliorer le service et fournir le support ;</li>
                <li>respecter des obligations légales applicables.</li>
              </List>

              <p className="mt-4">
                Les bases légales varient selon les juridictions et peuvent inclure : exécution du contrat (fourniture
                du service), intérêt légitime (sécurité/qualité), consentement (lorsque requis), et obligations légales.
              </p>
            </Card>

            <Card id="sharing" title="5. Partage des données">
              <p>EchoWorld ne vend pas vos données personnelles. Elles peuvent être partagées avec :</p>
              <List>
                <li>des prestataires techniques (hébergement, stockage, email, monitoring) agissant sur instruction ;</li>
                <li>les autres utilisateurs, selon vos paramètres de visibilité (profil/échos/interactions) ;</li>
                <li>les autorités compétentes lorsque la loi l’exige.</li>
              </List>
            </Card>

            <Card id="transfers" title="6. Transferts internationaux">
              <p>
                EchoWorld peut traiter des données via des infrastructures situées dans différents pays. Lorsque la loi
                l’exige, des garanties appropriées sont appliquées (clauses contractuelles, mesures de sécurité,
                minimisation), afin d’assurer un niveau de protection adéquat.
              </p>
            </Card>

            <Card id="retention" title="7. Conservation">
              <List>
                <li>Compte : tant que le compte est actif.</li>
                <li>Contenus : jusqu’à suppression par vous, sous réserve de contraintes légales/techniques.</li>
                <li>Journaux de sécurité : durées limitées, puis suppression/agrégation lorsque possible.</li>
                <li>Obligations légales : conservation plus longue si la loi l’exige.</li>
              </List>
            </Card>

            <Card id="security" title="8. Sécurité">
              <p>
                EchoWorld met en place des mesures techniques et organisationnelles raisonnables (contrôles d’accès,
                chiffrement en transit, durcissement, surveillance). Vous devez également protéger vos identifiants.
              </p>
            </Card>

            <Card id="rights" title="9. Vos droits">
              <p>
                Selon la loi applicable (ex. RGPD, lois locales équivalentes), vous pouvez disposer de droits tels que :
                accès, rectification, suppression, opposition, limitation, portabilité, et retrait du consentement lorsqu’il
                s’applique.
              </p>
              <p className="mt-3">
                Pour exercer vos droits, utilisez les canaux de support disponibles dans EchoWorld. Une vérification
                d’identité raisonnable peut être demandée afin de protéger vos données.
              </p>
            </Card>

            <Card id="children" title="10. Mineurs">
              <p>
                EchoWorld n’est pas destiné aux enfants en dessous de l’âge minimum légal applicable dans leur pays.
                En cas de non-respect, des mesures peuvent être prises (restriction, suppression, demandes de consentement
                lorsque requis).
              </p>
            </Card>

            <Card id="cookies" title="11. Cookies & traceurs">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-bold text-white">Cookies nécessaires</div>
                <p className="mt-2 text-slate-300">
                  Cookies indispensables au fonctionnement : authentification, sécurité, préférences essentielles, prévention
                  des abus. Ils sont requis pour fournir le service.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-bold text-white">Cookies optionnels</div>
                <p className="mt-2 text-slate-300">
                  Si EchoWorld utilise des cookies optionnels (ex. mesure d’audience), ils seront soumis au consentement
                  lorsque la loi l’exige, via une gestion des préférences.
                </p>
              </div>
            </Card>

            <Card id="changes" title="12. Modifications">
              <p>
                EchoWorld peut mettre à jour cette politique pour refléter l’évolution du service, de la sécurité ou des
                exigences légales. En cas de changement substantiel, une information sera affichée sur la plateforme et/ou
                une acceptation pourra être requise lorsque nécessaire.
              </p>
            </Card>

            <Card id="contact" title="13. Contact">
              <p>
                Pour toute question relative à la confidentialité ou aux données personnelles, contactez-nous via les canaux
                de support disponibles dans EchoWorld.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/terms"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Conditions d’utilisation
                </Link>
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Mon compte
                </Link>
              </div>
            </Card>
          </article>
        </div>
      </section>
    </main>
  );
}
