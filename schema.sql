-- =====================================================================
-- SHARANYA - College Placement Management System Database Schema
-- Database Name: placement_management
-- Default Credentials: root / mee_msql_password @ localhost:3306
-- =====================================================================

CREATE DATABASE IF NOT EXISTS placement_management;
USE placement_management;

-- Drop existing tables to ensure clean initialization
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS students;

-- =====================================================================
-- Table 1: students
-- Stores academic and profile details of registered college students
-- =====================================================================
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(30) NOT NULL UNIQUE,
    branch VARCHAR(50) NOT NULL,
    cgpa DECIMAL(3,2) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Table 2: companies
-- Stores registered recruiting companies and drive specifications
-- =====================================================================
CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    job_role VARCHAR(100) NOT NULL,
    package DECIMAL(10,2) NOT NULL,
    eligibility_cgpa DECIMAL(3,2) NOT NULL,
    drive_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Table 3: applications
-- Links students with company recruitment drives and tracks progress
-- =====================================================================
CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    company_id INT NOT NULL,
    applied_date DATE NOT NULL,
    round VARCHAR(50) DEFAULT 'Applied',
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_student 
        FOREIGN KEY (student_id) REFERENCES students(student_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_application_company 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_student_company UNIQUE (student_id, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- DUMMY / SEED DATA INSERTION
-- Realistic sample data for college demonstration
-- =====================================================================

-- Insert Sample Students (Minimum 8 records)
INSERT INTO students (student_id, name, roll_no, branch, cgpa, email) VALUES
(1, 'Rahul Sharma', '22CS001', 'CSE', 8.50, 'rahul@example.com'),
(2, 'Priya Reddy', '22CS002', 'CSE', 9.10, 'priya@example.com'),
(3, 'Arjun Kumar', '22CS003', 'ECE', 7.80, 'arjun@example.com'),
(4, 'Sneha Patel', '22CS004', 'CSE', 8.90, 'sneha@example.com'),
(5, 'Kiran Reddy', '22CS005', 'EEE', 7.20, 'kiran@example.com'),
(6, 'Ananya Verma', '22CS006', 'IT', 8.20, 'ananya@example.com'),
(7, 'Sai Krishna', '22CS007', 'CSE', 6.80, 'sai@example.com'),
(8, 'Divya Sharma', '22CS008', 'ECE', 9.30, 'divya@example.com');

-- Insert Sample Companies (Minimum 6 records)
INSERT INTO companies (company_id, company_name, job_role, package, eligibility_cgpa, drive_date) VALUES
(1, 'TCS', 'Software Developer', 6.00, 7.00, '2026-11-20'),
(2, 'Infosys', 'System Engineer', 5.00, 6.50, '2026-11-25'),
(3, 'Wipro', 'Project Engineer', 4.50, 6.00, '2026-12-02'),
(4, 'Accenture', 'Associate Software Engineer', 7.00, 7.50, '2026-12-10'),
(5, 'Amazon', 'Software Development Engineer', 18.00, 8.50, '2026-12-18'),
(6, 'Cognizant', 'Programmer Analyst', 5.50, 7.00, '2026-12-28');

-- Insert Sample Applications (Minimum 8 records)
-- Reflects various stages, rounds, and outcomes
INSERT INTO applications (application_id, student_id, company_id, applied_date, round, status) VALUES
(1, 1, 1, '2026-11-01', 'Technical Interview', 'Shortlisted'),
(2, 1, 5, '2026-11-02', 'HR Interview', 'Shortlisted'),
(3, 2, 5, '2026-11-01', 'Final Result', 'Selected'),
(4, 3, 4, '2026-11-03', 'Technical Interview', 'Shortlisted'),
(5, 4, 1, '2026-11-01', 'Final Result', 'Selected'),
(6, 4, 2, '2026-11-04', 'Online Assessment', 'Rejected'),
(7, 5, 2, '2026-11-02', 'HR Interview', 'Pending'),
(8, 6, 6, '2026-11-03', 'Online Assessment', 'Applied'),
(9, 7, 3, '2026-11-05', 'Applied', 'Pending'),
(10, 8, 5, '2026-11-01', 'Final Result', 'Selected');

