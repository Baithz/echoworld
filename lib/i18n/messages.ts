/**
 * =============================================================================
 * Fichier      : lib/i18n/messages.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-21)
 * Objet        : Dictionnaires i18n (MVP) - toutes langues supportées
 * -----------------------------------------------------------------------------
 * Description  :
 * - Messages UI de la home (Hero) et libellés communs
 * - Structure plate (keys) pour simplicité et perf
 * =============================================================================
 */

import type { AppLang } from './i18n';

export type I18nKey =
  | 'ui.language'
  | 'hero.badge_suffix'
  | 'hero.title_line1'
  | 'hero.title_line2'
  | 'hero.subtitle'
  | 'hero.cta_share'
  | 'hero.cta_map'
  | 'hero.cta_login'
  | 'hero.card1_title'
  | 'hero.card1_desc'
  | 'hero.card2_title'
  | 'hero.card2_desc'
  | 'hero.card3_title'
  | 'hero.card3_desc';

type Dict = Record<I18nKey, string>;

export const MESSAGES: Record<AppLang, Dict> = {
  en: {
    'ui.language': 'Language',
    'hero.badge_suffix': 'global empathy platform',
    'hero.title_line1': 'Your Story, Their Echo,',
    'hero.title_line2': 'Our World.',
    'hero.subtitle':
      'Share a personal echo. Place it on the map. Discover how human experiences resonate across borders.',
    'hero.cta_share': 'Share your echo',
    'hero.cta_map': 'Explore world map',
    'hero.cta_login': 'Login →',
    'hero.card1_title': 'Anonymous or named',
    'hero.card1_desc': 'Choose what you reveal. Identity stays yours.',
    'hero.card2_title': 'Map-first experience',
    'hero.card2_desc': 'Echoes become a living layer on the planet.',
    'hero.card3_title': 'Meaningful discovery',
    'hero.card3_desc': 'Find similar feelings across cultures.',
  },

  fr: {
    'ui.language': 'Langue',
    'hero.badge_suffix': 'plateforme mondiale d’empathie',
    'hero.title_line1': 'Votre histoire, leur écho,',
    'hero.title_line2': 'Notre monde.',
    'hero.subtitle':
      'Partagez un écho personnel. Placez-le sur la carte. Découvrez comment les expériences humaines résonnent au-delà des frontières.',
    'hero.cta_share': 'Partager votre écho',
    'hero.cta_map': 'Explorer la carte',
    'hero.cta_login': 'Connexion →',
    'hero.card1_title': 'Anonyme ou signé',
    'hero.card1_desc': 'Vous décidez ce que vous révélez. Votre identité reste à vous.',
    'hero.card2_title': 'Expérience centrée carte',
    'hero.card2_desc': 'Les échos deviennent une couche vivante sur la planète.',
    'hero.card3_title': 'Découverte pertinente',
    'hero.card3_desc': 'Retrouvez des ressentis similaires à travers les cultures.',
  },

  es: {
    'ui.language': 'Idioma',
    'hero.badge_suffix': 'plataforma global de empatía',
    'hero.title_line1': 'Tu historia, su eco,',
    'hero.title_line2': 'Nuestro mundo.',
    'hero.subtitle':
      'Comparte un eco personal. Colócalo en el mapa. Descubre cómo las experiencias humanas resuenan más allá de las fronteras.',
    'hero.cta_share': 'Compartir tu eco',
    'hero.cta_map': 'Explorar el mapa',
    'hero.cta_login': 'Iniciar sesión →',
    'hero.card1_title': 'Anónimo o con nombre',
    'hero.card1_desc': 'Tú decides qué revelar. Tu identidad es tuya.',
    'hero.card2_title': 'Experiencia centrada en el mapa',
    'hero.card2_desc': 'Los ecos se convierten en una capa viva del planeta.',
    'hero.card3_title': 'Descubrimiento significativo',
    'hero.card3_desc': 'Encuentra emociones similares a través de culturas.',
  },

  de: {
    'ui.language': 'Sprache',
    'hero.badge_suffix': 'globale Empathie-Plattform',
    'hero.title_line1': 'Deine Geschichte, ihr Echo,',
    'hero.title_line2': 'unsere Welt.',
    'hero.subtitle':
      'Teile ein persönliches Echo. Setze es auf die Karte. Entdecke, wie menschliche Erfahrungen über Grenzen hinweg nachklingen.',
    'hero.cta_share': 'Dein Echo teilen',
    'hero.cta_map': 'Weltkarte erkunden',
    'hero.cta_login': 'Anmelden →',
    'hero.card1_title': 'Anonym oder mit Namen',
    'hero.card1_desc': 'Du entscheidest, was du zeigst. Deine Identität bleibt bei dir.',
    'hero.card2_title': 'Karte zuerst',
    'hero.card2_desc': 'Echos werden zu einer lebendigen Ebene des Planeten.',
    'hero.card3_title': 'Sinnvolle Entdeckung',
    'hero.card3_desc': 'Finde ähnliche Gefühle über Kulturen hinweg.',
  },

  it: {
    'ui.language': 'Lingua',
    'hero.badge_suffix': 'piattaforma globale di empatia',
    'hero.title_line1': 'La tua storia, il loro eco,',
    'hero.title_line2': 'il nostro mondo.',
    'hero.subtitle':
      'Condividi un eco personale. Mettilo sulla mappa. Scopri come le esperienze umane risuonano oltre i confini.',
    'hero.cta_share': 'Condividi il tuo eco',
    'hero.cta_map': 'Esplora la mappa',
    'hero.cta_login': 'Accedi →',
    'hero.card1_title': 'Anonimo o con nome',
    'hero.card1_desc': 'Scegli cosa rivelare. La tua identità resta tua.',
    'hero.card2_title': 'Esperienza prima di tutto sulla mappa',
    'hero.card2_desc': 'Gli echi diventano uno strato vivo del pianeta.',
    'hero.card3_title': 'Scoperta significativa',
    'hero.card3_desc': 'Trova emozioni simili tra culture.',
  },

  pt: {
    'ui.language': 'Idioma',
    'hero.badge_suffix': 'plataforma global de empatia',
    'hero.title_line1': 'Sua história, o eco deles,',
    'hero.title_line2': 'nosso mundo.',
    'hero.subtitle':
      'Compartilhe um eco pessoal. Coloque no mapa. Descubra como experiências humanas ressoam além das fronteiras.',
    'hero.cta_share': 'Compartilhar seu eco',
    'hero.cta_map': 'Explorar o mapa',
    'hero.cta_login': 'Entrar →',
    'hero.card1_title': 'Anônimo ou com nome',
    'hero.card1_desc': 'Você escolhe o que revelar. Sua identidade é sua.',
    'hero.card2_title': 'Experiência centrada no mapa',
    'hero.card2_desc': 'Ecos viram uma camada viva do planeta.',
    'hero.card3_title': 'Descoberta significativa',
    'hero.card3_desc': 'Encontre sentimentos semelhantes entre culturas.',
  },

  ar: {
    'ui.language': 'اللغة',
    'hero.badge_suffix': 'منصّة عالمية للتعاطف',
    'hero.title_line1': 'قصتك، صداها لديهم،',
    'hero.title_line2': 'عالمُنا.',
    'hero.subtitle':
      'شارك صدىً شخصيًا. ضعه على الخريطة. اكتشف كيف تتردد التجارب الإنسانية عبر الحدود.',
    'hero.cta_share': 'شارك صداك',
    'hero.cta_map': 'استكشف الخريطة',
    'hero.cta_login': 'تسجيل الدخول →',
    'hero.card1_title': 'مجهول أو باسم',
    'hero.card1_desc': 'أنت تختار ما تكشفه. هويتك ملكك.',
    'hero.card2_title': 'تجربة تُركّز على الخريطة',
    'hero.card2_desc': 'تصبح الأصداء طبقة حيّة على الكوكب.',
    'hero.card3_title': 'اكتشاف ذو معنى',
    'hero.card3_desc': 'اعثر على مشاعر متشابهة عبر الثقافات.',
  },

  ja: {
    'ui.language': '言語',
    'hero.badge_suffix': '世界共感プラットフォーム',
    'hero.title_line1': 'あなたの物語、誰かのこだま、',
    'hero.title_line2': '私たちの世界。',
    'hero.subtitle':
      '個人的なエコーを共有し、地図に置いてみよう。人間の体験が国境を越えて共鳴する瞬間を発見しよう。',
    'hero.cta_share': 'エコーを投稿',
    'hero.cta_map': '世界地図を見る',
    'hero.cta_login': 'ログイン →',
    'hero.card1_title': '匿名でも署名でも',
    'hero.card1_desc': '公開する内容はあなた次第。アイデンティティはあなたのもの。',
    'hero.card2_title': 'マップ中心の体験',
    'hero.card2_desc': 'エコーが地球の“生きたレイヤー”になる。',
    'hero.card3_title': '意味のある発見',
    'hero.card3_desc': '文化を越えて似た感情を見つけよう。',
  },
};
