const { supabaseAdmin } = require('../config/supabase');
const prisma = require('../config/db');

// Backend uses the admin client to verify tokens and handle session sync
const supabase = supabaseAdmin;

/**
 * FULLY AUTOMATIC USER SYNCHRONIZATION MIDDLEWARE
 * Verifies Supabase JWT and ensures a corresponding User record exists in Primary DB.
 * Guarantees no "Account not found" issues for authenticated users.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('[AUTH] No token provided');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // 1. Verify token with Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      console.error('[AUTH] Supabase token verification failed:', error?.message);
      return res.status(401).json({ message: 'Invalid or expired Supabase token', error: error?.message });
    }

    const { email, id: supabaseId } = supabaseUser;
    
    // 2. AUTOMATIC SYNC LOGIC (Upsert/Link)
    console.log(`[AUTH] Syncing user: ${email} (${supabaseId})`);

    let user = await prisma.user.findUnique({
      where: { supabaseId },
      include: { student: true, faculty: true }
    });

    if (!user) {
      // Check if user exists by email but has no supabaseId linked yet
      user = await prisma.user.findUnique({
        where: { email },
        include: { student: true, faculty: true }
      });

      if (user) {
        // Link existing user to this Supabase ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: { supabaseId },
          include: { student: true, faculty: true }
        });
        console.log(`[SYNC] Linked existing user: ${email}`);
      } else {
        // AUTO-CREATE: No user found by ID or Email
        const BOOTSTRAP_ADMINS = ['ahsan.khan@mitwpu.edu.in'];
        let role = supabaseUser.user_metadata?.role || 'STUDENT';
        
        if (BOOTSTRAP_ADMINS.includes(email.toLowerCase())) {
          role = 'ADMIN';
        }
        
        user = await prisma.user.create({
          data: {
            email,
            supabaseId,
            role: role
          },
          include: { student: true, faculty: true }
        });
        console.log(`[SYNC] Created new ${role}: ${email}`);
      }
    } else {
      // Periodic Role Sync
      let expectedRole = supabaseUser.user_metadata?.role || user.role;
      const BOOTSTRAP_ADMINS = ['ahsan.khan@mitwpu.edu.in'];
      if (BOOTSTRAP_ADMINS.includes(email.toLowerCase())) {
        expectedRole = 'ADMIN';
      }

      if (user.role !== expectedRole) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: expectedRole },
          include: { student: true, faculty: true }
        });
        console.log(`[SYNC] Role updated for ${email} to ${expectedRole}`);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AUTH ERROR] Fatal middleware failure:', error);
    res.status(500).json({ message: 'Internal authentication error', error: error.message });
  }
};

module.exports = authMiddleware;
