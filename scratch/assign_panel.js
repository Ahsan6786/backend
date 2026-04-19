const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assign() {
  const facultyId = 58; // Alok Chauhan
  const panelId = 158; // Panel B
  
  const updatedPanel = await prisma.panel.update({
    where: { id: panelId },
    data: { facultyId: facultyId }
  });
  
  console.log("Assigned Panel:", JSON.stringify(updatedPanel, null, 2));
  
  // Verify students in that panel
  const students = await prisma.student.findMany({
    where: { panelId: panelId }
  });
  console.log("Students in assigned panel:", students.length);
}

assign().catch(console.error).finally(() => prisma.$disconnect());
