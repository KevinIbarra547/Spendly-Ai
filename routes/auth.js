const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, schoolName, graduationYear, studentStatus, primaryFinancialGoal } = req.body;

    // Validate all 7 fields present and non-empty
    if (!username || !password || !email || !schoolName || graduationYear === undefined || !studentStatus || !primaryFinancialGoal) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate graduationYear
    if (typeof graduationYear !== 'number' || graduationYear < 2024 || graduationYear > 2035) {
      return res.status(400).json({ error: 'Graduation year must be between 2024 and 2035' });
    }

    const users = readUsers();

    // Check for existing username or email
    if (users.some(u => u.username === username || u.email === email)) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Build user object with all 11 fields
    const newUser = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      email,
      schoolName,
      graduationYear,
      studentStatus,
      primaryFinancialGoal,
      pfp: '/uploads/pfps/default.png',
      monthlyBudgetCap: 0,
      isAdmin: users.length === 0
    };

    users.push(newUser);
    writeUsers(users);

    // Set session
    req.session.userId = newUser.id;

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, username: newUser.username, isAdmin: newUser.isAdmin }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === identifier || u.email === identifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;

    const { passwordHash, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const users = readUsers();
  const user = users.find(u => u.id === req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { passwordHash, ...safeUser } = user;
  return res.status(200).json(safeUser);
});
// PATCH /api/auth/profile
router.patch('/profile', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { username, email, schoolName, graduationYear, monthlyBudgetCap, studentStatus, primaryFinancialGoal, pfp } = req.body;

  // Block password changes
  if (req.body.passwordHash || req.body.password) {
    return res.status(400).json({ error: 'Password cannot be updated via this endpoint' });
  }

  try {
    const users = readUsers();
    const index = users.findIndex(u => u.id === req.session.userId);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check username/email not taken by another user
    if (username && users.some(u => u.username === username && u.id !== req.session.userId)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    if (email && users.some(u => u.email === email && u.id !== req.session.userId)) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // Only update fields that were actually sent
    const updatable = { username, email, schoolName, graduationYear, monthlyBudgetCap, studentStatus, primaryFinancialGoal, pfp };
    Object.entries(updatable).forEach(([key, value]) => {
      if (value !== undefined) users[index][key] = value;
    });

    writeUsers(users);

    const { passwordHash, ...safeUser } = users[index];
    return res.status(200).json(safeUser);
  } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
module.exports = router;