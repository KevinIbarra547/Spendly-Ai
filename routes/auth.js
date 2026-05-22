const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const usersFilePath = path.join(__dirname, '../data/users.json');

const readUsers = () => {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.writeFileSync(usersFilePath, '[]', 'utf8');
      return [];
    }
    throw err;
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
};

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, schoolName, graduationYear, studentStatus, primaryFinancialGoal } = req.body;
    if (!username || !password || !email || !schoolName || !graduationYear || !studentStatus || !primaryFinancialGoal) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = readUsers();
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = users.length === 0;

    const newUser = {
      id: randomUUID(),
      username,
      passwordHash,
      email,
      pfp: '/uploads/pfps/default.png',
      schoolName,
      graduationYear,
      monthlyBudgetCap: 0,
      studentStatus,
      primaryFinancialGoal,
      isAdmin
    };

    users.push(newUser);
    writeUsers(users);

    res.status(201).json({ message: 'User registered successfully', user: { id: newUser.id, username: newUser.username, isAdmin: newUser.isAdmin } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { password, identifier } = req.body;
    if (!password || !identifier) {
      return res.status(400).json({ error: 'Password and username/email are required' });
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
    req.session.user = { id: user.id, username: user.username, isAdmin: user.isAdmin };

    const { passwordHash, ...userWithoutHash } = user;
    res.status(200).json(userWithoutHash);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = router;