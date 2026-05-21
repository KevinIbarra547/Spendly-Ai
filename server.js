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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false }
}));

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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke internally!' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Spendly running on port ${port}`);
});
