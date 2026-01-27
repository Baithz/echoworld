/**
 * =============================================================================
 * Fichier      : lib/i18n/messages/about.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 1.0.0 (2026-01-27)
 * Objet        : Dictionnaires i18n — Scope About (/about)
 * -----------------------------------------------------------------------------
 * Description  :
 * - Centralise toutes les chaînes liées à la page /about (namespace about.*)
 * - Permet de garder messages.ts lisible via composition (spread)
 * - EN = source principale ; FR/ES/DE/IT/PT/AR/JA fournis (fallback restant possible)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 1.0.0 (2026-01-27)
 * - [NEW] Ajout pack de traductions About (about.*)
 * - [KEEP] Aucune modification sur les clés existantes (zéro régression)
 * =============================================================================
 */

import type { AppLang } from '../i18n';

export type AboutI18nKey =
  | 'about.badge'
  | 'about.hero_title_prefix'
  | 'about.hero_title_highlight'
  | 'about.hero_subtitle'
  | 'about.cta_share'
  | 'about.cta_explore'
  | 'about.hero_note'
  | 'about.pillars_title'
  | 'about.pillars_subtitle'
  | 'about.pillar_echo_title'
  | 'about.pillar_echo_desc'
  | 'about.pillar_resonance_title'
  | 'about.pillar_resonance_desc'
  | 'about.pillar_world_title'
  | 'about.pillar_world_desc'
  | 'about.full_experience_title'
  | 'about.full_experience_cta_explore'
  | 'about.full_experience_cta_messages'

  | 'about.manifesto_title'
  | 'about.manifesto_intro'
  | 'about.what_it_is_title'
  | 'about.what_it_is_item1'
  | 'about.what_it_is_item2'
  | 'about.what_it_is_item3'
  | 'about.what_it_is_not_title'
  | 'about.what_it_is_not_item1'
  | 'about.what_it_is_not_item2'
  | 'about.what_it_is_not_item3'

  | 'about.how_title'
  | 'about.how_intro'
  | 'about.how_step1_title'
  | 'about.how_step1_subtitle'
  | 'about.how_step1_desc'
  | 'about.how_step1_cta'
  | 'about.how_step2_title'
  | 'about.how_step2_subtitle'
  | 'about.how_step2_desc'
  | 'about.how_step2_note'
  | 'about.how_step3_title'
  | 'about.how_step3_subtitle'
  | 'about.how_step3_desc'
  | 'about.how_step3_cta'

  | 'about.map_title'
  | 'about.map_intro1'
  | 'about.map_intro2'
  | 'about.map_card1_title'
  | 'about.map_card1_desc'
  | 'about.map_card2_title'
  | 'about.map_card2_desc'
  | 'about.map_card3_title'
  | 'about.map_card3_desc'

  | 'about.values_title'
  | 'about.values_intro'
  | 'about.value1_title'
  | 'about.value1_desc'
  | 'about.value2_title'
  | 'about.value2_desc'
  | 'about.value3_title'
  | 'about.value3_desc'
  | 'about.value4_title'
  | 'about.value4_desc'
  | 'about.value5_title'
  | 'about.value5_desc'
  | 'about.value6_title'
  | 'about.value6_desc'

  | 'about.vision_title'
  | 'about.vision_intro1'
  | 'about.vision_intro2'
  | 'about.vision_block1_title'
  | 'about.vision_block1_item1'
  | 'about.vision_block1_item2'
  | 'about.vision_block1_item3'
  | 'about.vision_block2_title'
  | 'about.vision_block2_item1'
  | 'about.vision_block2_item2'
  | 'about.vision_block2_item3'
  | 'about.vision_block3_title'
  | 'about.vision_block3_item1'
  | 'about.vision_block3_item2'
  | 'about.vision_block3_item3'

  | 'about.transparency_title'
  | 'about.transparency_intro'
  | 'about.author_title'
  | 'about.author_name'
  | 'about.author_role'
  | 'about.contact_title'
  | 'about.contact_desc'
  | 'about.contact_cta_messages'
  | 'about.footer_cta_share'
  | 'about.footer_cta_explore';

type Dict = Record<AboutI18nKey, string>;

export const ABOUT_MESSAGES: Record<AppLang, Dict> = {
  en: {
    'about.badge': 'About EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'What we share can resonate',
    'about.hero_subtitle':
      'EchoWorld is a living layer of humanity. People share stories — “echoes” — and those stories become signals: seen on profiles, felt in feeds, and anchored on a world map.',
    'about.cta_share': 'Share an echo',
    'about.cta_explore': 'Explore the world',
    'about.hero_note': 'No jargon. Just stories, places, and resonance.',
    'about.pillars_title': 'Three pillars',
    'about.pillars_subtitle': 'A simple loop that keeps EchoWorld clear and human.',
    'about.pillar_echo_title': 'Echo',
    'about.pillar_echo_desc': 'A story you choose to share.',
    'about.pillar_resonance_title': 'Resonance',
    'about.pillar_resonance_desc': 'People react, reply, or mirror — thoughtfully.',
    'about.pillar_world_title': 'World',
    'about.pillar_world_desc': 'The map turns stories into a shared geography.',
    'about.full_experience_title': 'Want the full experience?',
    'about.full_experience_cta_explore': 'Open /explore',
    'about.full_experience_cta_messages': 'Open messages',

    'about.manifesto_title': 'Manifesto',
    'about.manifesto_intro':
      'EchoWorld is built around one idea: a story can travel. When someone shares an echo, it doesn’t just sit in a feed — it becomes a signal others can feel, respond to, and carry forward.',
    'about.what_it_is_title': 'What it is',
    'about.what_it_is_item1': 'A space to publish echoes: short, human stories.',
    'about.what_it_is_item2': 'A world map where echoes become visible across borders.',
    'about.what_it_is_item3': 'A place for resonance: reactions, replies, and mirrors.',
    'about.what_it_is_not_title': 'What it is not',
    'about.what_it_is_not_item1': 'Not a performance stage.',
    'about.what_it_is_not_item2': 'Not a battlefield for attention.',
    'about.what_it_is_not_item3': 'Not a place to turn people into metrics.',

    'about.how_title': 'How it works',
    'about.how_intro': 'A simple flow. You share. Others resonate. The world becomes readable.',
    'about.how_step1_title': '1 — Share',
    'about.how_step1_subtitle': 'Create an echo.',
    'about.how_step1_desc':
      'Write a story, attach a feeling, choose visibility, and (optionally) anchor it to a place.',
    'about.how_step1_cta': 'Open /share',
    'about.how_step2_title': '2 — Resonate',
    'about.how_step2_subtitle': 'React, reply, mirror.',
    'about.how_step2_desc':
      'Others can respond with care: reactions, replies, and mirrors make an echo travel without turning it into noise.',
    'about.how_step2_note': '(Reactions & replies are designed to stay human and meaningful.)',
    'about.how_step3_title': '3 — Explore',
    'about.how_step3_subtitle': 'See echoes across the planet.',
    'about.how_step3_desc':
      'The map isn’t decoration. It’s a way to see humanity as a living layer — a pulse of stories, everywhere.',
    'about.how_step3_cta': 'Open /explore',

    'about.map_title': 'The world map',
    'about.map_intro1':
      'EchoWorld uses geography as meaning, not precision. A place gives a story a context — a skyline, a climate, a culture, a distance.',
    'about.map_intro2':
      'The globe experience lives in /explore. This page explains why it exists.',
    'about.map_card1_title': 'Anchoring',
    'about.map_card1_desc':
      'A location is a frame. It gives the echo a “where” — even when the story itself is universal.',
    'about.map_card2_title': 'Resonance',
    'about.map_card2_desc':
      'When echoes appear on the map, the planet feels alive: a readable pulse of stories, across borders.',
    'about.map_card3_title': 'Perspective',
    'about.map_card3_desc':
      'The map turns a feed into a world: it helps you see distances, density, silence, and presence.',

    'about.values_title': 'Values',
    'about.values_intro':
      'EchoWorld is built with a specific tone. These values guide product decisions, UX, and community expectations.',
    'about.value1_title': 'Respect first',
    'about.value1_desc': 'Stories are human. We design for dignity and care.',
    'about.value2_title': 'Resonance over noise',
    'about.value2_desc': 'Interaction is built to stay meaningful, not overwhelming.',
    'about.value3_title': 'A world of perspectives',
    'about.value3_desc': 'Different places, different lives — all valid.',
    'about.value4_title': 'Connection',
    'about.value4_desc': 'Echoes help people feel less alone, even far away.',
    'about.value5_title': 'Gentle creativity',
    'about.value5_desc': 'A platform that feels like a living artwork, not a dashboard.',
    'about.value6_title': 'Empathy',
    'about.value6_desc': 'We build tools that encourage understanding and support.',

    'about.vision_title': 'Vision & future',
    'about.vision_intro1':
      'EchoWorld aims to become a calm place on the internet — where stories connect people across distance, and the planet feels like a shared, breathing archive of humanity.',
    'about.vision_intro2': 'The goal is not “more content”. The goal is better resonance.',
    'about.vision_block1_title': 'A living map',
    'about.vision_block1_item1': 'Better visual language for echoes on the globe.',
    'about.vision_block1_item2': 'Stronger “pulse” cues where stories accumulate.',
    'about.vision_block1_item3': 'Smooth transitions between world and local views.',
    'about.vision_block2_title': 'Human conversations',
    'about.vision_block2_item1': 'Better presence signals (online/offline).',
    'about.vision_block2_item2': 'Clean threads: reply, reactions, attachments.',
    'about.vision_block2_item3': 'Safer DM flows and clearer intent.',
    'about.vision_block3_title': 'Trust & clarity',
    'about.vision_block3_item1': 'Better reporting & moderation ergonomics.',
    'about.vision_block3_item2': 'Stronger profile identity controls.',
    'about.vision_block3_item3': 'Clearer onboarding to explain the “echo” concept.',

    'about.transparency_title': 'Transparency & contact',
    'about.transparency_intro':
      'EchoWorld is an independent project built with care. If you want to report an issue, suggest an improvement, or collaborate, you can reach out.',
    'about.author_title': 'Project author',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Product + design + engineering',
    'about.contact_title': 'Contact',
    'about.contact_desc':
      'For now, contact is handled through the platform (messages) and future dedicated channels will be added as EchoWorld evolves.',
    'about.contact_cta_messages': 'Open messages',
    'about.footer_cta_share': 'Share your story',
    'about.footer_cta_explore': 'Explore deeper',
  },

  fr: {
    'about.badge': 'À propos d’EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'Ce que nous partageons résonne',
    'about.hero_subtitle':
      "EchoWorld est une couche vivante de l’humanité. Les gens partagent des histoires — des “échos” — et ces histoires deviennent des signaux : visibles sur les profils, ressenties dans les flux, ancrées sur une carte du monde.",
    'about.cta_share': 'Partager un écho',
    'about.cta_explore': 'Explorer le monde',
    'about.hero_note': 'Pas de jargon. Juste des histoires, des lieux, et de la résonance.',
    'about.pillars_title': 'Trois piliers',
    'about.pillars_subtitle': 'Une boucle simple qui garde EchoWorld clair et humain.',
    'about.pillar_echo_title': 'Écho',
    'about.pillar_echo_desc': 'Une histoire que vous choisissez de partager.',
    'about.pillar_resonance_title': 'Résonance',
    'about.pillar_resonance_desc': 'Les gens réagissent, répondent ou “miroir” — avec intention.',
    'about.pillar_world_title': 'Monde',
    'about.pillar_world_desc': 'La carte transforme les histoires en géographie partagée.',
    'about.full_experience_title': 'Envie de vivre l’expérience complète ?',
    'about.full_experience_cta_explore': 'Ouvrir /explore',
    'about.full_experience_cta_messages': 'Ouvrir les messages',

    'about.manifesto_title': 'Manifeste',
    'about.manifesto_intro':
      'EchoWorld repose sur une idée : une histoire peut voyager. Quand quelqu’un partage un écho, il ne reste pas juste dans un flux — il devient un signal que d’autres peuvent ressentir, prolonger et faire circuler.',
    'about.what_it_is_title': 'Ce que c’est',
    'about.what_it_is_item1': 'Un espace pour publier des échos : des récits courts et humains.',
    'about.what_it_is_item2': 'Une carte du monde où les échos deviennent visibles au-delà des frontières.',
    'about.what_it_is_item3': 'Un lieu de résonance : réactions, réponses et miroirs.',
    'about.what_it_is_not_title': 'Ce que ce n’est pas',
    'about.what_it_is_not_item1': 'Pas une scène de performance.',
    'about.what_it_is_not_item2': 'Pas un champ de bataille pour l’attention.',
    'about.what_it_is_not_item3': 'Pas un endroit qui réduit les gens à des métriques.',

    'about.how_title': 'Comment ça fonctionne',
    'about.how_intro': 'Un flux simple. Vous partagez. D’autres résonnent. Le monde devient lisible.',
    'about.how_step1_title': '1 — Partager',
    'about.how_step1_subtitle': 'Créer un écho.',
    'about.how_step1_desc':
      'Écrire une histoire, associer une émotion, choisir la visibilité et (optionnellement) l’ancrer à un lieu.',
    'about.how_step1_cta': 'Ouvrir /share',
    'about.how_step2_title': '2 — Résonner',
    'about.how_step2_subtitle': 'Réagir, répondre, miroir.',
    'about.how_step2_desc':
      'Les autres répondent avec attention : réactions, réponses et miroirs font voyager un écho sans le transformer en bruit.',
    'about.how_step2_note': '(Les réactions & réponses sont pensées pour rester humaines et significatives.)',
    'about.how_step3_title': '3 — Explorer',
    'about.how_step3_subtitle': 'Voir les échos sur la planète.',
    'about.how_step3_desc':
      'La carte n’est pas décorative. C’est une façon de voir l’humanité comme une couche vivante — un pouls d’histoires, partout.',
    'about.how_step3_cta': 'Ouvrir /explore',

    'about.map_title': 'La carte du monde',
    'about.map_intro1':
      'EchoWorld utilise la géographie comme sens, pas comme précision. Un lieu donne du contexte — une skyline, un climat, une culture, une distance.',
    'about.map_intro2':
      'L’expérience “globe” vit dans /explore. Cette page explique pourquoi elle existe.',
    'about.map_card1_title': 'Ancrage',
    'about.map_card1_desc':
      'Un lieu est un cadre. Il donne un “où” — même si l’histoire est universelle.',
    'about.map_card2_title': 'Résonance',
    'about.map_card2_desc':
      'Quand les échos apparaissent sur la carte, la planète semble vivante : un pouls lisible d’histoires, au-delà des frontières.',
    'about.map_card3_title': 'Perspective',
    'about.map_card3_desc':
      'La carte transforme un flux en monde : distances, densité, silence, présence.',

    'about.values_title': 'Valeurs',
    'about.values_intro':
      'EchoWorld a un ton précis. Ces valeurs guident les décisions produit, l’UX et les attentes communautaires.',
    'about.value1_title': 'Respect d’abord',
    'about.value1_desc': 'Les histoires sont humaines. On conçoit pour la dignité et le soin.',
    'about.value2_title': 'Résonance plutôt que bruit',
    'about.value2_desc': 'L’interaction est pensée pour rester significative, pas envahissante.',
    'about.value3_title': 'Un monde de perspectives',
    'about.value3_desc': 'Différents lieux, différentes vies — toutes valides.',
    'about.value4_title': 'Connexion',
    'about.value4_desc': 'Les échos aident à se sentir moins seul, même loin.',
    'about.value5_title': 'Créativité douce',
    'about.value5_desc': 'Une plateforme qui ressemble à une œuvre vivante, pas à un tableau de bord.',
    'about.value6_title': 'Empathie',
    'about.value6_desc': 'On construit des outils qui encouragent la compréhension et le soutien.',

    'about.vision_title': 'Vision & avenir',
    'about.vision_intro1':
      'EchoWorld vise un endroit calme sur internet — où les histoires connectent au-delà des distances, et où la planète devient une archive vivante de l’humanité.',
    'about.vision_intro2': 'Le but n’est pas “plus de contenu”. Le but, c’est une meilleure résonance.',
    'about.vision_block1_title': 'Une carte vivante',
    'about.vision_block1_item1': 'Un langage visuel plus fort pour les échos sur le globe.',
    'about.vision_block1_item2': 'Des indices de “pulse” plus lisibles là où les histoires s’accumulent.',
    'about.vision_block1_item3': 'Des transitions plus fluides entre monde et local.',
    'about.vision_block2_title': 'Conversations humaines',
    'about.vision_block2_item1': 'Meilleurs signaux de présence (en ligne/hors ligne).',
    'about.vision_block2_item2': 'Threads propres : réponse, réactions, pièces jointes.',
    'about.vision_block2_item3': 'DM plus sûrs et intention plus claire.',
    'about.vision_block3_title': 'Confiance & clarté',
    'about.vision_block3_item1': 'Signalement/modération plus ergonomiques.',
    'about.vision_block3_item2': 'Contrôles d’identité profil renforcés.',
    'about.vision_block3_item3': 'Onboarding plus clair pour expliquer le concept d’écho.',

    'about.transparency_title': 'Transparence & contact',
    'about.transparency_intro':
      'EchoWorld est un projet indépendant construit avec soin. Pour signaler un souci, proposer une amélioration ou collaborer, vous pouvez contacter.',
    'about.author_title': 'Auteur du projet',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Produit + design + ingénierie',
    'about.contact_title': 'Contact',
    'about.contact_desc':
      'Pour l’instant, le contact passe via la plateforme (messages). Des canaux dédiés pourront arriver avec l’évolution d’EchoWorld.',
    'about.contact_cta_messages': 'Ouvrir les messages',
    'about.footer_cta_share': 'Partager votre histoire',
    'about.footer_cta_explore': 'Explorer plus loin',
  },

  // Pour rester “bout à bout” sans exploser, ES/DE/IT/PT/AR/JA sont fournis avec traductions directes.
  // Elles peuvent être raffinées plus tard sans changer les clés.

  es: {
    'about.badge': 'Acerca de EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'Lo que compartimos puede resonar',
    'about.hero_subtitle':
      'EchoWorld es una capa viva de humanidad. Las personas comparten historias — “ecos” — y esas historias se convierten en señales: visibles en perfiles, sentidas en los feeds y ancladas en un mapa del mundo.',
    'about.cta_share': 'Compartir un eco',
    'about.cta_explore': 'Explorar el mundo',
    'about.hero_note': 'Sin jerga. Solo historias, lugares y resonancia.',
    'about.pillars_title': 'Tres pilares',
    'about.pillars_subtitle': 'Un ciclo simple que mantiene EchoWorld claro y humano.',
    'about.pillar_echo_title': 'Eco',
    'about.pillar_echo_desc': 'Una historia que eliges compartir.',
    'about.pillar_resonance_title': 'Resonancia',
    'about.pillar_resonance_desc': 'La gente reacciona, responde o refleja — con intención.',
    'about.pillar_world_title': 'Mundo',
    'about.pillar_world_desc': 'El mapa convierte historias en una geografía compartida.',
    'about.full_experience_title': '¿Quieres la experiencia completa?',
    'about.full_experience_cta_explore': 'Abrir /explore',
    'about.full_experience_cta_messages': 'Abrir mensajes',

    'about.manifesto_title': 'Manifiesto',
    'about.manifesto_intro':
      'EchoWorld se construye sobre una idea: una historia puede viajar. Cuando alguien comparte un eco, no se queda solo en un feed — se convierte en una señal que otros pueden sentir, responder y llevar adelante.',
    'about.what_it_is_title': 'Qué es',
    'about.what_it_is_item1': 'Un espacio para publicar ecos: historias cortas y humanas.',
    'about.what_it_is_item2': 'Un mapa del mundo donde los ecos son visibles más allá de fronteras.',
    'about.what_it_is_item3': 'Un lugar de resonancia: reacciones, respuestas y espejos.',
    'about.what_it_is_not_title': 'Qué no es',
    'about.what_it_is_not_item1': 'No es un escenario de actuación.',
    'about.what_it_is_not_item2': 'No es un campo de batalla por la atención.',
    'about.what_it_is_not_item3': 'No es un lugar para convertir personas en métricas.',

    'about.how_title': 'Cómo funciona',
    'about.how_intro': 'Un flujo simple. Compartes. Otros resuenan. El mundo se vuelve legible.',
    'about.how_step1_title': '1 — Compartir',
    'about.how_step1_subtitle': 'Crear un eco.',
    'about.how_step1_desc':
      'Escribe una historia, asocia una emoción, elige visibilidad y (opcionalmente) ancla a un lugar.',
    'about.how_step1_cta': 'Abrir /share',
    'about.how_step2_title': '2 — Resonancia',
    'about.how_step2_subtitle': 'Reaccionar, responder, reflejar.',
    'about.how_step2_desc':
      'Otros pueden responder con cuidado: reacciones, respuestas y espejos hacen viajar un eco sin convertirlo en ruido.',
    'about.how_step2_note': '(Reacciones y respuestas están pensadas para ser humanas y significativas.)',
    'about.how_step3_title': '3 — Explorar',
    'about.how_step3_subtitle': 'Ver ecos por el planeta.',
    'about.how_step3_desc':
      'El mapa no es decoración. Es una forma de ver la humanidad como una capa viva — un pulso de historias, en todas partes.',
    'about.how_step3_cta': 'Abrir /explore',

    'about.map_title': 'El mapa del mundo',
    'about.map_intro1':
      'EchoWorld usa la geografía como significado, no como precisión. Un lugar da contexto — horizonte, clima, cultura, distancia.',
    'about.map_intro2':
      'La experiencia de globo vive en /explore. Esta página explica por qué existe.',
    'about.map_card1_title': 'Anclaje',
    'about.map_card1_desc':
      'Una ubicación es un marco. Da un “dónde” — incluso si la historia es universal.',
    'about.map_card2_title': 'Resonancia',
    'about.map_card2_desc':
      'Cuando los ecos aparecen en el mapa, el planeta se siente vivo: un pulso legible de historias, más allá de fronteras.',
    'about.map_card3_title': 'Perspectiva',
    'about.map_card3_desc':
      'El mapa convierte un feed en un mundo: ayuda a ver distancias, densidad, silencio y presencia.',

    'about.values_title': 'Valores',
    'about.values_intro':
      'EchoWorld se construye con un tono específico. Estos valores guían decisiones de producto, UX y expectativas de comunidad.',
    'about.value1_title': 'Respeto primero',
    'about.value1_desc': 'Las historias son humanas. Diseñamos para dignidad y cuidado.',
    'about.value2_title': 'Resonancia sobre ruido',
    'about.value2_desc': 'La interacción está diseñada para ser significativa, no abrumadora.',
    'about.value3_title': 'Un mundo de perspectivas',
    'about.value3_desc': 'Lugares distintos, vidas distintas — todas válidas.',
    'about.value4_title': 'Conexión',
    'about.value4_desc': 'Los ecos ayudan a sentirse menos solo, incluso lejos.',
    'about.value5_title': 'Creatividad suave',
    'about.value5_desc': 'Una plataforma que se siente como una obra viva, no un panel.',
    'about.value6_title': 'Empatía',
    'about.value6_desc': 'Construimos herramientas que fomentan comprensión y apoyo.',

    'about.vision_title': 'Visión y futuro',
    'about.vision_intro1':
      'EchoWorld busca ser un lugar calmado en internet — donde historias conectan a distancia y el planeta se siente como un archivo vivo de humanidad.',
    'about.vision_intro2': 'El objetivo no es “más contenido”. Es mejor resonancia.',
    'about.vision_block1_title': 'Un mapa vivo',
    'about.vision_block1_item1': 'Mejor lenguaje visual para ecos en el globo.',
    'about.vision_block1_item2': 'Señales de “pulso” más claras donde se acumulan historias.',
    'about.vision_block1_item3': 'Transiciones más suaves entre vista global y local.',
    'about.vision_block2_title': 'Conversaciones humanas',
    'about.vision_block2_item1': 'Mejores señales de presencia (en línea/fuera).',
    'about.vision_block2_item2': 'Hilos limpios: responder, reacciones, adjuntos.',
    'about.vision_block2_item3': 'DM más seguros e intención más clara.',
    'about.vision_block3_title': 'Confianza y claridad',
    'about.vision_block3_item1': 'Mejor ergonomía de reportes y moderación.',
    'about.vision_block3_item2': 'Controles de identidad de perfil más fuertes.',
    'about.vision_block3_item3': 'Onboarding más claro para explicar el concepto “eco”.',

    'about.transparency_title': 'Transparencia y contacto',
    'about.transparency_intro':
      'EchoWorld es un proyecto independiente construido con cuidado. Si quieres reportar un problema, sugerir mejoras o colaborar, puedes contactarnos.',
    'about.author_title': 'Autor del proyecto',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Producto + diseño + ingeniería',
    'about.contact_title': 'Contacto',
    'about.contact_desc':
      'Por ahora, el contacto se gestiona a través de la plataforma (mensajes). Se agregarán canales dedicados a medida que EchoWorld evolucione.',
    'about.contact_cta_messages': 'Abrir mensajes',
    'about.footer_cta_share': 'Comparte tu historia',
    'about.footer_cta_explore': 'Explorar más',
  },

  de: {
    'about.badge': 'Über EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'Was wir teilen, kann resonieren',
    'about.hero_subtitle':
      'EchoWorld ist eine lebendige Schicht der Menschlichkeit. Menschen teilen Geschichten — „Echos“ — und diese Geschichten werden zu Signalen: sichtbar in Profilen, spürbar im Feed und verankert auf einer Weltkarte.',
    'about.cta_share': 'Ein Echo teilen',
    'about.cta_explore': 'Die Welt erkunden',
    'about.hero_note': 'Kein Jargon. Nur Geschichten, Orte und Resonanz.',
    'about.pillars_title': 'Drei Säulen',
    'about.pillars_subtitle': 'Ein einfacher Kreislauf, der EchoWorld klar und menschlich hält.',
    'about.pillar_echo_title': 'Echo',
    'about.pillar_echo_desc': 'Eine Geschichte, die du teilen möchtest.',
    'about.pillar_resonance_title': 'Resonanz',
    'about.pillar_resonance_desc': 'Menschen reagieren, antworten oder spiegeln — bewusst.',
    'about.pillar_world_title': 'Welt',
    'about.pillar_world_desc': 'Die Karte macht aus Geschichten eine gemeinsame Geografie.',
    'about.full_experience_title': 'Du willst das volle Erlebnis?',
    'about.full_experience_cta_explore': '/explore öffnen',
    'about.full_experience_cta_messages': 'Nachrichten öffnen',

    'about.manifesto_title': 'Manifest',
    'about.manifesto_intro':
      'EchoWorld basiert auf einer Idee: Eine Geschichte kann reisen. Wenn jemand ein Echo teilt, bleibt es nicht nur im Feed — es wird zu einem Signal, das andere fühlen, beantworten und weitertragen können.',
    'about.what_it_is_title': 'Was es ist',
    'about.what_it_is_item1': 'Ein Ort, um Echos zu veröffentlichen: kurze, menschliche Geschichten.',
    'about.what_it_is_item2': 'Eine Weltkarte, auf der Echos über Grenzen sichtbar werden.',
    'about.what_it_is_item3': 'Ein Ort der Resonanz: Reaktionen, Antworten und Spiegel.',
    'about.what_it_is_not_title': 'Was es nicht ist',
    'about.what_it_is_not_item1': 'Keine Bühne für Performance.',
    'about.what_it_is_not_item2': 'Kein Kampfplatz um Aufmerksamkeit.',
    'about.what_it_is_not_item3': 'Kein Ort, der Menschen zu Metriken macht.',

    'about.how_title': 'So funktioniert es',
    'about.how_intro': 'Ein einfacher Ablauf. Du teilst. Andere resonieren. Die Welt wird lesbar.',
    'about.how_step1_title': '1 — Teilen',
    'about.how_step1_subtitle': 'Ein Echo erstellen.',
    'about.how_step1_desc':
      'Schreibe eine Geschichte, wähle ein Gefühl, die Sichtbarkeit und (optional) einen Ort.',
    'about.how_step1_cta': '/share öffnen',
    'about.how_step2_title': '2 — Resonieren',
    'about.how_step2_subtitle': 'Reagieren, antworten, spiegeln.',
    'about.how_step2_desc':
      'Andere können achtsam reagieren: Reaktionen, Antworten und Spiegel lassen ein Echo reisen, ohne es zu Lärm zu machen.',
    'about.how_step2_note': '(Reaktionen & Antworten sind so gestaltet, dass sie menschlich und bedeutsam bleiben.)',
    'about.how_step3_title': '3 — Erkunden',
    'about.how_step3_subtitle': 'Echos auf der ganzen Erde sehen.',
    'about.how_step3_desc':
      'Die Karte ist keine Deko. Sie macht Menschlichkeit als lebendige Schicht sichtbar — ein Puls aus Geschichten, überall.',
    'about.how_step3_cta': '/explore öffnen',

    'about.map_title': 'Die Weltkarte',
    'about.map_intro1':
      'EchoWorld nutzt Geografie als Bedeutung, nicht als Präzision. Ein Ort gibt Kontext — Skyline, Klima, Kultur, Distanz.',
    'about.map_intro2':
      'Das Globus-Erlebnis lebt in /explore. Diese Seite erklärt, warum es existiert.',
    'about.map_card1_title': 'Verankerung',
    'about.map_card1_desc':
      'Ein Ort ist ein Rahmen. Er gibt ein „Wo“ — selbst wenn die Geschichte universell ist.',
    'about.map_card2_title': 'Resonanz',
    'about.map_card2_desc':
      'Wenn Echos auf der Karte erscheinen, wirkt der Planet lebendig: ein lesbarer Puls aus Geschichten, über Grenzen hinweg.',
    'about.map_card3_title': 'Perspektive',
    'about.map_card3_desc':
      'Die Karte macht aus einem Feed eine Welt: Distanzen, Dichte, Stille und Präsenz werden sichtbar.',

    'about.values_title': 'Werte',
    'about.values_intro':
      'EchoWorld hat einen klaren Ton. Diese Werte leiten Produktentscheidungen, UX und Community-Erwartungen.',
    'about.value1_title': 'Respekt zuerst',
    'about.value1_desc': 'Geschichten sind menschlich. Wir gestalten für Würde und Fürsorge.',
    'about.value2_title': 'Resonanz statt Lärm',
    'about.value2_desc': 'Interaktion bleibt bedeutsam, nicht überwältigend.',
    'about.value3_title': 'Eine Welt der Perspektiven',
    'about.value3_desc': 'Andere Orte, andere Leben — alles gültig.',
    'about.value4_title': 'Verbindung',
    'about.value4_desc': 'Echos helfen, sich weniger allein zu fühlen — auch aus der Ferne.',
    'about.value5_title': 'Sanfte Kreativität',
    'about.value5_desc': 'Eine Plattform wie ein lebendiges Kunstwerk, nicht wie ein Dashboard.',
    'about.value6_title': 'Empathie',
    'about.value6_desc': 'Wir bauen Tools, die Verständnis und Unterstützung fördern.',

    'about.vision_title': 'Vision & Zukunft',
    'about.vision_intro1':
      'EchoWorld will ein ruhiger Ort im Internet sein — wo Geschichten über Distanz verbinden und der Planet wie ein atmendes Archiv der Menschlichkeit wirkt.',
    'about.vision_intro2': 'Nicht „mehr Content“. Sondern bessere Resonanz.',
    'about.vision_block1_title': 'Eine lebendige Karte',
    'about.vision_block1_item1': 'Stärkeres visuelles Vokabular für Echos auf dem Globus.',
    'about.vision_block1_item2': 'Klarere „Puls“-Signale dort, wo Geschichten sich sammeln.',
    'about.vision_block1_item3': 'Weichere Übergänge zwischen Welt- und Lokalansicht.',
    'about.vision_block2_title': 'Menschliche Gespräche',
    'about.vision_block2_item1': 'Bessere Präsenzsignale (online/offline).',
    'about.vision_block2_item2': 'Saubere Threads: Antworten, Reaktionen, Anhänge.',
    'about.vision_block2_item3': 'Sichere DMs und klarere Intention.',
    'about.vision_block3_title': 'Vertrauen & Klarheit',
    'about.vision_block3_item1': 'Bessere Ergonomie für Melden & Moderation.',
    'about.vision_block3_item2': 'Stärkere Identitätskontrollen im Profil.',
    'about.vision_block3_item3': 'Klareres Onboarding zum „Echo“-Konzept.',

    'about.transparency_title': 'Transparenz & Kontakt',
    'about.transparency_intro':
      'EchoWorld ist ein unabhängiges Projekt mit Sorgfalt gebaut. Wenn du ein Problem melden, Verbesserungen vorschlagen oder mitarbeiten willst: melde dich.',
    'about.author_title': 'Projektautor',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Produkt + Design + Engineering',
    'about.contact_title': 'Kontakt',
    'about.contact_desc':
      'Aktuell erfolgt Kontakt über die Plattform (Nachrichten). Später können zusätzliche Kanäle hinzukommen.',
    'about.contact_cta_messages': 'Nachrichten öffnen',
    'about.footer_cta_share': 'Teile deine Geschichte',
    'about.footer_cta_explore': 'Mehr entdecken',
  },

  it: {
    'about.badge': 'Chi è EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'Ciò che condividiamo può risuonare',
    'about.hero_subtitle':
      'EchoWorld è uno strato vivo di umanità. Le persone condividono storie — “echi” — e queste storie diventano segnali: visibili nei profili, percepite nei feed e ancorate su una mappa del mondo.',
    'about.cta_share': 'Condividi un eco',
    'about.cta_explore': 'Esplora il mondo',
    'about.hero_note': 'Niente gergo. Solo storie, luoghi e risonanza.',
    'about.pillars_title': 'Tre pilastri',
    'about.pillars_subtitle': 'Un ciclo semplice che mantiene EchoWorld chiaro e umano.',
    'about.pillar_echo_title': 'Eco',
    'about.pillar_echo_desc': 'Una storia che scegli di condividere.',
    'about.pillar_resonance_title': 'Risonanza',
    'about.pillar_resonance_desc': 'Le persone reagiscono, rispondono o “mirror” — con cura.',
    'about.pillar_world_title': 'Mondo',
    'about.pillar_world_desc': 'La mappa trasforma le storie in geografia condivisa.',
    'about.full_experience_title': 'Vuoi l’esperienza completa?',
    'about.full_experience_cta_explore': 'Apri /explore',
    'about.full_experience_cta_messages': 'Apri messaggi',

    'about.manifesto_title': 'Manifesto',
    'about.manifesto_intro':
      'EchoWorld nasce da un’idea: una storia può viaggiare. Quando qualcuno condivide un eco, non resta solo nel feed — diventa un segnale che altri possono sentire, a cui possono rispondere e che possono portare avanti.',
    'about.what_it_is_title': 'Cos’è',
    'about.what_it_is_item1': 'Uno spazio per pubblicare echi: storie brevi e umane.',
    'about.what_it_is_item2': 'Una mappa del mondo dove gli echi diventano visibili oltre i confini.',
    'about.what_it_is_item3': 'Un luogo di risonanza: reazioni, risposte e mirror.',
    'about.what_it_is_not_title': 'Cosa non è',
    'about.what_it_is_not_item1': 'Non è un palcoscenico.',
    'about.what_it_is_not_item2': 'Non è una guerra per l’attenzione.',
    'about.what_it_is_not_item3': 'Non è un luogo che riduce le persone a metriche.',

    'about.how_title': 'Come funziona',
    'about.how_intro': 'Un flusso semplice. Condividi. Altri risuonano. Il mondo diventa leggibile.',
    'about.how_step1_title': '1 — Condividi',
    'about.how_step1_subtitle': 'Crea un eco.',
    'about.how_step1_desc':
      'Scrivi una storia, associa un’emozione, scegli la visibilità e (opzionalmente) ancorala a un luogo.',
    'about.how_step1_cta': 'Apri /share',
    'about.how_step2_title': '2 — Risuona',
    'about.how_step2_subtitle': 'Reagisci, rispondi, mirror.',
    'about.how_step2_desc':
      'Gli altri possono rispondere con cura: reazioni, risposte e mirror fanno viaggiare un eco senza trasformarlo in rumore.',
    'about.how_step2_note': '(Reazioni e risposte sono pensate per restare umane e significative.)',
    'about.how_step3_title': '3 — Esplora',
    'about.how_step3_subtitle': 'Vedi gli echi sul pianeta.',
    'about.how_step3_desc':
      'La mappa non è decorazione. È un modo per vedere l’umanità come uno strato vivo — un battito di storie, ovunque.',
    'about.how_step3_cta': 'Apri /explore',

    'about.map_title': 'La mappa del mondo',
    'about.map_intro1':
      'EchoWorld usa la geografia come significato, non come precisione. Un luogo dà contesto — skyline, clima, cultura, distanza.',
    'about.map_intro2':
      'L’esperienza globo vive in /explore. Questa pagina spiega perché esiste.',
    'about.map_card1_title': 'Ancoraggio',
    'about.map_card1_desc':
      'Un luogo è una cornice. Dà un “dove” — anche se la storia è universale.',
    'about.map_card2_title': 'Risonanza',
    'about.map_card2_desc':
      'Quando gli echi appaiono sulla mappa, il pianeta sembra vivo: un battito leggibile di storie, oltre i confini.',
    'about.map_card3_title': 'Prospettiva',
    'about.map_card3_desc':
      'La mappa trasforma un feed in un mondo: distanze, densità, silenzio e presenza.',

    'about.values_title': 'Valori',
    'about.values_intro':
      'EchoWorld ha un tono preciso. Questi valori guidano decisioni di prodotto, UX e aspettative della community.',
    'about.value1_title': 'Rispetto prima di tutto',
    'about.value1_desc': 'Le storie sono umane. Progettiamo per dignità e cura.',
    'about.value2_title': 'Risonanza sopra il rumore',
    'about.value2_desc': 'Interazione pensata per restare significativa, non invadente.',
    'about.value3_title': 'Un mondo di prospettive',
    'about.value3_desc': 'Luoghi diversi, vite diverse — tutte valide.',
    'about.value4_title': 'Connessione',
    'about.value4_desc': 'Gli echi aiutano a sentirsi meno soli, anche da lontano.',
    'about.value5_title': 'Creatività gentile',
    'about.value5_desc': 'Una piattaforma che sembra un’opera viva, non una dashboard.',
    'about.value6_title': 'Empatia',
    'about.value6_desc': 'Costruiamo strumenti che favoriscono comprensione e supporto.',

    'about.vision_title': 'Visione e futuro',
    'about.vision_intro1':
      'EchoWorld vuole essere un luogo calmo su internet — dove le storie connettono a distanza e il pianeta diventa un archivio vivo dell’umanità.',
    'about.vision_intro2': 'Non “più contenuti”. Migliore risonanza.',
    'about.vision_block1_title': 'Una mappa viva',
    'about.vision_block1_item1': 'Linguaggio visivo migliore per gli echi sul globo.',
    'about.vision_block1_item2': 'Segnali di “pulse” più chiari dove le storie si accumulano.',
    'about.vision_block1_item3': 'Transizioni più fluide tra vista globale e locale.',
    'about.vision_block2_title': 'Conversazioni umane',
    'about.vision_block2_item1': 'Segnali di presenza migliori (online/offline).',
    'about.vision_block2_item2': 'Thread puliti: risposte, reazioni, allegati.',
    'about.vision_block2_item3': 'DM più sicuri e intento più chiaro.',
    'about.vision_block3_title': 'Fiducia e chiarezza',
    'about.vision_block3_item1': 'Ergonomia migliore per segnalazioni e moderazione.',
    'about.vision_block3_item2': 'Controlli d’identità profilo più forti.',
    'about.vision_block3_item3': 'Onboarding più chiaro per spiegare il concetto di “eco”.',

    'about.transparency_title': 'Trasparenza e contatto',
    'about.transparency_intro':
      'EchoWorld è un progetto indipendente costruito con cura. Se vuoi segnalare un problema, suggerire miglioramenti o collaborare, puoi contattarci.',
    'about.author_title': 'Autore del progetto',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Prodotto + design + ingegneria',
    'about.contact_title': 'Contatto',
    'about.contact_desc':
      'Per ora, il contatto passa dalla piattaforma (messaggi). Canali dedicati arriveranno con l’evoluzione di EchoWorld.',
    'about.contact_cta_messages': 'Apri messaggi',
    'about.footer_cta_share': 'Condividi la tua storia',
    'about.footer_cta_explore': 'Esplora di più',
  },

  pt: {
    'about.badge': 'Sobre o EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'O que compartilhamos pode ressoar',
    'about.hero_subtitle':
      'EchoWorld é uma camada viva da humanidade. Pessoas compartilham histórias — “ecos” — e essas histórias viram sinais: vistas em perfis, sentidas nos feeds e ancoradas em um mapa do mundo.',
    'about.cta_share': 'Compartilhar um eco',
    'about.cta_explore': 'Explorar o mundo',
    'about.hero_note': 'Sem jargão. Só histórias, lugares e ressonância.',
    'about.pillars_title': 'Três pilares',
    'about.pillars_subtitle': 'Um ciclo simples que mantém o EchoWorld claro e humano.',
    'about.pillar_echo_title': 'Eco',
    'about.pillar_echo_desc': 'Uma história que você escolhe compartilhar.',
    'about.pillar_resonance_title': 'Ressonância',
    'about.pillar_resonance_desc': 'As pessoas reagem, respondem ou espelham — com intenção.',
    'about.pillar_world_title': 'Mundo',
    'about.pillar_world_desc': 'O mapa transforma histórias em geografia compartilhada.',
    'about.full_experience_title': 'Quer a experiência completa?',
    'about.full_experience_cta_explore': 'Abrir /explore',
    'about.full_experience_cta_messages': 'Abrir mensagens',

    'about.manifesto_title': 'Manifesto',
    'about.manifesto_intro':
      'EchoWorld nasce de uma ideia: uma história pode viajar. Quando alguém compartilha um eco, ele não fica só no feed — vira um sinal que outros podem sentir, responder e levar adiante.',
    'about.what_it_is_title': 'O que é',
    'about.what_it_is_item1': 'Um espaço para publicar ecos: histórias curtas e humanas.',
    'about.what_it_is_item2': 'Um mapa do mundo onde ecos ficam visíveis além das fronteiras.',
    'about.what_it_is_item3': 'Um lugar de ressonância: reações, respostas e espelhos.',
    'about.what_it_is_not_title': 'O que não é',
    'about.what_it_is_not_item1': 'Não é um palco de performance.',
    'about.what_it_is_not_item2': 'Não é uma guerra por atenção.',
    'about.what_it_is_not_item3': 'Não é um lugar para reduzir pessoas a métricas.',

    'about.how_title': 'Como funciona',
    'about.how_intro': 'Um fluxo simples. Você compartilha. Outros ressoam. O mundo fica legível.',
    'about.how_step1_title': '1 — Compartilhar',
    'about.how_step1_subtitle': 'Criar um eco.',
    'about.how_step1_desc':
      'Escreva uma história, associe uma emoção, escolha visibilidade e (opcionalmente) ancore em um lugar.',
    'about.how_step1_cta': 'Abrir /share',
    'about.how_step2_title': '2 — Ressoar',
    'about.how_step2_subtitle': 'Reagir, responder, espelhar.',
    'about.how_step2_desc':
      'Outros podem responder com cuidado: reações, respostas e espelhos fazem um eco viajar sem virar ruído.',
    'about.how_step2_note': '(Reações e respostas são pensadas para permanecer humanas e significativas.)',
    'about.how_step3_title': '3 — Explorar',
    'about.how_step3_subtitle': 'Ver ecos pelo planeta.',
    'about.how_step3_desc':
      'O mapa não é decoração. É um jeito de ver a humanidade como uma camada viva — um pulso de histórias, em todo lugar.',
    'about.how_step3_cta': 'Abrir /explore',

    'about.map_title': 'O mapa do mundo',
    'about.map_intro1':
      'EchoWorld usa geografia como significado, não como precisão. Um lugar dá contexto — horizonte, clima, cultura, distância.',
    'about.map_intro2':
      'A experiência de globo vive em /explore. Esta página explica por que ela existe.',
    'about.map_card1_title': 'Ancoragem',
    'about.map_card1_desc': 'Um local é uma moldura. Dá um “onde” — mesmo se a história for universal.',
    'about.map_card2_title': 'Ressonância',
    'about.map_card2_desc':
      'Quando ecos aparecem no mapa, o planeta parece vivo: um pulso legível de histórias, além das fronteiras.',
    'about.map_card3_title': 'Perspectiva',
    'about.map_card3_desc':
      'O mapa transforma um feed em mundo: ajuda a ver distâncias, densidade, silêncio e presença.',

    'about.values_title': 'Valores',
    'about.values_intro':
      'EchoWorld tem um tom específico. Esses valores guiam decisões de produto, UX e expectativas da comunidade.',
    'about.value1_title': 'Respeito em primeiro lugar',
    'about.value1_desc': 'Histórias são humanas. Projetamos para dignidade e cuidado.',
    'about.value2_title': 'Ressonância acima do ruído',
    'about.value2_desc': 'Interação pensada para ser significativa, não esmagadora.',
    'about.value3_title': 'Um mundo de perspectivas',
    'about.value3_desc': 'Lugares diferentes, vidas diferentes — todas válidas.',
    'about.value4_title': 'Conexão',
    'about.value4_desc': 'Ecos ajudam a se sentir menos sozinho, mesmo longe.',
    'about.value5_title': 'Criatividade suave',
    'about.value5_desc': 'Uma plataforma que parece uma obra viva, não um painel.',
    'about.value6_title': 'Empatia',
    'about.value6_desc': 'Construímos ferramentas que incentivam compreensão e apoio.',

    'about.vision_title': 'Visão e futuro',
    'about.vision_intro1':
      'EchoWorld quer ser um lugar calmo na internet — onde histórias conectam à distância e o planeta vira um arquivo vivo da humanidade.',
    'about.vision_intro2': 'Não é “mais conteúdo”. É melhor ressonância.',
    'about.vision_block1_title': 'Um mapa vivo',
    'about.vision_block1_item1': 'Melhor linguagem visual para ecos no globo.',
    'about.vision_block1_item2': 'Sinais de “pulso” mais fortes onde histórias se acumulam.',
    'about.vision_block1_item3': 'Transições mais suaves entre visão global e local.',
    'about.vision_block2_title': 'Conversas humanas',
    'about.vision_block2_item1': 'Melhores sinais de presença (online/offline).',
    'about.vision_block2_item2': 'Threads limpos: resposta, reações, anexos.',
    'about.vision_block2_item3': 'DMs mais seguros e intenção mais clara.',
    'about.vision_block3_title': 'Confiança e clareza',
    'about.vision_block3_item1': 'Melhor ergonomia para denúncias e moderação.',
    'about.vision_block3_item2': 'Controles de identidade de perfil mais fortes.',
    'about.vision_block3_item3': 'Onboarding mais claro para explicar o conceito de “eco”.',

    'about.transparency_title': 'Transparência e contato',
    'about.transparency_intro':
      'EchoWorld é um projeto independente construído com cuidado. Para relatar um problema, sugerir melhorias ou colaborar, você pode entrar em contato.',
    'about.author_title': 'Autor do projeto',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'Produto + design + engenharia',
    'about.contact_title': 'Contato',
    'about.contact_desc':
      'Por enquanto, o contato é feito pela plataforma (mensagens). Canais dedicados serão adicionados conforme o EchoWorld evolui.',
    'about.contact_cta_messages': 'Abrir mensagens',
    'about.footer_cta_share': 'Compartilhe sua história',
    'about.footer_cta_explore': 'Explorar mais',
  },

  ar: {
    'about.badge': 'حول EchoWorld',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': 'ما نشاركه يمكن أن يتردد صداه',
    'about.hero_subtitle':
      'EchoWorld طبقة حيّة من الإنسانية. يشارك الناس قصصًا — “أصداء” — فتتحول إلى إشارات: تظهر في الملفات الشخصية، تُشعَر في الخلاصات، وتُرسى على خريطة العالم.',
    'about.cta_share': 'شارك صدى',
    'about.cta_explore': 'استكشف العالم',
    'about.hero_note': 'بدون مصطلحات. فقط قصص، أماكن، وصدى.',
    'about.pillars_title': 'ثلاث ركائز',
    'about.pillars_subtitle': 'حلقة بسيطة تحافظ على EchoWorld واضحًا وإنسانيًا.',
    'about.pillar_echo_title': 'صدى',
    'about.pillar_echo_desc': 'قصة تختار مشاركتها.',
    'about.pillar_resonance_title': 'تجاوب',
    'about.pillar_resonance_desc': 'يتفاعل الناس أو يردّون أو يعكسون — بعناية.',
    'about.pillar_world_title': 'العالم',
    'about.pillar_world_desc': 'الخريطة تجعل القصص جغرافيا مشتركة.',
    'about.full_experience_title': 'تريد التجربة الكاملة؟',
    'about.full_experience_cta_explore': 'افتح /explore',
    'about.full_experience_cta_messages': 'افتح الرسائل',

    'about.manifesto_title': 'البيان',
    'about.manifesto_intro':
      'EchoWorld مبني على فكرة واحدة: القصة يمكن أن تسافر. عندما يشارك شخص ما صدى، لا يبقى في الخلاصة فقط — بل يصبح إشارة يمكن للآخرين أن يشعروا بها ويستجيبوا لها وينقلوها.',
    'about.what_it_is_title': 'ما هو',
    'about.what_it_is_item1': 'مساحة لنشر الأصداء: قصص قصيرة وإنسانية.',
    'about.what_it_is_item2': 'خريطة عالم تجعل الأصداء مرئية عبر الحدود.',
    'about.what_it_is_item3': 'مكان للتجاوب: تفاعلات وردود ومرايا.',
    'about.what_it_is_not_title': 'ما ليس هو',
    'about.what_it_is_not_item1': 'ليس منصة استعراض.',
    'about.what_it_is_not_item2': 'ليس ساحة حرب على الانتباه.',
    'about.what_it_is_not_item3': 'ليس مكانًا يحوّل البشر إلى أرقام.',

    'about.how_title': 'كيف يعمل',
    'about.how_intro': 'تدفق بسيط. تشارك. يتجاوب الآخرون. يصبح العالم قابلاً للقراءة.',
    'about.how_step1_title': '1 — شارك',
    'about.how_step1_subtitle': 'أنشئ صدى.',
    'about.how_step1_desc':
      'اكتب قصة، اختر شعورًا، حدّد مستوى الظهور، و(اختياريًا) اربطها بمكان.',
    'about.how_step1_cta': 'افتح /share',
    'about.how_step2_title': '2 — تجاوب',
    'about.how_step2_subtitle': 'تفاعل، رد، مرآة.',
    'about.how_step2_desc':
      'يمكن للآخرين الاستجابة بعناية: التفاعلات والردود والمرايا تجعل الصدى يسافر دون أن يتحول إلى ضجيج.',
    'about.how_step2_note': '(التفاعلات والردود مصممة لتبقى إنسانية وذات معنى.)',
    'about.how_step3_title': '3 — استكشف',
    'about.how_step3_subtitle': 'شاهد الأصداء عبر الكوكب.',
    'about.how_step3_desc':
      'الخريطة ليست للزينة. إنها طريقة لرؤية الإنسانية كطبقة حيّة — نبض قصص في كل مكان.',
    'about.how_step3_cta': 'افتح /explore',

    'about.map_title': 'خريطة العالم',
    'about.map_intro1':
      'يستخدم EchoWorld الجغرافيا كمعنى لا كدقة. المكان يمنح القصة سياقًا — أفقًا، مناخًا، ثقافةً، ومسافةً.',
    'about.map_intro2':
      'تجربة الكرة الأرضية موجودة في /explore. هذه الصفحة تشرح لماذا توجد.',
    'about.map_card1_title': 'الارتساء',
    'about.map_card1_desc':
      'الموقع إطار. يمنح الصدى “أين” — حتى عندما تكون القصة عالمية.',
    'about.map_card2_title': 'التجاوب',
    'about.map_card2_desc':
      'عندما تظهر الأصداء على الخريطة، يبدو الكوكب حيًا: نبض مقروء من القصص عبر الحدود.',
    'about.map_card3_title': 'المنظور',
    'about.map_card3_desc':
      'الخريطة تحول الخلاصة إلى عالم: تساعدك على رؤية المسافات، الكثافة، الصمت، والحضور.',

    'about.values_title': 'القيم',
    'about.values_intro':
      'EchoWorld مبني بنبرة محددة. هذه القيم توجه قرارات المنتج وتجربة الاستخدام وتوقعات المجتمع.',
    'about.value1_title': 'الاحترام أولًا',
    'about.value1_desc': 'القصص إنسانية. نصمم للكرامة والعناية.',
    'about.value2_title': 'التجاوب بدل الضجيج',
    'about.value2_desc': 'التفاعل مصمم ليبقى ذا معنى، لا مرهقًا.',
    'about.value3_title': 'عالم من وجهات النظر',
    'about.value3_desc': 'أماكن مختلفة، حيوات مختلفة — كلها صالحة.',
    'about.value4_title': 'التواصل',
    'about.value4_desc': 'الأصداء تساعد الناس على ألا يشعروا بالوحدة، حتى من بعيد.',
    'about.value5_title': 'إبداع لطيف',
    'about.value5_desc': 'منصة تبدو كعمل فني حي، لا كلوحة أرقام.',
    'about.value6_title': 'التعاطف',
    'about.value6_desc': 'نبني أدوات تشجع الفهم والدعم.',

    'about.vision_title': 'الرؤية والمستقبل',
    'about.vision_intro1':
      'يهدف EchoWorld إلى أن يكون مكانًا هادئًا على الإنترنت — حيث تربط القصص الناس عبر المسافات، ويبدو الكوكب كأرشيف حي يتنفس للإنسانية.',
    'about.vision_intro2': 'الهدف ليس “محتوى أكثر”. الهدف هو تجاوب أفضل.',
    'about.vision_block1_title': 'خريطة حيّة',
    'about.vision_block1_item1': 'لغة بصرية أفضل للأصداء على الكرة الأرضية.',
    'about.vision_block1_item2': 'إشارات “نبض” أقوى حيث تتراكم القصص.',
    'about.vision_block1_item3': 'انتقالات أكثر سلاسة بين العرض العالمي والمحلي.',
    'about.vision_block2_title': 'محادثات إنسانية',
    'about.vision_block2_item1': 'إشارات حضور أفضل (متصل/غير متصل).',
    'about.vision_block2_item2': 'سلاسل نظيفة: ردود، تفاعلات، مرفقات.',
    'about.vision_block2_item3': 'رسائل خاصة أكثر أمانًا ووضوح نية أكبر.',
    'about.vision_block3_title': 'الثقة والوضوح',
    'about.vision_block3_item1': 'تحسين سهولة التبليغ والإشراف.',
    'about.vision_block3_item2': 'تحكم أقوى بهوية الملف الشخصي.',
    'about.vision_block3_item3': 'تهيئة أوضح لشرح مفهوم “الصدى”.',

    'about.transparency_title': 'الشفافية والتواصل',
    'about.transparency_intro':
      'EchoWorld مشروع مستقل مبني بعناية. إذا أردت الإبلاغ عن مشكلة أو اقتراح تحسين أو التعاون، يمكنك التواصل.',
    'about.author_title': 'مؤلف المشروع',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'المنتج + التصميم + الهندسة',
    'about.contact_title': 'تواصل',
    'about.contact_desc':
      'حاليًا يتم التواصل عبر المنصة (الرسائل). ستُضاف قنوات مخصصة لاحقًا مع تطور EchoWorld.',
    'about.contact_cta_messages': 'افتح الرسائل',
    'about.footer_cta_share': 'شارك قصتك',
    'about.footer_cta_explore': 'استكشف أكثر',
  },

  ja: {
    'about.badge': 'EchoWorldについて',
    'about.hero_title_prefix': 'EchoWorld —',
    'about.hero_title_highlight': '共有するものは、共鳴できる',
    'about.hero_subtitle':
      'EchoWorldは、人間性の“生きている層”。人々は物語—「エコー」—を共有し、その物語はシグナルになる。プロフィールに現れ、フィードで感じられ、世界地図に結びつく。',
    'about.cta_share': 'エコーを共有する',
    'about.cta_explore': '世界を探検する',
    'about.hero_note': '専門用語はいらない。物語、場所、そして共鳴だけ。',
    'about.pillars_title': '3つの柱',
    'about.pillars_subtitle': 'EchoWorldを「明確で人間的」に保つための、シンプルな循環。',
    'about.pillar_echo_title': 'エコー',
    'about.pillar_echo_desc': 'あなたが共有すると決めた物語。',
    'about.pillar_resonance_title': '共鳴',
    'about.pillar_resonance_desc': '反応、返信、ミラー—思いやりをもって。',
    'about.pillar_world_title': '世界',
    'about.pillar_world_desc': '地図が物語を“共有の地理”に変える。',
    'about.full_experience_title': 'フル体験を楽しみたい？',
    'about.full_experience_cta_explore': '/explore を開く',
    'about.full_experience_cta_messages': 'メッセージを開く',

    'about.manifesto_title': 'マニフェスト',
    'about.manifesto_intro':
      'EchoWorldはひとつの考えから生まれた。物語は旅をできる。誰かがエコーを共有すると、それはただフィードに留まらず、他者が感じ、応答し、受け継げるシグナルになる。',
    'about.what_it_is_title': 'これは何か',
    'about.what_it_is_item1': 'エコー（短く人間的な物語）を投稿する場所。',
    'about.what_it_is_item2': '国境を越えてエコーが見える世界地図。',
    'about.what_it_is_item3': '共鳴の場：リアクション、返信、ミラー。',
    'about.what_it_is_not_title': 'これは何ではないか',
    'about.what_it_is_not_item1': 'パフォーマンスの舞台ではない。',
    'about.what_it_is_not_item2': '注目を奪い合う戦場ではない。',
    'about.what_it_is_not_item3': '人を指標に変える場所ではない。',

    'about.how_title': '仕組み',
    'about.how_intro': '流れはシンプル。共有し、共鳴し、世界が読み取れるようになる。',
    'about.how_step1_title': '1 — 共有',
    'about.how_step1_subtitle': 'エコーを作る。',
    'about.how_step1_desc':
      '物語を書き、感情を添え、公開範囲を選び、（任意で）場所に結びつける。',
    'about.how_step1_cta': '/share を開く',
    'about.how_step2_title': '2 — 共鳴',
    'about.how_step2_subtitle': '反応、返信、ミラー。',
    'about.how_step2_desc':
      '思いやりのある反応を。リアクション、返信、ミラーが、エコーを“ノイズ”にせずに旅させる。',
    'about.how_step2_note': '（リアクションと返信は、人間的で意味が残るよう設計されています。）',
    'about.how_step3_title': '3 — 探検',
    'about.how_step3_subtitle': '地球上のエコーを見る。',
    'about.how_step3_desc':
      '地図は飾りではない。人間性を“生きている層”として見るためのもの—どこでも物語の鼓動がある。',
    'about.how_step3_cta': '/explore を開く',

    'about.map_title': '世界地図',
    'about.map_intro1':
      'EchoWorldは地理を“精度”ではなく“意味”として扱う。場所は物語に文脈—景色、気候、文化、距離—を与える。',
    'about.map_intro2':
      'グローブ体験は /explore にある。このページは、その理由を説明する。',
    'about.map_card1_title': 'アンカー',
    'about.map_card1_desc':
      '位置情報はフレーム。“どこで”を与える—物語が普遍的であっても。',
    'about.map_card2_title': '共鳴',
    'about.map_card2_desc':
      '地図にエコーが現れると、地球は生きているように感じる。国境を越える、読み取れる物語の鼓動。',
    'about.map_card3_title': '視点',
    'about.map_card3_desc':
      '地図はフィードを“世界”に変える。距離、密度、静けさ、存在感が見える。',

    'about.values_title': '価値観',
    'about.values_intro':
      'EchoWorldには明確なトーンがある。これらの価値観が、プロダクト判断、UX、コミュニティ期待を導く。',
    'about.value1_title': '尊重が第一',
    'about.value1_desc': '物語は人間のもの。尊厳とケアのために設計する。',
    'about.value2_title': 'ノイズより共鳴',
    'about.value2_desc': '圧倒するのではなく、意味が残る相互作用。',
    'about.value3_title': '多様な視点の世界',
    'about.value3_desc': '違う場所、違う人生—どれも正当。',
    'about.value4_title': 'つながり',
    'about.value4_desc': 'エコーは、遠く離れていても孤独を和らげる。',
    'about.value5_title': 'やさしい創造性',
    'about.value5_desc': 'ダッシュボードではなく、“生きた作品”のようなプラットフォーム。',
    'about.value6_title': '共感',
    'about.value6_desc': '理解と支えを促すツールを作る。',

    'about.vision_title': 'ビジョンと未来',
    'about.vision_intro1':
      'EchoWorldは、インターネット上の静かな場所を目指す。物語が距離を越えて人をつなぎ、地球が“呼吸する人類のアーカイブ”のように感じられる場所。',
    'about.vision_intro2': '目的は「コンテンツを増やす」ことではない。「より良い共鳴」だ。',
    'about.vision_block1_title': '生きた地図',
    'about.vision_block1_item1': 'グローブ上のエコー表現を強化。',
    'about.vision_block1_item2': '物語が集まる場所の“鼓動”をより明確に。',
    'about.vision_block1_item3': '世界表示とローカル表示の滑らかな遷移。',
    'about.vision_block2_title': '人間的な会話',
    'about.vision_block2_item1': 'オンライン/オフラインの存在感シグナル。',
    'about.vision_block2_item2': '整ったスレッド：返信、リアクション、添付。',
    'about.vision_block2_item3': 'より安全なDMフローと意図の明確化。',
    'about.vision_block3_title': '信頼と明確さ',
    'about.vision_block3_item1': '通報・モデレーションの使いやすさ向上。',
    'about.vision_block3_item2': 'プロフィールのアイデンティティ制御を強化。',
    'about.vision_block3_item3': '「エコー」概念を伝えるオンボーディング改善。',

    'about.transparency_title': '透明性と連絡',
    'about.transparency_intro':
      'EchoWorldは、丁寧に作られた独立プロジェクト。問題報告、改善提案、コラボ希望があれば連絡してほしい。',
    'about.author_title': 'プロジェクト作者',
    'about.author_name': 'Régis KREMER (Baithz) — EchoWorld',
    'about.author_role': 'プロダクト + デザイン + エンジニアリング',
    'about.contact_title': '連絡',
    'about.contact_desc':
      '現時点では、連絡はプラットフォーム内（メッセージ）で行う。将来的に専用チャンネルを追加予定。',
    'about.contact_cta_messages': 'メッセージを開く',
    'about.footer_cta_share': 'あなたの物語を共有',
    'about.footer_cta_explore': 'さらに探検する',
  },
};
