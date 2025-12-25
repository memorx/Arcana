import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const themedSpreads = [
  {
    name: "Love Reading",
    nameEs: "Tirada del Amor",
    description:
      "Explore your romantic life and relationships with this focused 5-card spread",
    descriptionEs:
      "Explora tu vida romantica y relaciones con esta tirada de 5 cartas",
    cardCount: 5,
    creditCost: 2,
    positions: JSON.stringify([
      {
        position: 1,
        name: "Your Heart",
        nameEs: "Tu Corazon",
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
        nameEs: "La Conexion",
        description: "What brings or keeps you together",
      },
      {
        position: 4,
        name: "Challenges",
        nameEs: "Desafios",
        description: "Obstacles to overcome",
      },
      {
        position: 5,
        name: "Outcome",
        nameEs: "Resultado",
        description: "Where this is heading",
      },
    ]),
    category: "themed",
  },
  {
    name: "Career Spread",
    nameEs: "Tirada de Carrera",
    description:
      "Get guidance for your professional path with insights into your current position and potential",
    descriptionEs:
      "Obten guia para tu camino profesional con perspectivas sobre tu posicion actual y potencial",
    cardCount: 5,
    creditCost: 2,
    positions: JSON.stringify([
      {
        position: 1,
        name: "Current Position",
        nameEs: "Posicion Actual",
        description: "Where you are now professionally",
      },
      {
        position: 2,
        name: "Aspirations",
        nameEs: "Aspiraciones",
        description: "What you truly want in your career",
      },
      {
        position: 3,
        name: "Hidden Factors",
        nameEs: "Factores Ocultos",
        description: "What you might not be seeing",
      },
      {
        position: 4,
        name: "Action to Take",
        nameEs: "Accion a Tomar",
        description: "Your recommended next step",
      },
      {
        position: 5,
        name: "Potential Outcome",
        nameEs: "Resultado Potencial",
        description: "If you follow this guidance",
      },
    ]),
    category: "themed",
  },
  {
    name: "Year Ahead",
    nameEs: "El Ano que Viene",
    description:
      "A comprehensive 12-card spread revealing themes and energies for each month ahead",
    descriptionEs:
      "Una tirada completa de 12 cartas revelando temas y energias para cada mes",
    cardCount: 12,
    creditCost: 4,
    positions: JSON.stringify([
      { position: 1, name: "January", nameEs: "Enero", description: "Theme for January" },
      { position: 2, name: "February", nameEs: "Febrero", description: "Theme for February" },
      { position: 3, name: "March", nameEs: "Marzo", description: "Theme for March" },
      { position: 4, name: "April", nameEs: "Abril", description: "Theme for April" },
      { position: 5, name: "May", nameEs: "Mayo", description: "Theme for May" },
      { position: 6, name: "June", nameEs: "Junio", description: "Theme for June" },
      { position: 7, name: "July", nameEs: "Julio", description: "Theme for July" },
      { position: 8, name: "August", nameEs: "Agosto", description: "Theme for August" },
      { position: 9, name: "September", nameEs: "Septiembre", description: "Theme for September" },
      { position: 10, name: "October", nameEs: "Octubre", description: "Theme for October" },
      { position: 11, name: "November", nameEs: "Noviembre", description: "Theme for November" },
      { position: 12, name: "December", nameEs: "Diciembre", description: "Theme for December" },
    ]),
    category: "themed",
  },
];

async function main() {
  console.log("Seeding themed spreads...\n");

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
