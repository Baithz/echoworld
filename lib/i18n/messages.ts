/**
 * =============================================================================
 * Fichier      : lib/i18n/messages.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 3.0.0 (2026-01-21)
 * Objet        : Dictionnaires i18n - Ajout navigation + refonte complète
 * -----------------------------------------------------------------------------
 * Nouveautés v3 :
 * - Ajout clés navigation (nav.home, nav.explore, nav.share, nav.about, nav.login)
 * - Conservation de tous les messages existants
 * =============================================================================
 */

import type { AppLang } from './i18n';

export type I18nKey =
  // Common
  | 'ui.language'

  // Navigation (NEW)
  | 'nav.home'
  | 'nav.explore'
  | 'nav.share'
  | 'nav.about'
  | 'nav.login'

  // Hero (redesign)
  | 'hero.badge_prefix'
  | 'hero.badge_suffix'
  | 'hero.title_line1'
  | 'hero.title_line2'
  | 'hero.subtitle'
  | 'hero.cta_share'
  | 'hero.cta_explore'
  | 'hero.cta_login'

  // World Globe (monde vivant)
  | 'world.section_title'
  | 'world.live_indicator'
  | 'world.story_count'
  | 'world.countries_count'
  | 'world.hover_tip'
  | 'world.click_explore'
  | 'world.zoom_hint'

  // Story overlay (intégré à la carte)
  | 'story.just_shared'
  | 'story.minutes_ago'
  | 'story.from'
  | 'story.read_more'
  | 'story.anonymous'

  // Pulse Heart (cœur vivant)
  | 'pulse.title'
  | 'pulse.live_status'
  | 'pulse.heartbeat_label'
  | 'pulse.global_mood'
  | 'pulse.positivity_label'
  | 'pulse.emotion_joy'
  | 'pulse.emotion_hope'
  | 'pulse.emotion_gratitude'
  | 'pulse.emotion_reflection'
  | 'pulse.emotion_solidarity'
  | 'pulse.breathing_world'

  // Connections (rencontres humaines)
  | 'connections.title'
  | 'connections.subtitle'
  | 'connections.suggested_for_you'
  | 'connections.shared_experience'
  | 'connections.match_score'
  | 'connections.connect_btn'
  | 'connections.discover_more';

type Dict = Record<I18nKey, string>;

export const MESSAGES: Record<AppLang, Dict> = {
  en: {
    // Common
    'ui.language': 'Language',

    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.share': 'Share Story',
    'nav.about': 'About',
    'nav.login': 'Sign in',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'A living layer of humanity',
    'hero.title_line1': 'Your Story, Their Echo,',
    'hero.title_line2': 'Our World.',
    'hero.subtitle':
      'Watch the planet breathe. See stories pulse across borders. Feel the heartbeat of humanity.',
    'hero.cta_share': 'Share your echo',
    'hero.cta_explore': 'Explore the world',
    'hero.cta_login': 'Sign in',

    // World Globe
    'world.section_title': 'A Living World',
    'world.live_indicator': 'LIVE',
    'world.story_count': 'stories breathing',
    'world.countries_count': 'countries connected',
    'world.hover_tip': 'Hover to feel an echo',
    'world.click_explore': 'Click to dive deeper',
    'world.zoom_hint': 'Zoom, drag, discover',

    // Story overlay
    'story.just_shared': 'Just shared',
    'story.minutes_ago': 'min ago',
    'story.from': 'From',
    'story.read_more': 'Read the full story',
    'story.anonymous': 'Anonymous',

    // Pulse Heart
    'pulse.title': "The World's Heartbeat",
    'pulse.live_status': 'BEATING NOW',
    'pulse.heartbeat_label': 'Global pulse',
    'pulse.global_mood': 'Right now, humanity feels',
    'pulse.positivity_label': 'Collective warmth',
    'pulse.emotion_joy': 'Joy',
    'pulse.emotion_hope': 'Hope',
    'pulse.emotion_gratitude': 'Gratitude',
    'pulse.emotion_reflection': 'Reflection',
    'pulse.emotion_solidarity': 'Solidarity',
    'pulse.breathing_world': 'The world is breathing with you.',

    // Connections
    'connections.title': 'Souls Who Mirror You',
    'connections.subtitle': 'Real people. Similar journeys. Waiting to connect.',
    'connections.suggested_for_you': 'Suggested for you',
    'connections.shared_experience': 'Shared experience:',
    'connections.match_score': 'resonance',
    'connections.connect_btn': 'Start a conversation',
    'connections.discover_more': 'Discover more connections',
  },

  fr: {
    // Common
    'ui.language': 'Langue',

    // Navigation
    'nav.home': 'Accueil',
    'nav.explore': 'Explorer',
    'nav.share': 'Partager',
    'nav.about': 'À propos',
    'nav.login': 'Connexion',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': "Une couche vivante de l'humanité",
    'hero.title_line1': 'Votre histoire, leur écho,',
    'hero.title_line2': 'Notre monde.',
    'hero.subtitle':
      "Regardez la planète respirer. Voyez les histoires battre au-delà des frontières. Ressentez le cœur de l'humanité.",
    'hero.cta_share': 'Partager votre écho',
    'hero.cta_explore': 'Explorer le monde',
    'hero.cta_login': 'Se connecter',

    // World Globe
    'world.section_title': 'Un monde vivant',
    'world.live_indicator': 'EN DIRECT',
    'world.story_count': 'histoires qui respirent',
    'world.countries_count': 'pays connectés',
    'world.hover_tip': 'Survolez pour ressentir un écho',
    'world.click_explore': 'Cliquez pour plonger',
    'world.zoom_hint': 'Zoomez, déplacez, découvrez',

    // Story overlay
    'story.just_shared': "À l'instant",
    'story.minutes_ago': 'min',
    'story.from': 'De',
    'story.read_more': "Lire l'histoire complète",
    'story.anonymous': 'Anonyme',

    // Pulse Heart
    'pulse.title': 'Le battement du monde',
    'pulse.live_status': 'BAT MAINTENANT',
    'pulse.heartbeat_label': 'Pouls global',
    'pulse.global_mood': "En ce moment, l'humanité ressent",
    'pulse.positivity_label': 'Chaleur collective',
    'pulse.emotion_joy': 'Joie',
    'pulse.emotion_hope': 'Espoir',
    'pulse.emotion_gratitude': 'Gratitude',
    'pulse.emotion_reflection': 'Réflexion',
    'pulse.emotion_solidarity': 'Solidarité',
    'pulse.breathing_world': 'Le monde respire avec vous.',

    // Connections
    'connections.title': 'Âmes qui vous ressemblent',
    'connections.subtitle':
      'Vraies personnes. Parcours similaires. Prêtes à se connecter.',
    'connections.suggested_for_you': 'Suggéré pour vous',
    'connections.shared_experience': 'Expérience partagée :',
    'connections.match_score': 'résonance',
    'connections.connect_btn': 'Démarrer une conversation',
    'connections.discover_more': 'Découvrir plus de connexions',
  },

  es: {
    // Common
    'ui.language': 'Idioma',

    // Navigation
    'nav.home': 'Inicio',
    'nav.explore': 'Explorar',
    'nav.share': 'Compartir',
    'nav.about': 'Acerca de',
    'nav.login': 'Iniciar sesión',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'Una capa viva de humanidad',
    'hero.title_line1': 'Tu historia, su eco,',
    'hero.title_line2': 'Nuestro mundo.',
    'hero.subtitle':
      'Mira el planeta respirar. Ve las historias latir más allá de las fronteras. Siente el latido de la humanidad.',
    'hero.cta_share': 'Compartir tu eco',
    'hero.cta_explore': 'Explorar el mundo',
    'hero.cta_login': 'Iniciar sesión',

    // World Globe
    'world.section_title': 'Un mundo vivo',
    'world.live_indicator': 'EN VIVO',
    'world.story_count': 'historias respirando',
    'world.countries_count': 'países conectados',
    'world.hover_tip': 'Pasa el cursor para sentir un eco',
    'world.click_explore': 'Haz clic para sumergirte',
    'world.zoom_hint': 'Zoom, arrastra, descubre',

    // Story overlay
    'story.just_shared': 'Recién compartida',
    'story.minutes_ago': 'min',
    'story.from': 'Desde',
    'story.read_more': 'Leer la historia completa',
    'story.anonymous': 'Anónimo',

    // Pulse Heart
    'pulse.title': 'El latido del mundo',
    'pulse.live_status': 'LATIENDO AHORA',
    'pulse.heartbeat_label': 'Pulso global',
    'pulse.global_mood': 'Ahora mismo, la humanidad siente',
    'pulse.positivity_label': 'Calidez colectiva',
    'pulse.emotion_joy': 'Alegría',
    'pulse.emotion_hope': 'Esperanza',
    'pulse.emotion_gratitude': 'Gratitud',
    'pulse.emotion_reflection': 'Reflexión',
    'pulse.emotion_solidarity': 'Solidaridad',
    'pulse.breathing_world': 'El mundo respira contigo.',

    // Connections
    'connections.title': 'Almas que te reflejan',
    'connections.subtitle':
      'Personas reales. Viajes similares. Esperando conectar.',
    'connections.suggested_for_you': 'Sugerido para ti',
    'connections.shared_experience': 'Experiencia compartida:',
    'connections.match_score': 'resonancia',
    'connections.connect_btn': 'Iniciar conversación',
    'connections.discover_more': 'Descubrir más conexiones',
  },

  de: {
    // Common
    'ui.language': 'Sprache',

    // Navigation
    'nav.home': 'Startseite',
    'nav.explore': 'Erkunden',
    'nav.share': 'Teilen',
    'nav.about': 'Über uns',
    'nav.login': 'Anmelden',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'Eine lebendige Schicht der Menschlichkeit',
    'hero.title_line1': 'Deine Geschichte, ihr Echo,',
    'hero.title_line2': 'unsere Welt.',
    'hero.subtitle':
      'Beobachte, wie der Planet atmet. Sieh Geschichten über Grenzen hinweg pulsieren. Fühle den Herzschlag der Menschheit.',
    'hero.cta_share': 'Teile dein Echo',
    'hero.cta_explore': 'Erkunde die Welt',
    'hero.cta_login': 'Anmelden',

    // World Globe
    'world.section_title': 'Eine lebendige Welt',
    'world.live_indicator': 'LIVE',
    'world.story_count': 'atmende Geschichten',
    'world.countries_count': 'verbundene Länder',
    'world.hover_tip': 'Schwebe, um ein Echo zu fühlen',
    'world.click_explore': 'Klicken, um tiefer einzutauchen',
    'world.zoom_hint': 'Zoomen, ziehen, entdecken',

    // Story overlay
    'story.just_shared': 'Gerade geteilt',
    'story.minutes_ago': 'Min.',
    'story.from': 'Von',
    'story.read_more': 'Die ganze Geschichte lesen',
    'story.anonymous': 'Anonym',

    // Pulse Heart
    'pulse.title': 'Der Herzschlag der Welt',
    'pulse.live_status': 'SCHLÄGT JETZT',
    'pulse.heartbeat_label': 'Globaler Puls',
    'pulse.global_mood': 'Gerade jetzt fühlt die Menschheit',
    'pulse.positivity_label': 'Kollektive Wärme',
    'pulse.emotion_joy': 'Freude',
    'pulse.emotion_hope': 'Hoffnung',
    'pulse.emotion_gratitude': 'Dankbarkeit',
    'pulse.emotion_reflection': 'Reflexion',
    'pulse.emotion_solidarity': 'Solidarität',
    'pulse.breathing_world': 'Die Welt atmet mit dir.',

    // Connections
    'connections.title': 'Seelen, die dich spiegeln',
    'connections.subtitle':
      'Echte Menschen. Ähnliche Reisen. Warten auf Verbindung.',
    'connections.suggested_for_you': 'Für dich vorgeschlagen',
    'connections.shared_experience': 'Geteilte Erfahrung:',
    'connections.match_score': 'Resonanz',
    'connections.connect_btn': 'Gespräch beginnen',
    'connections.discover_more': 'Mehr Verbindungen entdecken',
  },

  it: {
    // Common
    'ui.language': 'Lingua',

    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Esplora',
    'nav.share': 'Condividi',
    'nav.about': 'Chi siamo',
    'nav.login': 'Accedi',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'Uno strato vivo di umanità',
    'hero.title_line1': 'La tua storia, il loro eco,',
    'hero.title_line2': 'il nostro mondo.',
    'hero.subtitle':
      "Guarda il pianeta respirare. Vedi le storie pulsare oltre i confini. Senti il battito dell'umanità.",
    'hero.cta_share': 'Condividi il tuo eco',
    'hero.cta_explore': 'Esplora il mondo',
    'hero.cta_login': 'Accedi',

    // World Globe
    'world.section_title': 'Un mondo vivo',
    'world.live_indicator': 'IN DIRETTA',
    'world.story_count': 'storie che respirano',
    'world.countries_count': 'paesi connessi',
    'world.hover_tip': 'Passa sopra per sentire un eco',
    'world.click_explore': 'Clicca per immergerti',
    'world.zoom_hint': 'Zoom, trascina, scopri',

    // Story overlay
    'story.just_shared': 'Appena condivisa',
    'story.minutes_ago': 'min fa',
    'story.from': 'Da',
    'story.read_more': 'Leggi la storia completa',
    'story.anonymous': 'Anonimo',

    // Pulse Heart
    'pulse.title': 'Il battito del mondo',
    'pulse.live_status': 'BATTE ORA',
    'pulse.heartbeat_label': 'Polso globale',
    'pulse.global_mood': "Ora, l'umanità sente",
    'pulse.positivity_label': 'Calore collettivo',
    'pulse.emotion_joy': 'Gioia',
    'pulse.emotion_hope': 'Speranza',
    'pulse.emotion_gratitude': 'Gratitudine',
    'pulse.emotion_reflection': 'Riflessione',
    'pulse.emotion_solidarity': 'Solidarietà',
    'pulse.breathing_world': 'Il mondo respira con te.',

    // Connections
    'connections.title': 'Anime che ti rispecchiano',
    'connections.subtitle':
      'Persone reali. Percorsi simili. Pronte a connettersi.',
    'connections.suggested_for_you': 'Suggerito per te',
    'connections.shared_experience': 'Esperienza condivisa:',
    'connections.match_score': 'risonanza',
    'connections.connect_btn': 'Inizia una conversazione',
    'connections.discover_more': 'Scopri più connessioni',
  },

  pt: {
    // Common
    'ui.language': 'Idioma',

    // Navigation
    'nav.home': 'Início',
    'nav.explore': 'Explorar',
    'nav.share': 'Compartilhar',
    'nav.about': 'Sobre',
    'nav.login': 'Entrar',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'Uma camada viva de humanidade',
    'hero.title_line1': 'Sua história, o eco deles,',
    'hero.title_line2': 'nosso mundo.',
    'hero.subtitle':
      'Veja o planeta respirar. Observe histórias pulsarem além das fronteiras. Sinta o batimento da humanidade.',
    'hero.cta_share': 'Compartilhar seu eco',
    'hero.cta_explore': 'Explorar o mundo',
    'hero.cta_login': 'Entrar',

    // World Globe
    'world.section_title': 'Um mundo vivo',
    'world.live_indicator': 'AO VIVO',
    'world.story_count': 'histórias respirando',
    'world.countries_count': 'países conectados',
    'world.hover_tip': 'Passe o mouse para sentir um eco',
    'world.click_explore': 'Clique para mergulhar',
    'world.zoom_hint': 'Zoom, arraste, descubra',

    // Story overlay
    'story.just_shared': 'Recém compartilhada',
    'story.minutes_ago': 'min atrás',
    'story.from': 'De',
    'story.read_more': 'Ler a história completa',
    'story.anonymous': 'Anônimo',

    // Pulse Heart
    'pulse.title': 'O batimento do mundo',
    'pulse.live_status': 'BATENDO AGORA',
    'pulse.heartbeat_label': 'Pulso global',
    'pulse.global_mood': 'Agora, a humanidade sente',
    'pulse.positivity_label': 'Calor coletivo',
    'pulse.emotion_joy': 'Alegria',
    'pulse.emotion_hope': 'Esperança',
    'pulse.emotion_gratitude': 'Gratidão',
    'pulse.emotion_reflection': 'Reflexão',
    'pulse.emotion_solidarity': 'Solidariedade',
    'pulse.breathing_world': 'O mundo respira com você.',

    // Connections
    'connections.title': 'Almas que refletem você',
    'connections.subtitle': 'Pessoas reais. Jornadas similares. Esperando conectar.',
    'connections.suggested_for_you': 'Sugerido para você',
    'connections.shared_experience': 'Experiência compartilhada:',
    'connections.match_score': 'ressonância',
    'connections.connect_btn': 'Iniciar conversa',
    'connections.discover_more': 'Descobrir mais conexões',
  },

  ar: {
    // Common
    'ui.language': 'اللغة',

    // Navigation
    'nav.home': 'الرئيسية',
    'nav.explore': 'استكشاف',
    'nav.share': 'مشاركة',
    'nav.about': 'حول',
    'nav.login': 'تسجيل الدخول',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': 'طبقة حيّة من الإنسانية',
    'hero.title_line1': 'قصتك، صداها لديهم،',
    'hero.title_line2': 'عالمُنا.',
    'hero.subtitle':
      'شاهد الكوكب يتنفس. انظر القصص تنبض عبر الحدود. اشعر بنبض الإنسانية.',
    'hero.cta_share': 'شارك صداك',
    'hero.cta_explore': 'استكشف العالم',
    'hero.cta_login': 'تسجيل الدخول',

    // World Globe
    'world.section_title': 'عالم حيّ',
    'world.live_indicator': 'مباشر',
    'world.story_count': 'قصص تتنفس',
    'world.countries_count': 'دول متّصلة',
    'world.hover_tip': 'مرّر للشعور بصدى',
    'world.click_explore': 'انقر للغوص أعمق',
    'world.zoom_hint': 'زوم، اسحب، اكتشف',

    // Story overlay
    'story.just_shared': 'شُورِكت للتو',
    'story.minutes_ago': 'دقيقة',
    'story.from': 'من',
    'story.read_more': 'اقرأ القصة كاملة',
    'story.anonymous': 'مجهول',

    // Pulse Heart
    'pulse.title': 'نبض العالم',
    'pulse.live_status': 'ينبض الآن',
    'pulse.heartbeat_label': 'النبض العالمي',
    'pulse.global_mood': 'الآن، تشعر الإنسانية بـ',
    'pulse.positivity_label': 'الدفء الجماعي',
    'pulse.emotion_joy': 'الفرح',
    'pulse.emotion_hope': 'الأمل',
    'pulse.emotion_gratitude': 'الامتنان',
    'pulse.emotion_reflection': 'التأمّل',
    'pulse.emotion_solidarity': 'التضامن',
    'pulse.breathing_world': 'العالم يتنفس معك.',

    // Connections
    'connections.title': 'أرواح تعكسك',
    'connections.subtitle': 'أشخاص حقيقيون. رحلات متشابهة. ينتظرون الاتصال.',
    'connections.suggested_for_you': 'مقترح لك',
    'connections.shared_experience': 'تجربة مشتركة:',
    'connections.match_score': 'تجاوب',
    'connections.connect_btn': 'ابدأ محادثة',
    'connections.discover_more': 'اكتشف مزيدًا من الاتصالات',
  },

  ja: {
    // Common
    'ui.language': '言語',

    // Navigation
    'nav.home': 'ホーム',
    'nav.explore': '探索',
    'nav.share': '投稿',
    'nav.about': '概要',
    'nav.login': 'サインイン',

    // Hero (redesign)
    'hero.badge_prefix': 'EchoWorld',
    'hero.badge_suffix': '人間性の生きたレイヤー',
    'hero.title_line1': 'あなたの物語、誰かのこだま、',
    'hero.title_line2': '私たちの世界。',
    'hero.subtitle':
      '地球が呼吸するのを見よう。国境を越えて物語が鼓動する様子を。人間性の心拍を感じよう。',
    'hero.cta_share': 'エコーを投稿',
    'hero.cta_explore': '世界を探索',
    'hero.cta_login': 'サインイン',

    // World Globe
    'world.section_title': '生きている世界',
    'world.live_indicator': 'ライブ',
    'world.story_count': '呼吸する物語',
    'world.countries_count': 'つながる国々',
    'world.hover_tip': 'ホバーでエコーを感じる',
    'world.click_explore': 'クリックで深く',
    'world.zoom_hint': 'ズーム、ドラッグ、発見',

    // Story overlay
    'story.just_shared': 'たった今',
    'story.minutes_ago': '分前',
    'story.from': 'から',
    'story.read_more': '全文を読む',
    'story.anonymous': '匿名',

    // Pulse Heart
    'pulse.title': '世界の鼓動',
    'pulse.live_status': '今、鼓動中',
    'pulse.heartbeat_label': 'グローバルパルス',
    'pulse.global_mood': '今、人類が感じていること',
    'pulse.positivity_label': '集合的な温もり',
    'pulse.emotion_joy': '喜び',
    'pulse.emotion_hope': '希望',
    'pulse.emotion_gratitude': '感謝',
    'pulse.emotion_reflection': '内省',
    'pulse.emotion_solidarity': '連帯',
    'pulse.breathing_world': '世界があなたと呼吸しています。',

    // Connections
    'connections.title': 'あなたを映す魂',
    'connections.subtitle': '本物の人々。似た旅路。つながりを待っています。',
    'connections.suggested_for_you': 'あなたへのおすすめ',
    'connections.shared_experience': '共有体験:',
    'connections.match_score': '共鳴',
    'connections.connect_btn': '会話を始める',
    'connections.discover_more': 'もっとつながりを発見',
  },
};