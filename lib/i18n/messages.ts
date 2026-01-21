/**
 * =============================================================================
 * Fichier      : lib/i18n/messages.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.1.0 (2026-01-21)
 * Objet        : Dictionnaires i18n (MVP) - toutes langues supportées
 * -----------------------------------------------------------------------------
 * Description  :
 * - Messages UI de la home (Hero) + "Mirror Preview" (tabs via URL ?tab=...)
 * - Structure plate (keys) pour simplicité et perf
 *
 * Correctifs (sans régression) :
 * - [ADD] Clés MirrorPreview + Pulse
 * - [SAFE] Clés Hero existantes inchangées
 * =============================================================================
 */

import type { AppLang } from './i18n';

export type I18nKey =
  // Common
  | 'ui.language'

  // Hero
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
  | 'hero.card3_desc'

  // MirrorPreview
  | 'mirror.title'
  | 'mirror.subtitle'
  | 'mirror.pulse_label'
  | 'mirror.active_stories'
  | 'mirror.countries'
  | 'mirror.tab_map'
  | 'mirror.tab_stories'
  | 'mirror.tab_connections'
  | 'mirror.tab_pulse'

  // Pulse panel
  | 'pulse.title'
  | 'pulse.positivity'
  | 'pulse.description';

type Dict = Record<I18nKey, string>;

export const MESSAGES: Record<AppLang, Dict> = {
  en: {
    // Common
    'ui.language': 'Language',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Global Mirror',
    'mirror.subtitle': 'A living layer of human stories — discover patterns across borders.',
    'mirror.pulse_label': 'Global Pulse:',
    'mirror.active_stories': 'active stories',
    'mirror.countries': 'countries',
    'mirror.tab_map': 'Interactive map',
    'mirror.tab_stories': 'Story feed',
    'mirror.tab_connections': 'Connections',
    'mirror.tab_pulse': 'Emotional pulse',

    // Pulse panel
    'pulse.title': 'Global Emotional Pulse',
    'pulse.positivity': 'Positivity',
    'pulse.description':
      'Right now, the world shares mostly moments of joy, hope and gratitude — shifting in real time.',
  },

  fr: {
    // Common
    'ui.language': 'Langue',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Miroir mondial',
    'mirror.subtitle': 'Une couche vivante d’histoires humaines — repérez les échos au-delà des frontières.',
    'mirror.pulse_label': 'Pouls global :',
    'mirror.active_stories': 'histoires actives',
    'mirror.countries': 'pays',
    'mirror.tab_map': 'Carte interactive',
    'mirror.tab_stories': 'Flux d’histoires',
    'mirror.tab_connections': 'Connexions',
    'mirror.tab_pulse': 'Pouls émotionnel',

    // Pulse panel
    'pulse.title': 'Pouls émotionnel global',
    'pulse.positivity': 'Positivité',
    'pulse.description':
      'En ce moment, le monde partage surtout des instants de joie, d’espoir et de gratitude — en évolution en temps réel.',
  },

  es: {
    // Common
    'ui.language': 'Idioma',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Espejo global',
    'mirror.subtitle': 'Una capa viva de historias humanas: descubre patrones más allá de las fronteras.',
    'mirror.pulse_label': 'Pulso global:',
    'mirror.active_stories': 'historias activas',
    'mirror.countries': 'países',
    'mirror.tab_map': 'Mapa interactivo',
    'mirror.tab_stories': 'Flujo de historias',
    'mirror.tab_connections': 'Conexiones',
    'mirror.tab_pulse': 'Pulso emocional',

    // Pulse panel
    'pulse.title': 'Pulso emocional global',
    'pulse.positivity': 'Positividad',
    'pulse.description':
      'Ahora mismo, el mundo comparte sobre todo momentos de alegría, esperanza y gratitud — cambiando en tiempo real.',
  },

  de: {
    // Common
    'ui.language': 'Sprache',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Globaler Spiegel',
    'mirror.subtitle': 'Eine lebendige Schicht menschlicher Geschichten — Muster über Grenzen hinweg entdecken.',
    'mirror.pulse_label': 'Globaler Puls:',
    'mirror.active_stories': 'aktive Geschichten',
    'mirror.countries': 'Länder',
    'mirror.tab_map': 'Interaktive Karte',
    'mirror.tab_stories': 'Story-Feed',
    'mirror.tab_connections': 'Verbindungen',
    'mirror.tab_pulse': 'Emotionaler Puls',

    // Pulse panel
    'pulse.title': 'Globaler emotionaler Puls',
    'pulse.positivity': 'Positivität',
    'pulse.description':
      'Aktuell teilt die Welt vor allem Momente von Freude, Hoffnung und Dankbarkeit — in Echtzeit im Wandel.',
  },

  it: {
    // Common
    'ui.language': 'Lingua',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Specchio globale',
    'mirror.subtitle': 'Uno strato vivo di storie umane — scopri schemi oltre i confini.',
    'mirror.pulse_label': 'Polso globale:',
    'mirror.active_stories': 'storie attive',
    'mirror.countries': 'paesi',
    'mirror.tab_map': 'Mappa interattiva',
    'mirror.tab_stories': 'Feed di storie',
    'mirror.tab_connections': 'Connessioni',
    'mirror.tab_pulse': 'Polso emotivo',

    // Pulse panel
    'pulse.title': 'Polso emotivo globale',
    'pulse.positivity': 'Positività',
    'pulse.description':
      'In questo momento, il mondo condivide soprattutto gioia, speranza e gratitudine — in evoluzione in tempo reale.',
  },

  pt: {
    // Common
    'ui.language': 'Idioma',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'Espelho global',
    'mirror.subtitle': 'Uma camada viva de histórias humanas — descubra padrões além das fronteiras.',
    'mirror.pulse_label': 'Pulso global:',
    'mirror.active_stories': 'histórias ativas',
    'mirror.countries': 'países',
    'mirror.tab_map': 'Mapa interativo',
    'mirror.tab_stories': 'Feed de histórias',
    'mirror.tab_connections': 'Conexões',
    'mirror.tab_pulse': 'Pulso emocional',

    // Pulse panel
    'pulse.title': 'Pulso emocional global',
    'pulse.positivity': 'Positividade',
    'pulse.description':
      'Agora, o mundo compartilha principalmente alegria, esperança e gratidão — mudando em tempo real.',
  },

  ar: {
    // Common
    'ui.language': 'اللغة',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'المرآة العالمية',
    'mirror.subtitle': 'طبقة حيّة من القصص الإنسانية — اكتشف الأنماط عبر الحدود.',
    'mirror.pulse_label': 'النبض العالمي:',
    'mirror.active_stories': 'قصص نشطة',
    'mirror.countries': 'دول',
    'mirror.tab_map': 'خريطة تفاعلية',
    'mirror.tab_stories': 'تدفّق القصص',
    'mirror.tab_connections': 'روابط',
    'mirror.tab_pulse': 'النبض العاطفي',

    // Pulse panel
    'pulse.title': 'النبض العاطفي العالمي',
    'pulse.positivity': 'الإيجابية',
    'pulse.description':
      'حاليًا، يشارك العالم غالبًا لحظات من الفرح والأمل والامتنان — ويتغيّر ذلك في الوقت الحقيقي.',
  },

  ja: {
    // Common
    'ui.language': '言語',

    // Hero
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

    // MirrorPreview
    'mirror.title': 'グローバル・ミラー',
    'mirror.subtitle': '人間の物語が織りなす“生きたレイヤー” — 国境を越えたパターンを発見。',
    'mirror.pulse_label': 'グローバル・パルス:',
    'mirror.active_stories': 'アクティブな物語',
    'mirror.countries': '国',
    'mirror.tab_map': 'インタラクティブ地図',
    'mirror.tab_stories': 'ストーリーフィード',
    'mirror.tab_connections': 'つながり',
    'mirror.tab_pulse': '感情のパルス',

    // Pulse panel
    'pulse.title': 'グローバル感情パルス',
    'pulse.positivity': 'ポジティブ度',
    'pulse.description':
      'いま世界では、喜び・希望・感謝の瞬間が多く共有されています。数値はリアルタイムに揺れ動きます。',
  },
};
