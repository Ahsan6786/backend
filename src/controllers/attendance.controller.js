const prisma = require('../config/db');

/**
 * Controller for Attendance-related operations
 */
const attendanceController = {
  /**
   * Faculty marks attendance for a student
   */
  markAttendance: async (req, res) => {
    try {
      const { studentId, status, date } = req.body;
      const facultyId = req.user.faculty?.id;

      if (!studentId || !status) {
        return res.status(400).json({ message: 'studentId and status are required' });
      }

      const attendance = await prisma.attendance.create({
        data: {
          studentId,
          facultyId,
          status,
          date: date ? new Date(date) : new Date()
        }
      });

      res.status(201).json({ message: 'Attendance marked successfully', attendance });
    } catch (error) {
      res.status(500).json({ message: 'Error marking attendance', error: error.message });
    }
  },

  /**
   * Get attendance for a specific student
   */
  getStudentAttendance: async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const attendance = await prisma.attendance.findMany({
        where: { studentId },
        orderBy: { date: 'desc' }
      });
      res.status(200).json(attendance);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching attendance', error: error.message });
    }
  }
};

module.exports = attendanceController;
