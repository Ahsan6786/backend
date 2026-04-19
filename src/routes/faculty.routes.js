const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// Public route for Faculty login is handled by auth.routes.js Login endpoint

// Protected routes
router.use(authMiddleware);

// Faculty Dashboard (Accessible by FACULTY)
router.get('/dashboard', checkRole(['FACULTY']), facultyController.getFacultyDashboard);

// Faculty CRUD (Accessible by ADMIN)
router.post('/create', checkRole(['ADMIN', 'SUPER_ADMIN']), facultyController.createFaculty);
router.get('/', checkRole(['ADMIN', 'SUPER_ADMIN', 'FACULTY']), facultyController.getAllFaculty);

module.exports = router;
