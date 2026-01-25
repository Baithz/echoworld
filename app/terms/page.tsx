/**
 * =============================================================================
 * Fichier      : app/terms/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-25)
 * Objet        : Page légale — Conditions d’utilisation (CGU)
 * -----------------------------------------------------------------------------
 * Description  :
 * - CGU complètes : compte, contenus, modération, DM, sécurité, responsabilités
 * - Webdesign EchoWorld : max-w-7xl, sections glass, gradients, rounded-3xl
 * - Sommaire + ancres, lisible, cohérent avec / (Home)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.1.0 (2026-01-25)
 * - [UI] Alignement design EchoWorld (largeur/couleurs/rythme/sections)
 * - [CLEAN] Suppression des notes internes (ex: “Point bloquant…”)
 * - [KEEP] Contenu légal complet + structure par ancres
 * =============================================================================
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Conditions d’utilisation — EchoWorld",
  description: "Conditions d’utilisation (CGU) de la plateforme EchoWorld.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '25 janvier 2026';

const sections = [
  { id: 'overview', label: '1. Présentation' },
  { id: 'eligibility', label: '2. Éligibilité & âge minimum' },
  { id: 'account', label: '3. Compte & sécurité' },
  { id: 'service', label: '4. Service & disponibilité' },
  { id: 'content', label: '5. Contenus, licences & droits' },
  { id: 'conduct', label: '6. Règles de conduite' },
  { id: 'moderation', label: '7. Modération & signalements' },
  { id: 'dm', label: '8. Messagerie & interactions' },
  { id: 'thirdparty', label: '9. Services tiers' },
  { id: 'termination', label: '10. Suspension & résiliation' },
  { id: 'liability', label: '11. Responsabilités & garanties' },
  { id: 'ip', label: '12. Propriété intellectuelle' },
  { id: 'law', label: '13. Droit applicable & litiges' },
  { id: 'changes', label: '14. Modifications' },
  { id: 'contact', label: '15. Contact' },
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
      className="scroll-mt-28 relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/25 via-slate-950/50 to-sky-950/25 px-6 py-8 backdrop-blur-sm md:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.10),transparent_70%)]" />
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

export default function TermsPage() {
  return (
    <main className="relative">
      {/* Hero (aligné Home : max-w-7xl px-6 pt-32 pb-16) */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-12 md:pt-36 md:pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/40 via-slate-950/60 to-sky-950/40 px-8 py-12 backdrop-blur-sm md:px-12 md:py-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.14),transparent_70%)]" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Juridique</Pill>
              <Pill>CGU</Pill>
              <Pill>Mis à jour : {LAST_UPDATED}</Pill>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
              Conditions d’utilisation
            </h1>

            <p className="mt-4 max-w-3xl text-base text-slate-300">
              Les présentes Conditions d’utilisation (« CGU ») encadrent l’accès et l’usage d’EchoWorld.
              En créant un compte ou en utilisant la plateforme, vous acceptez ces CGU.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Politique de confidentialité
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

      {/* Corps (aligné Home : max-w-7xl px-6 pb-32) */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* Sommaire */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div
              id="toc"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-violet-950/20 via-slate-950/45 to-sky-950/20 p-6 backdrop-blur-sm"
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.10),transparent_70%)]" />
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
                    <Link href="/privacy" className="block hover:text-white">
                      Politique de confidentialité
                    </Link>
                    <Link href="/explore" className="block hover:text-white">
                      Explorer
                    </Link>
                    <Link href="/share" className="block hover:text-white">
                      Publier un écho
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Contenu */}
          <article className="space-y-8">
            <Card id="overview" title="1. Présentation">
              <p>
                EchoWorld est une plateforme permettant de publier, consulter et interagir avec des contenus (« Échos »)
                incluant du texte, des émotions, et, selon les cas, des médias. La plateforme peut proposer des réglages
                de visibilité (public, local, privé, semi-anonyme).
              </p>
              <p>
                Les termes « vous » / « utilisateur » désignent toute personne utilisant EchoWorld. Les termes « EchoWorld »
                / « nous » désignent l’opérateur du service.
              </p>
            </Card>

            <Card id="eligibility" title="2. Éligibilité & âge minimum">
              <List>
                <li>Vous devez respecter l’âge minimum légal applicable dans votre pays pour créer un compte.</li>
                <li>Si un consentement parental est requis, vous vous engagez à l’obtenir avant utilisation.</li>
                <li>Vous certifiez que les informations fournies lors de l’inscription sont exactes.</li>
              </List>
            </Card>

            <Card id="account" title="3. Compte & sécurité">
              <List>
                <li>Vous êtes responsable de la confidentialité de vos identifiants et de toute activité sur votre compte.</li>
                <li>Vous devez nous notifier sans délai en cas d’accès non autorisé ou de compromission.</li>
                <li>Vous ne devez pas contourner les protections ni tenter d’accéder à des données qui ne vous appartiennent pas.</li>
              </List>
            </Card>

            <Card id="service" title="4. Service & disponibilité">
              <p>
                EchoWorld est fourni « en l’état » et peut évoluer. Nous faisons nos meilleurs efforts pour assurer une
                disponibilité stable, sans garantir l’absence d’interruptions, d’erreurs, ou de maintenance.
              </p>
              <p>
                Nous pouvons modifier, suspendre ou interrompre tout ou partie du service pour des raisons techniques,
                de sécurité, de conformité, ou d’évolution du produit.
              </p>
            </Card>

            <Card id="content" title="5. Contenus, licences & droits">
              <p>
                Vous conservez vos droits sur les contenus que vous publiez. Vous déclarez disposer de tous les droits
                nécessaires (droits d’auteur, droits à l’image, autorisations de tiers) pour publier et partager ces contenus.
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
                <div className="text-sm font-bold text-white">Licence accordée à EchoWorld</div>
                <p className="mt-2">
                  Afin d’opérer la plateforme (hébergement, affichage, distribution selon vos paramètres, sauvegarde,
                  prévention des abus, modération), vous accordez à EchoWorld une licence non exclusive, mondiale et gratuite,
                  permettant de stocker, reproduire, afficher, distribuer et adapter techniquement vos contenus, uniquement
                  dans le cadre du fonctionnement d’EchoWorld.
                </p>
              </div>

              <p className="mt-4">
                La suppression d’un contenu entraîne sa suppression/indisponibilité sur la plateforme, sous réserve de copies
                résiduelles temporaires (cache/sauvegardes/logs) nécessaires à la sécurité ou à la continuité technique,
                et des obligations légales applicables.
              </p>
            </Card>

            <Card id="conduct" title="6. Règles de conduite">
              <p>Vous vous engagez à ne pas :</p>
              <List>
                <li>harceler, menacer, humilier ou cibler une personne (y compris publication d’informations personnelles) ;</li>
                <li>publier des contenus haineux, discriminatoires, ou incitant à la violence ;</li>
                <li>partager des contenus illégaux, frauduleux, trompeurs, ou portant atteinte aux droits de tiers ;</li>
                <li>diffuser du spam, manipuler artificiellement les interactions, ou automatiser abusivement l’usage ;</li>
                <li>tenter de compromettre la sécurité, l’intégrité ou la disponibilité de la plateforme ;</li>
                <li>publier des contenus à caractère sexuel impliquant des mineurs (tolérance zéro).</li>
              </List>
            </Card>

            <Card id="moderation" title="7. Modération & signalements">
              <p>
                EchoWorld peut mettre en place une modération afin de protéger la communauté et de respecter la loi.
                La modération peut inclure : réduction de visibilité, suppression, avertissements, limitation de compte,
                suspension ou fermeture.
              </p>
              <p>
                Lorsque disponible, vous pouvez signaler un contenu ou un compte. Nous pouvons conserver certaines données
                nécessaires à la sécurité, au traitement des abus et aux obligations légales.
              </p>
            </Card>

            <Card id="dm" title="8. Messagerie & interactions">
              <p>
                EchoWorld peut proposer des échanges privés. Vous êtes responsable de vos interactions. N’envoyez pas
                d’informations sensibles si vous ne le souhaitez pas. Des mesures anti-abus peuvent être appliquées
                (limites, détection, signalements).
              </p>
            </Card>

            <Card id="thirdparty" title="9. Services tiers">
              <p>
                EchoWorld peut s’appuyer sur des services tiers (hébergement, stockage, envoi d’emails, monitoring).
                Ces prestataires interviennent uniquement pour opérer la plateforme, conformément à notre{' '}
                <Link href="/privacy" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white/60">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </Card>

            <Card id="termination" title="10. Suspension & résiliation">
              <p>
                Vous pouvez cesser d’utiliser EchoWorld à tout moment. EchoWorld peut suspendre ou résilier l’accès en cas
                de violation des CGU, de risque de sécurité, d’abus répétés, ou d’exigences légales.
              </p>
              <p>
                En cas de résiliation, certaines données peuvent être conservées pour des raisons légales ou de sécurité,
                dans la mesure permise par la loi applicable.
              </p>
            </Card>

            <Card id="liability" title="11. Responsabilités & garanties">
              <p>
                Dans la mesure permise par la loi, EchoWorld exclut les garanties implicites (adéquation, non-contrefaçon,
                disponibilité) et ne peut être tenu responsable des dommages indirects. EchoWorld n’est pas responsable
                des contenus publiés par les utilisateurs.
              </p>
              <p>
                Certaines juridictions n’autorisent pas certaines exclusions/limitations : elles s’appliquent alors dans
                les limites permises par la loi locale.
              </p>
            </Card>

            <Card id="ip" title="12. Propriété intellectuelle">
              <p>
                EchoWorld, ses marques, logos, interfaces et designs (hors contenus utilisateurs) sont protégés par les lois
                applicables. Toute reproduction ou exploitation non autorisée est interdite.
              </p>
            </Card>

            <Card id="law" title="13. Droit applicable & litiges">
              <p>
                Ces CGU s’appliquent sous réserve des droits impératifs de votre pays de résidence. En cas de litige, une
                résolution amiable sera recherchée en priorité, lorsque cela est approprié.
              </p>
            </Card>

            <Card id="changes" title="14. Modifications">
              <p>
                EchoWorld peut mettre à jour ces CGU pour refléter l’évolution du service, de la sécurité ou des exigences
                légales. En cas de changement substantiel, une information sera affichée sur la plateforme et/ou une
                acceptation pourra être requise.
              </p>
            </Card>

            <Card id="contact" title="15. Contact">
              <p>
                Pour toute question concernant ces CGU, contactez-nous via les canaux de support disponibles dans EchoWorld.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Politique de confidentialité
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Explorer
                </Link>
              </div>
            </Card>
          </article>
        </div>
      </section>
    </main>
  );
}
