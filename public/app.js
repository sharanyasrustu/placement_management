/**
 * =====================================================================
 * SHARANYA - College Placement Management System
 * Frontend Client Application (Vanilla JavaScript + Fetch API)
 * Supports Multi-Page Architecture & Dynamic Dropdown Boxes
 * =====================================================================
 */

// Application State
const state = {
    students: [],
    companies: [],
    applications: [],
    activeView: 'dashboard',
    pendingDelete: {
        type: null, // 'student' | 'company' | 'application'
        id: null,
        name: ''
    }
};

// Available Constants for Dropdown Boxes
const RECRUITMENT_ROUNDS = [
    'Applied',
    'Online Assessment',
    'Technical Interview',
    'HR Interview',
    'Final Result'
];

const APPLICATION_STATUSES = [
    'Pending',
    'Applied',
    'Shortlisted',
    'Selected',
    'Rejected'
];

// =====================================================================
// INITIALIZATION
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupEventHandlers();
    loadAllData();
});

/**
 * Loads all initial datasets from backend via Fetch API
 */
async function loadAllData() {
    await Promise.all([
        fetchDashboard(),
        fetchStudents(),
        fetchCompanies(),
        fetchApplications()
    ]);

    populateApplyDropdowns();

    // Check URL parameters for pre-selected student or company from table shortcuts
    const urlParams = new URLSearchParams(window.location.search);
    const preStudentId = urlParams.get('student_id');
    const preCompanyId = urlParams.get('company_id');

    if (preStudentId && document.getElementById('applyStudentSelect')) {
        document.getElementById('applyStudentSelect').value = preStudentId;
    }
    if (preCompanyId && document.getElementById('applyCompanySelect')) {
        document.getElementById('applyCompanySelect').value = preCompanyId;
    }
    if (preStudentId || preCompanyId) {
        checkEligibility();
    }
}

// =====================================================================
// NAVIGATION & SIDEBAR CONTROLS
// =====================================================================
function setupNavigation() {
    // Mobile sidebar toggle
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileToggleBtn && sidebar) {
        mobileToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !mobileToggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Topbar Quick Apply Button (if present)
    const quickApplyBtn = document.getElementById('quickApplyBtn');
    if (quickApplyBtn) {
        quickApplyBtn.addEventListener('click', () => {
            window.location.href = 'apply.html';
        });
    }
}

// =====================================================================
// API REQUESTS & DATA FETCHING
// =====================================================================

/**
 * Fetch dashboard metrics & recent applications
 */
async function fetchDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();

        if (result.success) {
            const stats = result.stats;
            const elStudents = document.getElementById('stat-total-students');
            const elCompanies = document.getElementById('stat-total-companies');
            const elApplications = document.getElementById('stat-total-applications');
            const elSelected = document.getElementById('stat-total-selected');
            const elShortlisted = document.getElementById('stat-total-shortlisted');
            const elRejected = document.getElementById('stat-total-rejected');

            if (elStudents) elStudents.textContent = stats.totalStudents || 0;
            if (elCompanies) elCompanies.textContent = stats.totalCompanies || 0;
            if (elApplications) elApplications.textContent = stats.totalApplications || 0;
            if (elSelected) elSelected.textContent = stats.totalSelected || 0;
            if (elShortlisted) elShortlisted.textContent = stats.totalShortlisted || 0;
            if (elRejected) elRejected.textContent = stats.totalRejected || 0;

            renderRecentApplications(result.recentApplications || []);
        }
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
    }
}

/**
 * Fetch registered students list
 */
async function fetchStudents() {
    try {
        const response = await fetch('/api/students');
        const result = await response.json();

        if (result.success) {
            state.students = result.data;
            renderStudentsTable(state.students);
            const badge = document.getElementById('studentsCountBadge');
            if (badge) badge.textContent = state.students.length;
        }
    } catch (err) {
        showToast('Failed to load students list', 'error');
    }
}

/**
 * Fetch registered companies list
 */
async function fetchCompanies() {
    try {
        const response = await fetch('/api/companies');
        const result = await response.json();

        if (result.success) {
            state.companies = result.data;
            renderCompaniesTable(state.companies);
            renderDashboardDrives(state.companies);
            populateCompanyFilters(state.companies);
            const badge = document.getElementById('companiesCountBadge');
            if (badge) badge.textContent = state.companies.length;
        }
    } catch (err) {
        showToast('Failed to load company drives', 'error');
    }
}

/**
 * Fetch all placement applications
 */
async function fetchApplications() {
    try {
        const response = await fetch('/api/applications');
        const result = await response.json();

        if (result.success) {
            state.applications = result.data;
            renderApplicationsTable(state.applications);
            const badge = document.getElementById('applicationsCountBadge');
            if (badge) badge.textContent = state.applications.length;
        }
    } catch (err) {
        showToast('Failed to load applications', 'error');
    }
}

// =====================================================================
// RENDERING FUNCTIONS
// =====================================================================

/**
 * Render students table
 */
function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No students found.</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td><strong>${escapeHtml(student.roll_no)}</strong></td>
            <td>
                <div><strong>${escapeHtml(student.name)}</strong></div>
            </td>
            <td><span class="badge badge-branch">${escapeHtml(student.branch)}</span></td>
            <td><span class="badge badge-cgpa">${parseFloat(student.cgpa).toFixed(2)}</span></td>
            <td>${escapeHtml(student.email)}</td>
            <td class="text-right">
                <div class="action-buttons-group">
                    <button class="btn-action-icon apply" title="Apply for Drive" onclick="applyForStudent(${student.student_id})">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                    <button class="btn-action-icon" title="Edit Student" onclick="openEditStudentModal(${student.student_id})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-action-icon delete" title="Delete Student" onclick="confirmDelete('student', ${student.student_id}, '${escapeHtml(student.name)}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Render companies table
 */
function renderCompaniesTable(companies) {
    const tbody = document.getElementById('companiesTableBody');
    if (!tbody) return;

    if (companies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No company drives registered yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = companies.map(company => `
        <tr>
            <td><strong>${escapeHtml(company.company_name)}</strong></td>
            <td>${escapeHtml(company.job_role)}</td>
            <td><span class="badge badge-package">₹ ${parseFloat(company.package).toFixed(2)} LPA</span></td>
            <td><span class="badge badge-cgpa">Min ${parseFloat(company.eligibility_cgpa).toFixed(2)}</span></td>
            <td><i class="fa-regular fa-calendar text-muted"></i> ${formatDate(company.drive_date)}</td>
            <td class="text-right">
                <div class="action-buttons-group">
                    <button class="btn-action-icon apply" title="Apply Students" onclick="applyForCompany(${company.company_id})">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                    <button class="btn-action-icon" title="Edit Company" onclick="openEditCompanyModal(${company.company_id})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-action-icon delete" title="Delete Company" onclick="confirmDelete('company', ${company.company_id}, '${escapeHtml(company.company_name)}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Render recent applications on dashboard
 */
function renderRecentApplications(recentApps) {
    const tbody = document.getElementById('recent-applications-body');
    if (!tbody) return;

    if (recentApps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No applications submitted yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = recentApps.map(app => `
        <tr>
            <td>
                <strong>${escapeHtml(app.student_name)}</strong>
                <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(app.roll_no)}</div>
            </td>
            <td><span class="badge badge-branch">${escapeHtml(app.branch)}</span></td>
            <td><strong>${escapeHtml(app.company_name)}</strong></td>
            <td><span class="badge badge-package">₹ ${parseFloat(app.package).toFixed(2)} LPA</span></td>
            <td>${escapeHtml(app.round)}</td>
            <td><span class="status-badge status-${escapeHtml(app.status)}">${escapeHtml(app.status)}</span></td>
        </tr>
    `).join('');
}

/**
 * Render upcoming drives preview on dashboard
 */
function renderDashboardDrives(companies) {
    const container = document.getElementById('dashboard-drives-list');
    if (!container) return;

    if (companies.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4">No active drives.</div>`;
        return;
    }

    const preview = companies.slice(0, 4);
    container.innerHTML = preview.map(c => `
        <div class="drive-item">
            <div class="drive-item-info">
                <strong>${escapeHtml(c.company_name)}</strong>
                <span>${escapeHtml(c.job_role)} &bull; Min CGPA: ${parseFloat(c.eligibility_cgpa).toFixed(2)}</span>
            </div>
            <div class="drive-item-meta">
                <span class="badge badge-package">₹ ${parseFloat(c.package).toFixed(2)} LPA</span>
                <small><i class="fa-regular fa-calendar"></i> ${formatDate(c.drive_date)}</small>
            </div>
        </div>
    `).join('');
}

/**
 * Render live applications management table with inline Dropdown Boxes
 */
function renderApplicationsTable(applications) {
    const tbody = document.getElementById('applicationsTableBody');
    if (!tbody) return;

    if (applications.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No applications matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = applications.map(app => `
        <tr>
            <td><strong>#${app.application_id}</strong></td>
            <td>
                <strong>${escapeHtml(app.student_name)}</strong>
                <div style="font-size: 0.78rem; color: var(--slate-500);">
                    ${escapeHtml(app.roll_no)} &bull; ${escapeHtml(app.branch)} &bull; CGPA: ${parseFloat(app.cgpa).toFixed(2)}
                </div>
            </td>
            <td>
                <strong>${escapeHtml(app.company_name)}</strong>
                <div style="font-size: 0.78rem; color: var(--slate-500);">${escapeHtml(app.job_role)}</div>
            </td>
            <td><span class="badge badge-package">₹ ${parseFloat(app.package).toFixed(2)} LPA</span></td>
            <td>${formatDate(app.applied_date)}</td>
            <td>
                <!-- Recruitment Round Inline Dropdown Box -->
                <select class="table-select" onchange="updateApplicationRound(${app.application_id}, this.value)">
                    ${RECRUITMENT_ROUNDS.map(r => `
                        <option value="${r}" ${app.round === r ? 'selected' : ''}>${r}</option>
                    `).join('')}
                </select>
            </td>
            <td>
                <!-- Application Status Inline Dropdown Box -->
                <select class="table-select status-badge status-${escapeHtml(app.status)}" onchange="updateApplicationStatus(${app.application_id}, this.value, this)">
                    ${APPLICATION_STATUSES.map(s => `
                        <option value="${s}" ${app.status === s ? 'selected' : ''}>${s}</option>
                    `).join('')}
                </select>
            </td>
            <td class="text-right">
                <button class="btn-action-icon delete" title="Delete Application" onclick="confirmDelete('application', ${app.application_id}, 'Application #${app.application_id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// =====================================================================
// APPLY FOR PLACEMENT VIEW LOGIC (CGPA CHECK + DROPDOWNS)
// =====================================================================

/**
 * Populates student and company dropdown boxes for the Apply section
 */
function populateApplyDropdowns() {
    const studentSelect = document.getElementById('applyStudentSelect');
    const companySelect = document.getElementById('applyCompanySelect');

    if (studentSelect) {
        studentSelect.innerHTML = `<option value="">-- Choose Registered Student from Dropdown --</option>` +
            state.students.map(s => `
                <option value="${s.student_id}" data-cgpa="${s.cgpa}">
                    [${escapeHtml(s.roll_no)}] ${escapeHtml(s.name)} - ${escapeHtml(s.branch)} (CGPA: ${parseFloat(s.cgpa).toFixed(2)})
                </option>
            `).join('');
    }

    if (companySelect) {
        companySelect.innerHTML = `<option value="">-- Choose Company Recruitment Drive from Dropdown --</option>` +
            state.companies.map(c => `
                <option value="${c.company_id}" data-min-cgpa="${c.eligibility_cgpa}" data-package="${c.package}">
                    ${escapeHtml(c.company_name)} - ${escapeHtml(c.job_role)} (Min CGPA: ${parseFloat(c.eligibility_cgpa).toFixed(2)}, ₹${parseFloat(c.package).toFixed(2)} LPA)
                </option>
            `).join('');
    }
}

/**
 * Check CGPA eligibility and duplicate status in real time
 */
function checkEligibility() {
    const studentSelect = document.getElementById('applyStudentSelect');
    const companySelect = document.getElementById('applyCompanySelect');
    const statusBox = document.getElementById('eligibilityStatusBox');
    const submitBtn = document.getElementById('submitApplyBtn');

    if (!studentSelect || !companySelect || !statusBox || !submitBtn) return;

    const studentId = parseInt(studentSelect.value);
    const companyId = parseInt(companySelect.value);

    // If either is not selected, display placeholder
    if (!studentId || !companyId) {
        statusBox.innerHTML = `
            <div class="eligibility-placeholder">
                <i class="fa-solid fa-circle-info"></i>
                <p>Select both a student and a company drive from the dropdown boxes to evaluate eligibility criteria automatically.</p>
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    const student = state.students.find(s => s.student_id === studentId);
    const company = state.companies.find(c => c.company_id === companyId);

    if (!student || !company) return;

    const studentCgpa = parseFloat(student.cgpa);
    const minCgpa = parseFloat(company.eligibility_cgpa);

    // Check if already applied
    const alreadyApplied = state.applications.some(
        a => a.student_id === studentId && a.company_id === companyId
    );

    if (alreadyApplied) {
        statusBox.innerHTML = `
            <div class="eligibility-result">
                <div class="eligibility-banner already-applied">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Already Applied: ${escapeHtml(student.name)} (${escapeHtml(student.roll_no)}) has already submitted an application to ${escapeHtml(company.company_name)}.</span>
                </div>
                <div class="eligibility-details-grid">
                    <div class="cgpa-compare-box">
                        <span>Student CGPA</span>
                        <strong>${studentCgpa.toFixed(2)}</strong>
                    </div>
                    <div class="cgpa-compare-box">
                        <span>Required CGPA</span>
                        <strong>${minCgpa.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    // Check CGPA Eligibility
    if (studentCgpa < minCgpa) {
        statusBox.innerHTML = `
            <div class="eligibility-result">
                <div class="eligibility-banner ineligible">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span>Ineligible: Student CGPA (${studentCgpa.toFixed(2)}) is lower than minimum requirement (${minCgpa.toFixed(2)}).</span>
                </div>
                <div class="eligibility-details-grid">
                    <div class="cgpa-compare-box">
                        <span>Student CGPA</span>
                        <strong class="text-danger">${studentCgpa.toFixed(2)}</strong>
                    </div>
                    <div class="cgpa-compare-box">
                        <span>Required CGPA</span>
                        <strong>${minCgpa.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `;
        submitBtn.disabled = true;
        return;
    }

    // Eligible
    statusBox.innerHTML = `
        <div class="eligibility-result">
            <div class="eligibility-banner eligible">
                <i class="fa-solid fa-circle-check"></i>
                <span>Eligible: Student meets or exceeds the required eligibility criteria (${studentCgpa.toFixed(2)} &ge; ${minCgpa.toFixed(2)}).</span>
            </div>
            <div class="eligibility-details-grid">
                <div class="cgpa-compare-box">
                    <span>Student CGPA</span>
                    <strong class="text-success">${studentCgpa.toFixed(2)}</strong>
                </div>
                <div class="cgpa-compare-box">
                    <span>Required CGPA</span>
                    <strong>${minCgpa.toFixed(2)}</strong>
                </div>
            </div>
        </div>
    `;
    submitBtn.disabled = false;
}

/**
 * Shortcut from Student table to apply for this student
 */
function applyForStudent(studentId) {
    window.location.href = `apply.html?student_id=${studentId}`;
}

/**
 * Shortcut from Company table to apply for this company
 */
function applyForCompany(companyId) {
    window.location.href = `apply.html?company_id=${companyId}`;
}

// =====================================================================
// FORM SUBMISSIONS (STUDENTS, COMPANIES, APPLICATIONS)
// =====================================================================

function setupEventHandlers() {
    // Apply Form Change Events
    const studentSelect = document.getElementById('applyStudentSelect');
    const companySelect = document.getElementById('applyCompanySelect');
    if (studentSelect) studentSelect.addEventListener('change', checkEligibility);
    if (companySelect) companySelect.addEventListener('change', checkEligibility);

    // Apply Form Submit
    const applyForm = document.getElementById('applyPlacementForm');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student_id = parseInt(document.getElementById('applyStudentSelect').value);
            const company_id = parseInt(document.getElementById('applyCompanySelect').value);

            try {
                const response = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id, company_id })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showToast(data.message, 'success');
                    applyForm.reset();
                    await Promise.all([fetchApplications(), fetchDashboard()]);
                    checkEligibility();
                } else {
                    showToast(data.error || 'Failed to apply', 'error');
                }
            } catch (err) {
                showToast('Network error while submitting application', 'error');
            }
        });
    }

    // Student Registration / Edit Form Submit
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = document.getElementById('studentFormId').value;
            const payload = {
                name: document.getElementById('studentName').value.trim(),
                roll_no: document.getElementById('studentRoll').value.trim(),
                branch: document.getElementById('studentBranch').value,
                cgpa: parseFloat(document.getElementById('studentCgpa').value),
                email: document.getElementById('studentEmail').value.trim()
            };

            const isEdit = !!studentId;
            const url = isEdit ? `/api/students/${studentId}` : '/api/students';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    showToast(data.message || 'Student saved successfully', 'success');
                    closeModal('studentModal');
                    studentForm.reset();
                    await Promise.all([fetchStudents(), fetchDashboard()]);
                    populateApplyDropdowns();
                } else {
                    showToast(data.error || 'Failed to save student', 'error');
                }
            } catch (err) {
                showToast('Network error while saving student', 'error');
            }
        });
    }

    // Company Registration / Edit Form Submit
    const companyForm = document.getElementById('companyForm');
    if (companyForm) {
        companyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const companyId = document.getElementById('companyFormId').value;
            const payload = {
                company_name: document.getElementById('companyName').value.trim(),
                job_role: document.getElementById('jobRole').value.trim(),
                package: parseFloat(document.getElementById('companyPackage').value),
                eligibility_cgpa: parseFloat(document.getElementById('companyEligibility').value),
                drive_date: document.getElementById('driveDate').value
            };

            const isEdit = !!companyId;
            const url = isEdit ? `/api/companies/${companyId}` : '/api/companies';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    showToast(data.message || 'Company drive saved successfully', 'success');
                    closeModal('companyModal');
                    companyForm.reset();
                    await Promise.all([fetchCompanies(), fetchDashboard()]);
                    populateApplyDropdowns();
                } else {
                    showToast(data.error || 'Failed to save company', 'error');
                }
            } catch (err) {
                showToast('Network error while saving company', 'error');
            }
        });
    }

    // Register Student Modal Opener
    const openAddStudentModalBtn = document.getElementById('openAddStudentModalBtn');
    if (openAddStudentModalBtn) {
        openAddStudentModalBtn.addEventListener('click', () => {
            document.getElementById('studentForm').reset();
            document.getElementById('studentFormId').value = '';
            document.getElementById('studentModalTitle').innerHTML = '<i class="fa-solid fa-user-graduate"></i> Register New Student';
            openModal('studentModal');
        });
    }

    // Register Company Modal Opener
    const openAddCompanyModalBtn = document.getElementById('openAddCompanyModalBtn');
    if (openAddCompanyModalBtn) {
        openAddCompanyModalBtn.addEventListener('click', () => {
            document.getElementById('companyForm').reset();
            document.getElementById('companyFormId').value = '';
            document.getElementById('companyModalTitle').innerHTML = '<i class="fa-solid fa-building"></i> Register Company Drive';
            openModal('companyModal');
        });
    }

    // Execution of confirmed deletion
    const executeDeleteBtn = document.getElementById('executeDeleteBtn');
    if (executeDeleteBtn) {
        executeDeleteBtn.addEventListener('click', executeConfirmedDelete);
    }

    // Student Filter and Search Listeners
    const studentSearchInput = document.getElementById('studentSearchInput');
    const studentBranchFilter = document.getElementById('studentBranchFilter');
    const studentSortFilter = document.getElementById('studentSortFilter');
    if (studentSearchInput) studentSearchInput.addEventListener('input', filterStudentsTable);
    if (studentBranchFilter) studentBranchFilter.addEventListener('change', filterStudentsTable);
    if (studentSortFilter) studentSortFilter.addEventListener('change', filterStudentsTable);

    // Company Search and Sort Listeners
    const companySearchInput = document.getElementById('companySearchInput');
    const companySortFilter = document.getElementById('companySortFilter');
    if (companySearchInput) companySearchInput.addEventListener('input', filterCompaniesTable);
    if (companySortFilter) companySortFilter.addEventListener('change', filterCompaniesTable);

    // Application Filters Listeners
    const appSearchInput = document.getElementById('appSearchInput');
    const appCompanyFilter = document.getElementById('appCompanyFilter');
    const appBranchFilter = document.getElementById('appBranchFilter');
    const appRoundFilter = document.getElementById('appRoundFilter');
    const appStatusFilter = document.getElementById('appStatusFilter');
    const resetAppFiltersBtn = document.getElementById('resetAppFiltersBtn');

    if (appSearchInput) appSearchInput.addEventListener('input', filterApplicationsTable);
    if (appCompanyFilter) appCompanyFilter.addEventListener('change', filterApplicationsTable);
    if (appBranchFilter) appBranchFilter.addEventListener('change', filterApplicationsTable);
    if (appRoundFilter) appRoundFilter.addEventListener('change', filterApplicationsTable);
    if (appStatusFilter) appStatusFilter.addEventListener('change', filterApplicationsTable);
    if (resetAppFiltersBtn) {
        resetAppFiltersBtn.addEventListener('click', () => {
            if (appSearchInput) appSearchInput.value = '';
            if (appCompanyFilter) appCompanyFilter.value = '';
            if (appBranchFilter) appBranchFilter.value = '';
            if (appRoundFilter) appRoundFilter.value = '';
            if (appStatusFilter) appStatusFilter.value = '';
            renderApplicationsTable(state.applications);
        });
    }
}

// =====================================================================
// LIVE UPDATE APIS (ROUND & STATUS DROPDOWNS)
// =====================================================================

/**
 * Updates application recruitment round via PUT API
 */
async function updateApplicationRound(applicationId, newRound) {
    try {
        const response = await fetch(`/api/applications/${applicationId}/round`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ round: newRound })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message, 'success');
            const target = state.applications.find(a => a.application_id === applicationId);
            if (target) target.round = newRound;
            fetchDashboard();
        } else {
            showToast(data.error || 'Failed to update round', 'error');
            fetchApplications();
        }
    } catch (err) {
        showToast('Error updating round', 'error');
        fetchApplications();
    }
}

/**
 * Updates application recruitment status via PUT API
 */
async function updateApplicationStatus(applicationId, newStatus, selectElement) {
    try {
        const response = await fetch(`/api/applications/${applicationId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message, 'success');
            if (selectElement) {
                selectElement.className = `table-select status-badge status-${newStatus}`;
            }
            const target = state.applications.find(a => a.application_id === applicationId);
            if (target) target.status = newStatus;
            fetchDashboard();
        } else {
            showToast(data.error || 'Failed to update status', 'error');
            fetchApplications();
        }
    } catch (err) {
        showToast('Error updating status', 'error');
        fetchApplications();
    }
}

// =====================================================================
// MODAL MANAGEMENT & CRUD HELPERS
// =====================================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

/**
 * Open edit modal for student
 */
function openEditStudentModal(studentId) {
    const student = state.students.find(s => s.student_id === studentId);
    if (!student) return;

    document.getElementById('studentFormId').value = student.student_id;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentRoll').value = student.roll_no;
    document.getElementById('studentBranch').value = student.branch;
    document.getElementById('studentCgpa').value = parseFloat(student.cgpa).toFixed(2);
    document.getElementById('studentEmail').value = student.email;

    document.getElementById('studentModalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Student Profile';
    openModal('studentModal');
}

/**
 * Open edit modal for company
 */
function openEditCompanyModal(companyId) {
    const company = state.companies.find(c => c.company_id === companyId);
    if (!company) return;

    document.getElementById('companyFormId').value = company.company_id;
    document.getElementById('companyName').value = company.company_name;
    document.getElementById('jobRole').value = company.job_role;
    
    // Select matching dropdown option if exists
    const roleSelect = document.getElementById('jobRoleSelect');
    if (roleSelect) {
        const optionExists = Array.from(roleSelect.options).some(o => o.value === company.job_role);
        roleSelect.value = optionExists ? company.job_role : 'custom';
    }

    document.getElementById('companyPackage').value = parseFloat(company.package).toFixed(2);
    document.getElementById('companyEligibility').value = parseFloat(company.eligibility_cgpa).toFixed(2);
    
    const rawDate = company.drive_date;
    const formattedDate = rawDate ? rawDate.split('T')[0] : '';
    document.getElementById('driveDate').value = formattedDate;

    document.getElementById('companyModalTitle').innerHTML = '<i class="fa-solid fa-building-pen"></i> Edit Company Drive';
    openModal('companyModal');
}

/**
 * Confirm deletion modal
 */
function confirmDelete(type, id, displayName) {
    state.pendingDelete = { type, id, name: displayName };
    const msgEl = document.getElementById('deleteConfirmMessage');
    
    const typeLabel = type === 'student' ? 'student' : type === 'company' ? 'company recruitment drive' : 'application';
    msgEl.textContent = `Are you sure you want to permanently delete ${typeLabel} "${displayName}"?`;

    openModal('deleteConfirmModal');
}

/**
 * Execute delete request to backend
 */
async function executeConfirmedDelete() {
    const { type, id } = state.pendingDelete;
    if (!type || !id) return;

    let endpoint = '';
    if (type === 'student') endpoint = `/api/students/${id}`;
    else if (type === 'company') endpoint = `/api/companies/${id}`;
    else if (type === 'application') endpoint = `/api/applications/${id}`;

    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message, 'success');
            closeModal('deleteConfirmModal');

            if (type === 'student') {
                await fetchStudents();
                populateApplyDropdowns();
            } else if (type === 'company') {
                await fetchCompanies();
                populateApplyDropdowns();
            } else if (type === 'application') {
                await fetchApplications();
            }
            fetchDashboard();
        } else {
            showToast(data.error || 'Failed to delete record', 'error');
            closeModal('deleteConfirmModal');
        }
    } catch (err) {
        showToast('Network error while deleting record', 'error');
        closeModal('deleteConfirmModal');
    }
}

// =====================================================================
// SEARCH & FILTER UTILITIES (WITH SORT & DROPDOWNS)
// =====================================================================

function filterStudentsTable() {
    const query = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
    const branch = document.getElementById('studentBranchFilter')?.value || '';
    const sort = document.getElementById('studentSortFilter')?.value || 'id_desc';

    let filtered = state.students.filter(s => {
        const matchesQuery = !query ||
                             s.name.toLowerCase().includes(query) ||
                             s.roll_no.toLowerCase().includes(query) ||
                             s.email.toLowerCase().includes(query);
        const matchesBranch = !branch || s.branch === branch;
        return matchesQuery && matchesBranch;
    });

    if (sort === 'cgpa_desc') filtered.sort((a, b) => parseFloat(b.cgpa) - parseFloat(a.cgpa));
    else if (sort === 'cgpa_asc') filtered.sort((a, b) => parseFloat(a.cgpa) - parseFloat(b.cgpa));
    else if (sort === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'roll_asc') filtered.sort((a, b) => a.roll_no.localeCompare(b.roll_no));
    else filtered.sort((a, b) => b.student_id - a.student_id);

    renderStudentsTable(filtered);
}

function filterCompaniesTable() {
    const query = (document.getElementById('companySearchInput')?.value || '').toLowerCase().trim();
    const sort = document.getElementById('companySortFilter')?.value || 'date_asc';

    let filtered = state.companies.filter(c => {
        return !query ||
               c.company_name.toLowerCase().includes(query) ||
               c.job_role.toLowerCase().includes(query);
    });

    if (sort === 'pkg_desc') filtered.sort((a, b) => parseFloat(b.package) - parseFloat(a.package));
    else if (sort === 'pkg_asc') filtered.sort((a, b) => parseFloat(a.package) - parseFloat(b.package));
    else if (sort === 'cgpa_asc') filtered.sort((a, b) => parseFloat(a.eligibility_cgpa) - parseFloat(b.eligibility_cgpa));
    else if (sort === 'cgpa_desc') filtered.sort((a, b) => parseFloat(b.eligibility_cgpa) - parseFloat(a.eligibility_cgpa));
    else if (sort === 'name_asc') filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
    else filtered.sort((a, b) => new Date(a.drive_date) - new Date(b.drive_date));

    renderCompaniesTable(filtered);
}

function populateCompanyFilters(companies) {
    const filter = document.getElementById('appCompanyFilter');
    if (!filter) return;

    const currentVal = filter.value;
    filter.innerHTML = `<option value="">-- All Companies (Dropdown) --</option>` +
        companies.map(c => `
            <option value="${c.company_name}">${escapeHtml(c.company_name)}</option>
        `).join('');
    filter.value = currentVal;
}

function filterApplicationsTable() {
    const query = (document.getElementById('appSearchInput')?.value || '').toLowerCase().trim();
    const company = document.getElementById('appCompanyFilter')?.value || '';
    const branch = document.getElementById('appBranchFilter')?.value || '';
    const round = document.getElementById('appRoundFilter')?.value || '';
    const status = document.getElementById('appStatusFilter')?.value || '';

    const filtered = state.applications.filter(a => {
        const matchesQuery = !query || 
            a.student_name.toLowerCase().includes(query) || 
            a.roll_no.toLowerCase().includes(query);
        const matchesCompany = !company || a.company_name === company;
        const matchesBranch = !branch || a.branch === branch;
        const matchesRound = !round || a.round === round;
        const matchesStatus = !status || a.status === status;

        return matchesQuery && matchesCompany && matchesBranch && matchesRound && matchesStatus;
    });

    renderApplicationsTable(filtered);
}

// =====================================================================
// DATA EXPORT (CSV / EXCEL COMPATIBLE)
// =====================================================================

function exportStudentsToCSV() {
    if (!state.students || state.students.length === 0) {
        showToast('No students to export', 'warning');
        return;
    }
    const headers = ['Student ID', 'Roll Number', 'Full Name', 'Branch', 'CGPA', 'Email Address'];
    const rows = state.students.map(s => [
        s.student_id,
        `"${s.roll_no}"`,
        `"${s.name}"`,
        `"${s.branch}"`,
        parseFloat(s.cgpa).toFixed(2),
        `"${s.email}"`
    ]);
    downloadCSV([headers, ...rows], 'SHARANYA_Students_List.csv');
}

function exportCompaniesToCSV() {
    if (!state.companies || state.companies.length === 0) {
        showToast('No companies to export', 'warning');
        return;
    }
    const headers = ['Company ID', 'Company Name', 'Job Role', 'Package (LPA)', 'Min Eligibility CGPA', 'Drive Date'];
    const rows = state.companies.map(c => [
        c.company_id,
        `"${c.company_name}"`,
        `"${c.job_role}"`,
        parseFloat(c.package).toFixed(2),
        parseFloat(c.eligibility_cgpa).toFixed(2),
        `"${c.drive_date}"`
    ]);
    downloadCSV([headers, ...rows], 'SHARANYA_Company_Drives.csv');
}

function exportApplicationsToCSV() {
    if (!state.applications || state.applications.length === 0) {
        showToast('No applications to export', 'warning');
        return;
    }
    const headers = ['Application ID', 'Roll Number', 'Student Name', 'Branch', 'CGPA', 'Company Name', 'Job Role', 'Package (LPA)', 'Applied Date', 'Round', 'Status'];
    const rows = state.applications.map(a => [
        a.application_id,
        `"${a.roll_no}"`,
        `"${a.student_name}"`,
        `"${a.branch}"`,
        parseFloat(a.cgpa).toFixed(2),
        `"${a.company_name}"`,
        `"${a.job_role}"`,
        parseFloat(a.package).toFixed(2),
        `"${a.applied_date}"`,
        `"${a.round}"`,
        `"${a.status}"`
    ]);
    downloadCSV([headers, ...rows], 'SHARANYA_Placement_Applications_Report.csv');
}

function downloadCSV(dataArray, filename) {
    const csvContent = dataArray.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully!`, 'success');
}

// =====================================================================
// NOTIFICATIONS & FORMATTING UTILS
// =====================================================================

/**
 * Toast notifications
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: 'fa-solid fa-circle-check',
        error: 'fa-solid fa-circle-xmark',
        warning: 'fa-solid fa-triangle-exclamation',
        info: 'fa-solid fa-circle-info'
    };

    toast.innerHTML = `
        <div class="toast-icon"><i class="${iconMap[type] || iconMap.info}"></i></div>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const cleanDate = dateStr.split('T')[0];
        const [year, month, day] = cleanDate.split('-');
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
