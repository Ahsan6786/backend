const prisma = require('../config/db');
const { supabaseAdmin } = require('../config/supabase');
const uploadTracker = require('../utils/uploadStatus');

/**
 * Pre-flight Analysis
 */
const preFlightAnalysis = async (rawData) => {
    const emails = rawData
        .map(r => String(r.email || '').trim().toLowerCase())
        .filter(e => e.includes('@'));

    const uniqueEmails = [...new Set(emails)];

    const existingUsers = await prisma.user.findMany({
        where: { email: { in: uniqueEmails } },
        select: { email: true, role: true }
    });

    return {
        totalRows: rawData.length,
        validEmails: uniqueEmails.length,
        duplicateCount: existingUsers.length,
        newCount: uniqueEmails.length - existingUsers.length,
        existingUsers
    };
};

/**
 * MAIN INGESTION ENGINE
 */
const bulkIngestData = async (rawData, strategy = 'overwrite') => {
    const start = Date.now();

    const stats = {
        total: rawData.length,
        schoolsCreated: 0,
        departmentsCreated: 0,
        divisionsCreated: 0,
        panelsCreated: 0,
        studentsCreated: 0,
        facultyCreated: 0,
        usersCreated: 0,
        errors: []
    };

    uploadTracker.start(rawData.length);

    // 🔥 PRELOAD USERS (IMPORTANT FIX)
    const existingUsers = await prisma.user.findMany({
        select: { email: true }
    });
    const existingEmailSet = new Set(existingUsers.map(u => u.email));

    const cache = {
        division: new Map(),
        school: new Map(),
        dept: new Map(),
        panel: new Map()
    };

    const details = [];

    console.log(`[INGESTION] Processing ${rawData.length} records...`);

    for (const row of rawData) {
        if (uploadTracker.shouldCancel()) break;

        const rowLog = {
            email: String(row.email || '').trim().toLowerCase(),
            name: String(row.name || row.email || 'Unknown').trim(),
            rawRole: row.role || 'Missing',
            normalizedRole: 'Pending',
            status: 'Pending',
            error: null
        };

        try {
            const email = rowLog.email;

            if (!email.includes('@')) {
                throw new Error(`Invalid email`);
            }

            // 🔥 SKIP STRATEGY FIX
            const isExisting = existingEmailSet.has(email);
            if (strategy === 'skip' && isExisting) {
                rowLog.status = 'SKIPPED';
                details.push(rowLog);
                continue;
            }

            // ROLE NORMALIZATION
            let roleToken = 'STUDENT';
            const role = String(row.role || '').toLowerCase().trim();

            if (!role) {
                rowLog.normalizedRole = 'STUDENT (Default)';
            } else if (['faculty', 'teacher'].includes(role)) {
                roleToken = 'FACULTY';
                rowLog.normalizedRole = 'FACULTY';
            } else if (role === 'student') {
                roleToken = 'STUDENT';
                rowLog.normalizedRole = 'STUDENT';
            } else {
                throw new Error(`Invalid role: ${row.role}`);
            }

            // ✅ SAFE STRING HANDLING (FIXED)
            const safe = (val, def = '') =>
                typeof val === 'string'
                    ? val.trim()
                    : val !== undefined && val !== null
                        ? String(val).trim()
                        : def;

            // ✅ DIVISION FIX
            const normalizeDivision = (input) => {
                const val = safe(input).toUpperCase();

                if (['1', 'I', 'A', 'DIV I'].includes(val)) return 'DIV I';
                if (['2', 'II', 'B', 'DIV II'].includes(val)) return 'DIV II';
                if (['3', 'III', 'C', 'DIV III'].includes(val)) return 'DIV III';
                if (['4', 'IV', 'D', 'DIV IV'].includes(val)) return 'DIV IV';

                return 'DIV I';
            };

            const divName = normalizeDivision(row.division);
            const schoolName = safe(row.school, 'General School');
            const deptName = safe(row.department, 'General Department');
            const panelName = safe(row.panel, 'A').toUpperCase();

            // ===== HIERARCHY =====

            // DIVISION
            let divId = cache.division.get(divName);
            if (!divId) {
                const div = await prisma.division.upsert({
                    where: { name: divName },
                    update: {},
                    create: { name: divName }
                });
                divId = div.id;
                cache.division.set(divName, divId);
                stats.divisionsCreated++;
            }

            // SCHOOL (FIXED UNIQUE KEY)
            const schoolKey = `${divId}_${schoolName}`;
            let schoolId = cache.school.get(schoolKey);

            if (!schoolId) {
                const school = await prisma.school.upsert({
                    where: {
                        name_divisionId: {
                            name: schoolName,
                            divisionId: divId
                        }
                    },
                    update: {},
                    create: {
                        name: schoolName,
                        divisionId: divId
                    }
                });

                schoolId = school.id;
                cache.school.set(schoolKey, schoolId);
                stats.schoolsCreated++;
            }

            // DEPT
            const deptKey = `${schoolId}_${deptName}`;
            let deptId = cache.dept.get(deptKey);

            if (!deptId) {
                const dept = await prisma.department.upsert({
                    where: {
                        name_schoolId: {
                            name: deptName,
                            schoolId
                        }
                    },
                    update: {},
                    create: { name: deptName, schoolId }
                });

                deptId = dept.id;
                cache.dept.set(deptKey, deptId);
                stats.departmentsCreated++;
            }

            // PANEL
            const panelKey = `${deptId}_${panelName}`;
            let panelId = cache.panel.get(panelKey);

            if (!panelId) {
                const panel = await prisma.panel.upsert({
                    where: {
                        name_departmentId: {
                            name: panelName,
                            departmentId: deptId
                        }
                    },
                    update: {},
                    create: { name: panelName, departmentId: deptId }
                });

                panelId = panel.id;
                cache.panel.set(panelKey, panelId);
                stats.panelsCreated++;
            }

            // ===== USER =====
            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                const { data, error } =
                    await supabaseAdmin.auth.admin.createUser({
                        email,
                        password: '123456',
                        email_confirm: true,
                        user_metadata: { name: rowLog.name, role: roleToken }
                    });

                if (error) throw error;

                user = await prisma.user.create({
                    data: {
                        email,
                        role: roleToken,
                        supabaseId: data.user.id
                    }
                });

                stats.usersCreated++;
            } else {
                await prisma.user.update({
                    where: { email },
                    data: { role: roleToken }
                });
            }

            // ===== PROFILE =====
            if (roleToken === 'FACULTY') {
                await prisma.faculty.upsert({
                    where: { userId: user.id },
                    update: {
                        name: rowLog.name,
                        departmentId: deptId
                    },
                    create: {
                        userId: user.id,
                        name: rowLog.name,
                        departmentId: deptId
                    }
                });

                stats.facultyCreated++;
                rowLog.status = 'FACULTY';
            } else {
                await prisma.student.upsert({
                    where: { email },
                    update: {
                        name: rowLog.name,
                        userId: user.id,
                        panelId
                    },
                    create: {
                        email,
                        name: rowLog.name,
                        userId: user.id,
                        panelId
                    }
                });

                stats.studentsCreated++;
                rowLog.status = 'STUDENT';
            }

            uploadTracker.update(1);

        } catch (err) {
            console.error(`[FAILED] ${rowLog.email}: ${err.message}`);
            rowLog.status = 'FAILED';
            rowLog.error = err.message;
            stats.errors.push(err.message);
        }

        details.push(rowLog);
    }

    uploadTracker.complete();

    console.log(
        `[INGESTION DONE] ${stats.studentsCreated + stats.facultyCreated} created`
    );

    return {
        ...stats,
        details
    };
};

module.exports = { bulkIngestData, preFlightAnalysis };