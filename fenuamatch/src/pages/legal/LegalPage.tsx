import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, Notice, PageHeader } from '@/components/ui/Card';
import { BRAND } from '@/config/brand';

const TODO = <mark className="rounded bg-warning-50 px-1 font-semibold text-warning">[À compléter avant publication]</mark>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

const DOCS: Record<string, { title: string; body: ReactNode }> = {
  cgu: {
    title: 'Conditions générales d\'utilisation',
    body: (
      <>
        <Section title="1. Objet">
          <p>{BRAND.name} est une plateforme de mise en relation entre des particuliers ou clients (« Clients ») et des prestataires indépendants,
            artisans, patentés ou professionnels (« Prestataires ») sur l'île de Tahiti. {BRAND.name} n'est pas partie aux accords conclus entre Clients et Prestataires.</p>
        </Section>
        <Section title="2. Accès et compte">
          <p>L'utilisation complète du service nécessite un compte et la confirmation de l'adresse e-mail. L'inscription est réservée aux personnes âgées de 18 ans ou plus.
            Chaque utilisateur est responsable de la confidentialité de son mot de passe et des informations qu'il publie.</p>
          <p>Le nom d'utilisateur peut être modifié une première fois librement, puis au plus une fois tous les 90 jours.</p>
        </Section>
        <Section title="3. Gratuité de la version actuelle">
          <p>La version actuelle du service est gratuite. Aucune fonctionnalité payante n'est active. Si des offres payantes sont proposées à l'avenir, leurs conditions
            seront présentées clairement avant toute souscription.</p>
        </Section>
        <Section title="4. Annonces, propositions et missions">
          <p>Une annonce reste active 30 jours et peut être renouvelée gratuitement. Elle peut être modifiée jusqu'à trois fois avant l'attribution d'une mission.</p>
          <p>Une mission est considérée comme attribuée uniquement lorsque le Client a choisi une proposition <strong>et</strong> que le Prestataire l'a confirmée.
            Ce mécanisme n'a pas valeur de devis signé ni de contrat : le prix, les modalités et le paiement de la prestation sont convenus directement entre les parties,
            en dehors de la plateforme. Les prix indiqués dans les propositions sont indicatifs.</p>
        </Section>
        <Section title="5. Règles de conduite">
          <p>Sont interdits notamment : les contenus frauduleux, trompeurs ou illicites, le harcèlement, la publicité abusive, l'usurpation d'identité,
            la collecte de données d'autres membres et l'envoi de messages en masse. Les prestataires ne peuvent pas solliciter un client qui ne les a pas contactés
            ou qui n'a pas publié d'annonce.</p>
        </Section>
        <Section title="6. Signalements et modération">
          <p>Tout membre peut signaler un contenu. À partir de trois signalements émanant de comptes distincts, un contenu peut être masqué temporairement en attendant
            un examen. Ce masquage n'est pas une sanction définitive : l'auteur est informé et peut contester. L'équipe s'efforce de traiter les contestations sous 7 jours,
            sans pouvoir le garantir. {BRAND.name} peut masquer un contenu ou suspendre un compte en cas de manquement aux présentes conditions.</p>
        </Section>
        <Section title="7. Comptes inactifs">
          <p>Après six mois sans activité, un rappel est envoyé. Sans retour dans les 30 jours suivants, le profil public est masqué (le compte n'est pas supprimé)
            et redevient visible dès la reconnexion de son titulaire.</p>
        </Section>
        <Section title="8. Responsabilité">
          <p>{BRAND.name} ne vérifie pas, dans la version actuelle, les qualifications, assurances ou statuts déclarés par les Prestataires et ne garantit ni la qualité
            des prestations ni l'obtention de clients. La disponibilité affichée est indicative.</p>
        </Section>
        <Section title="9. Suppression du compte">
          <p>Chaque utilisateur peut supprimer son compte depuis ses paramètres. Les conditions de conservation figurent dans la politique de confidentialité.</p>
        </Section>
        <Section title="10. Droit applicable">
          <p>Droit applicable et juridiction compétente : {TODO}</p>
        </Section>
      </>
    ),
  },
  privacy: {
    title: 'Politique de confidentialité',
    body: (
      <>
        <Section title="Responsable du traitement">
          <p>Identité et coordonnées du responsable : {TODO}</p>
        </Section>
        <Section title="Données collectées">
          <ul className="list-disc space-y-1 pl-5">
            <li>Compte : adresse e-mail (privée), nom d'utilisateur, type de compte, mot de passe (stocké uniquement sous forme chiffrée par Supabase Auth).</li>
            <li>Facultatif : photo de profil, commune, numéro de téléphone (privé pour les clients ; affiché sur la fiche uniquement si un prestataire le renseigne).</li>
            <li>Prestataires : nom public, métiers, commune, description, disponibilité, photos de réalisations et informations pratiques choisies.</li>
            <li>Annonces, propositions, messages privés, notifications, signalements.</li>
            <li>Données techniques nécessaires à la sécurité (journaux de connexion gérés par l'hébergeur).</li>
          </ul>
          <p>Les photos sont réduites et ré-encodées dans votre navigateur avant l'envoi, ce qui supprime leurs métadonnées (dont la position GPS).
            Nous ne vous demandons jamais votre adresse exacte.</p>
        </Section>
        <Section title="Finalités">
          <p>Fournir le service de mise en relation, permettre la messagerie, envoyer les e-mails nécessaires (confirmation, sécurité, événements importants),
            assurer la modération et la sécurité. Aucune donnée n'est vendue. Aucun traceur publicitaire n'est utilisé.</p>
        </Section>
        <Section title="Destinataires et hébergement">
          <p>Données hébergées par Supabase (base de données, authentification, fichiers) et site servi par Cloudflare. Région d'hébergement : {TODO}.
            Les messages privés ne sont accessibles qu'aux participants de la conversation ; l'équipe de modération ne consulte que les messages qui lui sont signalés.</p>
        </Section>
        <Section title="Durées de conservation">
          <p>Les données sont conservées tant que le compte existe. À la suppression du compte, le profil, la fiche, les annonces et les fichiers sont supprimés ;
            les messages envoyés restent visibles par leurs destinataires sous la mention « Compte supprimé ». Durées légales éventuelles : {TODO}</p>
        </Section>
        <Section title="Vos droits">
          <p>Depuis vos paramètres, vous pouvez à tout moment consulter et modifier vos informations, <strong>exporter vos données</strong> (fichier JSON) et
            <strong> supprimer votre compte</strong>. Pour toute autre demande : {TODO}. Cadre juridique applicable à la protection des données en Polynésie française : {TODO}</p>
        </Section>
      </>
    ),
  },
  mentions: {
    title: 'Mentions légales',
    body: (
      <>
        <Section title="Éditeur du site">
          <ul className="space-y-1">
            <li>Nom ou raison sociale : {TODO}</li>
            <li>Statut / forme juridique : {TODO}</li>
            <li>Numéro TAHITI : {TODO}</li>
            <li>Adresse : {TODO}</li>
            <li>Directeur de la publication : {TODO}</li>
            <li>Contact : {TODO}</li>
          </ul>
        </Section>
        <Section title="Hébergement">
          <p>Site : Cloudflare, Inc. — base de données et fichiers : Supabase, Inc. Coordonnées exactes à vérifier : {TODO}</p>
        </Section>
        <Section title="Propriété intellectuelle">
          <p>Le nom {BRAND.name}, le logo et l'interface sont protégés. Les contenus publiés restent la propriété de leurs auteurs, qui accordent à {BRAND.name}
            le droit de les afficher sur la plateforme.</p>
        </Section>
      </>
    ),
  },
  contact: {
    title: 'Contact et signalement',
    body: (
      <>
        <Section title="Nous écrire">
          <p>Adresse de contact : {TODO}</p>
        </Section>
        <Section title="Signaler un contenu">
          <p>Le moyen le plus rapide : utilisez le bouton <strong>« Signaler »</strong> présent sur chaque fiche, annonce et message. Votre signalement est confidentiel
            et transmis à l'équipe de modération.</p>
        </Section>
        <Section title="Contester une décision">
          <p>Si un de vos contenus a été masqué, rendez-vous dans <Link to="/parametres/moderation" className="text-brand-strong underline">Paramètres › Modération</Link>.</p>
        </Section>
      </>
    ),
  },
};

export default function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const d = DOCS[doc];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={d.title} />
      <Notice tone="warning" className="mb-4">
        Document provisoire, rédigé comme un projet : il doit être relu et validé (idéalement par un professionnel du droit) avant l'ouverture publique.
      </Notice>
      <Card className="space-y-6 p-5 sm:p-7">{d.body}</Card>
    </div>
  );
}
