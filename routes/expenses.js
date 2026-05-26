const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const requireAuth = require('../middleware/auth');

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
    const expenses = readJSON(expensesPath);
    const newExpense = {
      id: `exp_${Date.now()}`,
      userId: req.session.userId,
      amount: req.body.amount,
      category: req.body.category,
      merchant: req.body.merchant,
      date: req.body.date,
      notes: req.body.notes,
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
