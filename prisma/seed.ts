import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = ['USER', 'ADMIN'];

async function main() {
  for (const name of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded roles: ${DEFAULT_ROLES.join(', ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
