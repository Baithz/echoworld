/**
 * =============================================================================
 * Fichier      : app/terms/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Page légale — Conditions d’utilisation (CGU)
 * -----------------------------------------------------------------------------
 * Description  :
 * - CGU complètes : compte, contenus, modération, DM, sécurité, responsabilités
 * - Structure lisible : sommaire + ancres
 * - Texte FR "global-ready" (avec clauses internationales + conformité locale)
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
  { id: 'changes', label: '14. Modifications des CGU' },
  { id: 'contact', label: '15. Contact' },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/90">
      {children}
    </span>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl font-semibold tracking-tight text-white">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-240 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 h-80 w-200 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>Juridique</Pill>
            <Pill>CGU</Pill>
            <Pill>Dernière mise à jour : {LAST_UPDATED}</Pill>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            Conditions d’utilisation
          </h1>

          <p className="mt-4 max-w-3xl text-sm text-white/70 md:text-base">
            Les présentes Conditions d’utilisation (« CGU ») régissent l’accès et l’usage d’EchoWorld
            (la « Plateforme »). En créant un compte ou en utilisant la Plateforme, vous acceptez ces CGU.
          </p>

          <p className="mt-4 max-w-3xl text-xs text-white/55">
            Note : EchoWorld peut être accessible depuis plusieurs pays. Certaines clauses s’appliquent « dans la
            mesure permise par la loi applicable ». En cas d’exigence locale impérative, elle prévaut.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[280px_1fr]">
          {/* TOC */}
          <aside className="md:sticky md:top-20 md:h-fit">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/90">Sommaire</div>
              <nav className="mt-3 space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/55">
                <div>
                  Voir aussi :{' '}
                  <Link href="/privacy" className="font-semibold text-violet-300 hover:text-violet-200">
                    Politique de confidentialité
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Legal body */}
          <article className="space-y-10">
            <section className="space-y-3">
              <SectionTitle id="overview">1. Présentation</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld est une plateforme sociale centrée sur le partage de récits (« Échos »), d’émotions,
                d’interactions (réactions, réponses, partages, messages) et, selon les cas, de contenus média
                (images). La Plateforme peut proposer des fonctionnalités publiques ou privées, ainsi que des
                paramètres de visibilité.
              </p>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Les termes « vous » / « utilisateur » désignent toute personne qui accède à la Plateforme. Les
                termes « EchoWorld », « nous » désignent l’éditeur/opérateur du service.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="eligibility">2. Éligibilité & âge minimum</SectionTitle>
              <ul className="list-disc space-y-2 pl-5 text-sm text-white/75 md:text-base">
                <li>
                  Vous devez avoir l’âge minimum requis par la loi de votre pays pour utiliser des services
                  en ligne et créer un compte.
                </li>
                <li>
                  Si votre pays impose un âge supérieur ou une autorisation parentale, vous vous engagez à
                  respecter ces obligations.
                </li>
                <li>
                  Vous certifiez fournir des informations exactes lors de l’inscription.
                </li>
              </ul>
              <p className="text-xs text-white/55">
                Si vous êtes mineur et que votre loi locale l’exige, vous devez obtenir l’accord d’un parent
                ou tuteur légal. En cas de doute, n’utilisez pas la Plateforme.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="account">3. Compte & sécurité</SectionTitle>
              <ul className="list-disc space-y-2 pl-5 text-sm text-white/75 md:text-base">
                <li>
                  Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée
                  via votre compte.
                </li>
                <li>
                  Vous vous engagez à nous notifier sans délai toute utilisation non autorisée de votre compte.
                </li>
                <li>
                  Vous ne devez pas contourner les protections, ni tenter d’accéder à des comptes/données qui ne
                  vous appartiennent pas.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <SectionTitle id="service">4. Service & disponibilité</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Nous faisons nos meilleurs efforts pour fournir une Plateforme stable, mais nous ne garantissons
                pas une disponibilité permanente ni l’absence d’erreurs. Nous pouvons modifier, suspendre ou
                interrompre tout ou partie du service (maintenance, sécurité, évolution produit).
              </p>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Certaines fonctionnalités peuvent être en bêta, évoluer ou être retirées sans préavis.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="content">5. Contenus, licences & droits</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Vous conservez vos droits sur les contenus que vous publiez (textes, images, informations, etc.).
                Vous déclarez disposer des droits nécessaires (y compris droits d’auteur, droits à l’image, droits
                des tiers) pour publier et partager ces contenus.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-white/90">Licence que vous accordez à EchoWorld</div>
                <p className="mt-2 text-sm leading-relaxed text-white/75 md:text-base">
                  Afin d’opérer la Plateforme (hébergement, affichage, distribution selon vos paramètres, sauvegarde,
                  prévention des abus, modération), vous nous accordez une licence non exclusive, mondiale, gratuite,
                  transférable (uniquement pour sous-traitance technique), et révocable dans la mesure permise par la loi,
                  pour utiliser, reproduire, stocker, adapter (format technique), afficher et distribuer vos contenus.
                </p>
                <p className="mt-2 text-xs text-white/55">
                  Cette licence est limitée à l’exploitation du service et au respect de vos paramètres de visibilité.
                </p>
              </div>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Vous pouvez supprimer vos contenus dans la mesure où la Plateforme offre cette fonctionnalité. Des copies
                résiduelles peuvent persister temporairement (cache, sauvegardes, logs de sécurité) pour des durées limitées.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="conduct">6. Règles de conduite</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld est un espace de partage respectueux. Vous vous engagez à ne pas :
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-white/75 md:text-base">
                <li>Harceler, menacer, humilier ou cibler une personne (y compris doxxing).</li>
                <li>Publier des contenus haineux, discriminatoires, ou incitant à la violence.</li>
                <li>Partager des contenus illégaux, trompeurs, frauduleux ou portant atteinte aux droits de tiers.</li>
                <li>Diffuser du spam, des sollicitations non désirées, ou manipuler artificiellement les interactions.</li>
                <li>Tenter d’exploiter la Plateforme (scraping abusif, contournement sécurité, attaques).</li>
                <li>Publier des contenus à caractère sexuel impliquant des mineurs (tolérance zéro).</li>
              </ul>
              <p className="text-xs text-white/55">
                Selon votre pays, des obligations légales spécifiques peuvent s’appliquer (contenus interdits, signalements,
                conservation). Vous devez aussi respecter les lois locales.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="moderation">7. Modération & signalements</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Nous pouvons modérer des contenus et comportements afin de protéger la communauté et respecter la loi.
                La modération peut inclure : réduction de visibilité, suppression, avertissements, limitation de compte,
                suspension ou fermeture.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-white/75 md:text-base">
                <li>Vous pouvez signaler un contenu ou un compte lorsque la fonctionnalité est disponible.</li>
                <li>
                  Nous pouvons conserver certaines données nécessaires à la sécurité, aux enquêtes d’abus et aux obligations
                  légales.
                </li>
                <li>
                  Nous pouvons coopérer avec les autorités lorsque requis par la loi applicable.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <SectionTitle id="dm">8. Messagerie & interactions</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                La Plateforme peut offrir des échanges privés (messages). Vous êtes responsable de vos interactions.
                N’envoyez pas d’informations sensibles si vous ne le souhaitez pas. Nous pouvons appliquer des
                mesures anti-abus (limites, détection, signalements).
              </p>
              <p className="text-xs text-white/55">
                La confidentialité des échanges dépend aussi des destinataires (captures d’écran, re-partage).
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="thirdparty">9. Services tiers</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld peut s’appuyer sur des services tiers (hébergement, analytics, CDN, authentification,
                stockage). Ces services sont soumis à leurs propres conditions. Nous sélectionnons des prestataires
                pour opérer la Plateforme et protéger les données conformément à notre{' '}
                <Link href="/privacy" className="font-semibold text-violet-300 hover:text-violet-200">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="termination">10. Suspension & résiliation</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Vous pouvez cesser d’utiliser la Plateforme à tout moment. Nous pouvons suspendre ou résilier votre accès
                en cas de violation des CGU, de risque de sécurité, d’obligations légales, ou d’abus répétés.
              </p>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                En cas de résiliation, certaines données peuvent être conservées pour des raisons légales/sécurité, et vos
                contenus publics déjà partagés peuvent rester visibles si la suppression n’est pas techniquement ou légalement
                possible (ex. copies, citations, re-partages), dans la mesure permise par la loi.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="liability">11. Responsabilités & garanties</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                La Plateforme est fournie « en l’état » et « selon disponibilité ». Dans la mesure permise par la loi, nous
                excluons toute garantie implicite (qualité marchande, adéquation, non-contrefaçon) et ne pouvons être tenus
                responsables des dommages indirects (pertes de profit, données, réputation), ni des contenus publiés par des
                utilisateurs.
              </p>
              <p className="text-xs text-white/55">
                Certaines juridictions n’autorisent pas certaines exclusions/limitations : elles s’appliquent alors dans les
                limites permises par la loi locale.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="ip">12. Propriété intellectuelle</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld, ses marques, logos, interfaces, designs, et composants (hors contenus utilisateurs) sont protégés
                par les lois applicables (droits d’auteur, marques). Vous n’êtes pas autorisé à les copier, modifier,
                distribuer ou exploiter sans autorisation écrite.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="law">13. Droit applicable & litiges</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Le droit applicable et les modalités de règlement des litiges dépendent de votre pays de résidence et des
                lois impératives locales. Lorsque la loi le permet, tout différend sera traité selon des procédures
                raisonnables visant d’abord une résolution amiable.
              </p>
              <p className="text-xs text-white/55">
                Pour un cadrage « mondial », cette clause est volontairement compatible avec des exigences locales
                (consommation, juridictions impératives, médiation). Un cadrage juridictionnel plus strict peut être ajouté
                si tu définis l’entité juridique opératrice et le pays siège.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="changes">14. Modifications des CGU</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Nous pouvons modifier les CGU pour refléter des évolutions du service, de la sécurité ou des exigences
                légales. En cas de changements significatifs, nous afficherons une information sur la Plateforme et/ou
                demanderons votre acceptation lorsque requis.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="contact">15. Contact</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Pour toute question relative aux CGU, vous pouvez nous contacter via les moyens indiqués dans la Plateforme
                (section support/contact) ou à l’adresse de contact publiée par EchoWorld.
              </p>
              <p className="text-xs text-white/55">
                Pour les demandes liées aux données personnelles : voir{' '}
                <Link href="/privacy" className="font-semibold text-violet-300 hover:text-violet-200">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/55">
              <div className="font-semibold text-white/80">Clause de prudence (transparence)</div>
              <p className="mt-2 leading-relaxed">
                Ce document vise un haut niveau de clarté et une compatibilité internationale (« dans la mesure permise par
                la loi »). Toutefois, des exigences locales spécifiques (ex. consommation, mineurs, contenus, médiation,
                obligations de plateforme) peuvent imposer des ajustements. Pour une conformité juridique parfaite, un
                conseil juridique local est recommandé.
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
