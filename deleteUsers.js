require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = 'ahsan.khan@mitwpu.edu.in';

async function deleteAllUsers() {
    const perPage = 100;

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page: 1, // 🔥 ALWAYS PAGE 1
            perPage
        });

        if (error) {
            console.error('Error:', error.message);
            break;
        }

        const users = data.users;

        if (!users.length) {
            console.log('✅ All users deleted');
            break;
        }

        console.log(`Deleting batch of ${users.length} users...`);

        let deletedCount = 0;

        for (const user of users) {
            if (user.email === ADMIN_EMAIL) continue;

            await supabase.auth.admin.deleteUser(user.id);
            deletedCount++;
            console.log('Deleted:', user.email);
        }

        if (deletedCount === 0) {
            console.log('Only admin left, stopping...');
            break;
        }
    }

    console.log('🔥 FINAL CLEAN DONE');
}

deleteAllUsers();