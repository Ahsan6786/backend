require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function wipe() {
  console.log('--- STARTING TOTAL DATA WIPE ---');

  try {
    // 1. DELETE PRISMA RECORDS (Reversed dependency order)
    console.log('[1/2] Cleaning Primary Database...');
    
    // Clear transactional/child data first
    await prisma.evaluation.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.student.deleteMany();
    
    // Clear structure
    await prisma.panel.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.department.deleteMany();
    await prisma.school.deleteMany();
    await prisma.division.deleteMany();
    
    // Clear root users
    await prisma.user.deleteMany();
    
    console.log('✓ Primary Database cleared.');

    // 2. DELETE SUPABASE AUTH USERS
    console.log('[2/2] Cleaning Supabase Auth Users...');
    
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Failed to list Supabase users:', error.message);
    } else {
      console.log(`Found ${users.length} authentication records.`);
      
      for (const user of users) {
        process.stdout.write(`Deleting ${user.email}... `);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (delError) {
          console.log(`FAILED: ${delError.message}`);
        } else {
          console.log('OK');
        }
      }
    }
    
    console.log('✓ Supabase Auth cleared.');
    console.log('--- WIPE COMPLETE ---');
    console.log('NOTE: Please run "node seed.js" to restore admin access.');

  } catch (err) {
    console.error('CRITICAL WIPE ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

wipe();
