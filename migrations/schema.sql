-- Full schema for a fresh database (single source of truth). Legacy installs: align tables manually from this file.
CREATE DATABASE IF NOT EXISTS svayam_vishal;
USE svayam_vishal;

-- 1. JOBS
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
  posted_by        VARCHAR(64)  NOT NULL DEFAULT 'admin',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
                   ON UPDATE CURRENT_TIMESTAMP
);

-- 2. APPLICANTS
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

-- 3. APPLICATIONS
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

-- 4. STATUS LOG (changed_by optional; e.g. JWT subject string)
CREATE TABLE application_status_log (
  id             INT      PRIMARY KEY AUTO_INCREMENT,
  application_id CHAR(36) NOT NULL,
  old_status     VARCHAR(30),
  new_status     VARCHAR(30) NOT NULL,
  changed_by     VARCHAR(64) NULL DEFAULT NULL,
  note           TEXT,
  changed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  last_login DATETIME DEFAULT NULL,
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_upto DATETIME DEFAULT '2099-12-31 23:59:59',
  txn_start TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
  txn_end TIMESTAMP(6) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username),
  KEY idx_admin_users_validity (valid_from, valid_upto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;