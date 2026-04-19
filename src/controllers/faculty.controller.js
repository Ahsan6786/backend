const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const facultyController = {
  /**
   * Admin creates a new faculty member and their User account
   */
  createFaculty: async (req, res) => {
    try {
      const { name, email, facultyRole, department, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'FACULTY',
          faculty: {
            create: {
              name,
              facultyRole,
              department
            }
          }
        },
        include: { faculty: true }
      });

      res.status(201).json({ message: 'Faculty created successfully', faculty: result.faculty });
    } catch (error) {
      res.status(500).json({ message: 'Error creating faculty', error: error.message });
    }
  },

  /**
   * Get all faculty members with user data
   */
  getAllFaculty: async (req, res) => {
    try {
      console.log(`[API] GET /faculty - Fetching all members...`);
      const faculty = await prisma.faculty.findMany({
        include: { 
            user: { select: { email: true, role: true } },
            department: {
                include: { school: true }
            }
        }
      });
      return res.status(200).json({
        success: true,
        data: faculty || []
      });
    } catch (error) {
      console.error('[FATAL] getAllFaculty:', error);
      return res.status(200).json({ 
        success: false, 
        message: 'Internal error while syncronizing faculty directory',
        data: [] 
      });
    }
  },

  /**
   * Get dashboard data for Faculty (Assigned students via panels)
   */
  getFacultyDashboard: async (req, res) => {
    try {
      const facultyId = req.user?.faculty?.id;
      console.log(`[API] GET /faculty/dashboard - Faculty ID:`, facultyId);
      
      if (!facultyId) {
        return res.status(403).json({ success: false, message: 'User is not linked to a faculty record' });
      }

      // Safe date ranges for today's attendance
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch faculty with their panel links, which lead to panels and students
      const facultyWithData = await prisma.faculty.findUnique({
        where: { id: facultyId },
        include: {
          panelLinks: {
            include: {
              panel: {
                include: {
                  students: {
                    include: {
                      evaluations: { where: { facultyId } },
                      attendance: {
                        where: {
                          date: { gte: startOfDay, lte: endOfDay }
                        },
                        take: 1
                      },
                      panel: {
                        include: {
                          department: {
                            include: { school: { include: { division: true } } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!facultyWithData || !facultyWithData.panelLinks) {
        return res.status(200).json({ 
          success: true, 
          stats: { totalStudents: 0 },
          students: [],
          panels: []
        });
      }

      // Extract panels and students from the junction table structure
      const assignedPanels = facultyWithData.panelLinks.map(link => ({
        id: link.panel.id,
        name: link.panel.name,
        role: link.role
      }));

      const assignedStudents = facultyWithData.panelLinks.flatMap(link => link.panel.students || []);

      return res.status(200).json({
        success: true,
        stats: { totalStudents: assignedStudents.length },
        students: assignedStudents,
        panels: assignedPanels
      });
    } catch (error) {
      console.error('[FATAL] getFacultyDashboard:', error);
      return res.status(200).json({ 
        success: false, 
        message: 'Failed to aggregate faculty intelligence dashboard',
        stats: { totalStudents: 0 },
        students: [],
        panels: []
      });
    }
  }
};

module.exports = facultyController;
