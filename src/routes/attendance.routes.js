const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

router.use(authMiddleware);

router.post('/mark', checkRole(['FACULTY', 'ADMIN']), attendanceController.markAttendance);
router.get('/student/:id', attendanceController.getStudentAttendance);

module.exports = router;
