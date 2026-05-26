const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Helper functions for reading and writing JSON files
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

// --- Expenses Endpoints ---

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

// --- Goals Endpoints ---

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
    if (req.body.title !== undefined || req.body.targetAmount !== undefined || req.body.currentSaved !== undefined || req.body.deadline !== undefined) {
      const validation = isValidGoal(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
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

module.exports = router;
