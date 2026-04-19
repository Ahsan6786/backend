const prisma = require('../config/db');

/**
 * Auth Controller optimized for Supabase integration
 */
const authController = {
  /**
   * Sync and return current user profile
   * The actual token verification is handled by authMiddleware
   */
  getMe: async (req, res) => {
    try {
      // req.user is already attached by authMiddleware with all relations
      res.status(200).json(req.user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user profile', error: error.message });
    }
  },

  /**
   * Health check for auth subsystem
   */
  checkStatus: (req, res) => {
    res.status(200).json({ status: 'Auth system transitioned to Supabase' });
  }
};

module.exports = authController;
