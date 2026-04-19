const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@ltc.com';
  const adminPassword = 'AdminPassword123';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  console.log('Seeding initial admin account...');

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin account created/updated:');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${adminPassword}`);
  console.log('Please log in with these credentials after starting the project.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
