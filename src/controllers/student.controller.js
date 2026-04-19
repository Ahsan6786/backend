const fs = require('fs');
const prisma = require('../config/db'); // 🔥 IMPORTANT
const parseExcel = require('../utils/excelParser');
const { bulkCreateStudents } = require('../services/student.service');

const studentController = {
  /**
   * Upload students via Excel
   */
  uploadStudents: async (req, res) => {
    let filePath = null;
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file format.' });
      }

      filePath = req.file.path;

      // 1. Parse Excel
      let rawData;
      try {
        rawData = parseExcel(filePath);
      } catch (parseError) {
        if (filePath) fs.unlink(filePath, () => { });
        return res.status(400).json({ message: `Parsing Error: ${parseError.message}` });
      }

      if (!rawData || rawData.length === 0) {
        if (filePath) fs.unlink(filePath, () => { });
        return res.status(400).json({ message: 'Excel file is empty or headers are unrecognizable.' });
      }

      // 2. Ingest Data
      const result = await bulkCreateStudents(rawData);

      // 3. Cleanup
      fs.unlink(filePath, (err) => {
        if (err) console.error(`[Ingestion] Failed to delete file: ${filePath}`, err);
      });

      // 4. Response
      res.status(200).json({
        message: 'Hierarchical student ingestion completed.',
        ...result,
        duplicates: result.skipped || 0
      });

    } catch (error) {
      console.error('[Ingestion] Critical Error:', error);
      if (filePath) fs.unlink(filePath, () => { });
      res.status(500).json({
        message: 'Critical error during file processing.',
        error: error.message
      });
    }
  },

  /**
   * 🔥 GET ALL STUDENTS WITH FULL HIERARCHY (FIXED)
   */
  getAllStudents: async (req, res) => {
    try {
      const students = await prisma.student.findMany({
        include: {
          panel: {
            include: {
              department: {
                include: {
                  school: {
                    include: {
                      division: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      res.status(200).json({
        message: 'Students fetched successfully',
        count: students.length,
        data: students
      });

    } catch (error) {
      console.error('[Student Fetch Error]:', error);
      res.status(500).json({
        message: 'Error fetching students',
        error: error.message
      });
    }
  },

  /**
   * Dashboard placeholder
   */
  getDashboard: async (req, res) => {
    try {
      const studentId = req.user.id;
      res.status(200).json({
        message: 'Dashboard data fetched.',
        studentId
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching dashboard',
        error: error.message
      });
    }
  }
};

module.exports = studentController;