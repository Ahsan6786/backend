const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function purgeSystem() {
  console.log('🚀 SYSTEM PURGE INITIALIZED...');
  console.log('⚠️ Protecting ADMIN and SUPER_ADMIN accounts.');

  try {
    // 1. Identify all users to be removed
    const usersToDelete = await prisma.user.findMany({
      where: {
        role: { in: ['FACULTY', 'STUDENT'] }
      },
      select: { id: true, email: true, supabaseId: true }
    });

    console.log(`📡 Identified ${usersToDelete.length} non-admin users to purge.`);

    // 2. Clear Auth from Supabase
    for (const user of usersToDelete) {
      if (user.supabaseId && user.supabaseId !== 'EXTERNAL') {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
        if (error) {
          console.warn(`[Supabase Error] Could not delete ${user.email}:`, error.message);
        } else {
          console.log(`[Supabase] Removed: ${user.email}`);
        }
      }
    }

    // 3. Clear Database Records (Order matters for foreign keys)
    console.log('🧹 Clearing transaction data (Attendance/Evaluations)...');
    await prisma.attendance.deleteMany();
    await prisma.evaluation.deleteMany();

    console.log('🧹 Clearing profiles (Student/Faculty)...');
    await prisma.student.deleteMany();
    await prisma.faculty.deleteMany();

    console.log('🧹 Clearing institutional hierarchy (Panels/Depts/Schools/Divisions)...');
    await prisma.panel.deleteMany();
    await prisma.department.deleteMany();
    await prisma.school.deleteMany();
    await prisma.division.deleteMany();

    console.log('🧹 Clearing user accounts...');
    await prisma.user.deleteMany({
      where: {
        role: { in: ['FACULTY', 'STUDENT'] }
      }
    });

    console.log('✅ SYSTEM PURGE COMPLETE.');
    console.log('🛡️ All non-admin records have been successfully eliminated.');
  } catch (err) {
    console.error('❌ PURGE FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

purgeSystem();
