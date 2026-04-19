const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function provisionExistingStudents() {
  console.log('--- STARTING BULK PROVISIONING ---');
  
  try {
    // 1. Find students who don't have a userId linked yet
    const students = await prisma.student.findMany({
      where: { userId: null },
      select: { id: true, email: true, name: true }
    });

    console.log(`Found ${students.length} students needing accounts.`);

    for (const student of students) {
      console.log(`Processing: ${student.email}...`);
      
      try {
        // 1. Create Supabase Auth account
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
          password: '123456',
          email_confirm: true,
          user_metadata: { name: student.name, role: 'STUDENT' }
        });

        let supabaseId = null;

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`  > User already in Supabase, fetching ID...`);
            const { data: list } = await supabaseAdmin.auth.admin.listUsers();
            supabaseId = list?.users?.find(u => u.email === student.email)?.id;
          } else {
            console.error(`  > Failed to create Supabase account: ${authError.message}`);
            continue;
          }
        } else {
          supabaseId = authUser.user.id;
        }

        // 2. Create Prisma User
        const newUser = await prisma.user.create({
          data: {
            email: student.email,
            role: 'STUDENT',
            supabaseId: supabaseId
          }
        });

        // 3. Link Student to User
        await prisma.student.update({
          where: { id: student.id },
          data: { userId: newUser.id }
        });

        console.log(`  > SUCCESS: Account created & linked.`);
      } catch (rowError) {
        console.error(`  > Error processing row: ${rowError.message}`);
      }
    }

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  } finally {
    await prisma.$disconnect();
    console.log('--- PROVISIONING COMPLETE ---');
  }
}

provisionExistingStudents();
