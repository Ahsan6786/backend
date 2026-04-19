const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

// All routes here require ADMIN or SUPER_ADMIN role
router.use(authMiddleware);
router.use(checkRole(['ADMIN', 'SUPER_ADMIN']));

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const uploadController = require('../controllers/upload.controller');

// High-level management routes
router.get('/students', adminController.getAllStudents);
router.get('/hierarchy', adminController.getHierarchy);
router.get('/stats', adminController.getEnhancedStats);
router.get('/bulk-status', adminController.getBulkStatus);
router.post('/check-duplicates', adminController.checkDuplicates);
router.post('/cancel-bulk', adminController.cancelBulkUpload);
router.post('/assign-panels', adminController.assignPanels);
router.get('/users', adminController.getSystemUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Universal System Ingestion Engine
router.post('/pre-flight', upload.single('file'), uploadController.handlePreFlight);
router.post('/universal-upload', upload.single('file'), uploadController.handleUniversalUpload);

// Panel & Faculty Assignment Management
router.get('/panels', adminController.getAllPanels);
router.put('/panels/:panelId/assign', adminController.assignFacultyToPanel);

module.exports = router;
