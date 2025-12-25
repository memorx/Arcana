import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const blogPosts = [
  {
    slug: "beginners-guide-tarot-interpretation",
    title: "Beginner's Guide: How to Interpret Tarot Cards",
    titleEs: "Guía para principiantes: Cómo interpretar el tarot",
    excerpt: "Learn the fundamentals of tarot reading and discover how to interpret the cards for yourself and others.",
    excerptEs: "Aprende los fundamentos de la lectura del tarot y descubre cómo interpretar las cartas para ti y para otros.",
    content: `# Beginner's Guide: How to Interpret Tarot Cards

Tarot reading is an ancient art that has guided people for centuries. Whether you're seeking clarity about your future or looking for deeper self-understanding, learning to read tarot can be a transformative experience.

## Understanding the Deck

A standard tarot deck consists of 78 cards divided into two main sections:

### The Major Arcana (22 cards)
These cards represent major life events, spiritual lessons, and significant turning points. They include iconic cards like The Fool, The Magician, The High Priestess, and The World.

### The Minor Arcana (56 cards)
These cards deal with everyday situations and are divided into four suits:
- **Wands**: Passion, creativity, and ambition
- **Cups**: Emotions, relationships, and intuition
- **Swords**: Thoughts, communication, and conflict
- **Pentacles**: Material matters, career, and finances

## How to Begin a Reading

1. **Create a calm environment**: Find a quiet space where you won't be disturbed
2. **Clear your mind**: Take a few deep breaths and focus on your question
3. **Shuffle the cards**: While thinking about your question
4. **Draw your cards**: Use a spread that matches your question
5. **Trust your intuition**: Let the images speak to you

## Tips for Interpretation

- Consider the imagery and symbolism on each card
- Pay attention to your first impressions
- Notice the colors, figures, and objects depicted
- Consider the card's position in the spread
- Look for patterns and connections between cards

Remember, tarot is a tool for reflection and guidance. The cards don't predict a fixed future—they illuminate possibilities and help you understand your current path.`,
    contentEs: `# Guía para principiantes: Cómo interpretar el tarot

La lectura del tarot es un arte antiguo que ha guiado a las personas durante siglos. Ya sea que busques claridad sobre tu futuro o una comprensión más profunda de ti mismo, aprender a leer el tarot puede ser una experiencia transformadora.

## Entendiendo el Mazo

Un mazo de tarot estándar consiste en 78 cartas divididas en dos secciones principales:

### Los Arcanos Mayores (22 cartas)
Estas cartas representan eventos importantes de la vida, lecciones espirituales y puntos de inflexión significativos. Incluyen cartas icónicas como El Loco, El Mago, La Sacerdotisa y El Mundo.

### Los Arcanos Menores (56 cartas)
Estas cartas tratan situaciones cotidianas y se dividen en cuatro palos:
- **Bastos**: Pasión, creatividad y ambición
- **Copas**: Emociones, relaciones e intuición
- **Espadas**: Pensamientos, comunicación y conflicto
- **Oros**: Asuntos materiales, carrera y finanzas

## Cómo Comenzar una Lectura

1. **Crea un ambiente tranquilo**: Encuentra un espacio silencioso donde no te interrumpan
2. **Despeja tu mente**: Toma algunas respiraciones profundas y concéntrate en tu pregunta
3. **Baraja las cartas**: Mientras piensas en tu pregunta
4. **Saca tus cartas**: Usa una tirada que coincida con tu pregunta
5. **Confía en tu intuición**: Deja que las imágenes te hablen

## Consejos para la Interpretación

- Considera la imaginería y el simbolismo de cada carta
- Presta atención a tus primeras impresiones
- Nota los colores, figuras y objetos representados
- Considera la posición de la carta en la tirada
- Busca patrones y conexiones entre las cartas

Recuerda, el tarot es una herramienta para la reflexión y la guía. Las cartas no predicen un futuro fijo—iluminan posibilidades y te ayudan a entender tu camino actual.`,
    published: true,
    publishedAt: new Date("2024-01-15"),
  },
  {
    slug: "major-arcana-meaning-symbolism",
    title: "The Major Arcana: Meaning and Symbolism",
    titleEs: "Los Arcanos Mayores: Significado y simbolismo",
    excerpt: "Explore the 22 Major Arcana cards and their profound spiritual meanings in tarot readings.",
    excerptEs: "Explora las 22 cartas de los Arcanos Mayores y sus profundos significados espirituales en las lecturas de tarot.",
    content: `# The Major Arcana: Meaning and Symbolism

The Major Arcana represents the journey of the soul through life's most profound experiences. These 22 cards tell the story of The Fool's Journey—a metaphor for our own spiritual evolution.

## The Fool's Journey

The journey begins with The Fool (0), representing new beginnings and unlimited potential. As we progress through the cards, we encounter teachers, challenges, and transformations that shape our spiritual growth.

## Key Cards and Their Meanings

### The Fool (0)
New beginnings, innocence, spontaneity, a free spirit

### The Magician (I)
Manifestation, resourcefulness, inspired action, power

### The High Priestess (II)
Intuition, sacred knowledge, divine feminine, the subconscious

### The Empress (III)
Femininity, beauty, nature, abundance, nurturing

### The Emperor (IV)
Authority, structure, control, fatherhood

### The Hierophant (V)
Tradition, conformity, morality, ethics, spiritual wisdom

### The Lovers (VI)
Relationships, choices, alignment of values, union

### The Chariot (VII)
Direction, control, willpower, success, determination

### Strength (VIII)
Inner strength, bravery, compassion, patience

### The Hermit (IX)
Soul-searching, introspection, guidance, inner wisdom

### Wheel of Fortune (X)
Change, cycles, fate, decisive moments

### Justice (XI)
Fairness, truth, cause and effect, law

### The Hanged Man (XII)
Surrender, new perspectives, letting go

### Death (XIII)
Endings, change, transformation, transition

### Temperance (XIV)
Balance, moderation, patience, finding meaning

### The Devil (XV)
Shadow self, attachment, addiction, restriction

### The Tower (XVI)
Sudden change, upheaval, revelation, awakening

### The Star (XVII)
Hope, faith, purpose, renewal, spirituality

### The Moon (XVIII)
Illusion, fear, anxiety, subconscious, intuition

### The Sun (XIX)
Positivity, fun, warmth, success, vitality

### Judgement (XX)
Reflection, reckoning, awakening, rebirth

### The World (XXI)
Completion, integration, accomplishment, travel

Each Major Arcana card carries deep symbolism and invites us to reflect on our own journey through life.`,
    contentEs: `# Los Arcanos Mayores: Significado y simbolismo

Los Arcanos Mayores representan el viaje del alma a través de las experiencias más profundas de la vida. Estas 22 cartas cuentan la historia del Viaje del Loco—una metáfora de nuestra propia evolución espiritual.

## El Viaje del Loco

El viaje comienza con El Loco (0), representando nuevos comienzos y potencial ilimitado. A medida que avanzamos por las cartas, encontramos maestros, desafíos y transformaciones que moldean nuestro crecimiento espiritual.

## Cartas Clave y Sus Significados

### El Loco (0)
Nuevos comienzos, inocencia, espontaneidad, espíritu libre

### El Mago (I)
Manifestación, recursos, acción inspirada, poder

### La Sacerdotisa (II)
Intuición, conocimiento sagrado, lo femenino divino, el subconsciente

### La Emperatriz (III)
Feminidad, belleza, naturaleza, abundancia, nutrición

### El Emperador (IV)
Autoridad, estructura, control, paternidad

### El Hierofante (V)
Tradición, conformidad, moralidad, ética, sabiduría espiritual

### Los Enamorados (VI)
Relaciones, elecciones, alineación de valores, unión

### El Carro (VII)
Dirección, control, fuerza de voluntad, éxito, determinación

### La Fuerza (VIII)
Fuerza interior, valentía, compasión, paciencia

### El Ermitaño (IX)
Búsqueda del alma, introspección, guía, sabiduría interior

### La Rueda de la Fortuna (X)
Cambio, ciclos, destino, momentos decisivos

### La Justicia (XI)
Equidad, verdad, causa y efecto, ley

### El Colgado (XII)
Rendición, nuevas perspectivas, soltar

### La Muerte (XIII)
Finales, cambio, transformación, transición

### La Templanza (XIV)
Equilibrio, moderación, paciencia, encontrar significado

### El Diablo (XV)
Yo sombra, apego, adicción, restricción

### La Torre (XVI)
Cambio repentino, agitación, revelación, despertar

### La Estrella (XVII)
Esperanza, fe, propósito, renovación, espiritualidad

### La Luna (XVIII)
Ilusión, miedo, ansiedad, subconsciente, intuición

### El Sol (XIX)
Positividad, diversión, calidez, éxito, vitalidad

### El Juicio (XX)
Reflexión, ajuste de cuentas, despertar, renacimiento

### El Mundo (XXI)
Compleción, integración, logro, viaje

Cada carta de los Arcanos Mayores lleva un profundo simbolismo y nos invita a reflexionar sobre nuestro propio viaje a través de la vida.`,
    published: true,
    publishedAt: new Date("2024-02-01"),
  },
  {
    slug: "5-tarot-spreads-different-situations",
    title: "5 Tarot Spreads for Different Situations",
    titleEs: "5 tiradas de tarot para diferentes situaciones",
    excerpt: "Discover the best tarot spreads for love, career, decision-making, and personal growth.",
    excerptEs: "Descubre las mejores tiradas de tarot para el amor, la carrera, la toma de decisiones y el crecimiento personal.",
    content: `# 5 Tarot Spreads for Different Situations

Choosing the right spread can make all the difference in your tarot reading. Here are five versatile spreads for various life situations.

## 1. The Three-Card Spread

**Best for**: Quick insights, daily guidance, simple questions

**Layout**: Three cards in a row

**Positions**:
- Card 1: Past (what led to this moment)
- Card 2: Present (current situation)
- Card 3: Future (likely outcome)

**Variations**:
- Mind / Body / Spirit
- Situation / Action / Outcome
- You / Other Person / Relationship

## 2. The Celtic Cross

**Best for**: In-depth analysis of complex situations

**Layout**: Ten cards in a cross pattern

This classic spread provides comprehensive insight into:
- Your current situation
- Challenges you face
- Subconscious influences
- Recent past and near future
- Your hopes and fears
- The likely outcome

## 3. The Relationship Spread

**Best for**: Understanding romantic connections

**Layout**: Five cards

**Positions**:
- Card 1: How you see yourself
- Card 2: How you see your partner
- Card 3: How your partner sees you
- Card 4: The relationship's strength
- Card 5: The relationship's challenge

## 4. The Career Path Spread

**Best for**: Professional decisions and career guidance

**Layout**: Five cards in a path formation

**Positions**:
- Card 1: Current position
- Card 2: Your skills and strengths
- Card 3: Obstacles to overcome
- Card 4: Action to take
- Card 5: Potential outcome

## 5. The Decision-Making Spread

**Best for**: Choosing between options

**Layout**: Seven cards

**Positions**:
- Card 1: The situation
- Cards 2-3: Option A (pros and cons)
- Cards 4-5: Option B (pros and cons)
- Cards 6-7: What you need to consider

## Tips for Better Readings

1. **Clear your mind** before shuffling
2. **Focus on your question** while mixing the cards
3. **Take notes** on your readings
4. **Trust your intuition** when interpreting
5. **Reflect on readings** over time

Remember, the cards offer guidance, not absolute predictions. Use them as a tool for self-reflection and decision-making.`,
    contentEs: `# 5 tiradas de tarot para diferentes situaciones

Elegir la tirada correcta puede marcar toda la diferencia en tu lectura de tarot. Aquí hay cinco tiradas versátiles para diversas situaciones de la vida.

## 1. La Tirada de Tres Cartas

**Mejor para**: Perspectivas rápidas, guía diaria, preguntas simples

**Diseño**: Tres cartas en fila

**Posiciones**:
- Carta 1: Pasado (lo que llevó a este momento)
- Carta 2: Presente (situación actual)
- Carta 3: Futuro (resultado probable)

**Variaciones**:
- Mente / Cuerpo / Espíritu
- Situación / Acción / Resultado
- Tú / Otra Persona / Relación

## 2. La Cruz Celta

**Mejor para**: Análisis profundo de situaciones complejas

**Diseño**: Diez cartas en patrón de cruz

Esta tirada clásica proporciona una visión completa de:
- Tu situación actual
- Los desafíos que enfrentas
- Influencias subconscientes
- Pasado reciente y futuro cercano
- Tus esperanzas y miedos
- El resultado probable

## 3. La Tirada de Relación

**Mejor para**: Entender conexiones románticas

**Diseño**: Cinco cartas

**Posiciones**:
- Carta 1: Cómo te ves a ti mismo
- Carta 2: Cómo ves a tu pareja
- Carta 3: Cómo te ve tu pareja
- Carta 4: La fortaleza de la relación
- Carta 5: El desafío de la relación

## 4. La Tirada de Carrera

**Mejor para**: Decisiones profesionales y orientación de carrera

**Diseño**: Cinco cartas en formación de camino

**Posiciones**:
- Carta 1: Posición actual
- Carta 2: Tus habilidades y fortalezas
- Carta 3: Obstáculos a superar
- Carta 4: Acción a tomar
- Carta 5: Resultado potencial

## 5. La Tirada de Toma de Decisiones

**Mejor para**: Elegir entre opciones

**Diseño**: Siete cartas

**Posiciones**:
- Carta 1: La situación
- Cartas 2-3: Opción A (pros y contras)
- Cartas 4-5: Opción B (pros y contras)
- Cartas 6-7: Lo que necesitas considerar

## Consejos para Mejores Lecturas

1. **Despeja tu mente** antes de barajar
2. **Enfócate en tu pregunta** mientras mezclas las cartas
3. **Toma notas** de tus lecturas
4. **Confía en tu intuición** al interpretar
5. **Reflexiona sobre las lecturas** con el tiempo

Recuerda, las cartas ofrecen guía, no predicciones absolutas. Úsalas como herramienta para la auto-reflexión y la toma de decisiones.`,
    published: true,
    publishedAt: new Date("2024-02-15"),
  },
];

async function main() {
  console.log("Seeding blog posts...\n");

  for (const post of blogPosts) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: post.slug },
    });

    if (existing) {
      console.log(`Updating: ${post.title}`);
      await prisma.blogPost.update({
        where: { slug: post.slug },
        data: post,
      });
    } else {
      console.log(`Creating: ${post.title}`);
      await prisma.blogPost.create({
        data: post,
      });
    }
  }

  const count = await prisma.blogPost.count();
  console.log(`\nDone! Total blog posts: ${count}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
