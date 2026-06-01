require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET is not set in Replit Secrets');
  process.exit(1);
}

const SERVER_START_ISO = new Date().toISOString();

// 1. BODY PARSERS FIRST (so req.body is defined inside session + routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. SESSION MIDDLEWARE SECOND (so req.session exists inside routes)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false
  }
}));

// 3. API ROUTES THIRD (BEFORE static, so /api/* doesn't fall through)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/family', require('./routes/family'));

// 4. Built-in health and config endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, startedAt: SERVER_START_ISO });
});

app.get('/api/site/config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'site_config.json'), 'utf8'));
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Could not read site config' });
  }
});

// 5. STATIC FILES LAST (so it's a fallback after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// 6. Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke internally!' });
});

// Recurring allowance scheduler — pure setInterval, no scheduler library.
// Walks recurringAllowances.json; for each schedule whose nextSendAt has
// passed (possibly multiple times if the server was offline), pushes a new
// entry into the child's allowanceHistory, bumps pendingAllowance, and
// advances nextSendAt one interval at a time until it's in the future.
function runAllowanceScheduler() {
  try {
    const RECURRING_PATH = path.join(__dirname, 'data', 'recurringAllowances.json');
    const USERS_PATH     = path.join(__dirname, 'data', 'users.json');

    let recurring, users;
    try {
      recurring = JSON.parse(fs.readFileSync(RECURRING_PATH, 'utf8'));
      users     = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
    } catch (e) {
      return; // Files missing or unreadable — skip this tick.
    }

    const now = new Date();
    let changed = false;

    recurring.forEach(entry => {
      while (now >= new Date(entry.nextSendAt)) {
        const childIdx = users.findIndex(u => u.id === entry.childId);
        if (childIdx !== -1) {
          const child = users[childIdx];
          if (!Array.isArray(child.allowanceHistory)) child.allowanceHistory = [];
          child.allowanceHistory.push({
            id: 'allowance_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            fromParentId: entry.parentId,
            amount: entry.amount,
            recurrence: entry.recurrence,
            receivedAt: new Date(entry.nextSendAt).toISOString(),
            allocatedAt: null,
            allocation: { savingsGoal: null, food: null, freeSpending: null },
            grade: null,
            gradeFeedback: null
          });
          const existing = Number(child.pendingAllowance) || 0;
          child.pendingAllowance = Math.round((existing + entry.amount) * 100) / 100;
          changed = true;
        }
        const next = new Date(entry.nextSendAt);
        if (entry.recurrence === 'weekly')  next.setDate(next.getDate() + 7);
        if (entry.recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
        entry.nextSendAt = next.toISOString();
      }
    });

    if (changed) {
      fs.writeFileSync(USERS_PATH,     JSON.stringify(users,     null, 2), 'utf8');
      fs.writeFileSync(RECURRING_PATH, JSON.stringify(recurring, null, 2), 'utf8');
      console.log('Allowance scheduler: processed recurring allowances');
    }
  } catch (err) {
    console.error('Allowance scheduler error:', err);
  }
}

// Catch up missed allowances on boot, then tick hourly.
runAllowanceScheduler();
setInterval(runAllowanceScheduler, 3600000);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Spendly running on port ${port}`);
});