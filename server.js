/**
 * =====================================================================
 * SHARANYA - College Placement Management System
 * Backend Server: Node.js with Express.js and MySQL2 Connection Pooling
 * =====================================================================
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mee_mysql_password',
    database: process.env.DB_NAME || 'placement_management',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    decimalNumbers: true
};

const pool = mysql.createPool(dbConfig);

// Test database connection at startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('----------------------------------------------------');
        console.log('✓ Connected successfully to MySQL database: ' + dbConfig.database);
        console.log(`✓ Host: ${dbConfig.host}:${dbConfig.port} | User: ${dbConfig.user}`);
        console.log('----------------------------------------------------');
        connection.release();
    } catch (err) {
        console.error('----------------------------------------------------');
        console.error('⚠ Warning: Could not connect to MySQL database at startup.');
        console.error(`  Error Code: ${err.code} | Message: ${err.message}`);
        console.error('  Please ensure MySQL is running and schema.sql has been executed.');
        console.error('----------------------------------------------------');
    }
})();

// Helper function for centralized error logging and response
const handleError = (res, err, defaultMessage = 'Internal Server Error') => {
    console.error('API Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry: A record with this unique identifier already exists.'
        });
    }
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(400).json({
            success: false,
            error: 'Cannot delete record because it is referenced in placement applications.'
        });
    }
    return res.status(500).json({
        success: false,
        error: defaultMessage,
        details: err.message
    });
};

// =====================================================================
// 1. DASHBOARD API
// =====================================================================

/**
 * GET /api/dashboard
 * Returns dynamic placement summary metrics and recent applications
 */
app.get('/api/dashboard', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM students) AS totalStudents,
                (SELECT COUNT(*) FROM companies) AS totalCompanies,
                (SELECT COUNT(*) FROM applications) AS totalApplications,
                (SELECT COUNT(*) FROM applications WHERE status = 'Selected') AS totalSelected,
                (SELECT COUNT(*) FROM applications WHERE status = 'Shortlisted') AS totalShortlisted,
                (SELECT COUNT(*) FROM applications WHERE status = 'Rejected') AS totalRejected
        `;
        const [statsRows] = await pool.query(statsQuery);

        const recentQuery = `
            SELECT 
                a.application_id,
                s.name AS student_name,
                s.roll_no,
                s.branch,
                c.company_name,
                c.job_role,
                c.package,
                a.applied_date,
                a.round,
                a.status
            FROM applications a
            INNER JOIN students s ON a.student_id = s.student_id
            INNER JOIN companies c ON a.company_id = c.company_id
            ORDER BY a.application_id DESC
            LIMIT 5
        `;
        const [recentRows] = await pool.query(recentQuery);

        res.json({
            success: true,
            stats: statsRows[0] || {
                totalStudents: 0,
                totalCompanies: 0,
                totalApplications: 0,
                totalSelected: 0,
                totalShortlisted: 0,
                totalRejected: 0
            },
            recentApplications: recentRows
        });
    } catch (err) {
        handleError(res, err, 'Failed to retrieve dashboard statistics');
    }
});

// =====================================================================
// 2. STUDENT APIS
// =====================================================================

/**
 * GET /api/students
 * Fetch all registered students
 */
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM students ORDER BY student_id DESC');
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        handleError(res, err, 'Failed to fetch students');
    }
});

/**
 * GET /api/students/:id
 * Fetch individual student details
 */
app.get('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM students WHERE student_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        handleError(res, err, 'Failed to fetch student details');
    }
});

/**
 * POST /api/students
 * Register a new student
 */
app.post('/api/students', async (req, res) => {
    try {
        const { name, roll_no, branch, cgpa, email } = req.body;

        // Validation
        if (!name || !roll_no || !branch || cgpa === undefined || !email) {
            return res.status(400).json({
                success: false,
                error: 'All fields (name, roll_no, branch, cgpa, email) are required.'
            });
        }

        const parsedCgpa = parseFloat(cgpa);
        if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
            return res.status(400).json({
                success: false,
                error: 'CGPA must be a valid number between 0.00 and 10.00.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address format.'
            });
        }

        const insertQuery = `
            INSERT INTO students (name, roll_no, branch, cgpa, email)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            name.trim(),
            roll_no.trim().toUpperCase(),
            branch.trim().toUpperCase(),
            parsedCgpa.toFixed(2),
            email.trim().toLowerCase()
        ]);

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student_id: result.insertId,
            data: {
                student_id: result.insertId,
                name: name.trim(),
                roll_no: roll_no.trim().toUpperCase(),
                branch: branch.trim().toUpperCase(),
                cgpa: parseFloat(parsedCgpa.toFixed(2)),
                email: email.trim().toLowerCase()
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to register student');
    }
});

/**
 * PUT /api/students/:id
 * Update student information
 */
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, roll_no, branch, cgpa, email } = req.body;

        if (!name || !roll_no || !branch || cgpa === undefined || !email) {
            return res.status(400).json({
                success: false,
                error: 'All fields (name, roll_no, branch, cgpa, email) are required.'
            });
        }

        const parsedCgpa = parseFloat(cgpa);
        if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
            return res.status(400).json({
                success: false,
                error: 'CGPA must be a valid number between 0.00 and 10.00.'
            });
        }

        const updateQuery = `
            UPDATE students 
            SET name = ?, roll_no = ?, branch = ?, cgpa = ?, email = ?
            WHERE student_id = ?
        `;
        const [result] = await pool.query(updateQuery, [
            name.trim(),
            roll_no.trim().toUpperCase(),
            branch.trim().toUpperCase(),
            parsedCgpa.toFixed(2),
            email.trim().toLowerCase(),
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        res.json({
            success: true,
            message: 'Student details updated successfully'
        });
    } catch (err) {
        handleError(res, err, 'Failed to update student');
    }
});

/**
 * DELETE /api/students/:id
 * Delete a student if permitted by application relationships
 */
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check for active applications
        const [apps] = await pool.query(
            'SELECT COUNT(*) as count FROM applications WHERE student_id = ?',
            [id]
        );

        if (apps[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete student: ${apps[0].count} placement application(s) are linked to this student. Remove the applications first.`
            });
        }

        const [result] = await pool.query('DELETE FROM students WHERE student_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        res.json({
            success: true,
            message: 'Student deleted successfully'
        });
    } catch (err) {
        handleError(res, err, 'Failed to delete student');
    }
});

// =====================================================================
// 3. COMPANY APIS
// =====================================================================

/**
 * GET /api/companies
 * Fetch all registered companies
 */
app.get('/api/companies', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM companies ORDER BY drive_date ASC, company_id DESC');
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        handleError(res, err, 'Failed to fetch companies');
    }
});

/**
 * GET /api/companies/:id
 * Fetch individual company details
 */
app.get('/api/companies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM companies WHERE company_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        handleError(res, err, 'Failed to fetch company details');
    }
});

/**
 * POST /api/companies
 * Register a new company recruitment drive
 */
app.post('/api/companies', async (req, res) => {
    try {
        const { company_name, job_role, package: pkg, eligibility_cgpa, drive_date } = req.body;

        if (!company_name || !job_role || pkg === undefined || eligibility_cgpa === undefined || !drive_date) {
            return res.status(400).json({
                success: false,
                error: 'All fields (company_name, job_role, package, eligibility_cgpa, drive_date) are required.'
            });
        }

        const parsedPkg = parseFloat(pkg);
        const parsedEligibility = parseFloat(eligibility_cgpa);

        if (isNaN(parsedPkg) || parsedPkg <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Package must be a positive number in LPA (e.g. 6.50).'
            });
        }

        if (isNaN(parsedEligibility) || parsedEligibility < 0 || parsedEligibility > 10) {
            return res.status(400).json({
                success: false,
                error: 'Eligibility CGPA must be a valid number between 0.00 and 10.00.'
            });
        }

        const insertQuery = `
            INSERT INTO companies (company_name, job_role, package, eligibility_cgpa, drive_date)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            company_name.trim(),
            job_role.trim(),
            parsedPkg.toFixed(2),
            parsedEligibility.toFixed(2),
            drive_date
        ]);

        res.status(201).json({
            success: true,
            message: 'Company registered successfully',
            company_id: result.insertId,
            data: {
                company_id: result.insertId,
                company_name: company_name.trim(),
                job_role: job_role.trim(),
                package: parseFloat(parsedPkg.toFixed(2)),
                eligibility_cgpa: parseFloat(parsedEligibility.toFixed(2)),
                drive_date
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to register company');
    }
});

/**
 * PUT /api/companies/:id
 * Update company details
 */
app.put('/api/companies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, job_role, package: pkg, eligibility_cgpa, drive_date } = req.body;

        if (!company_name || !job_role || pkg === undefined || eligibility_cgpa === undefined || !drive_date) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required.'
            });
        }

        const parsedPkg = parseFloat(pkg);
        const parsedEligibility = parseFloat(eligibility_cgpa);

        if (isNaN(parsedPkg) || parsedPkg <= 0 || isNaN(parsedEligibility) || parsedEligibility < 0 || parsedEligibility > 10) {
            return res.status(400).json({
                success: false,
                error: 'Please provide valid numbers for package and eligibility CGPA.'
            });
        }

        const updateQuery = `
            UPDATE companies 
            SET company_name = ?, job_role = ?, package = ?, eligibility_cgpa = ?, drive_date = ?
            WHERE company_id = ?
        `;
        const [result] = await pool.query(updateQuery, [
            company_name.trim(),
            job_role.trim(),
            parsedPkg.toFixed(2),
            parsedEligibility.toFixed(2),
            drive_date,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        res.json({
            success: true,
            message: 'Company details updated successfully'
        });
    } catch (err) {
        handleError(res, err, 'Failed to update company');
    }
});

/**
 * DELETE /api/companies/:id
 * Delete a company if permitted by application relationships
 */
app.delete('/api/companies/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check for active applications
        const [apps] = await pool.query(
            'SELECT COUNT(*) as count FROM applications WHERE company_id = ?',
            [id]
        );

        if (apps[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete company: ${apps[0].count} student application(s) exist for this recruitment drive. Please remove the applications first.`
            });
        }

        const [result] = await pool.query('DELETE FROM companies WHERE company_id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        res.json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (err) {
        handleError(res, err, 'Failed to delete company');
    }
});

// =====================================================================
// 4. APPLICATION APIS
// =====================================================================

/**
 * GET /api/applications
 * Fetch all applications using SQL JOIN queries across students and companies
 */
app.get('/api/applications', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.application_id,
                a.student_id,
                s.name AS student_name,
                s.roll_no,
                s.branch,
                s.cgpa,
                s.email AS student_email,
                a.company_id,
                c.company_name,
                c.job_role,
                c.package,
                c.eligibility_cgpa,
                c.drive_date,
                a.applied_date,
                a.round,
                a.status
            FROM applications a
            INNER JOIN students s ON a.student_id = s.student_id
            INNER JOIN companies c ON a.company_id = c.company_id
            ORDER BY a.application_id DESC
        `;
        const [rows] = await pool.query(query);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        handleError(res, err, 'Failed to fetch applications');
    }
});

/**
 * POST /api/applications
 * Allow students to apply for company recruitment drives:
 * - Validates student and company IDs
 * - Verifies student CGPA against company eligibility CGPA
 * - Prevents duplicate applications
 * - Automatically stores current application date
 * - Defaults round = 'Applied', status = 'Pending'
 */
app.post('/api/applications', async (req, res) => {
    try {
        const { student_id, company_id } = req.body;

        if (!student_id || !company_id) {
            return res.status(400).json({
                success: false,
                error: 'Both student_id and company_id are required to apply.'
            });
        }

        // 1. Fetch Student Details
        const [students] = await pool.query(
            'SELECT student_id, name, roll_no, cgpa FROM students WHERE student_id = ?',
            [student_id]
        );
        if (students.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found.' });
        }
        const student = students[0];

        // 2. Fetch Company Details
        const [companies] = await pool.query(
            'SELECT company_id, company_name, job_role, package, eligibility_cgpa FROM companies WHERE company_id = ?',
            [company_id]
        );
        if (companies.length === 0) {
            return res.status(404).json({ success: false, error: 'Company recruitment drive not found.' });
        }
        const company = companies[0];

        // 3. Check CGPA Eligibility Criteria
        const studentCgpa = parseFloat(student.cgpa);
        const minCgpa = parseFloat(company.eligibility_cgpa);

        if (studentCgpa < minCgpa) {
            return res.status(400).json({
                success: false,
                error: `Ineligible: Student CGPA (${studentCgpa.toFixed(2)}) is below the required minimum CGPA of ${minCgpa.toFixed(2)} for ${company.company_name} (${company.job_role}).`
            });
        }

        // 4. Check for Duplicate Application
        const [existing] = await pool.query(
            'SELECT application_id FROM applications WHERE student_id = ? AND company_id = ?',
            [student_id, company_id]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Duplicate Application: ${student.name} (${student.roll_no}) has already applied to ${company.company_name}.`
            });
        }

        // 5. Automatic Application Date
        const today = new Date().toISOString().split('T')[0];
        const defaultRound = 'Applied';
        const defaultStatus = 'Pending';

        const insertQuery = `
            INSERT INTO applications (student_id, company_id, applied_date, round, status)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            student_id,
            company_id,
            today,
            defaultRound,
            defaultStatus
        ]);

        res.status(201).json({
            success: true,
            message: `Application submitted successfully for ${student.name} to ${company.company_name}!`,
            application_id: result.insertId,
            data: {
                application_id: result.insertId,
                student_id: student.student_id,
                student_name: student.name,
                roll_no: student.roll_no,
                company_id: company.company_id,
                company_name: company.company_name,
                job_role: company.job_role,
                applied_date: today,
                round: defaultRound,
                status: defaultStatus
            }
        });
    } catch (err) {
        handleError(res, err, 'Failed to submit placement application');
    }
});

/**
 * PUT /api/applications/:id/status
 * Update application status (Pending, Applied, Shortlisted, Selected, Rejected)
 */
app.put('/api/applications/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Applied', 'Shortlisted', 'Selected', 'Rejected'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Permitted values: ${validStatuses.join(', ')}`
            });
        }

        const [result] = await pool.query(
            'UPDATE applications SET status = ? WHERE application_id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        res.json({
            success: true,
            message: `Application status updated to '${status}' successfully.`
        });
    } catch (err) {
        handleError(res, err, 'Failed to update application status');
    }
});

/**
 * PUT /api/applications/:id/round
 * Update recruitment round (Applied, Online Assessment, Technical Interview, HR Interview, Final Result)
 */
app.put('/api/applications/:id/round', async (req, res) => {
    try {
        const { id } = req.params;
        const { round } = req.body;

        const validRounds = ['Applied', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Final Result'];
        if (!round || !validRounds.includes(round)) {
            return res.status(400).json({
                success: false,
                error: `Invalid recruitment round. Permitted values: ${validRounds.join(', ')}`
            });
        }

        const [result] = await pool.query(
            'UPDATE applications SET round = ? WHERE application_id = ?',
            [round, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        res.json({
            success: true,
            message: `Application round updated to '${round}' successfully.`
        });
    } catch (err) {
        handleError(res, err, 'Failed to update recruitment round');
    }
});

/**
 * DELETE /api/applications/:id
 * Delete an application
 */
app.delete('/api/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM applications WHERE application_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        res.json({
            success: true,
            message: 'Application deleted successfully.'
        });
    } catch (err) {
        handleError(res, err, 'Failed to delete application');
    }
});

// Route mappings for separate HTML pages
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/students', (req, res) => res.sendFile(path.join(__dirname, 'public', 'students.html')));
app.get('/companies', (req, res) => res.sendFile(path.join(__dirname, 'public', 'companies.html')));
app.get('/apply', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apply.html')));
app.get('/applications', (req, res) => res.sendFile(path.join(__dirname, 'public', 'applications.html')));

// Fallback route serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SHARANYA Placement Management Server is running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`====================================================`);
});

