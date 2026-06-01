require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { runAllowanceScheduler } = require('./routes/family');

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

// 7. Recurring allowance scheduler — catch up any overdue allowances on boot,
// then check hourly at the top of every hour.
runAllowanceScheduler();  // catch-up on boot
cron.schedule('0 * * * *', () => { runAllowanceScheduler(); });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Spendly running on port ${port}`);
});