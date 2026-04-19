const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAndFixAdmin() {
  const email = 'ahsan.khan@mitwpu.edu.in';
  console.log(`Checking user: ${email}`);

  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('User not found in Supabase Auth');
    return;
  }

  console.log('Current Supabase Metadata:', user.user_metadata);

  if (user.user_metadata?.role !== 'ADMIN') {
    console.log('Updating role to ADMIN in Supabase...');
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, role: 'ADMIN' } }
    );

    if (updateError) {
      console.error('Update failed:', updateError);
    } else {
      console.log('Update successful! Metadata now:', data.user.user_metadata);
    }
  } else {
    console.log('Role is already ADMIN in Supabase. No update needed.');
  }
}

checkAndFixAdmin();
