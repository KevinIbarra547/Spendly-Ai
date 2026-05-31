const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

function readJSON(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw err;
  }
}

// Validation helpers
function isValidExpense(body) {
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }
  if (!body.category || typeof body.category !== 'string' || body.category.trim() === '') {
    return { valid: false, error: 'Category must be a non-empty string' };
  }
  if (!body.merchant || typeof body.merchant !== 'string' || body.merchant.trim() === '') {
    return { valid: false, error: 'Merchant must be a non-empty string' };
  }
  if (!body.date || isNaN(new Date(body.date).getTime())) {
    return { valid: false, error: 'Date must be a valid ISO date string' };
  }
  return { valid: true };
}

function isValidGoal(body) {
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return { valid: false, error: 'Title must be a non-empty string' };
  }
  if (typeof body.targetAmount !== 'number' || body.targetAmount <= 0) {
    return { valid: false, error: 'Target amount must be a positive number' };
  }
  if (typeof body.currentSaved !== 'number' || body.currentSaved < 0) {
    return { valid: false, error: 'Current saved must be a non-negative number' };
  }
  if (body.currentSaved > body.targetAmount) {
    return { valid: false, error: 'Current saved cannot exceed target amount' };
  }
  if (!body.deadline || isNaN(new Date(body.deadline).getTime())) {
    return { valid: false, error: 'Deadline must be a valid ISO date string' };
  }
  return { valid: true };
}

// Paths for JSON files
const expensesPath = path.join(__dirname, '../data/expenses.json');
const goalsPath = path.join(__dirname, '../data/goals.json');
const usersPath = path.join(__dirname, '../data/users.json');

// ── Goals Endpoints ───────────────────────────────────────────────────────────

// GET /api/expenses/goals — return only the logged-in user's goals
router.get('/goals', requireAuth, (req, res) => {
  try {
    const goals = readJSON(goalsPath);
    const userGoals = goals.filter(goal => goal.userId === req.session.userId);
    res.json(userGoals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read goals' });
  }
});

// POST /api/expenses/goals — create a new goal
router.post('/goals', requireAuth, (req, res) => {
  try {
    const validation = isValidGoal(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const goals = readJSON(goalsPath);
    const newGoal = {
      id: `goal_${Date.now()}`,
      userId: req.session.userId,
      title: req.body.title,
      targetAmount: req.body.targetAmount,
      currentSaved: req.body.currentSaved,
      deadline: req.body.deadline,
    };
    goals.push(newGoal);
    writeJSON(goalsPath, goals);
    res.status(201).json(newGoal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/expenses/goals/:id — partially update a goal
router.put('/goals/:id', requireAuth, (req, res) => {
  try {
    const { title, targetAmount, currentSaved, deadline } = req.body;
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    if (targetAmount !== undefined && (typeof targetAmount !== 'number' || targetAmount <= 0)) {
      return res.status(400).json({ error: 'Target amount must be a positive number' });
    }
    if (currentSaved !== undefined && (typeof currentSaved !== 'number' || currentSaved < 0)) {
      return res.status(400).json({ error: 'Current saved must be a non-negative number' });
    }
    if (deadline !== undefined && isNaN(new Date(deadline).getTime())) {
      return res.status(400).json({ error: 'Deadline must be a valid ISO date string' });
    }
    const goals = readJSON(goalsPath);
    const index = goals.findIndex(goal => goal.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    if (goals[index].userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updatedGoal = { ...goals[index], ...req.body };
    updatedGoal.id = goals[index].id;
    updatedGoal.userId = goals[index].userId;
    goals[index] = updatedGoal;
    writeJSON(goalsPath, goals);
    res.json(updatedGoal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/expenses/goals/:id — delete a goal
router.delete('/goals/:id', requireAuth, (req, res) => {
  try {
    const goals = readJSON(goalsPath);
    const index = goals.findIndex(goal => goal.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    if (goals[index].userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    goals.splice(index, 1);
    writeJSON(goalsPath, goals);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ── Recurring Endpoints ───────────────────────────────────────────────────────

const CANCEL_URLS = {
  'netflix':        'https://www.netflix.com/cancelplan',
  'spotify':        'https://www.spotify.com/account/subscription/',
  'hulu':           'https://www.hulu.com/account',
  'disney':         'https://www.disneyplus.com/account/subscription',
  'apple':          'https://support.apple.com/HT202039',
  'icloud':         'https://support.apple.com/HT202039',
  'amazon':         'https://www.amazon.com/gp/help/customer/display.html?nodeId=201357590',
  'youtube':        'https://www.youtube.com/paid_memberships',
  'hbo':            'https://help.max.com/Answer/Detail/000001150',
  'max':            'https://help.max.com/Answer/Detail/000001150',
  'paramount':      'https://help.paramountplus.com/s/article/PD-How-do-I-cancel-my-Paramount-subscription',
  'peacock':        'https://www.peacocktv.com/help/article/how-do-i-cancel-my-subscription',
  'audible':        'https://www.audible.com/account/preferences',
  'crunchyroll':    'https://help.crunchyroll.com/hc/en-us/articles/360045038452',
  'dropbox':        'https://www.dropbox.com/account/plan',
  'github':         'https://github.com/settings/billing',
  'openai':         'https://help.openai.com/en/articles/6643004',
  'chatgpt':        'https://help.openai.com/en/articles/6643004',
  'adobe':          'https://account.adobe.com/plans',
  'canva':          'https://www.canva.com/settings/billing-and-teams',
  'planet fitness': 'https://www.planetfitness.com/account/cancel'
};

// POST /api/expenses/recurring/cancel — mark a subscription as cancelled
router.post('/recurring/cancel', requireAuth, (req, res) => {
  const { merchant } = req.body;
  if (!merchant || typeof merchant !== 'string' || merchant.trim() === '') {
    return res.status(400).json({ error: 'merchant must be a non-empty string' });
  }
  try {
    const users = readJSON(usersPath);
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const key = merchant.toLowerCase();
    if (!Array.isArray(users[idx].cancelledSubscriptions)) {
      users[idx].cancelledSubscriptions = [];
    }
    if (!users[idx].cancelledSubscriptions.includes(key)) {
      users[idx].cancelledSubscriptions.push(key);
    }
    writeJSON(usersPath, users);
    res.json({ cancelledSubscriptions: users[idx].cancelledSubscriptions });
  } catch (err) {
    console.error('recurring/cancel error:', err);
    res.status(500).json({ error: 'Failed to update cancellation status' });
  }
});

// POST /api/expenses/recurring/restore — un-cancel a subscription
router.post('/recurring/restore', requireAuth, (req, res) => {
  const { merchant } = req.body;
  if (!merchant || typeof merchant !== 'string' || merchant.trim() === '') {
    return res.status(400).json({ error: 'merchant must be a non-empty string' });
  }
  try {
    const users = readJSON(usersPath);
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const key = merchant.toLowerCase();
    if (!Array.isArray(users[idx].cancelledSubscriptions)) {
      users[idx].cancelledSubscriptions = [];
    }
    users[idx].cancelledSubscriptions = users[idx].cancelledSubscriptions.filter(m => m !== key);
    writeJSON(usersPath, users);
    res.json({ cancelledSubscriptions: users[idx].cancelledSubscriptions });
  } catch (err) {
    console.error('recurring/restore error:', err);
    res.status(500).json({ error: 'Failed to update cancellation status' });
  }
});

// GET /api/expenses/recurring — detect recurring subscriptions for current user
router.get('/recurring', requireAuth, (req, res) => {
  try {
    const expenses = readJSON(expensesPath);
    const users = readJSON(usersPath);
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.json([]);

    const cancelled = Array.isArray(user.cancelledSubscriptions)
      ? user.cancelledSubscriptions
      : [];

    const SCANNED = ['Subscriptions', 'Entertainment', 'Health', 'Shopping', 'Other'];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const userExpenses = expenses.filter(e => e.userId === req.session.userId);
    const filtered = userExpenses.filter(e =>
      SCANNED.includes(e.category) && e.date >= cutoffStr
    );

    const groups = {};
    filtered.forEach(e => {
      const key = e.merchant.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    const results = [];
    Object.entries(groups).forEach(([key, exps]) => {
      const months = new Set(exps.map(e => e.date.slice(0, 7)));
      if (months.size < 2) return;

      const avg = exps.reduce((s, e) => s + Number(e.amount), 0) / exps.length;
      const monthlyAmount = Math.round(avg * 100) / 100;
      const monthCount = months.size;
      const lastSeen = exps.map(e => e.date).sort().pop();

      let confidence;
      if (monthCount >= 6) confidence = 'locked';
      else if (monthCount >= 3) confidence = 'auto';
      else confidence = 'likely';

      const merchantName = exps[0].merchant;
      const merchantLower = merchantName.toLowerCase();
      const matchedKey = Object.keys(CANCEL_URLS).find(k => merchantLower.includes(k));
      const cancelUrl = matchedKey
        ? CANCEL_URLS[matchedKey]
        : 'https://www.google.com/search?q=how+to+cancel+' + encodeURIComponent(merchantName);

      results.push({
        merchant: merchantName,
        category: exps[0].category,
        monthlyAmount,
        monthCount,
        lastSeen,
        confidence,
        isCancelled: cancelled.includes(key),
        cancelUrl
      });
    });

    results.sort((a, b) => {
      if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
      if (b.monthCount !== a.monthCount) return b.monthCount - a.monthCount;
      return b.monthlyAmount - a.monthlyAmount;
    });

    res.json(results);
  } catch (err) {
    console.error('recurring detection error:', err);
    res.json([]);
  }
});

// ── Expenses Endpoints ────────────────────────────────────────────────────────

// GET /api/expenses — return only the logged-in user's expenses
router.get('/', requireAuth, (req, res) => {
  try {
    const expenses = readJSON(expensesPath);
    const userExpenses = expenses.filter(exp => exp.userId === req.session.userId);
    res.json(userExpenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read expenses' });
  }
});

// POST /api/expenses — create a new expense
router.post('/', requireAuth, (req, res) => {
  try {
    const validation = isValidExpense(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const expenses = readJSON(expensesPath);
    const newExpense = {
      id: `exp_${Date.now()}`,
      userId: req.session.userId,
      amount: req.body.amount,
      category: req.body.category,
      merchant: req.body.merchant,
      date: req.body.date,
      notes: req.body.notes || '',
    };
    expenses.push(newExpense);
    writeJSON(expensesPath, expenses);
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id — partially update an expense
router.put('/:id', requireAuth, (req, res) => {
  try {
    if (req.body.amount !== undefined || req.body.category !== undefined || req.body.merchant !== undefined || req.body.date !== undefined) {
      const validation = isValidExpense(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    const expenses = readJSON(expensesPath);
    const index = expenses.findIndex(exp => exp.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (expenses[index].userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updatedExpense = { ...expenses[index], ...req.body };
    updatedExpense.id = expenses[index].id;
    updatedExpense.userId = expenses[index].userId;
    expenses[index] = updatedExpense;
    writeJSON(expensesPath, expenses);
    res.json(updatedExpense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id — delete an expense
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const expenses = readJSON(expensesPath);
    const index = expenses.findIndex(exp => exp.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (expenses[index].userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    expenses.splice(index, 1);
    writeJSON(expensesPath, expenses);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
