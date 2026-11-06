/**
 * Creates the e2e users and their data in the LOCAL e2e database. Run by
 * `node scripts/e2e-db.mjs reset` (after the seeds) with the .env.e2e env;
 * never by hand against anything else: it aborts unless DATABASE_URL is the
 * local cluster on port 54329.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma, type Card } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FAKE_AI_TEXTS } from "@/lib/ai/config";
import { blueprintInputsHash } from "@/lib/ai/blueprint-synthesis";
import { CARD_ROLES, buildCompatibilitySummary, computeCompatibility, type CompatibilityCard } from "@/lib/compatibility";
import { getZodiacSign } from "@/lib/zodiac";
import {
  CONTRASENA_E2E,
  DATOS_GENERADOS,
  IDS,
  USUARIOS_DE_WORKER,
  USUARIO_CON_HISTORIA,
  USUARIO_NUEVO,
  usuarioDeWorker,
  type DatosGenerados,
  type UsuarioE2E,
} from "./usuarios";

const LOCAL_DB_URL = /@(localhost|127\.0\.0\.1):54329\//;
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!LOCAL_DB_URL.test(databaseUrl) || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  console.error("[fixtures] ABORTED: DATABASE_URL is not the local e2e cluster (127.0.0.1:54329).");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * HOUR);
const utcDay = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const todayUtc = () => {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Small deterministic PRNG so the fixtures are the same on every reset. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

async function crearUsuario(u: UsuarioE2E, hash: string, extra: Partial<Prisma.UserCreateInput> = {}) {
  return prisma.user.create({
    data: {
      id: u.id,
      email: u.email,
      name: u.nombre,
      password: hash,
      credits: u.creditos,
      freeReadingsLeft: u.lecturasGratis,
      ...extra,
      ...(u.nombreCompleto && u.nacimiento
        ? {
            profile: {
              create: {
                fullName: u.nombreCompleto,
                birthDate: utcDay(u.nacimiento),
                zodiacSign: getZodiacSign(utcDay(u.nacimiento)),
                focusArea: "general",
                emailTime: "08:00",
                locale: "es",
              },
            },
          }
        : {}),
    },
  });
}

/** Ages (hours) of the 10 readings: 3 of today, the rest spread over ~25 days. */
const EDADES_H = [2, 3, 4, 30, 80, 150, 220, 300, 400, 600];

const INTENCIONES = [
  "¿Qué necesito ver de mi trabajo en este momento?",
  "Busco claridad sobre una conversación pendiente con mi hermana.",
  "¿Cómo cuidar mi energía esta semana?",
  "¿Qué me pide esta etapa de mudanza?",
  "Quiero entender por qué me cuesta empezar proyectos nuevos.",
  "¿Qué puedo aprender de esta amistad que se está alejando?",
  "Claridad para decidir si tomo el curso o espero.",
  "¿Dónde estoy poniendo demasiada presión?",
  "Una mirada general a mi año.",
  "¿Qué me dicen mis propias cartas sobre este cambio?",
];

async function main() {
  const hash = await bcrypt.hash(CONTRASENA_E2E, 10);

  const cards = await prisma.card.findMany({ orderBy: [{ arcana: "asc" }, { suit: "asc" }, { number: "asc" }] });
  if (cards.length !== 78) throw new Error(`expected 78 cards from prisma/seed.ts, found ${cards.length}`);
  const spreads = await prisma.spreadType.findMany();
  const tirada = (name: string) => {
    const spread = spreads.find((s) => s.name === name);
    if (!spread) throw new Error(`spread type "${name}" not seeded`);
    return spread;
  };
  const byName = (name: string) => cards.find((c) => c.name === name)!;

  // ---- nuevo: empty states -------------------------------------------------
  await crearUsuario(USUARIO_NUEVO, hash);

  // ---- worker users: 1000 credits and a profile, nothing else ---------------
  for (let n = 0; n < USUARIOS_DE_WORKER; n++) {
    await crearUsuario(usuarioDeWorker(n), hash);
  }

  // ---- con historia ---------------------------------------------------------
  const ana = USUARIO_CON_HISTORIA;
  await crearUsuario(ana, hash, {
    xp: 420,
    level: 3,
    currentStreak: 3,
    longestStreak: 7,
    lastReadingDate: hoursAgo(2),
    goldenCardsCount: 1,
    referralCode: "ANAE2E01",
  });

  const random = rng(20261105);
  const pick = (count: number): Card[] => {
    const deck = [...cards];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck.slice(0, count);
  };

  const discovered = new Map<string, Date>();
  for (let i = 1; i <= 10; i++) {
    const spread = i === 9 ? tirada("Celtic Cross") : tirada("Three Card Spread");
    const drawn = pick(spread.cardCount);
    // Reading 1 always holds The Lovers (the card whose Wikimedia image 404s in production).
    if (i === 1 && !drawn.some((c) => c.name === "The Lovers")) drawn[0] = byName("The Lovers");
    const createdAt = hoursAgo(EDADES_H[i - 1]);
    const resonance = i === 5 ? 4 : i === 7 ? 5 : i === 9 ? 3 : null;

    await prisma.reading.create({
      data: {
        id: IDS.lectura(i),
        userId: ana.id,
        spreadTypeId: spread.id,
        intention: INTENCIONES[i - 1],
        cards: drawn.map((card, index) => ({
          position: index + 1,
          cardId: card.id,
          isReversed: random() < 0.3,
          isGolden: false,
        })) as unknown as Prisma.InputJsonValue,
        interpretation: FAKE_AI_TEXTS.es.reading,
        isPublic: true,
        shareId: IDS.compartida(i),
        personalNotes: i === 4 ? "Volver a leerla el domingo." : null,
        source: i === 10 ? "manual" : "app",
        resonance,
        resonanceNote: resonance === 5 ? "Pasó tal cual: la conversación llegó sola." : null,
        resonanceAt: resonance ? new Date(createdAt.getTime() + 2 * DAY) : null,
        createdAt,
        updatedAt: createdAt,
      },
    });
    for (const card of drawn) if (!discovered.has(card.id)) discovered.set(card.id, createdAt);

    if (i !== 10) {
      await prisma.creditTransaction.create({
        data: { userId: ana.id, amount: -spread.creditCost, type: "READING", readingId: IDS.lectura(i), createdAt },
      });
    }
  }

  await prisma.readingFollowUp.create({
    data: {
      readingId: IDS.lectura(4),
      userId: ana.id,
      question: "¿Y si la conversación no sale como espero?",
      answer: FAKE_AI_TEXTS.es.followup,
      creditsCharged: 0,
      createdAt: hoursAgo(28),
    },
  });

  await prisma.creditTransaction.create({
    data: { userId: ana.id, amount: 60, type: "PURCHASE", createdAt: hoursAgo(700) },
  });

  await prisma.userCardCollection.createMany({
    data: [...discovered].map(([cardId, discoveredAt]) => ({ userId: ana.id, cardId, discoveredAt })),
  });
  const star = byName("The Star");
  await prisma.userGoldenCardCollection.create({
    data: { userId: ana.id, cardId: star.id, readingId: IDS.lectura(6), discoveredAt: hoursAgo(150) },
  });
  if (!discovered.has(star.id)) {
    await prisma.userCardCollection.create({ data: { userId: ana.id, cardId: star.id, discoveredAt: hoursAgo(150) } });
  }

  const achievements = await prisma.achievement.findMany({
    where: { key: { in: ["first_reading", "seeker", "first_gold", "consistent"] } },
  });
  await prisma.userAchievement.createMany({
    data: achievements.map((a, index) => ({ userId: ana.id, achievementId: a.id, unlockedAt: hoursAgo(600 - index * 100) })),
  });

  // Reading for two ×2
  const partners = [
    { name: "Luis", birth: "1988-11-02", ageH: 50 },
    { name: "Marta", birth: "1995-02-14", ageH: 240 },
  ];
  for (const [index, partner] of partners.entries()) {
    const systems = computeCompatibility(
      { birthDate: utcDay(ana.nacimiento!), fullName: ana.nombreCompleto },
      { birthDate: utcDay(partner.birth), fullName: null }
    );
    const compatCards: CompatibilityCard[] = pick(3).map((card, i) => ({
      position: i + 1,
      role: CARD_ROLES[i].role,
      roleLabel: CARD_ROLES[i].label,
      cardId: card.id,
      isReversed: random() < 0.3,
      name: card.name,
      nameEs: card.nameEs,
      imageUrl: card.imageUrl,
      arcana: card.arcana,
      suit: card.suit,
      number: card.number,
    }));
    await prisma.compatibilityReading.create({
      data: {
        id: IDS.compatibilidad(index + 1),
        userId: ana.id,
        partnerName: partner.name,
        partnerBirthDate: utcDay(partner.birth),
        locale: "es",
        content: FAKE_AI_TEXTS.es.compatibility,
        summary: buildCompatibilitySummary(systems, compatCards) as unknown as Prisma.InputJsonValue,
        createdAt: hoursAgo(partner.ageH),
      },
    });
    await prisma.creditTransaction.create({
      data: { userId: ana.id, amount: -2, type: "COMPATIBILITY", createdAt: hoursAgo(partner.ageH) },
    });
  }

  // Arcana Map with its synthesis (current hash, so it is shown, not regenerated) and public link
  await prisma.arcanaProfile.create({
    data: {
      userId: ana.id,
      locale: "es",
      synthesis: FAKE_AI_TEXTS.es.synthesis,
      inputsHash: blueprintInputsHash(utcDay(ana.nacimiento!), ana.nombreCompleto!, "es"),
      shareId: IDS.mapaCompartido,
      version: 1,
      createdAt: hoursAgo(500),
      updatedAt: hoursAgo(500),
    },
  });

  // Daily oracle: active (paid with credits) with today's card and the three days before
  await prisma.subscription.create({
    data: {
      userId: ana.id,
      status: "active",
      paymentMethod: "credits",
      creditsCostPerMonth: 10,
      currentPeriodStart: hoursAgo(5 * 24),
      currentPeriodEnd: new Date(now.getTime() + 25 * DAY),
      lastResetDate: hoursAgo(5 * 24),
    },
  });
  const dailyCards = ["The Star", "The Hermit", "Two of Cups", "Ace of Wands"];
  for (const [daysBack, name] of dailyCards.entries()) {
    const date = new Date(todayUtc().getTime() - daysBack * DAY);
    await prisma.dailyReading.create({
      data: {
        userId: ana.id,
        date,
        cardId: byName(name).id,
        isReversed: daysBack === 2,
        interpretation: FAKE_AI_TEXTS.es.daily,
        sentAt: new Date(date.getTime() + 14 * HOUR),
      },
    });
  }

  // Ids the specs cannot know in advance
  const datos: DatosGenerados = { tiradas: Object.fromEntries(spreads.map((s) => [s.name, s.id])) };
  const file = path.join(process.cwd(), DATOS_GENERADOS);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(datos, null, 2)}\n`);

  const users = await prisma.user.count();
  console.log(
    `[fixtures] ${users} users (nuevo, con-historia, ${USUARIOS_DE_WORKER} workers); con-historia: 10 readings, 2 readings for two, Arcana Map ${IDS.mapaCompartido}, ${discovered.size} cards in collection; ids in ${DATOS_GENERADOS}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("[fixtures] failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
