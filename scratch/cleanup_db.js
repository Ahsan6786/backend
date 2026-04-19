const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROTECTED_EMAILS = ['ahsan.khan@mitwpu.edu.in'];

async function cleanup() {
  try {
    console.log("🚀 Starting Precision Database Purge...");

    // 1. Transactional Data
    const evaluations = await prisma.evaluation.deleteMany({});
    console.log(`✅ Deleted ${evaluations.count} evaluations.`);

    const attendance = await prisma.attendance.deleteMany({});
    console.log(`✅ Deleted ${attendance.count} attendance records.`);

    // 2. Structural/Grouping Data
    // Students depend on Panels, and Panels depend on Faculty.
    const students = await prisma.student.deleteMany({});
    console.log(`✅ Deleted ${students.count} students.`);

    const panels = await prisma.panel.deleteMany({});
    console.log(`✅ Deleted ${panels.count} panels.`);

    const faculty = await prisma.faculty.deleteMany({});
    console.log(`✅ Deleted ${faculty.count} faculty records.`);

    // 3. User Accounts
    // We delete all users EXCEPT those in the protected list.
    const users = await prisma.user.deleteMany({
      where: {
        email: {
          notIn: PROTECTED_EMAILS
        }
      }
    });
    console.log(`✅ Deleted ${users.count} user accounts (All students, faculty, and secondary admins).`);

    // Verify remaining
    const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log("\n🛡️ Protected Users remaining:");
    remaining.forEach(u => console.log(` - ${u.email} (${u.role})`));

    console.log("\n✨ System successfully reset to clean state.");
  } catch (error) {
    console.error("❌ Purge failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
