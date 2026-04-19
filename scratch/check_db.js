const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const panelsWithFaculty = await prisma.panel.findMany({
    where: {
      facultyLinks: { some: {} }
    },
    include: {
      facultyLinks: {
        include: {
          faculty: {
            include: { user: true }
          }
        }
      },
      students: true
    }
  });

  if (panelsWithFaculty.length === 0) {
    console.log("No panels have assigned faculty members.");
    
    // Let's check a few students and their panels
    const students = await prisma.student.findMany({
      take: 5,
      include: { panel: true }
    });
    console.log("Sample Students and Panels:", JSON.stringify(students, null, 2));

    // Check a few faculty
    const faculty = await prisma.faculty.findMany({
      take: 5,
      include: { user: true }
    });
    console.log("Sample Faculty:", JSON.stringify(faculty, null, 2));
  } else {
    console.log("Panels with Faculty:", JSON.stringify(panelsWithFaculty, null, 2));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
