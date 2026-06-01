const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed (jpeg, png, webp, heic)'));
  }
});

const groq = new Groq.default({ apiKey: process.env.GROQ_API_KEY });

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const EXPENSES_PATH = path.join(__dirname, '..', 'data', 'expenses.json');
const GOALS_PATH = path.join(__dirname, '..', 'data', 'goals.json');

function safeRead(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

async function gradeAllocation(save, spend, give, allowanceAmount) {
  const saveAmt  = (allowanceAmount * save  / 100).toFixed(2);
  const spendAmt = (allowanceAmount * spend / 100).toFixed(2);
  const giveAmt  = (allowanceAmount * give  / 100).toFixed(2);

  const gradingPrompt = `You are a friendly financial coach for a student.
A child has received an allowance of $${allowanceAmount} and wants to split it:
- Save: ${save}% ($${saveAmt})
- Spend: ${spend}% ($${spendAmt})
- Give: ${give}% ($${giveAmt})

Grade this allocation A through F using these exact criteria:
- A: Save >= 30% AND Give >= 10%
- B: Save >= 20% AND Give >= 5%
- C: Save >= 10% OR Give >= 5%
- D: Save < 10% AND Give < 5% AND Spend <= 100%
- F: Save === 0 AND Give === 0

Respond ONLY with a valid JSON object, no markdown, no code fences:
{
  "grade": "A",
  "feedback": "2-3 sentences of warm, encouraging, age-appropriate feedback. Be specific about their numbers. For C/D/F gently suggest what to change."
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: gradingPrompt }],
    temperature: 0.4,
    max_tokens: 300
  });

  const raw     = response.choices[0]?.message?.content || '';
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const parsed  = JSON.parse(cleaned);

  if (!['A', 'B', 'C', 'D', 'F'].includes(parsed.grade)) {
    throw new Error('Invalid grade returned: ' + parsed.grade);
  }
  if (!parsed.feedback || typeof parsed.feedback !== 'string') {
    throw new Error('Invalid feedback returned');
  }

  return { grade: parsed.grade, feedback: parsed.feedback };
}

function detectRecurring(userExpenses, cancelledSubs = []) {
  const SCANNED = ['Subscriptions','Entertainment','Health','Shopping','Other'];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const cutoffStr = cutoff.toISOString().slice(0,10);

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
    const months = new Set(exps.map(e => e.date.slice(0,7)));
    if (months.size >= 2) {
      const avg = exps.reduce((s,e) => s + Number(e.amount), 0) / exps.length;
      results.push({
        merchant: exps[0].merchant,
        monthlyAmount: Math.round(avg * 100) / 100,
        monthCount: months.size,
        isCancelled: cancelledSubs.includes(key)
      });
    }
  });

  return results.sort((a,b) => b.monthCount - a.monthCount);
}

function buildSystemPrompt(user, expenses, userGoals, recurringList) {
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

  let goalsBlock;
  if (!userGoals || userGoals.length === 0) {
    goalsBlock = 'They have not created any specific savings goals yet.';
  } else {
    const goalLines = userGoals.slice(0, 8).map(g => {
      const target = Number(g.targetAmount) || 0;
      const saved = Number(g.currentSaved) || 0;
      const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
      const deadline = g.deadline ? ` (deadline: ${g.deadline})` : '';
      return `  - "${g.title}": $${saved.toFixed(2)} saved of $${target.toFixed(2)} (${pct}%)${deadline}`;
    }).join('\n');
    goalsBlock = `Their active savings goals:\n${goalLines}`;
  }

  // Build financial profile context
  let profileBlock;
  const fp = user.financialProfile;

  if (!fp || !fp.surveyCompletedAt) {
    profileBlock = `This user has NOT completed their financial profile survey yet.
Important: somewhere in your response, gently remind them that completing their
profile at /onboarding.html will help you give them much more personalized advice.`;
  } else {
    const livingMap = {
      'with_family_no_bills': 'lives with family and pays no rent or bills',
      'with_family_contributes': 'lives with family and contributes to some bills',
      'renting': 'rents their own place',
      'owns_home': 'owns their home',
      'other': 'has another living situation'
    };
    const foodMap = {
      'cooks': 'mostly cooks at home',
      'eats_out': 'mostly buys fast food or eats out',
      'covered': 'has food covered for them (family, meal plan, etc.)',
      'mixed': 'mixes cooking and eating out'
    };
    const styleMap = {
      'overspender': 'tends to overspend — money goes fast',
      'balanced': 'is pretty balanced — tries to stay within limits',
      'saver': 'is a natural saver — rarely overspends'
    };
    const intentMap = {
      'stop_overspending': 'stop overspending and stick to a budget',
      'save_for_goal': 'save up for a specific goal faster',
      'understand_spending': 'understand where their money is actually going',
      'build_habits': 'build better long-term financial habits',
      'manage_family': 'manage shared or family expenses'
    };

    const billsLine = fp.paysRecurringBills && fp.billTypes && fp.billTypes.length > 0
      ? `They pay these recurring bills: ${fp.billTypes.join(', ')}.`
      : 'They do not pay any recurring bills.';

    const incomeLine = fp.hasIncome && fp.monthlyIncome
      ? `They earn approximately $${fp.monthlyIncome}/month after tax.`
      : 'They do not have a job or regular income.';

    const subsLine = fp.hasSubscriptions && fp.subscriptionDetails
      ? `Their known subscriptions: ${fp.subscriptionDetails}.`
      : fp.hasSubscriptions === false
      ? 'They do not pay for any subscriptions.'
      : 'Their subscription status is unknown.';

    const activeRecurring = recurringList
      ? recurringList.filter(r => !r.isCancelled)
      : [];
    const cancelledRecurring = recurringList
      ? recurringList.filter(r => r.isCancelled)
      : [];

    const recurringLine = activeRecurring.length > 0
      ? `Detected active recurring subscriptions: ${activeRecurring.map(r =>
          `${r.merchant} ($${r.monthlyAmount}/mo, seen ${r.monthCount} months)`
        ).join(', ')}.`
      : 'No active recurring subscriptions detected from expense history yet.';

    const cancelledLine = cancelledRecurring.length > 0
      ? `Subscriptions the user has already marked as cancelled: ${cancelledRecurring.map(r =>
          r.merchant
        ).join(', ')}. Do not suggest cancelling these — the user is already handling them.`
      : '';

    const goalLine = fp.hasSavingsGoal && fp.savingsGoalName
      ? `They are actively saving for: "${fp.savingsGoalName}" with a target of $${fp.savingsGoalTarget}.`
      : 'They do not currently have a savings goal set.';

    profileBlock = `
FINANCIAL PROFILE (from onboarding survey — use this to personalize every response):
- Living situation: ${livingMap[fp.livingSituation] || fp.livingSituation}
- ${billsLine}
- ${incomeLine}
- Food situation: ${foodMap[fp.foodSituation] || fp.foodSituation}
- ${subsLine}
- ${recurringLine}${cancelledLine ? '\n- ' + cancelledLine : ''}
- ${goalLine}
- Spending style: ${styleMap[fp.spendingStyle] || fp.spendingStyle}
- Primary intent with Spendly: ${intentMap[fp.primaryIntent] || fp.primaryIntent}
- Survey completed: ${new Date(fp.surveyCompletedAt).toLocaleDateString()}

Use this profile actively. Reference specific details when relevant. For example:
- If they earn $X/month, use that as the baseline for savings rate recommendations
- If they cook at home and have a spike in food spending, that IS an anomaly worth flagging
- If they eat out frequently, higher food spend is expected — don't flag it
- If they are an overspender, give firmer and more direct advice
- If they are a natural saver, be more encouraging and focus on goal acceleration
- If they have a savings goal, reference it when discussing spending priorities
`.trim();
  }

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
- ${goalsBlock}

${profileBlock}

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
    const goals = safeRead(GOALS_PATH, []);
    const userGoals = goals.filter(g => g.userId === user.id);

    const userExpenses = expenses.filter(e => e.userId === user.id);
    const cancelledSubs = user.cancelledSubscriptions || [];
    const recurring = detectRecurring(userExpenses, cancelledSubs);
    const systemPrompt = buildSystemPrompt(user, expenses, userGoals, recurring);
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

// POST /api/ai/grade-allocation — grade a proposed Save/Spend/Give split.
router.post('/grade-allocation', requireAuth, async (req, res) => {
  try {
    const { save, spend, give, allowanceAmount } = req.body;

    if (typeof save !== 'number' || typeof spend !== 'number' ||
        typeof give !== 'number' || typeof allowanceAmount !== 'number') {
      return res.status(400).json({
        error: 'save, spend, give, and allowanceAmount must be numbers'
      });
    }
    if (save < 0 || spend < 0 || give < 0) {
      return res.status(400).json({ error: 'All percentages must be non-negative' });
    }
    if (save + spend + give !== 100) {
      return res.status(400).json({ error: 'save + spend + give must equal 100' });
    }
    if (allowanceAmount <= 0) {
      return res.status(400).json({ error: 'allowanceAmount must be positive' });
    }

    const result = await gradeAllocation(save, spend, give, allowanceAmount);
    return res.json(result);
  } catch (err) {
    console.error('Grade allocation error:', err);
    return res.status(500).json({ error: 'Grading unavailable: ' + err.message });
  }
});

const ALLOWED_CATEGORIES = ['Food', 'Groceries', 'Coffee', 'Transportation', 'Entertainment', 'Shopping', 'Subscriptions', 'Other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/ai/scanner
// Accepts: multipart/form-data with field "receipt" (image). Returns parsed receipt JSON.
router.post('/scanner', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a receipt parser. Extract the following fields from this receipt image and respond with ONLY a valid JSON object (no markdown, no code fences, no explanation):

{
  "amount": <number, the total amount in dollars>,
  "merchant": "<string, the store or restaurant name>",
  "date": "<string, in YYYY-MM-DD format>",
  "category": "<one of: Food, Groceries, Coffee, Transportation, Entertainment, Shopping, Subscriptions, Other>"
}

Choose the category that best matches the merchant. If the receipt is unreadable or not a receipt, respond with:
{ "error": "Could not parse receipt" }

Today's date is ${new Date().toISOString().split('T')[0]} — use it if the receipt date is missing or unclear.`
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 300
    });

    const raw = response.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: 'Scanner returned invalid response', raw: cleaned });
    }

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error, raw: cleaned });
    }

    if (
      typeof parsed.amount !== 'number' ||
      !parsed.merchant || typeof parsed.merchant !== 'string' ||
      !DATE_RE.test(parsed.date) ||
      !ALLOWED_CATEGORIES.includes(parsed.category)
    ) {
      return res.status(502).json({ error: 'Scanner returned malformed data', data: parsed });
    }

    return res.json({
      amount: parsed.amount,
      merchant: parsed.merchant,
      date: parsed.date,
      category: parsed.category
    });
  } catch (err) {
    console.error('Scanner error:', err);
    return res.status(500).json({ error: 'Scanner unavailable: ' + err.message });
  }
});

// Multer error handler for scanner route
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image files allowed (jpeg, png, webp, heic)') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = { router, gradeAllocation };
