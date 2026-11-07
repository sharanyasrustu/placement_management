# SHARANYA – College Placement Management System

A full-stack, responsive web application built for college Training & Placement Offices (TPO), students, and recruiters.

---

## 🌟 System Architecture & Highlights

- **Backend:** Node.js with Express.js RESTful API architecture.
- **Database:** MySQL relational database utilizing connection pooling (`mysql2/promise`).
- **Frontend:** Responsive SPA using vanilla JavaScript (`fetch` API), semantic HTML5, and custom modern CSS3.
- **Key Modules:**
  - 📊 **Dynamic Dashboard:** Real-time metrics on students, drives, applications, selections, shortlists, and rejections.
  - 👨‍🎓 **Student Management:** Full CRUD operations with unique Roll No / Email validation.
  - 🏢 **Company Drives:** Full CRUD operations for company drives with CTC packages and min CGPA requirements.
  - 🎯 **Automated CGPA Eligibility Engine:** Client and server-side verification preventing students from applying to drives for which their CGPA is insufficient.
  - 🚫 **Duplicate Prevention:** Unique composite constraint on `(student_id, company_id)`.
  - 📋 **Recruitment Pipeline Tracking:** Real-time updates for recruitment rounds (`Applied`, `Online Assessment`, `Technical Interview`, `HR Interview`, `Final Result`) and application statuses (`Pending`, `Applied`, `Shortlisted`, `Selected`, `Rejected`).

---

## 📁 Project Structure (Multi-Page Architecture)

```text
SHARANYA-PLACEMENT-MANAGEMENT/
│
├── schema.sql              (MySQL Database Schema & Seed Data)
├── server.js               (Express.js REST API Server)
├── package.json            (Dependencies & NPM Scripts)
├── .env                    (MySQL Environment Credentials)
├── .env.example            (Sample Environment Variables)
│
└── public/
    ├── index.html          (Dashboard Overview Page)
    ├── students.html       (Student Management Page with Dropdowns)
    ├── companies.html      (Company Recruitment Drives Page with Dropdowns)
    ├── apply.html          (Apply for Placement Page with Student & Drive Dropdowns)
    ├── applications.html   (Applications Tracker with Filter Dropdowns & Row Dropdowns)
    ├── style.css           (Modern Responsive Corporate Theme)
    └── app.js              (Frontend Controller with Fetch API & CSV Export)
```

### 1. `students`
- `student_id` (INT AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(100) NOT NULL)
- `roll_no` (VARCHAR(30) NOT NULL UNIQUE)
- `branch` (VARCHAR(50) NOT NULL)
- `cgpa` (DECIMAL(3,2) NOT NULL)
- `email` (VARCHAR(100) NOT NULL UNIQUE)

### 2. `companies`
- `company_id` (INT AUTO_INCREMENT PRIMARY KEY)
- `company_name` (VARCHAR(150) NOT NULL)
- `job_role` (VARCHAR(100) NOT NULL)
- `package` (DECIMAL(10,2) NOT NULL)
- `eligibility_cgpa` (DECIMAL(3,2) NOT NULL)
- `drive_date` (DATE NOT NULL)

### 3. `applications`
- `application_id` (INT AUTO_INCREMENT PRIMARY KEY)
- `student_id` (INT NOT NULL, FK &rarr; students)
- `company_id` (INT NOT NULL, FK &rarr; companies)
- `applied_date` (DATE NOT NULL)
- `round` (VARCHAR(50) DEFAULT 'Applied')
- `status` (VARCHAR(30) DEFAULT 'Pending')
- *Constraint:* `UNIQUE (student_id, company_id)`

---

## 🚀 Quick Start Guide

### 1. Setup Database
In MySQL Workbench or MySQL CLI:
```sql
SOURCE schema.sql;
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
node server.js
```

### 4. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

