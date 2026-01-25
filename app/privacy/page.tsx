/**
 * =============================================================================
 * Fichier      : app/privacy/page.tsx
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-25)
 * Objet        : Page légale — Politique de confidentialité
 * -----------------------------------------------------------------------------
 * Description  :
 * - Politique RGPD-ready + clauses internationales (bases légales, droits, transferts)
 * - Structure lisible : sommaire + ancres
 * - Texte FR compatible “global”, sans dépendre d’un pays unique
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
  { id: 'retention', label: '7. Durées de conservation' },
  { id: 'security', label: '8. Sécurité' },
  { id: 'rights', label: '9. Vos droits' },
  { id: 'children', label: '10. Mineurs' },
  { id: 'cookies', label: '11. Cookies & traceurs' },
  { id: 'changes', label: '12. Modifications' },
  { id: 'contact', label: '13. Contact' },
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

function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-white/75 md:text-base">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-240 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 h-80 w-200 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>Juridique</Pill>
            <Pill>Confidentialité</Pill>
            <Pill>Dernière mise à jour : {LAST_UPDATED}</Pill>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            Politique de confidentialité
          </h1>

          <p className="mt-4 max-w-3xl text-sm text-white/70 md:text-base">
            Cette politique explique quelles données EchoWorld collecte, pourquoi, comment elles sont utilisées,
            avec qui elles peuvent être partagées, et quels sont vos droits.
          </p>

          <p className="mt-4 max-w-3xl text-xs text-white/55">
            EchoWorld vise une conformité internationale (RGPD/UE, standards de transparence et de sécurité).
            Certaines règles peuvent varier selon votre pays (droits consommateurs, mineurs, transfert, etc.).
          </p>
        </div>
      </div>

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
                  <Link href="/terms" className="font-semibold text-emerald-300 hover:text-emerald-200">
                    Conditions d’utilisation
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Body */}
          <article className="space-y-10">
            <section className="space-y-3">
              <SectionTitle id="scope">1. Champ d’application</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Cette politique s’applique à l’utilisation de la Plateforme EchoWorld (site web et fonctionnalités),
                y compris la création de compte, la publication d’Échos, les interactions (réactions, réponses),
                et la messagerie lorsque disponible.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="controller">2. Responsable du traitement</SectionTitle>
              <Row title="Qui traite vos données ?">
                EchoWorld agit en tant que responsable du traitement pour les données nécessaires au fonctionnement de
                la Plateforme. L’identité juridique exacte et les coordonnées officielles doivent être publiées dans la
                Plateforme (page contact/mentions) dès que l’entité opératrice est finalisée.
              </Row>
              <p className="text-xs text-white/55">
                Pour une conformité “sans faille”, il faudra renseigner : entité légale, adresse, email DPO/Privacy, et
                représentant UE/RU si requis.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="data">3. Données collectées</SectionTitle>
              <div className="space-y-4">
                <Row title="Données que vous fournissez">
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Informations de compte : email, identifiants, éventuellement pseudo/handle.</li>
                    <li>Profil : photo/avatar, bio, préférences, paramètres de visibilité.</li>
                    <li>Contenus : Échos (texte), médias (images) si vous en publiez, réactions/réponses/messages.</li>
                    <li>Signalements/support : contenus transmis via formulaires de support/signalement.</li>
                  </ul>
                </Row>

                <Row title="Données collectées automatiquement">
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Données techniques : logs, adresse IP, user-agent, identifiants d’appareil (selon contexte).</li>
                    <li>Données d’usage : pages consultées, actions (création, clics, interactions) pour sécurité/qualité.</li>
                    <li>Cookies/traceurs : nécessaires au login, préférences, mesures anti-abus (voir section cookies).</li>
                  </ul>
                </Row>

                <Row title="Données de localisation">
                  La Plateforme peut traiter des données de localisation si vous activez des fonctionnalités de géolocalisation
                  (ex. associer un Écho à un lieu). Selon votre choix, la localisation peut être précise (GPS) ou approximée.
                  Vous pouvez refuser la géolocalisation via les réglages de votre navigateur/appareil.
                </Row>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle id="purposes">4. Finalités & bases légales</SectionTitle>
              <Row title="Pourquoi EchoWorld traite vos données">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-semibold">Fournir le service</span> : création de compte, authentification,
                    publication, affichage des contenus, interactions, messagerie.
                  </li>
                  <li>
                    <span className="font-semibold">Sécurité & prévention des abus</span> : détection fraude/spam, protection
                    des utilisateurs, intégrité de la Plateforme.
                  </li>
                  <li>
                    <span className="font-semibold">Amélioration & support</span> : diagnostics, correction de bugs, assistance.
                  </li>
                  <li>
                    <span className="font-semibold">Obligations légales</span> : conformité, réponses aux demandes légitimes,
                    conservation imposée par la loi.
                  </li>
                </ul>
              </Row>

              <Row title="Bases légales (cadre international, RGPD-ready)">
                Selon votre pays, le traitement repose notamment sur :
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li><span className="font-semibold">Exécution du contrat</span> : fournir la Plateforme et ses fonctionnalités.</li>
                  <li><span className="font-semibold">Intérêt légitime</span> : sécurité, prévention des abus, amélioration du service.</li>
                  <li><span className="font-semibold">Consentement</span> : certains cookies/traceurs, géolocalisation, communications optionnelles.</li>
                  <li><span className="font-semibold">Obligation légale</span> : conservation/coopération lorsque requis.</li>
                </ul>
              </Row>
            </section>

            <section className="space-y-3">
              <SectionTitle id="sharing">5. Partage des données</SectionTitle>
              <Row title="Avec qui partageons-nous vos données ?">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-semibold">Sous-traitants techniques</span> (hébergement, base de données, stockage,
                    envoi d’emails, monitoring). Ils agissent sur instruction d’EchoWorld et avec des engagements de sécurité.
                  </li>
                  <li>
                    <span className="font-semibold">Autres utilisateurs</span> : selon vos paramètres (profil public, échos publics,
                    interactions).
                  </li>
                  <li>
                    <span className="font-semibold">Autorités</span> : si la loi l’exige (demande valable, prévention d’abus graves).
                  </li>
                  <li>
                    <span className="font-semibold">Changement d’activité</span> : en cas de fusion/cession, dans la mesure permise.
                  </li>
                </ul>
              </Row>
              <p className="text-xs text-white/55">
                Nous ne vendons pas vos données personnelles.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="transfers">6. Transferts internationaux</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld peut traiter des données dans différents pays (infrastructures cloud). Lorsque la loi l’exige,
                nous mettons en place des garanties appropriées (ex. clauses contractuelles types, mesures de sécurité,
                minimisation). Les transferts sont effectués uniquement pour opérer la Plateforme.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="retention">7. Durées de conservation</SectionTitle>
              <Row title="Combien de temps conservons-nous vos données ?">
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-semibold">Compte</span> : tant que votre compte est actif.</li>
                  <li><span className="font-semibold">Contenus</span> : jusqu’à suppression par vous, ou selon vos réglages, et dans la limite des contraintes légales/techniques.</li>
                  <li><span className="font-semibold">Logs sécurité</span> : conservés pour une durée limitée (prévention fraude, diagnostics), puis supprimés/agrégés.</li>
                  <li><span className="font-semibold">Obligations légales</span> : conservation plus longue si la loi l’exige.</li>
                </ul>
              </Row>
            </section>

            <section className="space-y-3">
              <SectionTitle id="security">8. Sécurité</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Nous mettons en place des mesures techniques et organisationnelles raisonnables : contrôle d’accès,
                chiffrement en transit, durcissement des services, surveillance, journaux de sécurité, et principes de
                minimisation. Aucune méthode n’est infaillible : vous devez aussi protéger vos identifiants.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="rights">9. Vos droits</SectionTitle>
              <Row title="Droits principaux (selon la loi applicable)">
                Vous pouvez disposer, selon votre pays, de droits tels que :
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Accès à vos données</li>
                  <li>Rectification</li>
                  <li>Suppression</li>
                  <li>Opposition</li>
                  <li>Limitation</li>
                  <li>Portabilité</li>
                  <li>Retrait du consentement (si applicable)</li>
                </ul>
              </Row>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Pour exercer vos droits, contactez EchoWorld via les canaux de contact publiés dans la Plateforme.
                Nous pourrons demander une vérification d’identité raisonnable pour protéger vos données.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="children">10. Mineurs</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                EchoWorld n’est pas destiné aux enfants en dessous de l’âge minimum légal applicable dans leur pays.
                Si nous découvrons qu’un compte ne respecte pas l’âge requis, nous pouvons prendre des mesures (restriction,
                suppression, demande de consentement parental si requis).
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="cookies">11. Cookies & traceurs</SectionTitle>
              <Row title="Cookies nécessaires">
                Cookies indispensables au fonctionnement : authentification, sécurité, préférences essentielles, prévention
                des abus. Ils ne peuvent généralement pas être désactivés sans impacter le service.
              </Row>
              <Row title="Cookies optionnels (si utilisés)">
                Certains cookies/traceurs peuvent être utilisés pour mesure d’audience, amélioration produit, ou fonctionnalités
                avancées. Lorsque la loi l’exige, ils sont soumis à consentement. Un bandeau de gestion des préférences peut
                être ajouté si tu actives des outils d’analytics/marketing.
              </Row>
              <p className="text-xs text-white/55">
                Si EchoWorld n’utilise pas de traceurs optionnels, cette section reste informative et peut être simplifiée.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="changes">12. Modifications</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Nous pouvons mettre à jour cette politique pour refléter l’évolution du service, de la sécurité ou des
                exigences légales. En cas de changements significatifs, nous afficherons une information sur la Plateforme
                et/ou demanderons votre consentement si requis.
              </p>
            </section>

            <section className="space-y-3">
              <SectionTitle id="contact">13. Contact</SectionTitle>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Pour toute question relative à la confidentialité ou aux données personnelles, contactez EchoWorld via les
                moyens indiqués dans la Plateforme (support/contact). Pour les règles d’usage, voir{' '}
                <Link href="/terms" className="font-semibold text-emerald-300 hover:text-emerald-200">
                  Conditions d’utilisation
                </Link>
                .
              </p>
            </section>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/55">
              <div className="font-semibold text-white/80">Point bloquant à corriger pour être “ultra carré”</div>
              <p className="mt-2 leading-relaxed">
                Pour une conformité mondiale totalement verrouillée, il manque une donnée objective : l’entité juridique
                opératrice (raison sociale, pays, adresse), et un contact “privacy/DPO”. Dès que tu me donnes ces infos,
                je te fournis une version finale qui remplace toutes les mentions génériques par des données exactes.
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
