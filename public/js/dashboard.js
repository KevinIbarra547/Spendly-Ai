(async () => {
  // Auth check
  let user;
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) { window.location.href = 'index.html'; return; }
    user = await res.json();
  } catch (e) { window.location.href = 'index.html'; return; }

  if (!user.financialProfile || !user.financialProfile.surveyCompletedAt) {
    window.location.href = '/onboarding.html';
    return;
  }

  // Greeting
  const greetingEl = document.getElementById('greeting-heading');
  const subtitleEl = document.getElementById('greeting-subtitle');
  if (greetingEl) {
    greetingEl.textContent = `Hey ${user.username} 👋`;
    greetingEl.style.cssText = 'font-size:30px;font-weight:700;color:#f4f1ec;letter-spacing:-0.01em;';
  }
  if (subtitleEl) subtitleEl.textContent = 'Welcome back to Spendly.';

  // Helpers
  function fmt(n) { return '$' + parseFloat(n).toFixed(2); }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const todayStr = now.toDateString();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === todayStr) return 'Today, ' + timeStr;
    if (d.toDateString() === yest.toDateString()) return 'Yesterday, ' + timeStr;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + timeStr;
  }

  function getCatBg(cat) {
    var m = {Food:'rgba(249,115,22,0.2)',Transport:'rgba(59,130,246,0.2)',Transportation:'rgba(59,130,246,0.2)',Entertainment:'rgba(168,85,247,0.2)',Shopping:'rgba(236,72,153,0.2)',Health:'rgba(34,197,94,0.2)',Coffee:'rgba(234,179,8,0.2)',Groceries:'rgba(20,184,166,0.2)',Other:'rgba(113,113,122,0.2)'};
    return m[cat] || m.Other;
  }
  function getCatFg(cat) {
    var m = {Food:'#fdba74',Transport:'#93c5fd',Transportation:'#93c5fd',Entertainment:'#d8b4fe',Shopping:'#f9a8d4',Health:'#86efac',Coffee:'#fde047',Groceries:'#5eead4',Other:'#a1a1aa'};
    return m[cat] || m.Other;
  }

  function categoryIcon(category) {
    var cat = (category || 'other').toLowerCase();
    var colorMap = {
      food:'rgba(249,115,22,0.2)', transport:'rgba(59,130,246,0.2)',
      transportation:'rgba(59,130,246,0.2)', entertainment:'rgba(168,85,247,0.2)',
      shopping:'rgba(236,72,153,0.2)', health:'rgba(34,197,94,0.2)',
      coffee:'rgba(234,179,8,0.2)', groceries:'rgba(20,184,166,0.2)',
      other:'rgba(113,113,122,0.2)'
    };
    var iconColorMap = {
      food:'#fdba74', transport:'#93c5fd', transportation:'#93c5fd',
      entertainment:'#d8b4fe', shopping:'#f9a8d4', health:'#86efac',
      coffee:'#fde047', groceries:'#5eead4', other:'#a1a1aa'
    };
    var bg = colorMap[cat] || colorMap.other;
    var ic = iconColorMap[cat] || iconColorMap.other;
    return '<div style="width:36px;height:36px;border-radius:10px;background:' + bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
      '<svg style="color:' + ic + '" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" /></svg>' +
    '</div>';
  }

  // Days remaining in current month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = lastDay.getDate() - now.getDate();

  // Fetch expenses
  let expenses = [];
  try {
    const expRes = await fetch('/api/expenses');
    if (expRes.ok) expenses = await expRes.json();
  } catch (e) { /* leave empty */ }

  // This Month calculations
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const prevMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
  });

  const monthSpent = thisMonthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const prevSpent  = prevMonthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const cap = parseFloat(user.monthlyBudgetCap) || 0;

  const monthSpentEl    = document.getElementById('month-spent');
  const monthCapLabel   = document.getElementById('month-cap-label');
  const monthProgressBar = document.getElementById('month-progress-bar');
  const monthRemaining  = document.getElementById('month-remaining');
  const monthDaysLeft   = document.getElementById('month-days-left');
  const monthDelta      = document.getElementById('month-delta');

  if (monthSpentEl) monthSpentEl.textContent = fmt(monthSpent);

  if (cap > 0) {
    if (monthCapLabel) monthCapLabel.textContent = `of ${fmt(cap)}`;
    const pct = Math.min(100, (monthSpent / cap) * 100);
    if (monthProgressBar) monthProgressBar.style.width = pct + '%';
    const remaining = Math.max(0, cap - monthSpent);
    if (monthRemaining) monthRemaining.textContent = fmt(remaining) + ' left to spend';
  } else {
    if (monthCapLabel) monthCapLabel.textContent = 'no cap set';
    if (monthProgressBar) monthProgressBar.parentElement.classList.add('hidden');
    if (monthRemaining) monthRemaining.textContent = '';
  }

  if (monthDaysLeft) monthDaysLeft.textContent = daysLeft + ' days remaining';

  if (monthDelta && prevSpent > 0) {
    const delta = ((monthSpent - prevSpent) / prevSpent) * 100;
    const sign = delta >= 0 ? '+' : '';
    monthDelta.textContent = sign + delta.toFixed(0) + '% vs last month';
  }

  // Fetch goals
  let goals = [];
  try {
    const goalsRes = await fetch('/api/expenses/goals');
    if (goalsRes.ok) goals = await goalsRes.json();
  } catch (e) { /* leave empty */ }

  // Top Goal card
  const topGoalContent = document.getElementById('top-goal-content');
  if (topGoalContent && goals.length > 0) {
    const incomplete = goals.filter(g => g.targetAmount > 0 && g.currentSaved < g.targetAmount);
    if (incomplete.length > 0) {
      const topGoal = incomplete.sort((a, b) => (b.currentSaved / b.targetAmount) - (a.currentSaved / a.targetAmount))[0];
      const gPct = Math.min(100, Math.round((topGoal.currentSaved / topGoal.targetAmount) * 100));
      topGoalContent.innerHTML = `
        <p class="text-white font-semibold text-lg mb-1">${topGoal.title}</p>
        <p class="text-zinc-400 text-sm mb-3">${fmt(topGoal.currentSaved)} saved of ${fmt(topGoal.targetAmount)}</p>
        <div class="w-full bg-zinc-800 rounded-full h-2">
          <div class="bg-white h-2 rounded-full transition-all" style="width: ${gPct}%"></div>
        </div>
        <p class="text-zinc-500 text-xs mt-2">${gPct}% complete</p>`;
    } else {
      topGoalContent.innerHTML = `<p class="text-zinc-400 text-sm">All goals completed! <a href="/goals.html" class="text-white underline">Add a new one</a></p>`;
    }
  }

  // Buddy says
  const buddyEl = document.getElementById('buddy-says-message');
  if (buddyEl) {
    if (expenses.length === 0) {
      buddyEl.textContent = 'Welcome to Spendly! Log your first expense to start seeing insights.';
    } else if (cap > 0 && monthSpent > cap) {
      buddyEl.textContent = `You're ${fmt(monthSpent - cap)} over your monthly cap. Worth a chat with the Coach.`;
    } else if (cap > 0 && monthSpent / cap > 0.8 && daysLeft > 5) {
      buddyEl.textContent = `Heads up — you've used ${fmt(monthSpent)} of your ${fmt(cap)} cap with ${daysLeft} days to go. Pace yourself.`;
    } else if (cap > 0 && (cap - monthSpent) / cap > 0.2) {
      buddyEl.textContent = `You're doing well this month — ${fmt(cap - monthSpent)} under cap. Keep it up.`;
    } else if (cap > 0) {
      buddyEl.textContent = `On track this month — ${fmt(monthSpent)} spent of ${fmt(cap)} cap.`;
    } else {
      buddyEl.textContent = `You've logged ${fmt(monthSpent)} this month. Set a monthly cap in your profile to track your budget.`;
    }
  }

  // Recent expenses list
  const recentList = document.getElementById('recent-expenses-list');
  const recentEmpty = document.getElementById('recent-expenses-empty');
  if (recentList) {
    const recent = [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
      .slice(0, 5);

    if (recent.length === 0) {
      recentList.classList.add('hidden');
      if (recentEmpty) recentEmpty.classList.remove('hidden');
    } else {
      recentList.innerHTML = recent.map(exp => `
        <div class="flex items-center justify-between py-3 border-b border-zinc-800 last:border-b-0">
          <div class="flex items-center gap-3">
            ${categoryIcon(exp.category)}
            <div>
              <p class="text-white text-sm font-medium">${exp.merchant || 'Unknown'}</p>
              <p class="text-zinc-500 text-xs"><span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500;background:${getCatBg(exp.category)};color:${getCatFg(exp.category)}">${exp.category || 'Other'}</span> · ${formatDate(exp.date)}</p>
            </div>
          </div>
          <span class="text-white text-sm font-semibold">-${fmt(exp.amount)}</span>
        </div>`).join('');
    }
  }
})();
