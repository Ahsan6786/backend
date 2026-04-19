const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const superAdminController = {
  // Org Structure Management
  createDivision: async (req, res) => {
    try {
      const { name } = req.body;
      const division = await prisma.division.create({ data: { name } });
      res.status(201).json(division);
    } catch (error) {
      res.status(500).json({ message: 'Error creating division', error: error.message });
    }
  },

  createSchool: async (req, res) => {
    try {
      const { name, divisionId } = req.body;
      const school = await prisma.school.create({ data: { name, divisionId } });
      res.status(201).json(school);
    } catch (error) {
      res.status(500).json({ message: 'Error creating school', error: error.message });
    }
  },

  createDepartment: async (req, res) => {
    try {
      const { name, schoolId } = req.body;
      const department = await prisma.department.create({ data: { name, schoolId } });
      res.status(201).json(department);
    } catch (error) {
      res.status(500).json({ message: 'Error creating department', error: error.message });
    }
  },

  // Admin Management
  createAdmin: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          admin: {
            create: { name }
          }
        }
      });

      res.status(201).json({ message: 'Admin created successfully', user });
    } catch (error) {
      res.status(500).json({ message: 'Error creating admin', error: error.message });
    }
  },

  getAllAdmins: async (req, res) => {
    try {
      const admins = await prisma.admin.findMany({ include: { user: true } });
      res.status(200).json(admins);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching admins', error: error.message });
    }
  }
};

module.exports = superAdminController;
