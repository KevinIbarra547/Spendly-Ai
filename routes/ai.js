const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { requireAuth } = require('../middleware/auth');

const groq = new Groq.default({ apiKey: process.env.GROQ_API_KEY });

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const EXPENSES_PATH = path.join(__dirname, '..', 'data', 'expenses.json');

function safeRead(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function buildSystemPrompt(user, expenses) {
  const userExpenses = expenses.filter(e => e.userId === user.id);
  const byCategory = {};
  let totalSpent = 0;
  for (const e of userExpenses) {
    const cat = e.category || 'Uncategorized';
    const amt = Number(e.amount) || 0;
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    totalSpent += amt;
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat} ($${amt.toFixed(2)})`)
    .join(', ') || 'no spending logged yet';

  const budgetLine = user.monthlyBudgetCap > 0
    ? `Their monthly budget cap is $${user.monthlyBudgetCap}.`
    : `They have not set a monthly budget cap yet.`;

  return `You are Spendly's AI Coach — a warm, encouraging friend who \
helps a student named ${user.username} manage their money. You talk like \
a slightly older sibling or a good RA: supportive, casual, never preachy, \
never shaming.

About this student:
- School status: ${user.studentStatus}
- Primary financial goal: ${user.primaryFinancialGoal}
- ${budgetLine}
- Top spending categories this period: ${topCategories}
- Total spent this period: $${totalSpent.toFixed(2)}

Your style:
- Keep responses to 2–3 sentences typically.
- Reference their actual numbers when relevant (e.g. "you've spent $X on Y").
- Celebrate small wins. Ask one follow-up question when useful.
- Never recommend debt, credit cards, loans, or financial products.
- Never make promises about returns or investments.
- If they describe a serious situation (gambling, debt spiral, real \
  financial distress), gently suggest they talk to a trusted adult or \
  a school counselor. Do not try to handle it yourself.

You are not a financial advisor. You are a friend who knows money.`;
}

// POST /api/ai/coach
// Body: { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
// Streams the assistant's response as Server-Sent Events.
router.post('/coach', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    for (const m of messages) {
      if (!m.role || !m.content || typeof m.content !== 'string') {
        return res.status(400).json({ error: 'invalid message format' });
      }
      if (m.role !== 'user' && m.role !== 'assistant') {
        return res.status(400).json({ error: 'invalid message role' });
      }
    }

    const users = safeRead(USERS_PATH, []);
    const user = users.find(u => u.id === req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const expenses = safeRead(EXPENSES_PATH, []);

    const systemPrompt = buildSystemPrompt(user, expenses);
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: fullMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 500
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Coach error:', err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Coach error: ' + err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Coach unavailable: ' + err.message });
    }
  }
});

module.exports = router;
