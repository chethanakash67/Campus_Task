// server/index.js - FIXED VERSION

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Root API route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'CampusTasks API', 
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login, /api/auth/forgot-password, /api/auth/reset-password',
      teams: '/api/teams',
      tasks: '/api/tasks',
      health: '/api/health'
    }
  });
});

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campustasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password'
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database connection successful');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error connecting to database:', err.message);
  });

// Authentication Middleware
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

// ==================== AUTH ROUTES ====================

// Register with email verification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = name.substring(0, 2).toUpperCase();

    const result = await pool.query(
      'INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar',
      [name, email, hashedPassword, avatar]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your_jwt_secret_key');

    // Send welcome email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to CampusTasks!',
        html: `
          <h2>Welcome to CampusTasks, ${name}!</h2>
          <p>Your account has been successfully created.</p>
          <p>You can now log in and start managing your tasks and teams.</p>
          <br>
          <p>Best regards,<br>The CampusTasks Team</p>
        `
      });
      console.log('✅ Welcome email sent to:', email);
    } catch (emailError) {
      console.log('⚠️ Email not sent (configure EMAIL_USER and EMAIL_PASSWORD in .env):', emailError.message);
    }

    res.status(201).json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }, 
      token 
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message || 'Server error occurred' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your_jwt_secret_key');

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = result.rows[0];
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key', { expiresIn: '1h' });

    // Send reset email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - CampusTasks',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="http://localhost:5173/reset-password?token=${resetToken}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The CampusTasks Team</p>
        `
      });
      res.json({ message: 'Password reset link sent to your email' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.status(500).json({ error: 'Failed to send reset email. Please configure email settings.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
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
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ==================== TEAM ROUTES ====================

// Get user's teams - FIXED
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
      WHERE t.id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create team - FIXED
app.post('/api/teams', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, description, color, members } = req.body;

    // Create team
    const teamResult = await client.query(
      'INSERT INTO teams (name, description, color, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || '', color || 'purple', req.user.id]
    );
    const team = teamResult.rows[0];

    // Add creator as team member
    await client.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [team.id, req.user.id, 'Lead']
    );

    // Add other team members
    if (members && members.length > 0) {
      for (const member of members) {
        let memberId;
        
        // Check if user exists by email
        const memberResult = await client.query('SELECT id FROM users WHERE email = $1', [member.email]);
        
        if (memberResult.rows.length === 0) {
          // Create new user
          const avatar = member.name.substring(0, 2).toUpperCase();
          const tempPassword = await bcrypt.hash('Welcome123!', 10);
          const newUserResult = await client.query(
            'INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING id',
            [member.name, member.email, tempPassword, avatar]
          );
          memberId = newUserResult.rows[0].id;
        } else {
          memberId = memberResult.rows[0].id;
        }

        // Add to team
        await client.query(
          'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [team.id, memberId, member.role || 'Member']
        );
      }
    }

    await client.query('COMMIT');

    // Get complete team with members
    const completeTeam = await pool.query(`
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
      WHERE t.id = $1
      GROUP BY t.id
    `, [team.id]);

    res.status(201).json(completeTeam.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// Update team - FIXED
app.put('/api/teams/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, description, color, members } = req.body;

    await client.query(
      'UPDATE teams SET name = $1, description = $2, color = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [name, description || '', color || 'purple', id]
    );

    // Delete existing members except creator
    await client.query('DELETE FROM team_members WHERE team_id = $1 AND user_id != $2', [id, req.user.id]);

    // Add new members
    if (members && members.length > 0) {
      for (const member of members) {
        let memberId;
        const memberResult = await client.query('SELECT id FROM users WHERE email = $1', [member.email]);

        if (memberResult.rows.length === 0) {
          const avatar = member.name.substring(0, 2).toUpperCase();
          const tempPassword = await bcrypt.hash('Welcome123!', 10);
          const newUserResult = await client.query(
            'INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING id',
            [member.name, member.email, tempPassword, avatar]
          );
          memberId = newUserResult.rows[0].id;
        } else {
          memberId = memberResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [id, memberId, member.role || 'Member']
        );
      }
    }

    await client.query('COMMIT');

    const updatedTeam = await pool.query(`
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
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);

    res.json(updatedTeam.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// Delete team
app.delete('/api/teams/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM teams WHERE id = $1', [id]);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TASK ROUTES ====================

// Get user's tasks - FIXED
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { type, teamId } = req.query;

    let query = `
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
      WHERE ta.user_id = $1
    `;

    const params = [req.user.id];

    if (type) {
      query += ' AND t.task_type = $2';
      params.push(type);
    }

    if (teamId) {
      query += ` AND t.team_id = $${params.length + 1}`;
      params.push(teamId);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Create task - FIXED
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

    // Add assignees
    if (assignees && assignees.length > 0) {
      for (const assignee of assignees) {
        await client.query(
          'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [task.id, assignee.id]
        );
      }
    }

    // Add tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await client.query(
          'INSERT INTO task_tags (task_id, tag_name) VALUES ($1, $2)',
          [task.id, tag]
        );
      }
    }

    // Add subtasks
    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        await client.query(
          'INSERT INTO subtasks (task_id, text, completed) VALUES ($1, $2, $3)',
          [task.id, subtask.text, subtask.completed || false]
        );
      }
    }

    await client.query('COMMIT');

    const completeTask = await getCompleteTask(task.id);
    res.status(201).json(completeTask);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      dbUpdates[snakeKey] = updates[key];
    });

    const setClause = Object.keys(dbUpdates)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    const values = Object.values(dbUpdates);

    await pool.query(
      `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1}`,
      [...values, id]
    );

    const updatedTask = await getCompleteTask(id);
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to task
app.post('/api/tasks/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    await pool.query(
      'INSERT INTO comments (task_id, user_id, text) VALUES ($1, $2, $3)',
      [id, req.user.id, text]
    );

    const updatedTask = await getCompleteTask(id);
    res.json(updatedTask);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle subtask
app.put('/api/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;

    await pool.query(
      'UPDATE subtasks SET completed = NOT completed WHERE id = $1',
      [subtaskId]
    );

    const updatedTask = await getCompleteTask(taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error('Toggle subtask error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', port: PORT });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', port: PORT });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
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