const { bulkIngestData } = require('../src/services/ingestion.service');
const prisma = require('../src/config/db');

const testData = [
  { name: 'Ahsan Khan', email: 'ahsan.khan@mitwpu.edu.in', role: 'Admin', school: 'Engineering', department: 'CSE', division: '1', panel: 'A' },
  { name: 'Faculty One', email: 'faculty1@ltc.edu', role: 'Faculty', school: 'Engineering', department: 'CSE', division: '1', panel: 'A' },
  { name: 'Student One', email: 'student1@ltc.edu', role: 'Student', school: 'Engineering', department: 'CSE', division: '1', panel: 'A' },
  { name: 'Student Two', email: 'student2@ltc.edu', role: 'Student', school: 'Engineering', department: 'CSE', division: '1', panel: 'B' },
  { name: 'Student Three', email: 'student3@ltc.edu', role: 'Student', school: 'Engineering', department: 'CSE', division: '2', panel: 'A' },
  { name: 'Faculty Two', email: 'faculty2@ltc.edu', role: 'Teacher', school: 'Arts', department: 'Design', division: '1', panel: 'Z' },
  { name: 'Student Four', email: 'student4@ltc.edu', role: 'Student', school: 'Arts', department: 'Design', division: '1', panel: 'Z' }
];

async function runTest() {
    try {
        console.log("Starting Ingestion Test...");
        const stats = await bulkIngestData(testData);
        console.log("Stats:", JSON.stringify(stats, null, 2));

        // Verify Hierarchy
        const schools = await prisma.school.findMany({ include: { departments: { include: { divisions: { include: { panels: true } } } } } });
        console.log("\nHierarchy Check:");
        schools.forEach(s => {
            console.log(`School: ${s.name}`);
            s.departments.forEach(d => {
                console.log(`  Dept: ${d.name}`);
                d.divisions.forEach(div => {
                    console.log(`    Div: ${div.name}`);
                    div.panels.forEach(p => console.log(`      Panel: ${p.name}`));
                });
            });
        });

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
