import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "alxfetisova@gmail.com";
  const newLocale = "en";

  console.log(`\nUpdating locale for: ${email} to "${newLocale}"\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    console.log("User or profile not found");
    return;
  }

  console.log(`Current locale: ${user.profile.locale}`);

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { locale: newLocale },
  });

  console.log(`✓ Updated locale to: ${newLocale}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
