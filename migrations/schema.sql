CREATE DATABASE IF NOT EXISTS career_portal;
USE career_portal;

-- 1. USERS (admin)
CREATE TABLE users (
  id            CHAR(36)     PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin') NOT NULL DEFAULT 'admin',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. JOBS
CREATE TABLE jobs (
  id               CHAR(36)     PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  designation      VARCHAR(255) NOT NULL,
  department       VARCHAR(255) NOT NULL,
  location         VARCHAR(255) NOT NULL,
  employment_type  ENUM('full-time','part-time','contract','internship') NOT NULL,
  experience_min   INT          NOT NULL DEFAULT 0,
  experience_max   INT          NOT NULL DEFAULT 0,
  description      TEXT,
  skills           JSON,
  responsibilities JSON,
  requirements     JSON,
  salary_min       INT          DEFAULT NULL,
  salary_max       INT          DEFAULT NULL,
  currency         VARCHAR(10)  DEFAULT 'INR',
  status           ENUM('draft','published','closed') DEFAULT 'draft',
  posted_by        CHAR(36)     NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- 3. APPLICANTS
CREATE TABLE applicants (
  id                  CHAR(36)     PRIMARY KEY,
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  phone               VARCHAR(20),
  current_designation VARCHAR(255),
  total_experience    DECIMAL(4,1) DEFAULT 0,
  skills              JSON,
  education           JSON,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP
);

-- 4. APPLICATIONS
CREATE TABLE applications (
  id           CHAR(36) PRIMARY KEY,
  job_id       CHAR(36) NOT NULL,
  applicant_id CHAR(36) NOT NULL,
  cover_note   TEXT,
  resume_url   VARCHAR(500),
  status       ENUM(
                 'submitted','under_review','shortlisted',
                 'interview_scheduled','rejected','hired'
               ) NOT NULL DEFAULT 'submitted',
  admin_notes  TEXT,
  applied_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id)       REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application (job_id, applicant_id)
);

-- 5. STATUS LOG
CREATE TABLE application_status_log (
  id             INT      PRIMARY KEY AUTO_INCREMENT,
  application_id CHAR(36) NOT NULL,
  old_status     VARCHAR(30),
  new_status     VARCHAR(30) NOT NULL,
  changed_by     CHAR(36)    NOT NULL,
  note           TEXT,
  changed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by)     REFERENCES users(id)
);

-- ADMIN SEED
INSERT INTO users (id, email, password_hash, role) VALUES (
  'admin-001',
  'admin@svayam.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);
-- Password: password