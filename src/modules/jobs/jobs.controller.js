import pool from '../../config/db.js';
import { v4 as uuid } from 'uuid';

// ── Helper ─────────────────────────────────────
const parseJob = (row) => ({
  ...row,
  skills:           safeJson(row.skills, []),
  responsibilities: safeJson(row.responsibilities, []),
  requirements:     safeJson(row.requirements, []),
  salary: row.salary_min ? {
    min:      row.salary_min,
    max:      row.salary_max,
    currency: row.currency
  } : null,
  experienceMin:   row.experience_min,
  experienceMax:   row.experience_max,
  employmentType:  row.employment_type,
  postedBy:        row.posted_by,
  createdAt:       row.created_at,
  updatedAt:       row.updated_at,
});

const safeJson = (val, fallback) => {
  if (!val) return fallback;
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
};

// ── GET published jobs (public + filters) ──────
export const getPublishedJobs = async (req, res) => {
  try {
    const { keyword, employmentType, experienceMin, experienceMax, skills } = req.query;

    let query = `SELECT * FROM jobs WHERE status = 'published'`;
    const params = [];

    if (keyword) {
      query += ` AND (title LIKE ? OR designation LIKE ? OR description LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (employmentType) {
      query += ` AND employment_type = ?`;
      params.push(employmentType);
    }
    if (experienceMin) {
      query += ` AND experience_max >= ?`;
      params.push(Number(experienceMin));
    }
    if (experienceMax) {
      query += ` AND experience_min <= ?`;
      params.push(Number(experienceMax));
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute(query, params);
    let jobs = rows.map(parseJob);

    // Skills filter (JSON mein hai)
    if (skills) {
      const skillList = Array.isArray(skills) ? skills : [skills];
      jobs = jobs.filter(j =>
        skillList.some(s =>
          j.skills.map(x => x.toLowerCase()).includes(s.toLowerCase())
        )
      );
    }

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET all jobs (admin) ───────────────────────
export const getAllJobs = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM jobs ORDER BY created_at DESC`
    );
    res.json(rows.map(parseJob));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET job by id ──────────────────────────────
export const getJobById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM jobs WHERE id = ?`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Job not found' });
    res.json(parseJob(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST create job (admin) ────────────────────
export const createJob = async (req, res) => {
  try {
    const {
      title, designation, department, location,
      employmentType, experienceMin, experienceMax,
      description, skills = [], responsibilities = [],
      requirements = [], salary, status = 'draft'
    } = req.body;

    const id = uuid();

    await pool.execute(
      `INSERT INTO jobs (
        id, title, designation, department, location,
        employment_type, experience_min, experience_max,
        description, skills, responsibilities, requirements,
        salary_min, salary_max, currency, status, posted_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, title, designation, department, location,
        employmentType, experienceMin, experienceMax,
        description,
        JSON.stringify(skills),
        JSON.stringify(responsibilities),
        JSON.stringify(requirements),
        salary?.min || null,
        salary?.max || null,
        salary?.currency || 'INR',
        status,
        req.user.id
      ]
    );

    res.status(201).json({ id, message: 'Job created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT update job (admin) ─────────────────────
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, designation, department, location,
      employmentType, experienceMin, experienceMax,
      description, skills = [], responsibilities = [],
      requirements = [], salary, status
    } = req.body;

    await pool.execute(
      `UPDATE jobs SET
        title=?, designation=?, department=?, location=?,
        employment_type=?, experience_min=?, experience_max=?,
        description=?, skills=?, responsibilities=?, requirements=?,
        salary_min=?, salary_max=?, currency=?, status=?
       WHERE id=?`,
      [
        title, designation, department, location,
        employmentType, experienceMin, experienceMax,
        description,
        JSON.stringify(skills),
        JSON.stringify(responsibilities),
        JSON.stringify(requirements),
        salary?.min || null,
        salary?.max || null,
        salary?.currency || 'INR',
        status,
        id
      ]
    );

    res.json({ message: 'Job updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PATCH update job status (admin) ───────────
export const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.execute(
      `UPDATE jobs SET status=? WHERE id=?`, [status, id]
    );

    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE job (admin) ─────────────────────────
export const deleteJob = async (req, res) => {
  try {
    await pool.execute(`DELETE FROM jobs WHERE id=?`, [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};