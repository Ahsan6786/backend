require('dotenv').config({ path: '.env' });
const { supabaseAdmin } = require('./src/config/supabase');

const PROTECTED_EMAIL = 'ahsan.khan@mitwpu.edu.in';

async function purgeSupabaseUsers() {
    console.log("🔥 Starting Comprehensive Supabase Auth Purge...");
    
    try {
        let hasMore = true;
        let totalDeleted = 0;
        let skippedCount = 0;

        while (hasMore) {
            let { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
                perPage: 1000,
            });

            if (error) throw error;
            
            // Filter out protected and already processed
            const targets = users.filter(u => u.email !== PROTECTED_EMAIL);
            
            if (targets.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`📊 Processing batch of ${targets.length} users...`);

            for (const user of targets) {
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
                
                if (deleteError) {
                    console.error(`❌ Failed to delete ${user.email}:`, deleteError.message);
                } else {
                    totalDeleted++;
                    if (totalDeleted % 100 === 0) {
                        console.log(`✅ Deleted ${totalDeleted} users...`);
                    }
                }
            }
        }

        console.log(`\n✨ Purge Complete!`);
        console.log(`✅ Total Users Deleted: ${totalDeleted}`);
        console.log(`🛡️  Admin Account Protected.`);

    } catch (err) {
        console.error("💀 Fatal Purge Error:", err.message);
    }
}

purgeSupabaseUsers();
