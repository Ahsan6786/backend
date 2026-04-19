const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * AUTH ROUTES
 * Note: Login is now handled directly on the frontend via Supabase Client.
 * These routes are used for backend session synchronization.
 */

// Profile sync (Requires valid Supabase token)
router.get('/me', authMiddleware, authController.getMe);

// Health check
router.get('/status', authController.checkStatus);

module.exports = router;
