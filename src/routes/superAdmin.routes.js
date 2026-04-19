const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdmin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// All routes here require SUPER_ADMIN role
router.use(authMiddleware);
router.use(checkRole(['SUPER_ADMIN']));

router.post('/division', superAdminController.createDivision);
router.post('/school', superAdminController.createSchool);
router.post('/department', superAdminController.createDepartment);
router.post('/admin', superAdminController.createAdmin);
router.get('/admins', superAdminController.getAllAdmins);

module.exports = router;
