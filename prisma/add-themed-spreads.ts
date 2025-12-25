import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const themedSpreads = [
  {
    name: "Love Reading",
    nameEs: "Tirada del Amor",
    description: "Explore your romantic life and relationships with this focused spread that examines your heart, your partner or desired connection, the energy between you, challenges to overcome, and the likely outcome.",
    descriptionEs: "Explora tu vida romántica y relaciones con esta tirada enfocada que examina tu corazón, tu pareja o conexión deseada, la energía entre ustedes, los desafíos a superar y el resultado probable.",
    cardCount: 5,
    creditCost: 2,
    category: "themed",
    positions: [
      {
        position: 1,
        name: "Your Heart",
        nameEs: "Tu Corazón",
        description: "How you feel about love right now",
      },
      {
        position: 2,
        name: "Your Partner/Desired",
        nameEs: "Tu Pareja/Deseado",
        description: "Their energy or what you seek",
      },
      {
        position: 3,
        name: "The Connection",
        nameEs: "La Conexión",
        description: "What brings or keeps you together",
      },
      {
        position: 4,
        name: "Challenges",
        nameEs: "Desafíos",
        description: "Obstacles to overcome",
      },
      {
        position: 5,
        name: "Outcome",
        nameEs: "Resultado",
        description: "Where this is heading",
      },
    ],
  },
  {
    name: "Career Spread",
    nameEs: "Tirada de Carrera",
    description: "Get guidance for your professional path with insights into your current position, true aspirations, hidden factors affecting your career, recommended actions, and potential outcomes.",
    descriptionEs: "Obtén guía para tu camino profesional con perspectivas sobre tu posición actual, aspiraciones verdaderas, factores ocultos que afectan tu carrera, acciones recomendadas y resultados potenciales.",
    cardCount: 5,
    creditCost: 2,
    category: "themed",
    positions: [
      {
        position: 1,
        name: "Current Position",
        nameEs: "Posición Actual",
        description: "Where you are now professionally",
      },
      {
        position: 2,
        name: "Aspirations",
        nameEs: "Aspiraciones",
        description: "What you truly want",
      },
      {
        position: 3,
        name: "Hidden Factors",
        nameEs: "Factores Ocultos",
        description: "What you're not seeing",
      },
      {
        position: 4,
        name: "Action to Take",
        nameEs: "Acción a Tomar",
        description: "Your next step",
      },
      {
        position: 5,
        name: "Potential Outcome",
        nameEs: "Resultado Potencial",
        description: "If you follow this path",
      },
    ],
  },
  {
    name: "Year Ahead",
    nameEs: "El Año que Viene",
    description: "A comprehensive 12-card spread revealing the themes and energies for each month of the coming year. Perfect for New Year readings or any time you want long-term guidance.",
    descriptionEs: "Una tirada completa de 12 cartas que revela los temas y energías para cada mes del próximo año. Perfecta para lecturas de Año Nuevo o cuando quieras guía a largo plazo.",
    cardCount: 12,
    creditCost: 4,
    category: "themed",
    positions: [
      { position: 1, name: "January", nameEs: "Enero", description: "Theme for this month" },
      { position: 2, name: "February", nameEs: "Febrero", description: "Theme for this month" },
      { position: 3, name: "March", nameEs: "Marzo", description: "Theme for this month" },
      { position: 4, name: "April", nameEs: "Abril", description: "Theme for this month" },
      { position: 5, name: "May", nameEs: "Mayo", description: "Theme for this month" },
      { position: 6, name: "June", nameEs: "Junio", description: "Theme for this month" },
      { position: 7, name: "July", nameEs: "Julio", description: "Theme for this month" },
      { position: 8, name: "August", nameEs: "Agosto", description: "Theme for this month" },
      { position: 9, name: "September", nameEs: "Septiembre", description: "Theme for this month" },
      { position: 10, name: "October", nameEs: "Octubre", description: "Theme for this month" },
      { position: 11, name: "November", nameEs: "Noviembre", description: "Theme for this month" },
      { position: 12, name: "December", nameEs: "Diciembre", description: "Theme for this month" },
    ],
  },
];

async function main() {
  console.log("Adding themed spreads...\n");

  for (const spread of themedSpreads) {
    const existing = await prisma.spreadType.findUnique({
      where: { name: spread.name },
    });

    if (existing) {
      console.log(`Updating: ${spread.name}`);
      await prisma.spreadType.update({
        where: { name: spread.name },
        data: spread,
      });
    } else {
      console.log(`Creating: ${spread.name}`);
      await prisma.spreadType.create({
        data: spread,
      });
    }
  }

  // Also update classic spreads to have category
  console.log("\nUpdating classic spreads with category...");
  await prisma.spreadType.updateMany({
    where: {
      name: {
        in: ["Three Card Spread", "Simple Cross", "Horseshoe Spread", "Celtic Cross"],
      },
    },
    data: { category: "classic" },
  });

  const count = await prisma.spreadType.count();
  console.log(`\nDone! Total spread types: ${count}`);
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
