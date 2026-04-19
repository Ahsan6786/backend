const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const adminController = require('../src/controllers/admin.controller');

async function testLogic() {
  const req = {};
  const res = {
    status: (code) => ({
      json: (data) => console.log("Status:", code, "Data length:", data.length || "isObject")
    })
  };

  console.log("Testing getAllPanels...");
  await adminController.getAllPanels(req, res);

  console.log("\nTesting assignFacultyToPanel...");
  const firstPanel = await prisma.panel.findFirst();
  if (firstPanel) {
    const mockReq = { params: { panelId: firstPanel.id }, body: { facultyId: 58 } }; // Assigning Alok
    await adminController.assignFacultyToPanel(mockReq, res);
  }
}

testLogic().catch(console.error).finally(() => prisma.$disconnect());
