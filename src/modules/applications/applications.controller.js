import pool from '../../config/db.js';
import { v4 as uuid } from 'uuid';

const safeJson = (val, fallback = []) => {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
};

// ── POST submit application (public) ──────────
export const submitApplication = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { jobId, coverNote } = req.body;
    const applicantData = JSON.parse(req.body.applicant);
    const resumeUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const {
      firstName, lastName, email, phone,
      currentDesignation, totalExperience,
      skills = [], education = []
    } = applicantData;

    // Check job exists
    const [jobs] = await conn.execute(
      `SELECT id FROM jobs WHERE id = ? AND status = 'published'`,
      [jobId]
    );
    if (!jobs[0]) {
      await conn.rollback();
      return res.status(404).json({ message: 'Job not found or not published' });
    }

    // Applicant dhundho ya banao (email se)
    let applicantId;
    const [existing] = await conn.execute(
      `SELECT id FROM applicants WHERE email = ?`, [email]
    );

    if (existing[0]) {
      // Update karo latest info se
      applicantId = existing[0].id;
      await conn.execute(
        `UPDATE applicants SET
          first_name=?, last_name=?, phone=?,
          current_designation=?, total_experience=?,
          skills=?, education=?
         WHERE id=?`,
        [
          firstName, lastName, phone,
          currentDesignation, totalExperience,
          JSON.stringify(skills),
          JSON.stringify(education),
          applicantId
        ]
      );
    } else {
      // Naya applicant banao
      applicantId = uuid();
      await conn.execute(
        `INSERT INTO applicants (
          id, first_name, last_name, email, phone,
          current_designation, total_experience,
          skills, education
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          applicantId, firstName, lastName, email, phone,
          currentDesignation, totalExperience,
          JSON.stringify(skills),
          JSON.stringify(education)
        ]
      );
    }

    // Application banao
    const appId = uuid();
    await conn.execute(
      `INSERT INTO applications (
        id, job_id, applicant_id, cover_note, resume_url, status
      ) VALUES (?,?,?,?,?,'submitted')`,
      [appId, jobId, applicantId, coverNote || null, resumeUrl]
    );

    // Status log
   await conn.execute(
  `INSERT INTO application_status_log (
    application_id, old_status, new_status, note
  ) VALUES (?,NULL,'submitted','Initial submission')`,
  [appId]
);

    await conn.commit();
    res.status(201).json({
      message: 'Application submitted successfully',
      id: appId
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'You have already applied for this job'
      });
    }
    res.status(500).json({ message: 'Failed to submit application' });
  } finally {
    conn.release();
  }
};

// ── GET all applications (admin) ───────────────
export const getAllApplications = async (req, res) => {
  try {
    const { jobId, status } = req.query;

    let query = `
      SELECT
        a.id, a.status, a.applied_at, a.resume_url,
        a.cover_note, a.admin_notes,
        ap.id AS applicant_id,
        ap.first_name, ap.last_name, ap.email,
        ap.phone, ap.current_designation, ap.total_experience,
        ap.skills, ap.education,
        j.id AS job_id, j.title AS job_title,
        j.designation AS job_designation
      FROM applications a
      JOIN applicants ap ON ap.id = a.applicant_id
      JOIN jobs j        ON j.id  = a.job_id
      WHERE 1=1
    `;
    const params = [];

    if (jobId) {
      query += ` AND a.job_id = ?`;
      params.push(jobId);
    }
    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.applied_at DESC`;

    const [rows] = await pool.execute(query, params);

    const applications = rows.map(row => ({
      id:         row.id,
      jobId:      row.job_id,
      status:     row.status,
      appliedAt:  row.applied_at,
      resumeUrl:  row.resume_url,
      coverNote:  row.cover_note,
      adminNotes: row.admin_notes,
      applicant: {
        id:                 row.applicant_id,
        firstName:          row.first_name,
        lastName:           row.last_name,
        email:              row.email,
        phone:              row.phone,
        currentDesignation: row.current_designation,
        totalExperience:    row.total_experience,
        skills:             safeJson(row.skills, []),
        education:          safeJson(row.education, []),
      },
      job: {
        id:          row.job_id,
        title:       row.job_title,
        designation: row.job_designation,
      }
    }));

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET application by id (admin) ─────────────
export const getApplicationById = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        a.*, 
        ap.id AS applicant_id,
        ap.first_name, ap.last_name, ap.email,
        ap.phone, ap.current_designation, ap.total_experience,
        ap.skills, ap.education,
        j.title AS job_title, j.designation AS job_designation,
        j.department, j.location
      FROM applications a
      JOIN applicants ap ON ap.id = a.applicant_id
      JOIN jobs j        ON j.id  = a.job_id
      WHERE a.id = ?
    `, [req.params.id]);

    if (!rows[0]) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const row = rows[0];

    // Status log bhi lo
    const [logs] = await pool.execute(
      `SELECT * FROM application_status_log
       WHERE application_id = ?
       ORDER BY changed_at ASC`,
      [req.params.id]
    );

    res.json({
      id:         row.id,
      jobId:      row.job_id,
      status:     row.status,
      appliedAt:  row.applied_at,
      updatedAt:  row.updated_at,
      resumeUrl:  row.resume_url,
      coverNote:  row.cover_note,
      adminNotes: row.admin_notes,
      applicant: {
        id:                 row.applicant_id,
        firstName:          row.first_name,
        lastName:           row.last_name,
        email:              row.email,
        phone:              row.phone,
        currentDesignation: row.current_designation,
        totalExperience:    row.total_experience,
        skills:             safeJson(row.skills, []),
        education:          safeJson(row.education, []),
      },
      job: {
        title:       row.job_title,
        designation: row.job_designation,
        department:  row.department,
        location:    row.location,
      },
      statusLog: logs
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PATCH update status (admin) ────────────────
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // Current status lo
    const [current] = await pool.execute(
      `SELECT status FROM applications WHERE id = ?`, [id]
    );
    if (!current[0]) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const oldStatus = current[0].status;

    // Update karo
    await pool.execute(
      `UPDATE applications SET status=?, admin_notes=? WHERE id=?`,
      [status, adminNotes || null, id]
    );

    // Log mein save karo
    await pool.execute(
      `INSERT INTO application_status_log (
        application_id, old_status, new_status, changed_by, note
      ) VALUES (?,?,?,?,?)`,
      [id, oldStatus, status, req.user.id, adminNotes || null]
    );

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};