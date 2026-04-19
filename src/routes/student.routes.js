const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student.controller');
const upload = require('../middleware/upload.middleware');

/**
 * Route: POST /api/students/upload
 * (TEMP: no auth for testing)
 */
router.post(
  '/upload',
  upload.single('file'),
  studentController.uploadStudents
);

/**
 * 🔥 Route: GET /api/students
 * (TEMP: no auth so browser se test ho sake)
 */
router.get(
  '/',
  studentController.getAllStudents
);

/**
 * Route: GET /api/students/dashboard
 */
router.get(
  '/dashboard',
  studentController.getDashboard
);

module.exports = router;