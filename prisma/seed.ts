import { PrismaClient, Arcana, Suit, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// MAJOR ARCANA (22 cards) - Rider-Waite-Smith deck from Wikimedia Commons
// ============================================================================

const majorArcana = [
  {
    name: "The Fool",
    nameEs: "El Loco",
    number: 0,
    keywords: ["nuevos comienzos", "inocencia", "espontaneidad", "espíritu libre"],
    meaningUpright:
      "Nuevos comienzos, inocencia, espontaneidad y un espíritu libre. Es momento de dar un salto de fe y confiar en el universo. Representa el inicio de un viaje, la disposición a abrazar lo desconocido sin miedo.",
    meaningReversed:
      "Imprudencia, riesgo innecesario, falta de dirección. Puede indicar que estás siendo demasiado ingenuo o que estás evitando tomar responsabilidades. Es momento de reflexionar antes de actuar.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg",
  },
  {
    name: "The Magician",
    nameEs: "El Mago",
    number: 1,
    keywords: ["manifestación", "poder", "acción", "recursos"],
    meaningUpright:
      "Tienes todos los recursos y habilidades necesarios para manifestar tus deseos. Es un momento de poder personal, creatividad y acción. El universo está alineado para que logres tus metas.",
    meaningReversed:
      "Manipulación, talentos desperdiciados, engaño. Puede indicar que no estás utilizando tu potencial o que alguien está siendo deshonesto contigo. Revisa tus intenciones.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg",
  },
  {
    name: "The High Priestess",
    nameEs: "La Sacerdotisa",
    number: 2,
    keywords: ["intuición", "misterio", "sabiduría interior", "lo subconsciente"],
    meaningUpright:
      "Confía en tu intuición y sabiduría interior. Hay conocimiento oculto que necesitas descubrir. Es momento de escuchar tu voz interior y prestar atención a tus sueños y presentimientos.",
    meaningReversed:
      "Secretos, desconexión de la intuición, información oculta. Puede indicar que estás ignorando tu voz interior o que hay verdades que no quieres enfrentar.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg",
  },
  {
    name: "The Empress",
    nameEs: "La Emperatriz",
    number: 3,
    keywords: ["fertilidad", "abundancia", "naturaleza", "feminidad"],
    meaningUpright:
      "Abundancia, fertilidad y conexión con la naturaleza. Representa la creatividad floreciendo, el cuidado maternal y la sensualidad. Es un momento de crecimiento y prosperidad.",
    meaningReversed:
      "Dependencia, bloqueo creativo, negligencia. Puede indicar problemas con la maternidad, falta de crecimiento personal o desconexión de tu lado nurturante.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg",
  },
  {
    name: "The Emperor",
    nameEs: "El Emperador",
    number: 4,
    keywords: ["autoridad", "estructura", "liderazgo", "padre"],
    meaningUpright:
      "Autoridad, estructura y control. Representa el liderazgo, la disciplina y la capacidad de crear orden en el caos. Es momento de tomar el mando de tu vida con determinación.",
    meaningReversed:
      "Tiranía, rigidez, falta de disciplina. Puede indicar abuso de poder, inflexibilidad o problemas con figuras de autoridad.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg",
  },
  {
    name: "The Hierophant",
    nameEs: "El Hierofante",
    number: 5,
    keywords: ["tradición", "conformidad", "espiritualidad", "educación"],
    meaningUpright:
      "Tradición, enseñanzas espirituales y conformidad con sistemas establecidos. Representa la búsqueda de conocimiento a través de instituciones y la guía de un mentor.",
    meaningReversed:
      "Rebelión, no conformidad, nuevos enfoques. Puede indicar el cuestionamiento de tradiciones o la necesidad de encontrar tu propio camino espiritual.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg",
  },
  {
    name: "The Lovers",
    nameEs: "Los Enamorados",
    number: 6,
    keywords: ["amor", "armonía", "relaciones", "elecciones"],
    meaningUpright:
      "Amor, armonía y relaciones significativas. Representa una conexión profunda, ya sea romántica o de valores. También indica una decisión importante que debe tomarse desde el corazón.",
    meaningReversed:
      "Desequilibrio, desalineación de valores, malas decisiones. Puede indicar conflictos en relaciones o falta de armonía interior.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3a/TheLovers.jpg",
  },
  {
    name: "The Chariot",
    nameEs: "El Carro",
    number: 7,
    keywords: ["determinación", "voluntad", "victoria", "control"],
    meaningUpright:
      "Victoria a través de la determinación y el control. Representa el triunfo sobre obstáculos mediante la fuerza de voluntad. Es momento de avanzar con confianza hacia tus metas.",
    meaningReversed:
      "Falta de control, agresión, obstáculos. Puede indicar que estás perdiendo el rumbo o que fuerzas opuestas están bloqueando tu progreso.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg",
  },
  {
    name: "Strength",
    nameEs: "La Fuerza",
    number: 8,
    keywords: ["coraje", "paciencia", "compasión", "fortaleza interior"],
    meaningUpright:
      "Fuerza interior, coraje y paciencia. No se trata de fuerza bruta, sino de la capacidad de superar desafíos con gracia y compasión. Tienes más fortaleza de la que crees.",
    meaningReversed:
      "Inseguridad, dudas, debilidad interior. Puede indicar falta de confianza en ti mismo o el uso inadecuado de tu poder personal.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg",
  },
  {
    name: "The Hermit",
    nameEs: "El Ermitaño",
    number: 9,
    keywords: ["introspección", "soledad", "búsqueda interior", "guía"],
    meaningUpright:
      "Tiempo de introspección y búsqueda interior. Representa la necesidad de retirarse del mundo para encontrar respuestas dentro de ti. La soledad puede ser tu mejor maestra ahora.",
    meaningReversed:
      "Aislamiento excesivo, soledad no deseada, rechazo de ayuda. Puede indicar que te has alejado demasiado o que te niegas a aceptar la guía que necesitas.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg",
  },
  {
    name: "Wheel of Fortune",
    nameEs: "La Rueda de la Fortuna",
    number: 10,
    keywords: ["destino", "cambio", "ciclos", "suerte"],
    meaningUpright:
      "Los ciclos de la vida están cambiando a tu favor. Representa el destino, la buena fortuna y los giros inesperados. Acepta que el cambio es la única constante.",
    meaningReversed:
      "Mala suerte, resistencia al cambio, ciclos negativos. Puede indicar que estás luchando contra el flujo natural de la vida o atravesando un período difícil.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg",
  },
  {
    name: "Justice",
    nameEs: "La Justicia",
    number: 11,
    keywords: ["justicia", "verdad", "causa y efecto", "ley"],
    meaningUpright:
      "Justicia, verdad y la ley del karma. Las consecuencias de tus acciones están llegando. Es momento de ser honesto contigo mismo y con los demás, y de tomar decisiones justas.",
    meaningReversed:
      "Injusticia, falta de responsabilidad, deshonestidad. Puede indicar que estás evitando las consecuencias de tus actos o siendo tratado injustamente.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg",
  },
  {
    name: "The Hanged Man",
    nameEs: "El Colgado",
    number: 12,
    keywords: ["pausa", "rendición", "nueva perspectiva", "sacrificio"],
    meaningUpright:
      "Tiempo de pausa y rendición. Ver las cosas desde una nueva perspectiva puede traer iluminación. A veces necesitas dejar ir el control para avanzar.",
    meaningReversed:
      "Resistencia, estancamiento, sacrificios innecesarios. Puede indicar que te niegas a ver otra perspectiva o que estás atrapado en patrones improductivos.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg",
  },
  {
    name: "Death",
    nameEs: "La Muerte",
    number: 13,
    keywords: ["transformación", "finales", "cambio", "transición"],
    meaningUpright:
      "Transformación profunda y finales necesarios. No representa muerte literal, sino el cierre de un capítulo para que algo nuevo pueda nacer. Abraza el cambio.",
    meaningReversed:
      "Resistencia al cambio, estancamiento, miedo a lo nuevo. Puede indicar que te aferras a algo que ya no te sirve o que evitas una transformación necesaria.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg",
  },
  {
    name: "Temperance",
    nameEs: "La Templanza",
    number: 14,
    keywords: ["equilibrio", "moderación", "paciencia", "propósito"],
    meaningUpright:
      "Equilibrio, moderación y paciencia. Es momento de encontrar el punto medio y fluir con la vida. La armonía viene de integrar los opuestos con gracia.",
    meaningReversed:
      "Desequilibrio, exceso, falta de armonía. Puede indicar que estás yendo a los extremos o que has perdido tu centro.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg",
  },
  {
    name: "The Devil",
    nameEs: "El Diablo",
    number: 15,
    keywords: ["ataduras", "adicción", "materialismo", "sombra"],
    meaningUpright:
      "Ataduras, adicciones y la sombra interior. Representa las cadenas que nos ponemos nosotros mismos. Es momento de reconocer qué te mantiene esclavizado y liberarte.",
    meaningReversed:
      "Liberación, independencia, romper cadenas. Puede indicar que estás listo para soltar adicciones o patrones destructivos.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg",
  },
  {
    name: "The Tower",
    nameEs: "La Torre",
    number: 16,
    keywords: ["caos", "destrucción", "revelación", "cambio súbito"],
    meaningUpright:
      "Cambio súbito y destrucción de lo falso. Aunque puede ser doloroso, La Torre derriba lo que no estaba construido sobre bases sólidas. La verdad sale a la luz.",
    meaningReversed:
      "Evitar el desastre, miedo al cambio, crisis interna. Puede indicar que estás postergando una destrucción necesaria o experimentando turbulencia interior.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg",
  },
  {
    name: "The Star",
    nameEs: "La Estrella",
    number: 17,
    keywords: ["esperanza", "inspiración", "renovación", "serenidad"],
    meaningUpright:
      "Esperanza, inspiración y renovación después de la tormenta. Representa la fe en el futuro y la conexión con lo divino. Un período de sanación y paz está llegando.",
    meaningReversed:
      "Desesperanza, falta de fe, desconexión. Puede indicar que has perdido la esperanza o que te sientes desconectado de tu propósito.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg",
  },
  {
    name: "The Moon",
    nameEs: "La Luna",
    number: 18,
    keywords: ["ilusión", "intuición", "miedos", "subconsciente"],
    meaningUpright:
      "El reino de la intuición, los sueños y el subconsciente. Las cosas no son lo que parecen. Confía en tu intuición pero sé consciente de tus miedos e ilusiones.",
    meaningReversed:
      "Confusión, miedos superados, claridad emergente. Puede indicar que estás saliendo de un período de incertidumbre o que tus miedos están disminuyendo.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg",
  },
  {
    name: "The Sun",
    nameEs: "El Sol",
    number: 19,
    keywords: ["alegría", "éxito", "vitalidad", "positividad"],
    meaningUpright:
      "Alegría, éxito y vitalidad radiante. Es uno de los mejores augurios del tarot. Representa felicidad, logros y la energía positiva que ilumina todo a tu alrededor.",
    meaningReversed:
      "Alegría temporal, exceso de optimismo, ego inflado. Puede indicar que estás siendo demasiado optimista o que la felicidad es superficial.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg",
  },
  {
    name: "Judgement",
    nameEs: "El Juicio",
    number: 20,
    keywords: ["renacimiento", "llamado interior", "absolución", "evaluación"],
    meaningUpright:
      "Renacimiento, llamado interior y evaluación. Es momento de hacer un balance de tu vida y responder a un llamado superior. Una nueva fase de existencia te espera.",
    meaningReversed:
      "Auto-duda, negación del llamado, falta de reflexión. Puede indicar que estás ignorando lecciones importantes o evitando la auto-evaluación.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg",
  },
  {
    name: "The World",
    nameEs: "El Mundo",
    number: 21,
    keywords: ["completitud", "integración", "logro", "viaje"],
    meaningUpright:
      "Completitud, integración y logro de metas. Representa el final exitoso de un ciclo y la celebración de todo lo aprendido. Has llegado a donde necesitabas estar.",
    meaningReversed:
      "Falta de cierre, metas incompletas, estancamiento. Puede indicar que algo te impide completar un ciclo o que te falta la última pieza del rompecabezas.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg",
  },
];

// ============================================================================
// MINOR ARCANA - WANDS (14 cards)
// ============================================================================

const wands = [
  {
    name: "Ace of Wands",
    nameEs: "As de Bastos",
    number: 1,
    keywords: ["inspiración", "nuevo comienzo", "potencial", "creatividad"],
    meaningUpright:
      "Nueva inspiración, entusiasmo y potencial creativo. Es el inicio de una aventura apasionante. Tienes la chispa para comenzar algo nuevo y emocionante.",
    meaningReversed:
      "Falta de energía, retrasos, creatividad bloqueada. Puede indicar que no es el momento adecuado para comenzar o que te falta motivación.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/11/Wands01.jpg",
  },
  {
    name: "Two of Wands",
    nameEs: "Dos de Bastos",
    number: 2,
    keywords: ["planificación", "decisiones", "progreso", "descubrimiento"],
    meaningUpright:
      "Planificación del futuro y toma de decisiones. Tienes el mundo en tus manos. Es momento de evaluar opciones y decidir qué camino tomar.",
    meaningReversed:
      "Miedo a lo desconocido, falta de planificación, indecisión. Puede indicar que te cuesta dar el siguiente paso o que estás atrapado en tu zona de confort.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Wands02.jpg",
  },
  {
    name: "Three of Wands",
    nameEs: "Tres de Bastos",
    number: 3,
    keywords: ["expansión", "previsión", "oportunidades", "crecimiento"],
    meaningUpright:
      "Expansión, previsión y oportunidades en el horizonte. Tus planes están dando frutos. Es momento de mirar hacia adelante con optimismo.",
    meaningReversed:
      "Retrasos, obstáculos, falta de previsión. Puede indicar que tus planes no están saliendo como esperabas o que te falta visión a largo plazo.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Wands03.jpg",
  },
  {
    name: "Four of Wands",
    nameEs: "Cuatro de Bastos",
    number: 4,
    keywords: ["celebración", "armonía", "hogar", "comunidad"],
    meaningUpright:
      "Celebración, armonía y alegría compartida. Representa reuniones felices, logros celebrados y la sensación de pertenencia. Es momento de disfrutar.",
    meaningReversed:
      "Conflictos en el hogar, falta de armonía, celebración postergada. Puede indicar tensiones familiares o que algo impide la celebración.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Wands04.jpg",
  },
  {
    name: "Five of Wands",
    nameEs: "Cinco de Bastos",
    number: 5,
    keywords: ["conflicto", "competencia", "tensión", "desacuerdo"],
    meaningUpright:
      "Competencia, conflicto y tensión. Hay desacuerdos y choques de egos. Puede ser una competencia saludable que te impulsa a mejorar.",
    meaningReversed:
      "Evitar conflictos, fin de la competencia, armonía. Puede indicar que el conflicto está terminando o que estás evitando confrontaciones necesarias.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Wands05.jpg",
  },
  {
    name: "Six of Wands",
    nameEs: "Seis de Bastos",
    number: 6,
    keywords: ["victoria", "reconocimiento", "éxito", "triunfo"],
    meaningUpright:
      "Victoria, reconocimiento público y éxito. Has superado los obstáculos y ahora recibes el reconocimiento merecido. Disfruta tu triunfo.",
    meaningReversed:
      "Fracaso, falta de reconocimiento, ego herido. Puede indicar que el éxito se escapa o que buscas validación externa excesivamente.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Wands06.jpg",
  },
  {
    name: "Seven of Wands",
    nameEs: "Siete de Bastos",
    number: 7,
    keywords: ["defensa", "perseverancia", "desafío", "posición"],
    meaningUpright:
      "Defensa de tu posición y perseverancia ante desafíos. Estás siendo retado pero tienes la ventaja. Mantén tu terreno con determinación.",
    meaningReversed:
      "Abrumado, rendirse, falta de confianza. Puede indicar que estás cediendo ante la presión o que dudas de tu capacidad para mantener tu posición.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Wands07.jpg",
  },
  {
    name: "Eight of Wands",
    nameEs: "Ocho de Bastos",
    number: 8,
    keywords: ["velocidad", "movimiento", "acción rápida", "progreso"],
    meaningUpright:
      "Movimiento rápido, acción y progreso veloz. Las cosas se aceleran. Noticias llegan rápidamente y los eventos se desarrollan con velocidad.",
    meaningReversed:
      "Retrasos, frustración, lentitud. Puede indicar que las cosas no avanzan tan rápido como quisieras o que hay obstáculos inesperados.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Wands08.jpg",
  },
  {
    name: "Nine of Wands",
    nameEs: "Nueve de Bastos",
    number: 9,
    keywords: ["resistencia", "persistencia", "prueba de fe", "límites"],
    meaningUpright:
      "Resistencia, persistencia y fortaleza ante la adversidad. Estás agotado pero cerca de la meta. Un último esfuerzo te llevará al éxito.",
    meaningReversed:
      "Paranoia, agotamiento, negarse a ceder. Puede indicar que estás demasiado a la defensiva o que necesitas descansar antes de continuar.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Wands09.jpg",
  },
  {
    name: "Ten of Wands",
    nameEs: "Diez de Bastos",
    number: 10,
    keywords: ["carga", "responsabilidad", "estrés", "trabajo duro"],
    meaningUpright:
      "Carga pesada, responsabilidades excesivas y trabajo duro. Has tomado demasiado. Es momento de evaluar qué puedes delegar o soltar.",
    meaningReversed:
      "Liberación de cargas, delegación, burnout. Puede indicar que finalmente sueltas responsabilidades o que el estrés te está afectando seriamente.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Wands10.jpg",
  },
  {
    name: "Page of Wands",
    nameEs: "Sota de Bastos",
    number: 11,
    keywords: ["exploración", "entusiasmo", "descubrimiento", "mensajes"],
    meaningUpright:
      "Entusiasmo juvenil, exploración y nuevas ideas. Representa el inicio de una aventura creativa. Buenas noticias relacionadas con proyectos pueden llegar.",
    meaningReversed:
      "Falta de dirección, ideas dispersas, retrasos en noticias. Puede indicar que te falta enfoque o que proyectos se estancan.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Wands11.jpg",
  },
  {
    name: "Knight of Wands",
    nameEs: "Caballero de Bastos",
    number: 12,
    keywords: ["acción", "aventura", "impulsividad", "energía"],
    meaningUpright:
      "Acción apasionada, aventura y energía impetuosa. Es momento de perseguir tus metas con entusiasmo. La acción audaz trae resultados.",
    meaningReversed:
      "Impulsividad excesiva, frustración, falta de dirección. Puede indicar que actúas sin pensar o que tu energía está dispersa.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/16/Wands12.jpg",
  },
  {
    name: "Queen of Wands",
    nameEs: "Reina de Bastos",
    number: 13,
    keywords: ["confianza", "determinación", "carisma", "independencia"],
    meaningUpright:
      "Confianza radiante, determinación y carisma natural. Representa a alguien magnético que inspira a otros. Tu presencia ilumina cualquier espacio.",
    meaningReversed:
      "Inseguridad, celos, temperamento. Puede indicar falta de confianza en ti mismo o tendencias controladoras.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wands13.jpg",
  },
  {
    name: "King of Wands",
    nameEs: "Rey de Bastos",
    number: 14,
    keywords: ["liderazgo", "visión", "emprendimiento", "honor"],
    meaningUpright:
      "Liderazgo natural, visión emprendedora y honor. Representa a un líder carismático que inspira y motiva. Tienes la capacidad de hacer realidad grandes visiones.",
    meaningReversed:
      "Tiranía, impulsividad, expectativas irreales. Puede indicar abuso de poder o proyectos que fracasan por falta de planificación.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Wands14.jpg",
  },
];

// ============================================================================
// MINOR ARCANA - CUPS (14 cards)
// ============================================================================

const cups = [
  {
    name: "Ace of Cups",
    nameEs: "As de Copas",
    number: 1,
    keywords: ["amor nuevo", "emoción", "intuición", "creatividad"],
    meaningUpright:
      "Nuevo amor, despertar emocional e intuición profunda. El corazón se abre a nuevas posibilidades. Es un momento de conexión emocional y espiritual.",
    meaningReversed:
      "Bloqueo emocional, amor rechazado, vacío interior. Puede indicar dificultad para expresar o recibir amor.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/36/Cups01.jpg",
  },
  {
    name: "Two of Cups",
    nameEs: "Dos de Copas",
    number: 2,
    keywords: ["unión", "asociación", "atracción", "conexión"],
    meaningUpright:
      "Unión, asociación y conexión mutua. Representa una relación equilibrada donde ambas partes dan y reciben. Puede ser romántica o una amistad profunda.",
    meaningReversed:
      "Desequilibrio en relaciones, separación, desconexión. Puede indicar falta de reciprocidad o una ruptura.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/Cups02.jpg",
  },
  {
    name: "Three of Cups",
    nameEs: "Tres de Copas",
    number: 3,
    keywords: ["celebración", "amistad", "comunidad", "creatividad"],
    meaningUpright:
      "Celebración, amistad y alegría compartida. Representa reuniones felices con amigos y la celebración de logros en comunidad.",
    meaningReversed:
      "Exceso, chismes, aislamiento social. Puede indicar problemas en amistades o celebraciones que se salen de control.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Cups03.jpg",
  },
  {
    name: "Four of Cups",
    nameEs: "Cuatro de Copas",
    number: 4,
    keywords: ["apatía", "contemplación", "insatisfacción", "reevaluación"],
    meaningUpright:
      "Apatía, contemplación y posible insatisfacción. Estás tan enfocado en lo que falta que no ves las oportunidades frente a ti. Es momento de reflexionar.",
    meaningReversed:
      "Nueva perspectiva, aceptación, motivación renovada. Puede indicar que sales de un período de apatía y ves nuevas posibilidades.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/35/Cups04.jpg",
  },
  {
    name: "Five of Cups",
    nameEs: "Cinco de Copas",
    number: 5,
    keywords: ["pérdida", "duelo", "arrepentimiento", "decepción"],
    meaningUpright:
      "Pérdida, duelo y enfoque en lo negativo. Estás lamentando lo perdido sin ver lo que aún tienes. El dolor es válido, pero no te quedes atrapado en él.",
    meaningReversed:
      "Aceptación, avanzar, perdón. Puede indicar que comienzas a superar una pérdida y a ver el lado positivo.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Cups05.jpg",
  },
  {
    name: "Six of Cups",
    nameEs: "Seis de Copas",
    number: 6,
    keywords: ["nostalgia", "recuerdos", "inocencia", "reunión"],
    meaningUpright:
      "Nostalgia, recuerdos felices e inocencia. Puede indicar el reencuentro con alguien del pasado o la necesidad de reconectar con tu niño interior.",
    meaningReversed:
      "Vivir en el pasado, idealización, incapacidad de avanzar. Puede indicar que te aferras a recuerdos en lugar de vivir el presente.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/17/Cups06.jpg",
  },
  {
    name: "Seven of Cups",
    nameEs: "Siete de Copas",
    number: 7,
    keywords: ["fantasía", "opciones", "ilusión", "imaginación"],
    meaningUpright:
      "Muchas opciones, fantasías e ilusiones. Hay tantas posibilidades que es difícil elegir. Ten cuidado de no perderte en sueños irreales.",
    meaningReversed:
      "Claridad, determinación, demasiadas opciones abruman. Puede indicar que finalmente tomas una decisión o que la realidad te golpea.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Cups07.jpg",
  },
  {
    name: "Eight of Cups",
    nameEs: "Ocho de Copas",
    number: 8,
    keywords: ["abandono", "búsqueda", "decepción", "avanzar"],
    meaningUpright:
      "Dejar atrás lo que ya no satisface para buscar algo más profundo. Es un viaje valiente hacia lo desconocido en busca de significado.",
    meaningReversed:
      "Miedo a dejar ir, estancamiento, evitar el cambio. Puede indicar que sabes que debes irte pero no encuentras el coraje.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/60/Cups08.jpg",
  },
  {
    name: "Nine of Cups",
    nameEs: "Nueve de Copas",
    number: 9,
    keywords: ["satisfacción", "deseos cumplidos", "gratitud", "abundancia"],
    meaningUpright:
      "Satisfacción emocional y deseos cumplidos. Conocida como la carta de los deseos, indica que lo que anhelas puede manifestarse. Gratitud y contentamiento.",
    meaningReversed:
      "Deseos insatisfechos, materialismo, complacencia. Puede indicar que buscas felicidad en lugares equivocados o que nada te satisface.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Cups09.jpg",
  },
  {
    name: "Ten of Cups",
    nameEs: "Diez de Copas",
    number: 10,
    keywords: ["armonía familiar", "felicidad", "alineamiento", "hogar"],
    meaningUpright:
      "Armonía familiar, felicidad duradera y plenitud emocional. Representa el ideal de felicidad: amor, familia y paz. Todo está alineado.",
    meaningReversed:
      "Conflictos familiares, valores desalineados, hogar roto. Puede indicar problemas en las relaciones familiares o la pérdida de armonía.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/84/Cups10.jpg",
  },
  {
    name: "Page of Cups",
    nameEs: "Sota de Copas",
    number: 11,
    keywords: ["creatividad", "intuición", "mensajes", "sensibilidad"],
    meaningUpright:
      "Mensajes emocionales, creatividad intuitiva y sensibilidad. Representa noticias de amor o el despertar de dones creativos e intuitivos.",
    meaningReversed:
      "Inmadurez emocional, bloqueo creativo, malas noticias. Puede indicar dificultad para expresar emociones o decepciones amorosas.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Cups11.jpg",
  },
  {
    name: "Knight of Cups",
    nameEs: "Caballero de Copas",
    number: 12,
    keywords: ["romance", "encanto", "imaginación", "propuestas"],
    meaningUpright:
      "El romántico, encantador y soñador. Representa propuestas, invitaciones y la llegada de romance o inspiración creativa.",
    meaningReversed:
      "Desilusión, ofertas no realistas, manipulación emocional. Puede indicar promesas vacías o alguien que no es lo que parece.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Cups12.jpg",
  },
  {
    name: "Queen of Cups",
    nameEs: "Reina de Copas",
    number: 13,
    keywords: ["compasión", "intuición", "curación", "sensibilidad"],
    meaningUpright:
      "Compasión profunda, intuición desarrollada y sanación emocional. Representa a alguien emocionalmente inteligente que cuida y nutre a otros.",
    meaningReversed:
      "Dependencia emocional, inseguridad, manipulación. Puede indicar problemas con los límites emocionales o ser demasiado sensible.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/62/Cups13.jpg",
  },
  {
    name: "King of Cups",
    nameEs: "Rey de Copas",
    number: 14,
    keywords: ["equilibrio emocional", "diplomacia", "madurez", "sabiduría"],
    meaningUpright:
      "Maestría emocional, diplomacia y sabiduría compasiva. Representa a alguien que controla sus emociones sin reprimirlas. Un consejero sabio.",
    meaningReversed:
      "Represión emocional, manipulación, frialdad. Puede indicar alguien que usa las emociones para manipular o que está emocionalmente desconectado.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/Cups14.jpg",
  },
];

// ============================================================================
// MINOR ARCANA - SWORDS (14 cards)
// ============================================================================

const swords = [
  {
    name: "Ace of Swords",
    nameEs: "As de Espadas",
    number: 1,
    keywords: ["claridad", "verdad", "nuevo pensamiento", "justicia"],
    meaningUpright:
      "Claridad mental, nuevas ideas y avances intelectuales. La verdad sale a la luz. Es momento de cortar con lo viejo y abrazar nuevas formas de pensar.",
    meaningReversed:
      "Confusión, mala comunicación, ideas bloqueadas. Puede indicar que la verdad está siendo distorsionada o que hay caos mental.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Swords01.jpg",
  },
  {
    name: "Two of Swords",
    nameEs: "Dos de Espadas",
    number: 2,
    keywords: ["indecisión", "estancamiento", "elección difícil", "negación"],
    meaningUpright:
      "Indecisión, estancamiento y bloqueo. Estás evitando una decisión difícil. La negación no resolverá el problema; debes enfrentar la situación.",
    meaningReversed:
      "Decisión tomada, verdad revelada, confusión. Puede indicar que finalmente enfrentas una elección difícil o que te sientes abrumado.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Swords02.jpg",
  },
  {
    name: "Three of Swords",
    nameEs: "Tres de Espadas",
    number: 3,
    keywords: ["corazón roto", "dolor", "pena", "traición"],
    meaningUpright:
      "Dolor del corazón, pena y traición. Representa una herida emocional profunda que debe ser reconocida y procesada para sanar.",
    meaningReversed:
      "Recuperación, perdón, liberación del dolor. Puede indicar que comienzas a sanar de una herida emocional.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/02/Swords03.jpg",
  },
  {
    name: "Four of Swords",
    nameEs: "Cuatro de Espadas",
    number: 4,
    keywords: ["descanso", "recuperación", "contemplación", "pausa"],
    meaningUpright:
      "Descanso necesario, recuperación y contemplación. Es momento de retirarse y recargar energías. La meditación y el silencio traen claridad.",
    meaningReversed:
      "Agotamiento, inquietud, resistencia al descanso. Puede indicar que te niegas a tomar el descanso que necesitas.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Swords04.jpg",
  },
  {
    name: "Five of Swords",
    nameEs: "Cinco de Espadas",
    number: 5,
    keywords: ["conflicto", "derrota", "victoria vacía", "deshonor"],
    meaningUpright:
      "Conflicto, tensión y posible victoria a costa de otros. Ganar esta batalla puede significar perder algo más valioso. Considera si vale la pena.",
    meaningReversed:
      "Reconciliación, fin del conflicto, aprender de la derrota. Puede indicar que el conflicto termina o que reconoces tus errores.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/23/Swords05.jpg",
  },
  {
    name: "Six of Swords",
    nameEs: "Seis de Espadas",
    number: 6,
    keywords: ["transición", "cambio", "alejarse", "sanación"],
    meaningUpright:
      "Transición hacia aguas más tranquilas. Dejas atrás tiempos difíciles. Aunque el viaje es melancólico, te diriges hacia la recuperación.",
    meaningReversed:
      "Resistencia al cambio, equipaje emocional, estancamiento. Puede indicar dificultad para dejar ir el pasado.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Swords06.jpg",
  },
  {
    name: "Seven of Swords",
    nameEs: "Siete de Espadas",
    number: 7,
    keywords: ["engaño", "estrategia", "sigilo", "traición"],
    meaningUpright:
      "Estrategia, sigilo y posible engaño. Alguien puede estar actuando de manera deshonesta. También puede indicar la necesidad de ser astuto.",
    meaningReversed:
      "Verdad revelada, conciencia culpable, planes descubiertos. Puede indicar que un engaño sale a la luz.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/34/Swords07.jpg",
  },
  {
    name: "Eight of Swords",
    nameEs: "Ocho de Espadas",
    number: 8,
    keywords: ["restricción", "víctima", "prisión mental", "impotencia"],
    meaningUpright:
      "Sentirse atrapado, restricción y victimización. Sin embargo, las limitaciones son principalmente mentales. Tienes más poder del que crees.",
    meaningReversed:
      "Liberación, nueva perspectiva, empoderamiento. Puede indicar que finalmente ves que las cadenas eran ilusorias.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Swords08.jpg",
  },
  {
    name: "Nine of Swords",
    nameEs: "Nueve de Espadas",
    number: 9,
    keywords: ["ansiedad", "pesadillas", "preocupación", "desesperación"],
    meaningUpright:
      "Ansiedad, pesadillas y preocupación excesiva. El miedo y la angustia te mantienen despierto. A menudo, los miedos son peores que la realidad.",
    meaningReversed:
      "Liberación de la ansiedad, esperanza, buscar ayuda. Puede indicar que comienzas a superar tus miedos o que necesitas apoyo.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Swords09.jpg",
  },
  {
    name: "Ten of Swords",
    nameEs: "Diez de Espadas",
    number: 10,
    keywords: ["fin doloroso", "traición", "crisis", "tocar fondo"],
    meaningUpright:
      "Final doloroso, traición y tocar fondo. Es el momento más oscuro, pero recuerda: después de esto, solo puede mejorar. El amanecer viene.",
    meaningReversed:
      "Recuperación, resistirse al inevitable, lecciones aprendidas. Puede indicar que el peor momento ya pasó.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Swords10.jpg",
  },
  {
    name: "Page of Swords",
    nameEs: "Sota de Espadas",
    number: 11,
    keywords: ["curiosidad", "vigilancia", "nuevas ideas", "comunicación"],
    meaningUpright:
      "Mente curiosa, vigilancia y nuevas ideas. Representa comunicación, mensajes y la búsqueda de la verdad con entusiasmo juvenil.",
    meaningReversed:
      "Chismes, ideas dispersas, falta de planificación. Puede indicar comunicación problemática o hablar sin pensar.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Swords11.jpg",
  },
  {
    name: "Knight of Swords",
    nameEs: "Caballero de Espadas",
    number: 12,
    keywords: ["acción rápida", "ambición", "determinación", "impaciencia"],
    meaningUpright:
      "Acción rápida, ambición y determinación feroz. Avanzas hacia tu objetivo sin mirar atrás. La velocidad es tu aliada, pero cuidado con la imprudencia.",
    meaningReversed:
      "Imprudencia, agresión, falta de dirección. Puede indicar que actúas sin pensar o que tu energía está fuera de control.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Swords12.jpg",
  },
  {
    name: "Queen of Swords",
    nameEs: "Reina de Espadas",
    number: 13,
    keywords: ["percepción", "independencia", "verdad", "experiencia"],
    meaningUpright:
      "Percepción aguda, independencia y comunicación directa. Representa a alguien que ha aprendido de experiencias difíciles y habla con claridad y verdad.",
    meaningReversed:
      "Frialdad, amargura, crueldad verbal. Puede indicar a alguien que usa su inteligencia para herir o que está emocionalmente cerrado.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Swords13.jpg",
  },
  {
    name: "King of Swords",
    nameEs: "Rey de Espadas",
    number: 14,
    keywords: ["autoridad intelectual", "verdad", "ética", "lógica"],
    meaningUpright:
      "Autoridad intelectual, claridad mental y estándares éticos altos. Representa la toma de decisiones basada en la razón y la verdad.",
    meaningReversed:
      "Tiranía intelectual, manipulación, frialdad excesiva. Puede indicar abuso de poder intelectual o falta de empatía.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Swords14.jpg",
  },
];

// ============================================================================
// MINOR ARCANA - PENTACLES (14 cards)
// ============================================================================

const pentacles = [
  {
    name: "Ace of Pentacles",
    nameEs: "As de Oros",
    number: 1,
    keywords: ["oportunidad", "prosperidad", "nuevo comienzo financiero", "manifestación"],
    meaningUpright:
      "Nueva oportunidad material, prosperidad y manifestación. Es el comienzo de abundancia financiera o un nuevo proyecto con potencial de crecimiento.",
    meaningReversed:
      "Oportunidad perdida, mala planificación financiera, falta de previsión. Puede indicar que una oportunidad se escapa por falta de acción.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pents01.jpg",
  },
  {
    name: "Two of Pentacles",
    nameEs: "Dos de Oros",
    number: 2,
    keywords: ["equilibrio", "adaptabilidad", "prioridades", "manejo del tiempo"],
    meaningUpright:
      "Equilibrio entre prioridades, adaptabilidad y manejo del tiempo. Estás haciendo malabares con múltiples responsabilidades. Mantén la flexibilidad.",
    meaningReversed:
      "Desequilibrio, desorganización, sobrecarga. Puede indicar que has tomado demasiado o que no puedes mantener el equilibrio.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Pents02.jpg",
  },
  {
    name: "Three of Pentacles",
    nameEs: "Tres de Oros",
    number: 3,
    keywords: ["trabajo en equipo", "colaboración", "habilidad", "aprendizaje"],
    meaningUpright:
      "Trabajo en equipo, colaboración y reconocimiento de habilidades. Representa proyectos exitosos logrados mediante cooperación y aprendizaje.",
    meaningReversed:
      "Falta de trabajo en equipo, mediocridad, conflictos laborales. Puede indicar problemas de comunicación en el trabajo.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/42/Pents03.jpg",
  },
  {
    name: "Four of Pentacles",
    nameEs: "Cuatro de Oros",
    number: 4,
    keywords: ["seguridad", "control", "posesividad", "ahorro"],
    meaningUpright:
      "Seguridad financiera, control y protección de recursos. Puede indicar tanto prudencia financiera como excesivo apego al dinero.",
    meaningReversed:
      "Generosidad, soltar el control, inseguridad material. Puede indicar que aprendes a compartir o que el miedo a perder te domina.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/35/Pents04.jpg",
  },
  {
    name: "Five of Pentacles",
    nameEs: "Cinco de Oros",
    number: 5,
    keywords: ["pobreza", "aislamiento", "preocupación", "inseguridad"],
    meaningUpright:
      "Dificultades financieras, aislamiento y preocupación material. Aunque el momento es difícil, hay ayuda disponible si la buscas.",
    meaningReversed:
      "Recuperación, fin de tiempos difíciles, ayuda recibida. Puede indicar que la situación financiera mejora.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/96/Pents05.jpg",
  },
  {
    name: "Six of Pentacles",
    nameEs: "Seis de Oros",
    number: 6,
    keywords: ["generosidad", "caridad", "dar y recibir", "equilibrio"],
    meaningUpright:
      "Generosidad, caridad y el flujo de dar y recibir. Representa tanto dar como recibir ayuda. El equilibrio en el intercambio material.",
    meaningReversed:
      "Deuda, generosidad con condiciones, desigualdad. Puede indicar dar más de lo que puedes o recibir con condiciones.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Pents06.jpg",
  },
  {
    name: "Seven of Pentacles",
    nameEs: "Siete de Oros",
    number: 7,
    keywords: ["paciencia", "inversión a largo plazo", "evaluación", "perseverancia"],
    meaningUpright:
      "Paciencia, evaluación del progreso e inversión a largo plazo. Has trabajado duro; ahora espera a ver los frutos de tu esfuerzo.",
    meaningReversed:
      "Impaciencia, falta de recompensa, mala inversión. Puede indicar frustración por falta de resultados o esfuerzos mal dirigidos.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Pents07.jpg",
  },
  {
    name: "Eight of Pentacles",
    nameEs: "Ocho de Oros",
    number: 8,
    keywords: ["maestría", "habilidad", "dedicación", "artesanía"],
    meaningUpright:
      "Maestría, dedicación al oficio y desarrollo de habilidades. Representa el trabajo diligente que lleva a la excelencia. Enfoque en mejorar.",
    meaningReversed:
      "Falta de enfoque, mediocridad, trabajo sin sentido. Puede indicar que te falta motivación o que el trabajo se siente vacío.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/49/Pents08.jpg",
  },
  {
    name: "Nine of Pentacles",
    nameEs: "Nueve de Oros",
    number: 9,
    keywords: ["abundancia", "independencia", "lujo", "autosuficiencia"],
    meaningUpright:
      "Abundancia, independencia financiera y disfrute del lujo ganado. Representa la culminación de esfuerzos y la capacidad de disfrutar los frutos del trabajo.",
    meaningReversed:
      "Dependencia financiera, exceso, trabajo excesivo. Puede indicar que el éxito ha costado demasiado o falta de autosuficiencia.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Pents09.jpg",
  },
  {
    name: "Ten of Pentacles",
    nameEs: "Diez de Oros",
    number: 10,
    keywords: ["riqueza", "herencia", "familia", "legado"],
    meaningUpright:
      "Riqueza duradera, herencia y legado familiar. Representa la culminación de la prosperidad material, la seguridad y las raíces familiares fuertes.",
    meaningReversed:
      "Pérdida financiera, conflictos de herencia, falta de estabilidad. Puede indicar problemas familiares relacionados con dinero.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/42/Pents10.jpg",
  },
  {
    name: "Page of Pentacles",
    nameEs: "Sota de Oros",
    number: 11,
    keywords: ["ambición", "oportunidad", "estudio", "manifestación"],
    meaningUpright:
      "Nuevas oportunidades financieras, ambición y deseo de aprender. Representa el inicio de un proyecto práctico o estudios que llevarán a la prosperidad.",
    meaningReversed:
      "Falta de progreso, sueños sin acción, oportunidad perdida. Puede indicar que las ideas no se concretan.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Pents11.jpg",
  },
  {
    name: "Knight of Pentacles",
    nameEs: "Caballero de Oros",
    number: 12,
    keywords: ["trabajo duro", "responsabilidad", "rutina", "confiabilidad"],
    meaningUpright:
      "Trabajo duro, responsabilidad y enfoque metódico. Representa progreso lento pero seguro mediante esfuerzo constante y dedicación.",
    meaningReversed:
      "Estancamiento, pereza, obsesión con el trabajo. Puede indicar falta de progreso o ser demasiado rígido en tu enfoque.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Pents12.jpg",
  },
  {
    name: "Queen of Pentacles",
    nameEs: "Reina de Oros",
    number: 13,
    keywords: ["abundancia", "practicidad", "nutrición", "seguridad"],
    meaningUpright:
      "Abundancia práctica, nurturante y segura. Representa a alguien que crea un hogar próspero y cuida de las necesidades materiales de otros.",
    meaningReversed:
      "Desequilibrio trabajo-hogar, dependencia, materialismo. Puede indicar descuido del hogar o exceso de enfoque en lo material.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/88/Pents13.jpg",
  },
  {
    name: "King of Pentacles",
    nameEs: "Rey de Oros",
    number: 14,
    keywords: ["abundancia", "seguridad", "liderazgo", "disciplina"],
    meaningUpright:
      "Éxito material, liderazgo empresarial y abundancia estable. Representa a alguien que ha construido riqueza mediante disciplina y visión práctica.",
    meaningReversed:
      "Codicia, materialismo, corrupción financiera. Puede indicar obsesión con el dinero o éxito logrado mediante medios cuestionables.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Pents14.jpg",
  },
];

// ============================================================================
// SPREAD TYPES
// ============================================================================

const spreadTypes = [
  {
    name: "Three Card Spread",
    nameEs: "Tirada de Tres Cartas",
    description:
      "A simple yet powerful spread that reveals the past influences, present situation, and future possibilities.",
    descriptionEs:
      "Una tirada simple pero poderosa que revela las influencias del pasado, la situación presente y las posibilidades futuras.",
    cardCount: 3,
    creditCost: 1,
    positions: [
      {
        position: 1,
        name: "Past",
        nameEs: "Pasado",
        description: "Past influences affecting the current situation",
      },
      {
        position: 2,
        name: "Present",
        nameEs: "Presente",
        description: "The current situation and energies at play",
      },
      {
        position: 3,
        name: "Future",
        nameEs: "Futuro",
        description: "The likely outcome or future direction",
      },
    ],
  },
  {
    name: "Simple Cross",
    nameEs: "Cruz Simple",
    description:
      "A five-card spread that explores the situation from multiple angles: past, present, hidden influences, advice, and outcome.",
    descriptionEs:
      "Una tirada de cinco cartas que explora la situación desde múltiples ángulos: pasado, presente, influencias ocultas, consejo y resultado.",
    cardCount: 5,
    creditCost: 2,
    positions: [
      {
        position: 1,
        name: "Present",
        nameEs: "Presente",
        description: "The current situation or question at hand",
      },
      {
        position: 2,
        name: "Past",
        nameEs: "Pasado",
        description: "Recent past influences",
      },
      {
        position: 3,
        name: "Future",
        nameEs: "Futuro",
        description: "Near future possibilities",
      },
      {
        position: 4,
        name: "Hidden Influence",
        nameEs: "Influencia Oculta",
        description: "Subconscious factors or hidden influences",
      },
      {
        position: 5,
        name: "Advice",
        nameEs: "Consejo",
        description: "Guidance or recommended action",
      },
    ],
  },
  {
    name: "Horseshoe Spread",
    nameEs: "Tirada de la Herradura",
    description:
      "A seven-card spread shaped like a horseshoe, offering insights into past, present, hidden factors, obstacles, environment, advice, and outcome.",
    descriptionEs:
      "Una tirada de siete cartas en forma de herradura, que ofrece información sobre el pasado, presente, factores ocultos, obstáculos, entorno, consejo y resultado.",
    cardCount: 7,
    creditCost: 2,
    positions: [
      {
        position: 1,
        name: "Past",
        nameEs: "Pasado",
        description: "Past influences on the matter",
      },
      {
        position: 2,
        name: "Present",
        nameEs: "Presente",
        description: "Current circumstances",
      },
      {
        position: 3,
        name: "Hidden Factors",
        nameEs: "Factores Ocultos",
        description: "What you may not be aware of",
      },
      {
        position: 4,
        name: "Obstacles",
        nameEs: "Obstáculos",
        description: "Challenges to overcome",
      },
      {
        position: 5,
        name: "Environment",
        nameEs: "Entorno",
        description: "External influences and people around you",
      },
      {
        position: 6,
        name: "Advice",
        nameEs: "Consejo",
        description: "What you should do",
      },
      {
        position: 7,
        name: "Outcome",
        nameEs: "Resultado",
        description: "The likely result if you follow this path",
      },
    ],
  },
  {
    name: "Celtic Cross",
    nameEs: "Cruz Celta",
    description:
      "The most comprehensive and popular tarot spread, offering deep insights into all aspects of a situation through ten interconnected positions.",
    descriptionEs:
      "La tirada más completa y popular del tarot, que ofrece una visión profunda de todos los aspectos de una situación a través de diez posiciones interconectadas.",
    cardCount: 10,
    creditCost: 3,
    positions: [
      {
        position: 1,
        name: "Present",
        nameEs: "Presente",
        description: "Your current situation",
      },
      {
        position: 2,
        name: "Challenge",
        nameEs: "Desafío",
        description: "The immediate challenge or obstacle",
      },
      {
        position: 3,
        name: "Past",
        nameEs: "Pasado",
        description: "Recent past influences",
      },
      {
        position: 4,
        name: "Future",
        nameEs: "Futuro",
        description: "Near future influences",
      },
      {
        position: 5,
        name: "Above",
        nameEs: "Arriba",
        description: "Your goals and aspirations",
      },
      {
        position: 6,
        name: "Below",
        nameEs: "Abajo",
        description: "Subconscious influences",
      },
      {
        position: 7,
        name: "Advice",
        nameEs: "Consejo",
        description: "Suggested approach",
      },
      {
        position: 8,
        name: "External",
        nameEs: "Externo",
        description: "External influences and environment",
      },
      {
        position: 9,
        name: "Hopes & Fears",
        nameEs: "Esperanzas y Miedos",
        description: "Your hopes and fears about the outcome",
      },
      {
        position: 10,
        name: "Outcome",
        nameEs: "Resultado",
        description: "The final outcome if current path continues",
      },
    ],
  },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function main() {
  console.log("Starting seed process...\n");

  // Clear existing data
  console.log("Clearing existing data...");
  await prisma.creditTransaction.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.card.deleteMany();
  await prisma.spreadType.deleteMany();
  console.log("Existing data cleared\n");

  // Seed Major Arcana
  console.log("Seeding Major Arcana (22 cards)...");
  for (const card of majorArcana) {
    await prisma.card.create({
      data: {
        ...card,
        arcana: Arcana.MAJOR,
        suit: null,
      },
    });
  }
  console.log("Major Arcana seeded\n");

  // Seed Minor Arcana - Wands
  console.log("Seeding Wands (14 cards)...");
  for (const card of wands) {
    await prisma.card.create({
      data: {
        ...card,
        arcana: Arcana.MINOR,
        suit: Suit.WANDS,
      },
    });
  }
  console.log("Wands seeded\n");

  // Seed Minor Arcana - Cups
  console.log("Seeding Cups (14 cards)...");
  for (const card of cups) {
    await prisma.card.create({
      data: {
        ...card,
        arcana: Arcana.MINOR,
        suit: Suit.CUPS,
      },
    });
  }
  console.log("Cups seeded\n");

  // Seed Minor Arcana - Swords
  console.log("Seeding Swords (14 cards)...");
  for (const card of swords) {
    await prisma.card.create({
      data: {
        ...card,
        arcana: Arcana.MINOR,
        suit: Suit.SWORDS,
      },
    });
  }
  console.log("Swords seeded\n");

  // Seed Minor Arcana - Pentacles
  console.log("Seeding Pentacles (14 cards)...");
  for (const card of pentacles) {
    await prisma.card.create({
      data: {
        ...card,
        arcana: Arcana.MINOR,
        suit: Suit.PENTACLES,
      },
    });
  }
  console.log("Pentacles seeded\n");

  // Seed Spread Types
  console.log("Seeding Spread Types (4 types)...");
  for (const spread of spreadTypes) {
    await prisma.spreadType.create({
      data: spread,
    });
  }
  console.log("Spread Types seeded\n");

  // Summary
  const cardCount = await prisma.card.count();
  const spreadCount = await prisma.spreadType.count();
  console.log("═══════════════════════════════════════");
  console.log(`Seed complete!`);
  console.log(`   ${cardCount} cards created`);
  console.log(`   ${spreadCount} spread types created`);
  console.log("═══════════════════════════════════════\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
