const prisma = require('../config/db');

/**
 * Controller for Student Evaluation logic
 */
const evaluationController = {
  /**
   * Faculty evaluates a student
   */
  createEvaluation: async (req, res) => {
    try {
      const { studentId, marks, remarks } = req.body;
      const facultyId = req.user.faculty?.id;

      if (!studentId || marks === undefined) {
        return res.status(400).json({ message: 'studentId and marks are required' });
      }

      if (!facultyId) {
        return res.status(403).json({ message: 'Only faculty can create evaluations' });
      }

      const evaluation = await prisma.evaluation.create({
        data: {
          studentId,
          facultyId,
          marks: parseFloat(marks),
          remarks
        }
      });

      res.status(201).json({ message: 'Evaluation submitted successfully', evaluation });
    } catch (error) {
      res.status(500).json({ message: 'Error creating evaluation', error: error.message });
    }
  },

  /**
   * Get evaluations for a specific student
   */
  getStudentEvaluations: async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const evaluations = await prisma.evaluation.findMany({
        where: { studentId },
        include: { faculty: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(evaluations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching evaluations', error: error.message });
    }
  }
};

module.exports = evaluationController;
