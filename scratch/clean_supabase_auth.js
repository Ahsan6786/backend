const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanSupabaseAuth() {
  console.log('🛡️ SUPABASE AUTH CLEANUP INITIALIZED...');
  const protectedEmail = 'ahsan.khan@mitwpu.edu.in';

  try {
    // 1. List all users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;

    console.log(`📡 Found ${users.length} users in Supabase Auth.`);

    let deletedCount = 0;
    for (const user of users) {
      if (user.email !== protectedEmail) {
        console.log(`🧹 Removing orphaned user: ${user.email}`);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (delError) {
          console.error(`❌ Failed to delete ${user.email}:`, delError.message);
        } else {
          deletedCount++;
        }
      } else {
        console.log(`✅ Keeping protected admin: ${user.email}`);
      }
    }

    console.log(`✨ Cleanup complete. Removed ${deletedCount} users.`);
    console.log(`🔓 Only ${protectedEmail} remains in the Auth system.`);
  } catch (err) {
    console.error('❌ CLEANUP FAILED:', err.message);
  }
}

cleanSupabaseAuth();
