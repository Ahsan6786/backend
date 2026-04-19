const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const facultyController = require('../src/controllers/faculty.controller');

async function test() {
  const facultyId = 58; // Alok Chauhan
  
  const req = {
    user: {
      faculty: { id: facultyId }
    }
  };
  
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log("Status Code:", code);
        console.log("Response Data:", JSON.stringify(data, null, 2));
      }
    })
  };
  
  await facultyController.getFacultyDashboard(req, res);
}

test().catch(console.error).finally(() => prisma.$disconnect());
