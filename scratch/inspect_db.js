const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB Investigation ---');
  
  const studentCount = await prisma.student.count();
  console.log('Total Students in DB:', studentCount);
  
  if (studentCount > 0) {
    const samples = await prisma.student.findMany({ take: 5 });
    console.log('Sample Students:', JSON.stringify(samples, null, 2));
    
    // Check for nulls in critical fields
    const nullNames = await prisma.student.count({ where: { name: null } });
    console.log('Students with null name:', nullNames);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
