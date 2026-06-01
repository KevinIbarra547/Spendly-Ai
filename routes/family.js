const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { requireAuth, requireParent, requireChild } = require('../middleware/auth');
const { gradeAllocation } = require('./ai');

const FAMILIES_PATH = path.join(__dirname, '..', 'data', 'families.json');
const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const GOALS_PATH = path.join(__dirname, '..', 'data', 'goals.json');

function readFamilies() {
  try {
    const raw = fs.readFileSync(FAMILIES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeFamilies(families) {
  fs.writeFileSync(FAMILIES_PATH, JSON.stringify(families, null, 2), 'utf8');
}

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

// Calculate the next send date for a recurring allowance.
// - weekly: lastSentAt + 7 days
// - monthly: same day-of-month, next calendar month. If that day does not
//   exist in the next month (e.g. Jan 31 → Feb), fall back to that month's
//   last day. Uses plain Date arithmetic — no external date libraries.
function calculateNextSendAt(lastSentAt, recurrence) {
  const base = new Date(lastSentAt);
  if (recurrence === 'weekly') {
    const next = new Date(base.getTime());
    next.setDate(next.getDate() + 7);
    return next.toISOString();
  }
  // monthly
  const day = base.getDate();
  const year = base.getFullYear();
  const month = base.getMonth();
  // Last day of the next month — day 0 of the month after next.
  const lastDayNextMonth = new Date(year, month + 2, 0).getDate();
  const targetDay = Math.min(day, lastDayNextMonth);
  const next = new Date(base.getTime());
  next.setFullYear(year, month + 1, targetDay);
  return next.toISOString();
}

// Generate a 6-character uppercase alphanumeric invite code that does not
// already exist in the families list — regenerate on collision.
function generateUniqueInviteCode(families) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(chars.length)];
    }
  } while (families.some(f => f.inviteCode === code));
  return code;
}

// GET /api/family/ping — confirms the router is mounted.
router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true });
});

// GET /api/family/group — the current parent's family group record.
router.get('/group', requireAuth, requireParent, (req, res) => {
  try {
    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    return res.status(200).json(family);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/family/members — summary of every child linked to this parent's group.
router.get('/members', requireAuth, requireParent, (req, res) => {
  try {
    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }

    const users = readUsers();
    const parent = users.find(u => u.id === req.session.userId);
    const parentNotes = (parent && parent.familyNotes) || {};
    const goals = readGoals();

    const summary = family.childIds.map(childId => {
      const child = users.find(u => u.id === childId);
      if (!child) return null;

      const history = Array.isArray(child.allowanceHistory) ? child.allowanceHistory : [];
      const latest = history.length > 0 ? history[history.length - 1] : null;

      return {
        id: child.id,
        username: child.username,
        pfp: child.pfp,
        pendingAllowance: child.pendingAllowance,
        allocations: child.allocations,
        familyNotes: parentNotes[child.id] || null,
        savingsGoals: goals.filter(g => g.userId === child.id),
        recentGrade: latest ? latest.grade : null,
        recentAllowance: latest ? { amount: latest.amount, receivedAt: latest.receivedAt } : null
      };
    }).filter(Boolean);

    return res.status(200).json(summary);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/family/allowance — send an allowance to a child.
router.post('/allowance', requireAuth, requireParent, (req, res) => {
  try {
    const { childId, amount, recurrence } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'childId is required' });
    }
    if (typeof amount !== 'number' || amount <= 0 || amount > 99999) {
      return res.status(400).json({ error: 'amount must be a positive number no greater than 99999' });
    }
    const validRecurrence = ['one-time', 'weekly', 'monthly'];
    if (!recurrence || !validRecurrence.includes(recurrence)) {
      return res.status(400).json({ error: 'recurrence must be one of: one-time, weekly, monthly' });
    }

    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    if (!family.childIds.includes(childId)) {
      return res.status(403).json({ error: 'Child not in your family group.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === childId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Child not found.' });
    }
    const child = users[idx];

    const entry = {
      id: `allowance_${Date.now()}`,
      fromParentId: req.session.userId,
      amount: amount,
      recurrence: recurrence,
      receivedAt: new Date().toISOString(),
      allocatedAt: null,
      allocation: {
        savingsGoal: null,
        food: null,
        freeSpending: null
      },
      grade: null,
      gradeFeedback: null
    };

    if (!Array.isArray(child.allowanceHistory)) child.allowanceHistory = [];
    child.allowanceHistory.push(entry);
    child.pendingAllowance = (child.pendingAllowance || 0) + amount;

    writeUsers(users);

    // For weekly/monthly, also register a recurring allowance schedule so the
    // scheduler keeps sending it. The first allowance above is sent immediately.
    let recurringEntry = null;
    if (recurrence === 'weekly' || recurrence === 'monthly') {
      if (!Array.isArray(family.recurringAllowances)) family.recurringAllowances = [];

      const duplicate = family.recurringAllowances.find(r =>
        r.parentId === req.session.userId &&
        r.childId === childId &&
        r.recurrence === recurrence
      );
      if (duplicate) {
        return res.status(400).json({ error: 'A recurring allowance of this type already exists for this child. Cancel it before creating a new one.' });
      }

      const createdAt = new Date().toISOString();
      recurringEntry = {
        id: `recurring_${Date.now()}`,
        parentId: req.session.userId,
        childId: childId,
        amount: amount,
        recurrence: recurrence,
        createdAt: createdAt,
        lastSentAt: createdAt,
        nextSendAt: calculateNextSendAt(createdAt, recurrence)
      };
      family.recurringAllowances.push(recurringEntry);
      writeFamilies(families);
    }

    return res.status(200).json({
      message: 'Allowance sent.',
      allowanceId: entry.id,
      pendingAllowance: child.pendingAllowance,
      recurring: recurringEntry ? { id: recurringEntry.id, nextSendAt: recurringEntry.nextSendAt } : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/family/allocate — child submits an allocation split for a pending allowance.
router.post('/allocate', requireAuth, requireChild, async (req, res) => {
  try {
    const { savingsGoal, food, freeSpending, allowanceId } = req.body;

    if (typeof savingsGoal !== 'number' || savingsGoal < 0 ||
        typeof food !== 'number' || food < 0 ||
        typeof freeSpending !== 'number' || freeSpending < 0) {
      return res.status(400).json({ error: 'savingsGoal, food, and freeSpending must be numbers >= 0' });
    }
    if (savingsGoal + food + freeSpending !== 100) {
      return res.status(400).json({ error: 'Allocation percentages must sum to exactly 100' });
    }
    if (!allowanceId || typeof allowanceId !== 'string') {
      return res.status(400).json({ error: 'allowanceId is required' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const child = users[idx];

    const history = Array.isArray(child.allowanceHistory) ? child.allowanceHistory : [];
    const entry = history.find(e => e.id === allowanceId);
    if (!entry) {
      return res.status(404).json({ error: 'Allowance not found.' });
    }
    if (entry.allocatedAt !== null) {
      return res.status(400).json({ error: 'Allowance already allocated.' });
    }
    // Belt-and-suspenders: nothing pending but this entry is already allocated.
    if ((child.pendingAllowance || 0) <= 0 && entry.allocatedAt) {
      return res.status(400).json({ error: 'This allowance has already been allocated.' });
    }

    const round2 = (n) => Math.round(n * 100) / 100;
    const savingsGoalAmount = round2((savingsGoal / 100) * entry.amount);
    const foodAmount = round2((food / 100) * entry.amount);
    const freeSpendingAmount = round2((freeSpending / 100) * entry.amount);

    // Apply any rounding remainder to freeSpending so the three buckets sum
    // exactly to the allowance amount.
    const sum = savingsGoalAmount + foodAmount + freeSpendingAmount;
    const remainder = round2(entry.amount - sum);
    const adjustedFreeSpending = round2(freeSpendingAmount + remainder);

    let grade = 'B';
    let feedback = 'AI grading unavailable — allocation accepted.';
    try {
      const groqClient = new Groq.default({ apiKey: process.env.GROQ_API_KEY });
      const result = await gradeAllocation(
        savingsGoal, food, freeSpending, entry.amount, groqClient
      );
      grade    = result.grade;
      feedback = result.feedback;
    } catch (aiErr) {
      console.error('Grading failed:', aiErr);
      // Fallback grade/feedback — allocation still proceeds.
    }

    const passed = grade === 'A' || grade === 'B';

    if (!passed) {
      // Do not mutate or persist anything on a failing grade.
      return res.status(200).json({ passed: false, grade, feedback });
    }

    child.allocations.savingsGoal += savingsGoalAmount;
    child.allocations.food += foodAmount;
    child.allocations.freeSpending += adjustedFreeSpending;
    child.pendingAllowance = Math.max(0, (child.pendingAllowance || 0) - entry.amount);

    entry.allocatedAt = new Date().toISOString();
    entry.allocation = {
      savingsGoal: savingsGoalAmount,
      food: foodAmount,
      freeSpending: adjustedFreeSpending
    };
    entry.grade = grade;
    entry.gradeFeedback = feedback;

    writeUsers(users);

    return res.status(200).json({
      passed: true,
      grade,
      feedback,
      allocations: child.allocations,
      pendingAllowance: child.pendingAllowance
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/family/dashboard — the child's own dashboard data.
router.get('/dashboard', requireAuth, requireChild, (req, res) => {
  try {
    const users = readUsers();
    const child = users.find(u => u.id === req.session.userId);
    if (!child) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const goals = readGoals();
    const savingsGoals = goals.filter(g => g.userId === child.id);

    let familyNote = null;
    if (child.familyId) {
      const parent = users.find(u => u.role === 'parent' && u.familyId === child.familyId);
      if (parent && parent.familyNotes && parent.familyNotes[child.id]) {
        familyNote = parent.familyNotes[child.id];
      }
    }

    return res.status(200).json({
      username: child.username,
      pfp: child.pfp,
      pendingAllowance: child.pendingAllowance,
      allocations: child.allocations,
      savingsGoals,
      allowanceHistory: child.allowanceHistory,
      familyNote
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/family/note — parent leaves/replaces a note on a child's dashboard.
router.patch('/note', requireAuth, requireParent, (req, res) => {
  try {
    const { childId, message } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'childId is required' });
    }
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.trim().length > 280) {
      return res.status(400).json({ error: 'message must be 280 characters or fewer' });
    }

    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    if (!family.childIds.includes(childId)) {
      return res.status(403).json({ error: 'Child not in your family group.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const parent = users[idx];
    if (!parent.familyNotes) parent.familyNotes = {};
    parent.familyNotes[childId] = {
      message: message.trim(),
      sentAt: new Date().toISOString()
    };

    writeUsers(users);

    return res.status(200).json({ message: 'Note saved.', note: parent.familyNotes[childId] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/family/note — parent removes their active note for a child.
router.delete('/note', requireAuth, requireParent, (req, res) => {
  try {
    const { childId } = req.body;

    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'childId is required' });
    }

    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    if (!family.childIds.includes(childId)) {
      return res.status(403).json({ error: 'Child not in your family group.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const parent = users[idx];
    if (parent.familyNotes && parent.familyNotes[childId]) {
      delete parent.familyNotes[childId];
      writeUsers(users);
    }

    return res.status(200).json({ message: 'Note removed.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/family/allowance/recurring — all active recurring allowances for
// this parent's family group.
router.get('/allowance/recurring', requireAuth, requireParent, (req, res) => {
  try {
    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    return res.status(200).json({ recurringAllowances: family.recurringAllowances || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/family/allowance/recurring — cancel a recurring allowance by id.
router.delete('/allowance/recurring', requireAuth, requireParent, (req, res) => {
  try {
    const { recurringId, childId } = req.body;

    if (!recurringId || typeof recurringId !== 'string') {
      return res.status(400).json({ error: 'recurringId is required' });
    }
    if (!childId || typeof childId !== 'string') {
      return res.status(400).json({ error: 'childId is required' });
    }

    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    if (!family.childIds.includes(childId)) {
      return res.status(403).json({ error: 'Child not in your family group.' });
    }

    const list = Array.isArray(family.recurringAllowances) ? family.recurringAllowances : [];
    const idx = list.findIndex(r => r.id === recurringId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Recurring allowance not found.' });
    }

    list.splice(idx, 1);
    family.recurringAllowances = list;
    writeFamilies(families);

    return res.status(200).json({ message: 'Recurring allowance cancelled.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/family/invite — the parent's current invite code.
router.get('/invite', requireAuth, requireParent, (req, res) => {
  try {
    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    return res.status(200).json({ inviteCode: family.inviteCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/family/invite/regenerate — issue a new unique invite code.
router.post('/invite/regenerate', requireAuth, requireParent, (req, res) => {
  try {
    const families = readFamilies();
    const family = families.find(f => f.parentId === req.session.userId);
    if (!family) {
      return res.status(404).json({ error: 'Family group not found.' });
    }
    family.inviteCode = generateUniqueInviteCode(families);
    writeFamilies(families);
    return res.status(200).json({ inviteCode: family.inviteCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Scans every family's recurring allowances and sends any that are due
// (nextSendAt in the past). Updates lastSentAt / nextSendAt and only writes
// the data files when something actually changed. Safe to run on boot and on
// an hourly cron — it is idempotent with respect to the schedule timestamps.
function runAllowanceScheduler() {
  try {
    const now = new Date();
    const families = readFamilies();
    const users = readUsers();
    let familiesChanged = false;
    let usersChanged = false;

    for (const family of families) {
      if (!family.recurringAllowances || family.recurringAllowances.length === 0) continue;

      for (const recurring of family.recurringAllowances) {
        const nextSend = new Date(recurring.nextSendAt);
        if (now < nextSend) continue;   // not due yet — skip

        // Find the child
        const childIdx = users.findIndex(u => u.id === recurring.childId);
        if (childIdx === -1) continue;  // child no longer exists — skip silently

        // Send the allowance
        const entry = {
          id: `allowance_${Date.now()}`,
          fromParentId: recurring.parentId,
          amount: recurring.amount,
          recurrence: recurring.recurrence,
          receivedAt: now.toISOString(),
          allocatedAt: null,
          allocation: { savingsGoal: null, food: null, freeSpending: null },
          grade: null,
          gradeFeedback: null
        };

        if (!Array.isArray(users[childIdx].allowanceHistory)) users[childIdx].allowanceHistory = [];
        users[childIdx].allowanceHistory.push(entry);
        users[childIdx].pendingAllowance = (users[childIdx].pendingAllowance || 0) + recurring.amount;
        usersChanged = true;

        // Update schedule
        recurring.lastSentAt = now.toISOString();
        recurring.nextSendAt = calculateNextSendAt(recurring.lastSentAt, recurring.recurrence);
        familiesChanged = true;
      }
    }

    if (usersChanged) writeUsers(users);
    if (familiesChanged) writeFamilies(families);

    console.log(`[Scheduler] Allowance check complete at ${now.toISOString()}`);
  } catch (err) {
    console.error('[Scheduler] Error during allowance check:', err);
  }
}

module.exports = router;
module.exports.readFamilies = readFamilies;
module.exports.writeFamilies = writeFamilies;
module.exports.calculateNextSendAt = calculateNextSendAt;
module.exports.runAllowanceScheduler = runAllowanceScheduler;
