// server/index.js - COMPLETE FIXED VERSION
// Combines full feature set (Teams, Tasks, Chat) with DIRECT LOGIN

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: [
    FRONTEND_URL,
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:5176'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// ==================== EMAIL CONFIGURATION ====================
let transporter = null;
let emailConfigured = false;

try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Verify email configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('ℹ️  Please check EMAIL_USER and EMAIL_PASSWORD in .env file');
      } else {
        console.log('✅ Email server is ready to send messages');
        emailConfigured = true;
      }
    });
  } else {
    console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env');
  }
} catch (error) {
  console.error('❌ Failed to initialize email transporter:', error.message);
}

// ==================== DATABASE CONNECTION ====================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campustasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password'
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL database'));
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test database connection and run migrations
pool.connect()
  .then(async (client) => {
    console.log('✅ Database connection successful');
    
    // Run migration to add completed_late status
    try {
      // Drop and recreate the constraint to allow completed_late
      await client.query(`
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
          CHECK (status IN ('todo', 'in-progress', 'done', 'completed_late'));
      `);
      console.log('✅ Database migration: completed_late status enabled');
    } catch (migrationErr) {
      // Constraint might not exist or already updated, that's okay
      console.log('ℹ️  Database migration note:', migrationErr.message);
    }
    
    // Add progress and last_progress_update columns to tasks
    try {
      await client.query(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMP;
      `);
      console.log('✅ Database migration: progress columns added');
    } catch (migrationErr) {
      console.log('ℹ️  Progress migration note:', migrationErr.message);
    }
    
    // Create task_activity table for activity timeline
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_activity (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          activity_type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON task_activity(created_at);
      `);
      console.log('✅ Database migration: task_activity table created');
    } catch (migrationErr) {
      console.log('ℹ️  Activity table migration note:', migrationErr.message);
    }

    // Ensure users table supports profile avatar images and bio text
    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
        ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;
      `);
      console.log('✅ Database migration: user profile columns ready');
    } catch (migrationErr) {
      console.log('ℹ️  User profile migration note:', migrationErr.message);
    }

    // Ensure join request table exists
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_join_requests (
          id SERIAL PRIMARY KEY,
          team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(team_id, user_id)
        );
      `);
      console.log('✅ Database migration: team join requests ready');
    } catch (migrationErr) {
      console.log('ℹ️  Team join request migration note:', migrationErr.message);
    }

    // Track deadline reminder emails/notifications already sent
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_deadline_reminders (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          days_before INTEGER NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(task_id, user_id, days_before)
        );
      `);
      console.log('✅ Database migration: task deadline reminders ready');
    } catch (migrationErr) {
      console.log('ℹ️  Task deadline reminder migration note:', migrationErr.message);
    }

    // Track awarded points to avoid duplicate scoring
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS task_point_awards (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          award_type VARCHAR(50) NOT NULL,
          points INTEGER NOT NULL,
          awarded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(task_id, user_id, award_type)
        );
      `);
      console.log('✅ Database migration: task point awards ready');
    } catch (migrationErr) {
      console.log('ℹ️  Task point awards migration note:', migrationErr.message);
    }
    
    client.release();
  })
  .catch(err => {
    console.error('❌ Error connecting to database:', err.message);
    console.log('ℹ️  Make sure PostgreSQL is running and credentials are correct in .env');
  });

// ==================== PASSPORT GOOGLE OAUTH ====================
const GOOGLE_OAUTH_ENABLED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (GOOGLE_OAUTH_ENABLED) {
  console.log('✅ Google OAuth is enabled');
  
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (user.rows.length === 0) {
          const name = profile.displayName;
          const avatar = name.substring(0, 2).toUpperCase();
          const result = await pool.query(
            'INSERT INTO users (name, email, password, avatar, google_id, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, email, 'google-oauth', avatar, profile.id, true]
          );
          user = result;
        } else {
          await pool.query(
            'UPDATE users SET google_id = $1, is_verified = true WHERE id = $2',
            [profile.id, user.rows[0].id]
          );
        }
        
        return done(null, user.rows[0]);
      } catch (error) {
        return done(error, null);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, user.rows[0]);
    } catch (error) {
      done(error, null);
    }
  });
} else {
  console.warn('⚠️  Google OAuth is disabled. Set GOOGLE_CLIENT_ID/SECRET in .env');
}

// ==================== HELPERS ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, name, otp, purpose = 'verify') {
  if (!transporter || !emailConfigured) {
    console.warn(`⚠️  Email not configured. Mock OTP for ${email}: ${otp}`);
    return false;
  }

  try {
    const subject = purpose === 'login' 
      ? 'Your CampusTasks Login Code' 
      : 'Verify Your CampusTasks Account';
    
    const greeting = purpose === 'login'
      ? `Welcome back, ${name}!`
      : `Welcome to CampusTasks, ${name}!`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${greeting}</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    });
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}

// Helper to get full task details (Used in Task Routes)
async function getCompleteTask(taskId) {
  const result = await pool.query(`
    SELECT t.*, 
      creator.name as creator_name,
      team.name as team_name,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'type', 'user'
        )) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) as assignees,
      COALESCE(
        json_agg(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL),
        '[]'
      ) as tags,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', s.id,
          'text', s.text,
          'completed', s.completed
        )) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) as subtasks,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', c.id,
          'author', cu.name,
          'authorId', cu.id,
          'text', c.text,
          'timestamp', c.created_at
        )) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) as comments
    FROM tasks t
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN teams team ON t.team_id = team.id
    LEFT JOIN task_assignees ta ON t.id = ta.task_id
    LEFT JOIN users u ON ta.user_id = u.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN subtasks s ON t.id = s.task_id
    LEFT JOIN comments c ON t.id = c.task_id
    LEFT JOIN users cu ON c.user_id = cu.id
    WHERE t.id = $1
    GROUP BY t.id, creator.name, team.name
  `, [taskId]);

  if (!result.rows[0]) return null;
  
  const task = result.rows[0];
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    taskType: task.task_type,
    dueDate: task.due_date,
    teamId: task.team_id,
    teamName: task.team_name,
    createdBy: task.created_by,
    creatorName: task.creator_name,
    progress: task.progress || 0,
    lastProgressUpdate: task.last_progress_update,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    assignees: task.assignees,
    tags: task.tags,
    subtasks: task.subtasks,
    comments: task.comments
  };
}
// Helper function to create notification (should be with other helpers)
async function createNotification(userId, type, title, message, link = null, metadata = {}) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, type, title, message, link, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

const DEADLINE_REMINDER_DAYS = [30, 20, 15, 10, 5, 2, 1];

async function sendDeadlineReminders() {
  try {
    const result = await pool.query(`
      SELECT
        t.id AS task_id,
        t.title AS task_title,
        t.due_date,
        t.team_id,
        team.name AS team_name,
        ta.user_id,
        u.email,
        u.name AS user_name,
        (t.due_date::date - CURRENT_DATE) AS days_before
      FROM tasks t
      JOIN task_assignees ta ON ta.task_id = t.id
      JOIN users u ON u.id = ta.user_id
      LEFT JOIN teams team ON team.id = t.team_id
      WHERE t.due_date IS NOT NULL
        AND t.status NOT IN ('done', 'completed_late')
        AND (t.due_date::date - CURRENT_DATE) = ANY($1::int[])
    `, [DEADLINE_REMINDER_DAYS]);

    for (const row of result.rows) {
      const daysBefore = Number(row.days_before);
      if (!DEADLINE_REMINDER_DAYS.includes(daysBefore)) continue;

      const dedupe = await pool.query(
        `INSERT INTO task_deadline_reminders (task_id, user_id, days_before)
         VALUES ($1, $2, $3)
         ON CONFLICT (task_id, user_id, days_before) DO NOTHING
         RETURNING id`,
        [row.task_id, row.user_id, daysBefore]
      );

      if (dedupe.rows.length === 0) continue;

      await createNotification(
        row.user_id,
        'task_due_soon',
        'Task deadline reminder',
        `"${row.task_title}" is due in ${daysBefore} day${daysBefore === 1 ? '' : 's'}.`,
        '/assigned-tasks',
        { taskId: row.task_id, teamId: row.team_id, daysBefore }
      );

      if (transporter && emailConfigured && row.email) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: row.email,
            subject: `Reminder: "${row.task_title}" due in ${daysBefore} day${daysBefore === 1 ? '' : 's'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">
                <h2 style="margin-top: 0;">Task Deadline Reminder</h2>
                <p>Hi ${row.user_name || 'there'},</p>
                <p>Your task <strong>${row.task_title}</strong> is due in <strong>${daysBefore} day${daysBefore === 1 ? '' : 's'}</strong>.</p>
                ${row.team_name ? `<p>Team: <strong>${row.team_name}</strong></p>` : ''}
                <p>Due Date: <strong>${new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></p>
                <div style="margin-top: 20px;">
                  <a href="${FRONTEND_URL}/assigned-tasks"
                     style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px;">
                    Open Task
                  </a>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error(`Deadline reminder email error for task ${row.task_id}:`, emailError.message);
        }
      }
    }
  } catch (error) {
    console.error('Deadline reminder job failed:', error.message);
  }
}

async function awardTaskCompletionPoints(taskId, completerId, ownerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Completer points: +10 for on-time completion
    const completerAward = await client.query(
      `INSERT INTO task_point_awards (task_id, user_id, award_type, points, awarded_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (task_id, user_id, award_type) DO NOTHING
       RETURNING id`,
      [taskId, completerId, 'completer_on_time', 10, completerId]
    );
    if (completerAward.rows.length > 0) {
      await client.query(
        'UPDATE users SET points = COALESCE(points, 0) + 10 WHERE id = $1',
        [completerId]
      );
      await createNotification(
        completerId,
        'task_assigned',
        'Points Earned',
        'You earned +10 points for completing a task on time.',
        '/leaderboard',
        { taskId, points: 10, type: 'completion' }
      );
    }

    // Owner bonus: +2 when someone completes owner's task on time
    if (ownerId) {
      const ownerAward = await client.query(
        `INSERT INTO task_point_awards (task_id, user_id, award_type, points, awarded_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (task_id, user_id, award_type) DO NOTHING
         RETURNING id`,
        [taskId, ownerId, 'owner_bonus', 2, completerId]
      );
      if (ownerAward.rows.length > 0) {
        await client.query(
          'UPDATE users SET points = COALESCE(points, 0) + 2 WHERE id = $1',
          [ownerId]
        );
        await createNotification(
          ownerId,
          'task_assigned',
          'Owner Bonus Earned',
          'You earned +2 points because your task was completed on time.',
          '/leaderboard',
          { taskId, points: 2, type: 'owner_bonus' }
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Award points error:', error.message);
  } finally {
    client.release();
  }
}

async function generateUniqueTeamCode(client) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await client.query('SELECT id FROM teams WHERE team_code = $1', [code]);
    if (existing.rows.length === 0) return code;
  }
  throw new Error('Could not generate unique team code');
}

function isAvatarImage(value) {
  return typeof value === 'string' &&
    (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'));
}
// ==================== AUTH ROUTES ====================

// DIRECT LOGIN (NO OTP) - PRIMARY LOGIN METHOD
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '7d' }
    );

    // Return user data and token
    res.json({ 
      message: 'Login successful!', 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        points: user.points || 0
      },
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user data
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, bio, COALESCE(points, 0) as points FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user profile
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;

    const current = await pool.query(
      'SELECT id, name, email, avatar, bio, COALESCE(points, 0) as points FROM users WHERE id = $1',
      [req.user.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextName = typeof name === 'string' && name.trim() ? name.trim() : current.rows[0].name;
    const nextBio = typeof bio === 'string' ? bio.trim().slice(0, 500) : (current.rows[0].bio || '');
    let nextAvatar = current.rows[0].avatar;

    if (typeof avatar === 'string' && avatar.trim()) {
      if (isAvatarImage(avatar)) {
        nextAvatar = avatar;
      } else {
        nextAvatar = avatar.trim().slice(0, 10);
      }
    } else if (avatar === null) {
      nextAvatar = nextName.substring(0, 2).toUpperCase();
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1, bio = $2, avatar = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, avatar, bio, COALESCE(points, 0) as points`,
      [nextName, nextBio, nextAvatar, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register - Step 1: Request OTP
app.post('/api/auth/request-otp-register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'register', expiresAt]
    );

    const emailSent = await sendOTPEmail(email, name, otp, 'register');
    
    if (emailSent) {
      res.json({ 
        message: 'OTP sent successfully',
        email: email
      });
    } else {
      // Email not configured - for development, still allow registration
      console.log(`📧 Development mode - OTP for ${email}: ${otp}`);
      res.json({ 
        message: 'OTP generated (check server console in dev mode)',
        email: email,
        devMode: true
      });
    }
  } catch (error) {
    console.error('Request OTP Register error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// Update team
app.put('/api/teams/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { name, description, color, members, isPublic } = req.body;

    const teamInfo = await client.query(
      `SELECT t.*, tm.role as my_role
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $2
       WHERE t.id = $1`,
      [id, req.user.id]
    );

    if (teamInfo.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamInfo.rows[0];
    if (!team.my_role) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const isOwner = Number(team.created_by) === Number(req.user.id);
    const isLead = team.my_role === 'Lead';
    const canInvite = team.is_public ? true : (isOwner || isLead);

    // Owner controls basic team settings, including privacy.
    if (isOwner) {
      await client.query(
        `UPDATE teams
         SET name = $1, description = $2, color = $3, is_public = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          name || team.name,
          description ?? team.description,
          color || team.color,
          typeof isPublic === 'boolean' ? isPublic : team.is_public,
          id
        ]
      );
    }

    const memberRows = await client.query(
      `SELECT tm.user_id, tm.role, u.email, u.name
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [id]
    );

    const currentMembersByEmail = new Map(
      memberRows.rows.map(m => [m.email.toLowerCase(), m])
    );
    const ownerEmail = memberRows.rows.find(m => Number(m.user_id) === Number(team.created_by))?.email?.toLowerCase();

    const requestedMembers = Array.isArray(members) ? members : [];
    const requestedEmails = new Set();

    for (const member of requestedMembers) {
      const email = member?.email?.toLowerCase?.().trim?.();
      if (!email) continue;
      requestedEmails.add(email);

      const existing = currentMembersByEmail.get(email);
      if (existing) {
        if (isOwner && member.role && existing.role !== member.role) {
          await client.query(
            'UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3',
            [member.role, id, existing.user_id]
          );
        }
        continue;
      }

      if (!canInvite) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only the owner or delegated leads can invite members to private teams' });
      }

      const userCheck = await client.query('SELECT id, name FROM users WHERE email = $1', [email]);
      const roleToAssign = member.role || 'Member';
      const teamName = name || team.name;

      if (userCheck.rows.length > 0) {
        const userId = userCheck.rows[0].id;
        await client.query(
          'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [id, userId, roleToAssign]
        );
        await createNotification(
          userId,
          'team_invite',
          'Added to Team',
          `You've been added to "${teamName}"`,
          '/teams',
          { teamId: id, teamName }
        );
      } else {
        const inviteToken = jwt.sign(
          { teamId: Number(id), email },
          process.env.JWT_SECRET || 'your_jwt_secret_key',
          { expiresIn: '7d' }
        );
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await client.query(
          `INSERT INTO team_invitations (team_id, inviter_id, invitee_email, invitee_name, role, token, expires_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
          [id, req.user.id, email, member.name || null, roleToAssign, inviteToken, expiresAt]
        );

        if (transporter && emailConfigured) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Join "${teamName}" on CampusTasks`,
            html: `
              <h2>Team Invitation</h2>
              <p>${req.user.name || req.user.email} invited you to join <strong>${teamName}</strong>.</p>
              <a href="${FRONTEND_URL}/accept-invitation?token=${inviteToken}">Accept Invitation</a>
            `
          });
        }
      }
    }

    // Only the owner can remove existing team members.
    const isOwnerEditing = isOwner;
    for (const member of memberRows.rows) {
      const email = member.email.toLowerCase();
      if (email === ownerEmail) continue;
      if (requestedEmails.has(email)) continue;

      if (!isOwnerEditing) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only the owner can remove team members' });
      }

      await client.query(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
        [id, member.user_id]
      );
    }

    await client.query('COMMIT');

    const result = await client.query(`
      SELECT t.*, 
        my_tm.role as my_role,
        (t.created_by = $2) as is_owner,
        (my_tm.role = 'Lead' OR t.created_by = $2) as is_leader,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.name, 'role', tm.role, 'email', u.email)
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) as members
      FROM teams t
      JOIN team_members my_tm ON my_tm.team_id = t.id AND my_tm.user_id = $2
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE t.id = $1
      GROUP BY t.id, my_tm.role
    `, [id, req.user.id]);

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update team error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Register - Step 2: Verify OTP and Create Account
app.post('/api/auth/verify-register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND is_verified = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'register']
    );

    if (otpResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await pool.query('UPDATE otp_codes SET is_verified = true WHERE id = $1', [otpResult.rows[0].id]);

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = name.substring(0, 2).toUpperCase();

    const result = await pool.query(
      'INSERT INTO users (name, email, password, avatar, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, avatar, COALESCE(points, 0) as points',
      [name, email, hashedPassword, avatar, true]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your_jwt_secret_key');

    res.json({ message: 'Registration successful!', user, token });
  } catch (error) {
    console.error('Verify register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, purpose || 'register', expiresAt]
    );

    const name = user.rows.length > 0 ? user.rows[0].name : 'User';
    const emailSent = await sendOTPEmail(email, name, otp, purpose);

    if (!emailSent) {
      return res.json({ 
        message: 'OTP generated (Dev Mode)',
        devMode: true,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
      });
    }

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth
if (GOOGLE_OAUTH_ENABLED) {
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login` }),
    (req, res) => {
      const token = jwt.sign({ id: req.user.id, email: req.user.email }, process.env.JWT_SECRET || 'your_jwt_secret_key');
      res.redirect(`${FRONTEND_URL}/auth-success?token=${token}`);
    }
  );
}

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });

    const user = result.rows[0];
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key', { expiresIn: '1h' });

    if (transporter && emailConfigured) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - CampusTasks',
        html: `
          <h2>Password Reset</h2>
          <p>Click below to reset your password:</p>
          <a href="${FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
        `
      });
    } else {
      console.log(`Dev Mode: Reset token for ${email}: ${resetToken}`);
    }
    
    res.json({ message: 'Password reset link sent' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, decoded.id]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ==================== TEAM ROUTES ====================

// Get user's teams
app.get('/api/teams/my-teams', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        my_tm.role as my_role,
        (t.created_by = $1) as is_owner,
        (my_tm.role = 'Lead' OR t.created_by = $1) as is_leader,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'role', tm.role,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as members
      FROM teams t
      JOIN team_members my_tm ON my_tm.team_id = t.id AND my_tm.user_id = $1
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      GROUP BY t.id, my_tm.role
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create team
app.post('/api/teams', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, description, color, members, isPublic } = req.body;
    const teamCode = await generateUniqueTeamCode(client);

    const teamResult = await client.query(
      `INSERT INTO teams (name, description, color, team_code, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || '', color || 'purple', teamCode, Boolean(isPublic ?? true), req.user.id]
    );
    const team = teamResult.rows[0];

    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.id, req.user.id, 'Lead']
    );

    // Send invitations and Notifications
    if (members && members.length > 0) {
      for (const member of members) {
        if (!member?.email || member.email.toLowerCase() === req.user.email?.toLowerCase()) {
          continue;
        }
        const token = jwt.sign({ teamId: team.id, email: member.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await client.query(
          'INSERT INTO team_invitations (team_id, inviter_id, invitee_email, invitee_name, role, token, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [team.id, req.user.id, member.email, member.name, member.role || 'Member', token, expiresAt]
        );

        // Check if user exists and create notification
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [member.email]);
        if (existingUser.rows.length > 0) {
          await createNotification(
            existingUser.rows[0].id,
            'team_invite',
            'New Team Invitation',
            `${req.user.name || req.user.email} invited you to join "${team.name}"`,
            `/accept-invitation?token=${token}`,
            { teamId: team.id, teamName: team.name }
          );
        }

        if (transporter && emailConfigured) {
          try {
            const inviter = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: member.email,
              subject: `You're invited to join ${team.name} on CampusTasks`,
              html: `
                <h2>Team Invitation</h2>
                <p>${inviter.rows[0].name} has invited you to join "${team.name}".</p>
                <a href="${FRONTEND_URL}/accept-invitation?token=${token}">Accept Invitation</a>
              `
            });
          } catch (emailError) {
            console.error('Invitation email error:', emailError);
          }
        }
      }
    }

    await client.query('COMMIT');
    
    // Fetch created team to return formatted result
    const completeTeam = await client.query(`
      SELECT t.*, 
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.name, 'role', tm.role)
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) as members
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE t.id = $1 GROUP BY t.id
    `, [team.id]);
    
    res.status(201).json(completeTeam.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create team error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Accept team invitation
app.post('/api/teams/accept-invitation', async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, userId } = req.body;
    
    // Validate token format
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    } catch (jwtError) {
      return res.status(400).json({ error: 'Invalid invitation token' });
    }
    
    // Fetch invitation
    const invitation = await client.query(
      'SELECT * FROM team_invitations WHERE token = $1 AND status = $2 AND expires_at > NOW()',
      [token, 'pending']
    );

    if (invitation.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const invite = invitation.rows[0];

    // Validate user exists
    const userCheck = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Validate user email matches invitation email
    if (user.email.toLowerCase() !== invite.invitee_email.toLowerCase()) {
      return res.status(403).json({ 
        error: 'This invitation is for a different email address. Please use the account that matches the invitation email.' 
      });
    }

    // Check if user is already a team member (DB is source of truth)
    const existingMember = await client.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [invite.team_id, userId]
    );

    if (existingMember.rows.length > 0) {
      // User is already a member - mark invitation as accepted if still pending
      if (invite.status === 'pending') {
        await client.query(
          'UPDATE team_invitations SET status = $1, updated_at = NOW() WHERE id = $2',
          ['accepted', invite.id]
        );
      }
      return res.status(200).json({ 
        message: 'You are already a member of this team',
        alreadyMember: true
      });
    }

    // User is not a member - proceed with insertion
    await client.query('BEGIN');
    
    // Insert into team_members
    const insertResult = await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) RETURNING id',
      [invite.team_id, userId, invite.role]
    );

    // Only mark invitation as accepted if insert was successful
    if (insertResult.rows.length > 0) {
      await client.query(
        'UPDATE team_invitations SET status = $1, updated_at = NOW() WHERE id = $2',
        ['accepted', invite.id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Successfully joined the team!' });
    } else {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Failed to join team' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get pending invitations for a user
app.get('/api/invitations/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ti.*, t.name as team_name, t.color, u.name as inviter_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      LEFT JOIN users u ON ti.inviter_id = u.id
      WHERE ti.invitee_email = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
      ORDER BY ti.created_at DESC
    `, [req.user.email]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline invitation
app.post('/api/teams/decline-invitation', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    await pool.query(
      'UPDATE team_invitations SET status = $1, updated_at = NOW() WHERE token = $2',
      ['rejected', token]
    );
    res.json({ message: 'Invitation declined' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get invitation details - UPDATED
app.get('/api/teams/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(`
      SELECT ti.*, 
        t.name as team_name,
        t.description as team_description,
        t.color as team_color,
        u.name as inviter_name,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE team_id = t.id AND status != 'done') as task_count
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      LEFT JOIN users u ON ti.inviter_id = u.id
      WHERE ti.token = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    `, [token]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Invitation invalid or expired' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join team by code (public = direct join, private = pending approval)
app.post('/api/teams/join-by-code', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Team code is required' });

    const teamResult = await client.query(
      'SELECT id, name, created_by, is_public FROM teams WHERE team_code = $1',
      [code]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid team code' });
    }

    const team = teamResult.rows[0];

    const alreadyMember = await client.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.id, req.user.id]
    );
    if (alreadyMember.rows.length > 0) {
      return res.json({ status: 'already_member' });
    }

    if (team.is_public) {
      await client.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [team.id, req.user.id, 'Member']
      );
      return res.json({ status: 'joined', message: 'Joined team successfully' });
    }

    const existingRequest = await client.query(
      `SELECT id
       FROM team_join_requests
       WHERE team_id = $1 AND user_id = $2 AND status = 'pending'`,
      [team.id, req.user.id]
    );
    if (existingRequest.rows.length > 0) {
      return res.json({ status: 'pending', message: 'Join request already pending' });
    }

    await client.query(
      `INSERT INTO team_join_requests (team_id, user_id, status, created_at, updated_at)
       VALUES ($1, $2, 'pending', NOW(), NOW())
       ON CONFLICT (team_id, user_id)
       DO UPDATE SET status = 'pending', updated_at = NOW()`,
      [team.id, req.user.id]
    );

    await createNotification(
      team.created_by,
      'team_invite',
      'New Join Request',
      `${req.user.name || req.user.email} requested to join "${team.name}"`,
      '/teams',
      { teamId: team.id }
    );

    if (transporter && emailConfigured) {
      const owner = await client.query('SELECT email, name FROM users WHERE id = $1', [team.created_by]);
      if (owner.rows.length > 0) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: owner.rows[0].email,
          subject: `New join request for ${team.name}`,
          html: `
            <h3>Team Join Request</h3>
            <p>${req.user.name || req.user.email} requested to join <strong>${team.name}</strong>.</p>
            <p>Open CampusTasks Teams page to accept or reject.</p>
          `
        });
      }
    }

    res.json({ status: 'pending', message: 'Join request sent to owner' });
  } catch (error) {
    console.error('Join by code error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  } finally {
    client.release();
  }
});

// Get pending join requests (owner only for private teams)
app.get('/api/teams/:teamId/join-requests', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamCheck = await pool.query(
      'SELECT id, created_by, is_public FROM teams WHERE id = $1',
      [teamId]
    );
    if (teamCheck.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const team = teamCheck.rows[0];
    if (Number(team.created_by) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only team owner can view join requests' });
    }

    const result = await pool.query(
      `SELECT r.id, r.team_id, r.user_id, r.status, r.created_at, u.name, u.email, u.avatar
       FROM team_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.team_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [teamId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/teams/:teamId/join-requests/:requestId/approve', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { teamId, requestId } = req.params;

    const teamCheck = await client.query(
      'SELECT id, name, created_by FROM teams WHERE id = $1',
      [teamId]
    );
    if (teamCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Team not found' });
    }
    if (Number(teamCheck.rows[0].created_by) !== Number(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only team owner can approve requests' });
    }

    const requestResult = await client.query(
      `SELECT r.*, u.name, u.email
       FROM team_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 AND r.team_id = $2 AND r.status = 'pending'`,
      [requestId, teamId]
    );
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const joinRequest = requestResult.rows[0];

    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [teamId, joinRequest.user_id, 'Member']
    );
    await client.query(
      'UPDATE team_join_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['accepted', requestId]
    );
    await client.query('COMMIT');

    await createNotification(
      joinRequest.user_id,
      'team_invite',
      'Join Request Approved',
      `Your request to join "${teamCheck.rows[0].name}" was approved.`,
      '/teams',
      { teamId: Number(teamId) }
    );

    res.json({ message: 'Request approved' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve join request error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

app.post('/api/teams/:teamId/join-requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { teamId, requestId } = req.params;
    const teamCheck = await pool.query(
      'SELECT id, name, created_by FROM teams WHERE id = $1',
      [teamId]
    );
    if (teamCheck.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
    if (Number(teamCheck.rows[0].created_by) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only team owner can reject requests' });
    }

    const requestResult = await pool.query(
      `UPDATE team_join_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND team_id = $3 AND status = 'pending'
       RETURNING user_id`,
      ['rejected', requestId, teamId]
    );
    if (requestResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });

    await createNotification(
      requestResult.rows[0].user_id,
      'team_invite',
      'Join Request Declined',
      `Your request to join "${teamCheck.rows[0].name}" was declined.`,
      '/teams',
      { teamId: Number(teamId) }
    );

    res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete team
app.delete('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
    const ownerCheck = await pool.query(
      'SELECT created_by FROM teams WHERE id = $1',
      [req.params.id]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (Number(ownerCheck.rows[0].created_by) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only team owner can delete team' });
    }

    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TASK ROUTES ====================

// Get tasks assigned TO the current user
app.get('/api/tasks/assigned', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, team.name as team_name
      FROM tasks t
      LEFT JOIN teams team ON t.team_id = team.id
      WHERE t.id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)
        AND t.created_by <> $1
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks CREATED BY the current user (tasks I assigned to others)
app.get('/api/tasks/created', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, team.name as team_name,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          )) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as assignees
      FROM tasks t
      LEFT JOIN teams team ON t.team_id = team.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.created_by = $1
        AND EXISTS (
          SELECT 1
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id AND ta2.user_id <> $1
        )
      GROUP BY t.id, team.name
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching created tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's tasks with filters
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { type, teamId } = req.query;
    let query = `
      SELECT t.*, 
        COALESCE(json_agg(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL), '[]') as tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'type', 'user'
          )) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as assignees
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      WHERE t.id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)
    `;
    const params = [req.user.id];

    if (type) { query += ' AND t.task_type = $2'; params.push(type); }
    if (teamId) { query += ` AND t.team_id = $${params.length + 1}`; params.push(teamId); }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, description, priority, status, dueDate, tags, assignees, taskType, teamId, subtasks } = req.body;

    const taskResult = await client.query(
      'INSERT INTO tasks (title, description, priority, status, due_date, task_type, team_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, description || '', priority || 'Medium', status || 'todo', dueDate, taskType || 'personal', teamId, req.user.id]
    );
    const task = taskResult.rows[0];

    // For personal tasks, always assign creator
    // For team tasks, only assign creator if they are in the assignees list
    const isTeamTask = taskType === 'team' && teamId;
    const creatorInAssignees = assignees && assignees.some(a => a.id === req.user.id);
    
    if (!isTeamTask || creatorInAssignees) {
      await client.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [task.id, req.user.id]);
    }

    // Get team name if team task
    let teamName = null;
    if (teamId) {
      const teamResult = await client.query('SELECT name FROM teams WHERE id = $1', [teamId]);
      teamName = teamResult.rows[0]?.name;
    }

    // Get creator name
    const creatorResult = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const creatorName = creatorResult.rows[0]?.name || 'A team member';

    if (assignees && assignees.length > 0) {
      for (const assignee of assignees) {
        // Skip creator if already added above, otherwise add the assignee
        if (assignee.id === req.user.id && (!isTeamTask || creatorInAssignees)) {
          continue; // Already added above
        }
        
        await client.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [task.id, assignee.id]);
        
        // Send notification only to others (not the creator)
        if (assignee.id !== req.user.id) {
          // Create notification for assigned user
          await createNotification(
            assignee.id,
            'task_assigned',
            'New Task Assigned',
            `${creatorName} assigned you a task: "${title}"`,
            `/assigned-tasks`,
            { taskId: task.id, taskTitle: title, teamId, teamName }
          );

          // Send email notification to assigned user
          if (transporter && emailConfigured) {
            try {
              const userResult = await client.query('SELECT email, name FROM users WHERE id = $1', [assignee.id]);
              const assignedUser = userResult.rows[0];
              
              if (assignedUser?.email) {
                await transporter.sendMail({
                  from: process.env.EMAIL_USER,
                  to: assignedUser.email,
                  subject: `📋 New Task Assigned: ${title}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #646cff; margin-top: 0;">📋 New Task Assigned to You</h2>
                        <p style="font-size: 16px; color: #333;">
                          Hi <strong>${assignedUser.name}</strong>,
                        </p>
                        <p style="color: #666;">
                          <strong>${creatorName}</strong> has assigned you a new task${teamName ? ` in <strong>${teamName}</strong>` : ''}:
                        </p>
                        <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #646cff;">
                          <h3 style="margin: 0 0 10px 0; color: #333;">${title}</h3>
                          ${description ? `<p style="margin: 0 0 10px 0; color: #666;">${description}</p>` : ''}
                          <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 15px;">
                            <span style="background: ${priority === 'High' ? '#fee2e2' : priority === 'Medium' ? '#fef3c7' : '#d1fae5'}; 
                                         color: ${priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#059669'}; 
                                         padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">
                              ${priority} Priority
                            </span>
                            ${dueDate ? `
                              <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                                Due: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            ` : ''}
                            ${teamName ? `
                              <span style="background: #f3e8ff; color: #7c3aed; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                                Team: ${teamName}
                              </span>
                            ` : ''}
                          </div>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${FRONTEND_URL}/assigned-tasks" 
                             style="display: inline-block; background: #646cff; color: white; padding: 14px 40px; 
                                    text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            View Task
                          </a>
                        </div>
                        <p style="color: #999; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                          You received this email because you were assigned a task on CampusTasks.
                        </p>
                      </div>
                    </div>
                  `
                });
                console.log(`✅ Task assignment email sent to ${assignedUser.email}`);
              }
            } catch (emailError) {
              console.error('Task assignment email error:', emailError);
              // Don't fail the task creation if email fails
            }
          }
        }
      }
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await client.query('INSERT INTO task_tags (task_id, tag_name) VALUES ($1, $2)', [task.id, tag]);
      }
    }

    if (subtasks && subtasks.length > 0) {
      for (const sub of subtasks) {
        await client.query('INSERT INTO subtasks (task_id, text, completed) VALUES ($1, $2, $3)', [task.id, sub.text, sub.completed || false]);
      }
    }

    await client.query('COMMIT');
    const completeTask = await getCompleteTask(task.id);
    res.status(201).json(completeTask);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current task and verify edit access (creator or assignee).
    const currentTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (currentTask.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = currentTask.rows[0];

    const assigneeCheck = await pool.query(
      'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    const isCreator = Number(task.created_by) === Number(req.user.id);
    const isAssignee = assigneeCheck.rows.length > 0;

    if (!isCreator && !isAssignee) {
      return res.status(403).json({ error: 'You are not authorized to update this task' });
    }
    
    const dbUpdates = {};
    
    // Only allow updating tasks table fields here
    const validFields = ['title', 'description', 'priority', 'status', 'dueDate', 'taskType'];
    
    Object.keys(updates).forEach(key => {
      if(validFields.includes(key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[snakeKey] = updates[key];
      }
    });

    // Check for late submission: if marking as 'done' and past due date
    if (dbUpdates.status === 'done' && task.due_date) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(23, 59, 59, 999);
      const now = new Date();
      
      if (now > dueDate) {
        // Late submission - change status to 'completed_late'
        dbUpdates.status = 'completed_late';
      }
    }

    // Whenever task is completed (on-time or late), force progress to 100%.
    if (dbUpdates.status === 'done' || dbUpdates.status === 'completed_late') {
      dbUpdates.progress = 100;
      dbUpdates.last_progress_update = new Date();
    }

    // If task is moved back from completed to an active status, reduce progress automatically.
    const wasCompleted = task.status === 'done' || task.status === 'completed_late';
    const nowCompleted = dbUpdates.status === 'done' || dbUpdates.status === 'completed_late';
    if (dbUpdates.status && wasCompleted && !nowCompleted) {
      dbUpdates.progress = 0;
      dbUpdates.last_progress_update = new Date();
    }

    const previousStatus = task.status;
    const nextStatus = dbUpdates.status || task.status;
    const transitionedToOnTimeDone =
      nextStatus === 'done' &&
      previousStatus !== 'done' &&
      previousStatus !== 'completed_late';

    if (Object.keys(dbUpdates).length > 0) {
      const setClause = Object.keys(dbUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
      const values = Object.values(dbUpdates);
      await pool.query(
        `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1}`,
        [...values, id]
      );
    }

    if (transitionedToOnTimeDone) {
      await awardTaskCompletionPoints(id, req.user.id, task.created_by);
    }
    
    const updatedTask = await getCompleteTask(id);
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskCheck = await pool.query('SELECT created_by FROM tasks WHERE id = $1', [req.params.id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (Number(taskCheck.rows[0].created_by) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Only task creator can delete this task' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
app.post('/api/tasks/:id/comments', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO comments (task_id, user_id, text) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, req.body.text]
    );
    const updatedTask = await getCompleteTask(req.params.id);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle subtask
app.put('/api/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE subtasks SET completed = NOT completed WHERE id = $1', [req.params.subtaskId]);
    const updatedTask = await getCompleteTask(req.params.taskId);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TASK PROGRESS & ACTIVITY ====================

// Update task progress
app.post('/api/tasks/:id/progress', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { progress, note } = req.body;
    
    // Check if user is assigned to this task
    const assigneeCheck = await client.query(
      'SELECT * FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (assigneeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned users can update progress' });
    }
    
    // Get task details for notifications
    const taskResult = await client.query(`
      SELECT t.*, u.name as creator_name, u.email as creator_email
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    const oldProgress = task.progress || 0;
    
    // Update task progress
    await client.query(
      'UPDATE tasks SET progress = $1, last_progress_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [progress, id]
    );
    
    // Get user name for activity log
    const userResult = await client.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const userName = userResult.rows[0]?.name || 'Unknown User';
    
    // Create activity log entry
    await client.query(`
      INSERT INTO task_activity (task_id, user_id, activity_type, message, old_value, new_value, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      req.user.id,
      'progress_update',
      `${userName} updated progress from ${oldProgress}% to ${progress}%`,
      oldProgress.toString(),
      progress.toString(),
      note || null
    ]);
    
    await client.query('COMMIT');
    
    // Send email notification to task owner if different from updater
    if (task.created_by !== req.user.id && transporter && emailConfigured) {
      try {
        // Get team name if applicable
        let teamName = null;
        if (task.team_id) {
          const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [task.team_id]);
          teamName = teamResult.rows[0]?.name;
        }
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: task.creator_email,
          subject: `📊 Task Progress Update: ${task.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #646cff; margin-top: 0;">📊 Task Progress Updated</h2>
                <p style="font-size: 16px; color: #333;">
                  Hi <strong>${task.creator_name}</strong>,
                </p>
                <p style="color: #666;">
                  <strong>${userName}</strong> has updated the progress on your task${teamName ? ` in <strong>${teamName}</strong>` : ''}:
                </p>
                <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #646cff;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">${task.title}</h3>
                  <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                      <span style="color: #666;">Progress:</span>
                      <span style="font-weight: bold; color: ${progress >= 100 ? '#10b981' : '#646cff'};">${oldProgress}% → ${progress}%</span>
                    </div>
                    <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
                      <div style="background: linear-gradient(90deg, #646cff, #8b5cf6); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                  </div>
                  ${note ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                      <p style="margin: 0; color: #666; font-size: 14px;"><strong>Note:</strong></p>
                      <p style="margin: 5px 0 0 0; color: #333; font-style: italic;">"${note}"</p>
                    </div>
                  ` : ''}
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${FRONTEND_URL}/tasks" 
                     style="display: inline-block; background: #646cff; color: white; padding: 14px 40px; 
                            text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    View Task
                  </a>
                </div>
                <p style="color: #999; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  You received this email because you are the owner of this task on CampusTasks.
                </p>
              </div>
            </div>
          `
        });
        console.log(`✅ Progress update email sent to ${task.creator_email}`);
      } catch (emailError) {
        console.error('Progress update email error:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    const updatedTask = await getCompleteTask(id);
    res.json(updatedTask);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get task activity log
app.get('/api/tasks/:id/activity', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has access to this task
    const taskCheck = await pool.query(`
      SELECT t.* FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      WHERE t.id = $1 AND (t.created_by = $2 OR ta.user_id = $2)
    `, [id, req.user.id]);
    
    if (taskCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get activity log
    const activityResult = await pool.query(`
      SELECT 
        ta.*,
        u.name as user_name
      FROM task_activity ta
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.created_at DESC
      LIMIT 50
    `, [id]);
    
    const activities = activityResult.rows.map(a => ({
      id: a.id,
      type: a.activity_type,
      message: a.message,
      userName: a.user_name,
      oldValue: a.old_value,
      newValue: a.new_value,
      note: a.note,
      createdAt: a.created_at
    }));
    
    res.json(activities);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== CHAT ROUTES ====================

// Get team messages
app.get('/api/chat/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tm.*, u.name as user_name, u.avatar
      FROM team_messages tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.created_at ASC
    `, [req.params.teamId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send team message
app.post('/api/chat/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO team_messages (team_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [req.params.teamId, req.user.id, req.body.message]
    );
    const user = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [req.user.id]);
    res.json({ ...result.rows[0], user_name: user.rows[0].name, avatar: user.rows[0].avatar });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get direct messages
app.get('/api/chat/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT dm.*, 
        sender.name as sender_name, sender.avatar as sender_avatar,
        receiver.name as receiver_name, receiver.avatar as receiver_avatar
      FROM direct_messages dm
      JOIN users sender ON dm.sender_id = sender.id
      JOIN users receiver ON dm.receiver_id = receiver.id
      WHERE (dm.sender_id = $1 AND dm.receiver_id = $2) 
         OR (dm.sender_id = $2 AND dm.receiver_id = $1)
      ORDER BY dm.created_at ASC
    `, [req.user.id, userId]);

    // Mark as read
    await pool.query(
      'UPDATE direct_messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2',
      [req.user.id, userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send direct message
app.post('/api/chat/direct/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, req.params.userId, req.body.message]
    );
    const sender = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [req.user.id]);
    const receiver = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [req.params.userId]);

    res.json({
      ...result.rows[0],
      sender_name: sender.rows[0].name,
      sender_avatar: sender.rows[0].avatar,
      receiver_name: receiver.rows[0].name,
      receiver_avatar: receiver.rows[0].avatar
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
app.get('/api/chat/unread', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
// ==================== NOTIFICATION ROUTES ====================

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
app.put('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leaderboard
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar,
        COALESCE(u.points, 0) as points,
        COALESCE(COUNT(DISTINCT CASE WHEN a.award_type = 'completer_on_time' THEN a.task_id END), 0) as tasks_completed_on_time,
        COALESCE(COUNT(CASE WHEN a.award_type = 'owner_bonus' THEN 1 END), 0) as owner_bonus_count
      FROM users u
      LEFT JOIN task_point_awards a ON a.user_id = u.id
      GROUP BY u.id
      ORDER BY points DESC, tasks_completed_on_time DESC, u.name ASC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== HEALTH & SERVER ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    port: PORT,
    emailConfigured,
    googleOAuthEnabled: GOOGLE_OAUTH_ENABLED
  });
});

app.get('/api/health', (req, res) => res.redirect('/health'));

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email configured: ${emailConfigured ? 'Yes' : 'No (check .env)'}`);
  console.log(`🔐 Google OAuth: ${GOOGLE_OAUTH_ENABLED ? 'Enabled' : 'Disabled'}`);
});

// Run deadline reminders on startup, then hourly.
setTimeout(() => {
  sendDeadlineReminders();
}, 15000);
setInterval(() => {
  sendDeadlineReminders();
}, 60 * 60 * 1000);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});
