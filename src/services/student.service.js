const prisma = require('../config/db');
const { supabaseAdmin } = require('../config/supabase');
const uploadTracker = require('../utils/uploadStatus');

/**
 * PANEL NAME GENERATOR
 */
const getNextPanelName = (index) => {
    let name = '';
    while (index >= 0) {
        name = String.fromCharCode((index % 26) + 65) + name;
        index = Math.floor(index / 26) - 1;
    }
    return name;
};

/**
 * HYPER-SPEED HIERARCHICAL STUDENT DISTRIBUTION (V5)
 * Dramatically optimized for large-scale data (10k+ records).
 */
const bulkCreateStudents = async (rawData, mode = 'skip') => {
    const start = Date.now();
    const total = rawData.length;
    const stats = {
        total,
        divisionsCreated: 0,
        schoolsCreated: 0,
        departmentsCreated: 0,
        panelsCreated: 0,
        studentsAssigned: 0,
        facultyAssigned: 0,
        skipped: 0
    };
    const errors = [];

    console.log(`[HYPER-SPEED] Starting ingestion for ${total} records.`);
    uploadTracker.start(total);

    // 1. UNIQUE HIERARCHY PRE-PROVISIONING
    // Extract unique levels to avoid per-row database roundtrips
    const uniqueHierarchy = new Map(); // divName -> { schoolName -> { deptName -> { panelName? } } }

    rawData.forEach(row => {
        const div = (row.division || 'General Division').trim();
        const school = (row.school || 'General School').trim();
        const dept = (row.department || 'General Department').trim();
        const panel = row.panel ? String(row.panel).trim().toUpperCase() : null;

        if (!uniqueHierarchy.has(div)) uniqueHierarchy.set(div, new Map());
        const divMap = uniqueHierarchy.get(div);
        if (!divMap.has(school)) divMap.set(school, new Map());
        const schoolMap = divMap.get(school);
        if (!schoolMap.has(dept)) schoolMap.set(dept, new Set());
        if (panel) schoolMap.get(dept).add(panel);
    });

    // Sync Hierarchy to DB and Build Caches
    const cache = {
        divisions: new Map(), // name -> id
        schools: new Map(),   // divId:name -> id
        departments: new Map(), // schoolId:name -> id
        panels: new Map(),     // deptId:name -> id
    };

    for (const [divName, schools] of uniqueHierarchy) {
        const div = await prisma.division.upsert({
            where: { name: divName },
            update: {},
            create: { name: divName }
        });
        cache.divisions.set(divName, div.id);
        stats.divisionsCreated++;

        for (const [schoolName, depts] of schools) {
            const school = await prisma.school.upsert({
                where: { name_divisionId: { name: schoolName, divisionId: div.id } },
                update: {},
                create: { name: schoolName, divisionId: div.id }
            });
            cache.schools.set(`${div.id}:${schoolName}`, school.id);
            stats.schoolsCreated++;

            for (const [deptName, panels] of depts) {
                const dept = await prisma.department.upsert({
                    where: { name_schoolId: { name: deptName, schoolId: school.id } },
                    update: {},
                    create: { name: deptName, schoolId: school.id }
                });
                cache.departments.set(`${school.id}:${deptName}`, dept.id);
                stats.departmentsCreated++;

                // Pre-create provided panels
                for (const panelName of panels) {
                    const panel = await prisma.panel.upsert({
                        where: { name_departmentId: { name: panelName, departmentId: dept.id } },
                        update: {},
                        create: { name: panelName, departmentId: dept.id }
                    });
                    cache.panels.set(`${dept.id}:${panelName}`, panel.id);
                    stats.panelsCreated++;
                }
            }
        }
    }

    // 2. IDENTITY RESOLUTION & COMPACT PROCESSING
    // Fetch all existing users to minimize Supabase/DB calls
    const existingEmailsInDB = await prisma.user.findMany({
        where: { email: { in: rawData.map(r => r.email).filter(Boolean) } },
        select: { email: true, id: true, supabaseId: true }
    });
    const userCache = new Map(existingEmailsInDB.map(u => [u.email.toLowerCase(), u]));

    // 3. AUTO-PANEL GENERATOR CACHE (For rows missing panel)
    const departmentsToRefreshFromDB = [...cache.departments.values()];
    const panelsInDB = await prisma.panel.findMany({
        where: { departmentId: { in: departmentsToRefreshFromDB } },
        include: { _count: { select: { students: true } } }
    });
    
    // deptId -> Array of panels
    const autoPanelCache = new Map();
    panelsInDB.forEach(p => {
        if (!autoPanelCache.has(p.departmentId)) autoPanelCache.set(p.departmentId, []);
        autoPanelCache.get(p.departmentId).push(p);
    });

    // 4. PARALLEL SUPABASE PROVISIONING & BATCH SQL
    const CONCURRENCY = 10; // Lowered to avoid connection pressure
    const BATCH_SIZE = 100;

    for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
        if (uploadTracker.shouldCancel()) break;
        const chunk = rawData.slice(i, i + BATCH_SIZE);
        
        // Step A: Determine targets and prepare Supabase work
        const supabaseWork = [];
        const existingStudentData = [];
        const existingFacultyData = [];
        const emailsInThisBatch = new Set();

        for (const row of chunk) {
            const email = String(row.email).trim().toLowerCase();
            if (!email) continue;
            emailsInThisBatch.add(email);

            // 1. Resolve Role (Default: STUDENT)
            const rowRole = String(row.role || 'STUDENT').trim().toUpperCase();
            const targetRole = rowRole === 'FACULTY' || rowRole === 'TEACHER' ? 'FACULTY' : 'STUDENT';
            const isFaculty = targetRole === 'FACULTY';

            // Resolve Panel ID
            const divId = cache.divisions.get((row.division || 'General Division').trim());
            const schoolId = cache.schools.get(`${divId}:${(row.school || 'General School').trim()}`);
            const deptId = cache.departments.get(`${schoolId}:${(row.department || 'General Department').trim()}`);
            
            let panelId;
            const pName = row.panel ? String(row.panel).trim().toUpperCase() : null;
            if (pName) {
                panelId = cache.panels.get(`${deptId}:${pName}`);
            } else {
                // Auto Distribution Logic (Load from Cache or Map)
                if (!autoPanelCache.has(deptId)) {
                    autoPanelCache.set(deptId, []);
                }
                let deptPanels = autoPanelCache.get(deptId);
                
                let target = deptPanels.find(p => p._count.students < 25);
                if (!target) {
                    target = await prisma.panel.create({
                        data: { name: getNextPanelName(deptPanels.length), departmentId: deptId },
                        include: { _count: { select: { students: true } } }
                    });
                    deptPanels.push(target);
                    stats.panelsCreated++;
                }
                target._count.students++; // In-memory count update
                panelId = target.id;
            }

            if (!userCache.has(email)) {
                supabaseWork.push({ email, name: row.name || email, panelId, targetRole, deptId });
            } else {
                const userData = { 
                    email, 
                    name: row.name || email, 
                    userId: userCache.get(email).id,
                    deptId
                };
                
                if (isFaculty) {
                    existingFacultyData.push(userData);
                } else {
                    existingStudentData.push({ ...userData, panelId });
                }
            }
        }

        // Step B: Parallel Supabase Provisioning (Auth Only)
        const batchNewUsers = [];
        for (let j = 0; j < supabaseWork.length; j += CONCURRENCY) {
            const batch = supabaseWork.slice(j, j + CONCURRENCY);
            await Promise.all(batch.map(async (item) => {
                try {
                    const { data, error } = await supabaseAdmin.auth.admin.createUser({
                        email: item.email,
                        password: '123456',
                        email_confirm: true,
                        user_metadata: { name: item.name, role: item.targetRole }
                    });

                    if (error && !error.message.includes('already registered')) {
                        errors.push(`${item.email} (Supabase): ${error.message}`);
                        return; // Non-blocking failure
                    }
                    
                    batchNewUsers.push({
                        email: item.email,
                        role: item.targetRole,
                        supabaseId: data?.user?.id || 'EXTERNAL'
                    });
                } catch (e) {
                    errors.push(`${item.email} (Auth): ${e.message}`);
                }
            }));
        }

        // Step C: Batch DB User Insertion
        if (batchNewUsers.length > 0) {
            await prisma.user.createMany({
                data: batchNewUsers,
                skipDuplicates: true
            });
            
            // Re-query newly created users to get their IDs
            const freshUsers = await prisma.user.findMany({
                where: { email: { in: batchNewUsers.map(u => u.email) } },
                select: { id: true, email: true }
            });
            
            freshUsers.forEach(u => {
                const email = u.email.toLowerCase();
                const originalWork = supabaseWork.find(w => w.email === email);
                if (originalWork) {
                    const userData = {
                        email,
                        name: originalWork.name,
                        userId: u.id,
                        deptId: originalWork.deptId
                    };
                    
                    if (originalWork.targetRole === 'FACULTY') {
                        existingFacultyData.push(userData);
                    } else {
                        existingStudentData.push({ ...userData, panelId: originalWork.panelId });
                    }
                }
            });
        }

        // Step D: Batch DB Upsert for Students
        if (existingStudentData.length > 0) {
            await prisma.$transaction(
                existingStudentData.map(s => prisma.student.upsert({
                    where: { email: s.email },
                    update: { panelId: s.panelId, name: s.name },
                    create: { email: s.email, name: s.name, panelId: s.panelId, userId: s.userId }
                }))
            );
            stats.studentsAssigned += existingStudentData.length;
        }

        // Step E: Batch DB Upsert for Faculty
        if (existingFacultyData.length > 0) {
            await prisma.$transaction(
                existingFacultyData.map(f => prisma.faculty.upsert({
                    where: { userId: f.userId }, // Faculty is uniquely linked to User
                    update: { name: f.name, departmentId: f.deptId },
                    create: { name: f.name, departmentId: f.deptId, userId: f.userId }
                }))
            );
            stats.facultyAssigned += existingFacultyData.length;
        }

        uploadTracker.update(chunk.length);
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[HYPER-SPEED] Ingestion finished in ${duration}s.`);
    uploadTracker.complete();
    return { 
        ...stats, 
        inserted: stats.studentsAssigned,
        errors 
    };
};

module.exports = { bulkCreateStudents };
