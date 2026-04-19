const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluation.controller');
const authMiddleware = require('../middleware/auth.middleware');
const checkRole = require('../middleware/role.middleware');

router.use(authMiddleware);

router.post('/', checkRole(['FACULTY', 'ADMIN']), evaluationController.createEvaluation);
router.get('/student/:id', evaluationController.getStudentEvaluations);

module.exports = router;
