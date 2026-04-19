const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const alok = await prisma.faculty.findMany({
    where: {
      name: { contains: 'alok', mode: 'insensitive' }
    },
    include: { user: true }
  });
  console.log(JSON.stringify(alok, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
