// server/index.js - FINAL MERGED VERSION
// Combines full feature set (Teams, Tasks, Chat) with robust Error Handling & Auth flows

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
  origin: [FRONTEND_URL, 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

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

// Test database connection
pool.connect()
  .then(client => {
    console.log('✅ Database connection successful');
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
      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'id', u.id,
          'name', u.name,
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
    LEFT JOIN task_assignees ta ON t.id = ta.task_id
    LEFT JOIN users u ON ta.user_id = u.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN subtasks s ON t.id = s.task_id
    LEFT JOIN comments c ON t.id = c.task_id
    LEFT JOIN users cu ON c.user_id = cu.id
    WHERE t.id = $1
    GROUP BY t.id
  `, [taskId]);

  return result.rows[0];
}

// ==================== AUTH ROUTES ====================

// Register - Step 1: Request OTP
app.post('/api/auth/request-otp-register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Note: Ensure your DB has table 'otp_codes' OR 'otp_verifications' (Adjust table name if needed)
    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'register', expiresAt]
    );

    const emailSent = await sendOTPEmail(email, name, otp, 'register');
    
    // In dev mode, return OTP in response if email fails
    if (!emailSent) {
      return res.json({ 
        message: 'OTP generated (Check console/response in Dev)',
        email,
        devMode: true,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
      });
    }

    res.json({ message: 'OTP sent to your email', email });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
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
      'INSERT INTO users (name, email, password, avatar, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, avatar',
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

// Login - Step 1: Request OTP
app.post('/api/auth/request-otp-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'login', expiresAt]
    );

    const emailSent = await sendOTPEmail(email, user.name, otp, 'login');
    
    if (!emailSent) {
      return res.json({ 
        message: 'OTP generated (Dev Mode)',
        email,
        devMode: true,
        otp: process.env.NODE_ENV !== 'production' ? otp : undefined
      });
    }

    res.json({ message: 'OTP sent to your email', email });
  } catch (error) {
    console.error('Login OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login - Step 2: Verify OTP
app.post('/api/auth/verify-login', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpResult = await pool.query(
      'SELECT * FROM otp_codes WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND is_verified = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp, 'login']
    );

    if (otpResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await pool.query('UPDATE otp_codes SET is_verified = true WHERE id = $1', [otpResult.rows[0].id]);

    const userResult = await pool.query('SELECT id, name, email, avatar FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your_jwt_secret_key');

    res.json({ message: 'Login successful!', user, token });
  } catch (error) {
    console.error('Verify login error:', error);
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
      SELECT t.*, 
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
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE t.id IN (SELECT team_id FROM team_members WHERE user_id = $1)
      GROUP BY t.id
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
    const { name, description, color, members } = req.body;

    const teamResult = await client.query(
      'INSERT INTO teams (name, description, color, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || '', color || 'purple', req.user.id]
    );
    const team = teamResult.rows[0];

    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.id, req.user.id, 'Lead']
    );

    // Send invitations
    if (members && members.length > 0) {
      for (const member of members) {
        const token = jwt.sign({ teamId: team.id, email: member.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await client.query(
          'INSERT INTO team_invitations (team_id, inviter_id, invitee_email, invitee_name, role, token, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [team.id, req.user.id, member.email, member.name, member.role || 'Member', token, expiresAt]
        );

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key'); // Ensure secret matches
    
    const invitation = await client.query(
      'SELECT * FROM team_invitations WHERE token = $1 AND status = $2 AND expires_at > NOW()',
      [token, 'pending']
    );

    if (invitation.rows.length === 0) return res.status(400).json({ error: 'Invalid invitation' });

    await client.query('BEGIN');
    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [invitation.rows[0].team_id, userId, invitation.rows[0].role]
    );
    await client.query('UPDATE team_invitations SET status = $1, updated_at = NOW() WHERE id = $2', ['accepted', invitation.rows[0].id]);
    await client.query('COMMIT');

    res.json({ message: 'Successfully joined the team!' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get invitation details
app.get('/api/teams/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(`
      SELECT ti.*, t.name as team_name, u.name as inviter_name
      FROM team_invitations ti
      JOIN teams t ON ti.team_id = t.id
      LEFT JOIN users u ON ti.inviter_id = u.id
      WHERE ti.token = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
    `, [token]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Invitation invalid' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TASK ROUTES ====================

// Get assigned tasks
app.get('/api/tasks/assigned', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, team.name as team_name
      FROM tasks t
      LEFT JOIN teams team ON t.team_id = team.id
      WHERE t.id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)
      ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's tasks with filters
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { type, teamId } = req.query;
    let query = `
      SELECT t.*, 
        COALESCE(json_agg(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL), '[]') as tags
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      WHERE ta.user_id = $1
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

    // Assign Creator
    await client.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [task.id, req.user.id]);

    if (assignees && assignees.length > 0) {
      for (const assignee of assignees) {
        if(assignee.id !== req.user.id) {
            await client.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [task.id, assignee.id]);
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
    const dbUpdates = {};
    
    // Only allow updating tasks table fields here
    const validFields = ['title', 'description', 'priority', 'status', 'dueDate', 'taskType'];
    
    Object.keys(updates).forEach(key => {
      if(validFields.includes(key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[snakeKey] = updates[key];
      }
    });

    if (Object.keys(dbUpdates).length > 0) {
        const setClause = Object.keys(dbUpdates).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(dbUpdates);
        await pool.query(
          `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1}`,
          [...values, id]
        );
    }
    
    const updatedTask = await getCompleteTask(id);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});