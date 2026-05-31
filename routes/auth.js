const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const GOALS_PATH = path.join(__dirname, '..', 'data', 'goals.json');

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

function readGoals() {
  try {
    const raw = fs.readFileSync(GOALS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeGoals(goals) {
  fs.writeFileSync(GOALS_PATH, JSON.stringify(goals, null, 2), 'utf8');
}

const pfpStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'pfps'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});
const pfpUpload = multer({
  storage: pfpStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, or WebP images allowed'));
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, schoolName, graduationYear, studentStatus, primaryFinancialGoal, adminCode, role, inviteCode } = req.body;

    // Validate the always-required fields are present and non-empty.
    if (!username || !password || !email || !schoolName || !primaryFinancialGoal) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role — must be exactly "parent" or "child".
    if (role !== 'parent' && role !== 'child') {
      return res.status(400).json({ error: 'Role must be either "parent" or "child"' });
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

    // Graduation year and student status are only required for child/student
    // accounts. Parent accounts do not submit them and store them as null.
    let normalizedGraduationYear = null;
    let normalizedStudentStatus = null;
    if (role === 'child') {
      if (graduationYear === undefined || !studentStatus) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (typeof graduationYear !== 'number' || graduationYear < 2024 || graduationYear > 2035) {
        return res.status(400).json({ error: 'Graduation year must be between 2024 and 2035' });
      }
      normalizedGraduationYear = graduationYear;
      normalizedStudentStatus = studentStatus;
    }

    const users = readUsers();

    // Check for existing username or email
    if (users.some(u => u.username === username || u.email === email)) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Grant admin only when the secret admin code matches.
    const ADMIN_CODE = process.env.ADMIN_CODE || 'NollanisaBUM';
    const isAdmin = adminCode === ADMIN_CODE;

    // Build user object
    const newUser = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      email,
      schoolName,
      graduationYear: normalizedGraduationYear,
      studentStatus: normalizedStudentStatus,
      primaryFinancialGoal,
      role,
      inviteCode: role === 'child' && typeof inviteCode === 'string' && inviteCode.trim() !== '' ? inviteCode.trim() : null,
      pfp: '/uploads/pfps/default.png',
      monthlyBudgetCap: 0,
      isAdmin,
      income: 0,
      rent: 0,
      phoneBill: 0,
      otherBills: 0,
      diningBudget: 0,
      onboardingComplete: false,
      financialProfile: {
        livingSituation: null,
        paysRecurringBills: null,
        billTypes: null,
        monthlyHousingCost: null,
        monthlyBillsCost: null,
        hasIncome: null,
        monthlyIncome: null,
        foodSituation: null,
        hasSubscriptions: null,
        subscriptionDetails: null,
        hasSavingsGoal: null,
        savingsGoalName: null,
        savingsGoalTarget: null,
        spendingStyle: null,
        primaryIntent: null,
        surveyCompletedAt: null,
        surveyLastUpdatedAt: null,
      }
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
    const surveyComplete = !!(user.financialProfile && user.financialProfile.surveyCompletedAt);
    return res.status(200).json({ ...safeUser, surveyComplete });
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
  const surveyComplete = !!(user.financialProfile && user.financialProfile.surveyCompletedAt);
  return res.status(200).json({ ...safeUser, surveyComplete });
});

// POST /api/auth/pfp
router.post('/pfp', requireAuth, pfpUpload.single('pfp'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const pfpUrl = '/uploads/pfps/' + req.file.filename;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    users[idx].pfp = pfpUrl;
    writeUsers(users);
    res.json({ pfp: pfpUrl });
  } catch (err) {
    console.error('Pfp upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
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
// POST /api/auth/onboarding
router.post('/onboarding', requireAuth, (req, res) => {
  const { income, rent, phoneBill, otherBills, diningBudget } = req.body;
  const fields = { income, rent, phoneBill, otherBills, diningBudget };

  for (const [key, val] of Object.entries(fields)) {
    const n = Number(val);
    if (isNaN(n) || n < 0) {
      return res.status(400).json({ error: `${key} must be a non-negative number` });
    }
    fields[key] = n;
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    Object.assign(users[idx], fields, { onboardingComplete: true });
    writeUsers(users);

    const { passwordHash, ...safeUser } = users[idx];
    return res.status(200).json(safeUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Financial Onboarding Survey (CP-S03) ───────────────────────────────

// Validate the 13 survey fields. hasSubscriptions / subscriptionDetails are
// optional and never cause a validation error if missing.
function validateSurveyBody(body) {
  const {
    livingSituation, paysRecurringBills, billTypes, hasIncome, monthlyIncome,
    foodSituation, hasSavingsGoal, savingsGoalName, savingsGoalTarget,
    spendingStyle, primaryIntent, monthlyHousingCost, monthlyBillsCost
  } = body;

  if (typeof livingSituation !== 'string' || livingSituation.trim() === '') {
    return { valid: false, error: 'livingSituation must be a non-empty string' };
  }
  if (typeof paysRecurringBills !== 'boolean') {
    return { valid: false, error: 'paysRecurringBills must be a boolean' };
  }
  if (!Array.isArray(billTypes)) {
    return { valid: false, error: 'billTypes must be an array' };
  }
  if (typeof hasIncome !== 'boolean') {
    return { valid: false, error: 'hasIncome must be a boolean' };
  }
  if (hasIncome) {
    if (typeof monthlyIncome !== 'number' || monthlyIncome <= 0) {
      return { valid: false, error: 'monthlyIncome must be a positive number when hasIncome is true' };
    }
  } else if (monthlyIncome !== null && monthlyIncome !== undefined) {
    return { valid: false, error: 'monthlyIncome must be null when hasIncome is false' };
  }
  if (typeof foodSituation !== 'string' || foodSituation.trim() === '') {
    return { valid: false, error: 'foodSituation must be a non-empty string' };
  }
  if (typeof hasSavingsGoal !== 'boolean') {
    return { valid: false, error: 'hasSavingsGoal must be a boolean' };
  }
  if (hasSavingsGoal) {
    if (typeof savingsGoalName !== 'string' || savingsGoalName.trim().length < 2 || savingsGoalName.trim().length > 80) {
      return { valid: false, error: 'savingsGoalName must be a string between 2 and 80 characters when hasSavingsGoal is true' };
    }
    if (typeof savingsGoalTarget !== 'number' || savingsGoalTarget <= 0) {
      return { valid: false, error: 'savingsGoalTarget must be a positive number when hasSavingsGoal is true' };
    }
  } else {
    if (savingsGoalName !== null && savingsGoalName !== undefined) {
      return { valid: false, error: 'savingsGoalName must be null when hasSavingsGoal is false' };
    }
    if (savingsGoalTarget !== null && savingsGoalTarget !== undefined) {
      return { valid: false, error: 'savingsGoalTarget must be null when hasSavingsGoal is false' };
    }
  }
  if (typeof spendingStyle !== 'string' || spendingStyle.trim() === '') {
    return { valid: false, error: 'spendingStyle must be a non-empty string' };
  }
  if (typeof primaryIntent !== 'string' || primaryIntent.trim() === '') {
    return { valid: false, error: 'primaryIntent must be a non-empty string' };
  }
  // Cost screens are conditional — both are optional and may be null when the
  // user's living situation / bills answers skipped those screens.
  if (monthlyHousingCost !== null && monthlyHousingCost !== undefined) {
    if (typeof monthlyHousingCost !== 'number' || monthlyHousingCost <= 0 || monthlyHousingCost > 99999) {
      return { valid: false, error: 'monthlyHousingCost must be a positive number no greater than 99999' };
    }
  }
  if (monthlyBillsCost !== null && monthlyBillsCost !== undefined) {
    if (typeof monthlyBillsCost !== 'number' || monthlyBillsCost <= 0 || monthlyBillsCost > 99999) {
      return { valid: false, error: 'monthlyBillsCost must be a positive number no greater than 99999' };
    }
  }
  return { valid: true };
}

// Build the normalized survey fields to merge into financialProfile.
// Optional subscription fields are only included when actually provided so a
// PATCH that omits them does not wipe existing values.
function buildSurveyFields(body) {
  const fields = {
    livingSituation: body.livingSituation,
    paysRecurringBills: body.paysRecurringBills,
    billTypes: body.billTypes,
    hasIncome: body.hasIncome,
    monthlyIncome: body.hasIncome ? body.monthlyIncome : null,
    foodSituation: body.foodSituation,
    hasSavingsGoal: body.hasSavingsGoal,
    savingsGoalName: body.hasSavingsGoal ? body.savingsGoalName : null,
    savingsGoalTarget: body.hasSavingsGoal ? body.savingsGoalTarget : null,
    spendingStyle: body.spendingStyle,
    primaryIntent: body.primaryIntent,
  };
  if (body.hasSubscriptions !== undefined) fields.hasSubscriptions = body.hasSubscriptions;
  if (body.subscriptionDetails !== undefined) fields.subscriptionDetails = body.subscriptionDetails;
  // Only include cost fields when present so a PATCH that omits them does not
  // wipe existing values.
  if (body.monthlyHousingCost !== undefined) fields.monthlyHousingCost = body.monthlyHousingCost;
  if (body.monthlyBillsCost !== undefined) fields.monthlyBillsCost = body.monthlyBillsCost;
  return fields;
}

// Auto-create a Savings Goal from the survey answers, with duplicate
// protection: a goal is only created if there isn't already an
// onboarding-created goal with the same title for this user.
function autoCreateSavingsGoal(userId, body) {
  if (body.hasSavingsGoal === true && body.savingsGoalName && body.savingsGoalTarget) {
    const goals = readGoals();
    const exists = goals.some(g =>
      g.userId === userId &&
      g.title === body.savingsGoalName &&
      g.createdFromOnboarding === true
    );
    if (!exists) {
      goals.push({
        id: `goal_${Date.now()}`,
        userId,
        title: body.savingsGoalName,
        targetAmount: body.savingsGoalTarget,
        currentSaved: 0,
        deadline: null,
        createdFromOnboarding: true,
      });
      writeGoals(goals);
    }
  }
}

// POST /api/auth/survey — first-time survey completion
router.post('/survey', requireAuth, (req, res) => {
  const validation = validateSurveyBody(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const fields = buildSurveyFields(req.body);
    users[idx].financialProfile = Object.assign({}, users[idx].financialProfile, fields);

    const now = new Date().toISOString();
    // Only stamp the first completion — never overwrite an existing one.
    if (!users[idx].financialProfile.surveyCompletedAt) {
      users[idx].financialProfile.surveyCompletedAt = now;
    }
    users[idx].financialProfile.surveyLastUpdatedAt = now;

    writeUsers(users);
    autoCreateSavingsGoal(req.session.userId, req.body);

    const { passwordHash, ...safeUser } = users[idx];
    return res.status(200).json(safeUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/survey — edits from Settings > My Financial Profile
router.patch('/survey', requireAuth, (req, res) => {
  const validation = validateSurveyBody(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const fields = buildSurveyFields(req.body);
    users[idx].financialProfile = Object.assign({}, users[idx].financialProfile, fields);

    // Do NOT touch surveyCompletedAt on an edit.
    users[idx].financialProfile.surveyLastUpdatedAt = new Date().toISOString();

    writeUsers(users);
    autoCreateSavingsGoal(req.session.userId, req.body);

    const { passwordHash, ...safeUser } = users[idx];
    return res.status(200).json(safeUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;