const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING HIERARCHY FOR NEW DIVISION-FIRST MODEL ---');
  try {
    // Disable triggers/constraints check if possible or just delete in order
    // Order: Attendance/Evaluation -> Student -> Panel -> Department -> School -> Division
    
    console.log('Deleting Attendance & Evaluations...');
    await prisma.attendance.deleteMany();
    await prisma.evaluation.deleteMany();
    
    console.log('Unlinking Students and Faculty from Panels...');
    await prisma.student.updateMany({ data: { panelId: null } });
    await prisma.faculty.updateMany({ data: { departmentId: null } });
    
    console.log('Deleting Hierarchy Data...');
    await prisma.panel.deleteMany();
    await prisma.department.deleteMany();
    await prisma.school.deleteMany();
    await prisma.division.deleteMany();
    
    console.log('--- HIERARCHY WIPED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Error during wipe:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
