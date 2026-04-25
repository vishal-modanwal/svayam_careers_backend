import pool from '../../config/db.js';
import { v4 as uuid } from 'uuid';
import {
  sendApplicationConfirmationEmail,
  sendInterviewScheduledEmail,
} from '../../services/mail.service.js';

const safeJson = (val, fallback = []) => {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
};

// ── POST submit application (public) ──────────
export const submitApplication = async (req, res) => {
  const conn = await pool.getConnection();
  let emailPayload = null;
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
      `SELECT id, title, designation
       FROM jobs
       WHERE id = ? AND status = 'published'`,
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
      applicantId = existing[0].id;
      const [dupApp] = await conn.execute(
        `SELECT id FROM applications WHERE job_id = ? AND applicant_id = ?`,
        [jobId, applicantId]
      );
      if (dupApp[0]) {
        await conn.rollback();
        return res.status(409).json({
          message: 'You have already applied for this job',
        });
      }
      // Update karo latest info se
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

    emailPayload = {
      to: email,
      firstName,
      jobTitle: jobs[0].title || jobs[0].designation || 'the selected role',
      status: 'Submitted',
    };

    res.status(201).json({
      message: 'Application submitted successfully',
      id: appId
    });

  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'You have already applied for this job',
      });
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to submit application' });
  } finally {
    conn.release();
  }

  if (emailPayload) {
    try {
      await sendApplicationConfirmationEmail(emailPayload);
    } catch (emailErr) {
      console.error('Application confirmation email failed:', emailErr.message);
    }
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
// JSON body keys (camelCase only): status, adminNotes?, interviewDate?, interviewTime?, interviewMode?, interviewLink?, interviewLocation?
// When status is interview_scheduled: interviewDate, interviewTime, interviewMode required; interviewLink and/or interviewLocation (at least one non-empty).
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      adminNotes,
      interviewDate,
      interviewTime,
      interviewMode,
      interviewLink,
      interviewLocation,
    } = req.body;

    // Current status + candidate details lo
    const [current] = await pool.execute(
      `SELECT
         a.status,
         ap.first_name,
         ap.email,
         j.title,
         j.designation
       FROM applications a
       JOIN applicants ap ON ap.id = a.applicant_id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ?`,
      [id]
    );
    if (!current[0]) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const oldStatus = current[0].status;
    const normalizedStatus = String(status || '').toLowerCase();
    const sendsInterviewScheduleMail =
      normalizedStatus === 'interview_scheduled';
    const normalizedInterviewMode = String(interviewMode ?? '').trim();

    if (sendsInterviewScheduleMail) {
      const hasDate = Boolean(
        interviewDate != null && String(interviewDate).trim()
      );
      const hasTime = Boolean(
        interviewTime != null && String(interviewTime).trim()
      );
      const hasMode = Boolean(normalizedInterviewMode);
      const hasVenue = Boolean(
        (interviewLink != null && String(interviewLink).trim()) ||
          (interviewLocation != null && String(interviewLocation).trim())
      );

      if (!hasDate || !hasTime || !hasMode || !hasVenue) {
        const missing = [];
        if (!hasDate) missing.push('interviewDate');
        if (!hasTime) missing.push('interviewTime');
        if (!hasMode) missing.push('interviewMode');
        if (!hasVenue) {
          missing.push('interviewLink and/or interviewLocation');
        }
        return res.status(400).json({
          message:
            'interview_scheduled requires interview date, time, mode, and link or location from the client',
          missing,
        });
      }
    }

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

    if (sendsInterviewScheduleMail) {
      try {
        await sendInterviewScheduledEmail({
          to: current[0].email,
          firstName: current[0].first_name,
          jobTitle: current[0].title || current[0].designation || 'selected role',
          interviewDate,
          interviewTime,
          interviewMode: normalizedInterviewMode,
          interviewLink,
          interviewLocation,
        });
      } catch (emailErr) {
        console.error('Interview schedule email failed:', emailErr.message);
      }
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};