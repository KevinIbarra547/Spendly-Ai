(async () => {
  const res = await fetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = 'index.html';
    return;
  }
  const user = await res.json();

  // Populate sidebar user info
  const avatarEl = document.getElementById('sidebar-avatar');
  const initialsEl = document.getElementById('sidebar-initials');
  document.getElementById('sidebar-username').textContent = user.username;

  const isDefaultPfp = !user.pfp || user.pfp === '/uploads/pfps/default.png';
  if (!isDefaultPfp) {
    avatarEl.innerHTML = `<img src="${user.pfp}" class="w-full h-full object-cover" alt="">`;
  } else {
    initialsEl.textContent = user.username.slice(0, 2).toUpperCase();
  }

  // Highlight the active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === currentPage) {
      link.classList.remove('text-slate-400', 'hover:text-white', 'hover:bg-slate-800');
      link.classList.add('text-white', 'bg-indigo-500');
    }
  });

  // Message of the Day banner.
  try {
    const cfgRes = await fetch('/api/site/config');
    if (cfgRes.ok) {
      const config = await cfgRes.json();
      let banner = document.getElementById('motd-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'motd-banner';
        banner.className = 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 rounded-xl px-4 py-3 mb-6 text-sm';
        const main = document.querySelector('main') || document.body;
        main.prepend(banner);
      }
      banner.textContent = config.tipOfTheDay || '';
    }
  } catch (e) { /* no banner if config can't be read */ }

  // Greeting and student status
  const greetingEl = document.getElementById('greeting-text');
  const statusEl = document.getElementById('student-status-text');

  if (greetingEl) greetingEl.textContent = `Hello, ${user.username}! 👋`;
  if (statusEl) {
    const status = user.studentStatus || '';
    const year = user.graduationYear ? ` · Class of ${user.graduationYear}` : '';
    statusEl.textContent = `🎓 ${status}${year}`;
  }

  // Fetch expenses and populate Top Category and Recent Transactions
  try {
    const expRes = await fetch('/api/expenses');
    if (expRes.ok) {
      const expenses = await expRes.json();

      // Recent transactions — last 3, newest first
      const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      const listEl = document.getElementById('recent-transactions-list');
      if (listEl) {
        if (recent.length === 0) {
          listEl.innerHTML = `<li class="text-slate-400 text-sm">No transactions yet.</li>`;
        } else {
          listEl.innerHTML = recent.map(exp => `
            <li class="flex justify-between items-center py-3 border-b border-slate-700 last:border-0">
              <div>
                <p class="text-white text-sm font-medium">${exp.merchant || 'Unknown'}</p>
                <p class="text-slate-400 text-xs">${exp.category} · ${exp.date}</p>
              </div>
              <span class="text-white font-semibold text-sm">$${parseFloat(exp.amount).toFixed(2)}</span>
            </li>`).join('');
        }
      }

      // Top spending category this month
      const now = new Date();
      const thisMonth = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const categoryTotals = {};
      thisMonth.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount);
      });
      const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      const topCatEl = document.getElementById('top-category-value');
      const topAmtEl = document.getElementById('top-category-amount');
      if (topCatEl && topAmtEl) {
        if (topCategory) {
          topCatEl.textContent = topCategory[0];
          topAmtEl.textContent = `$${topCategory[1].toFixed(2)} this month`;
        } else {
          topCatEl.textContent = '—';
          topAmtEl.textContent = 'No expenses this month';
        }
      }
    }
  } catch (e) { console.error('Expenses fetch failed', e); }

  // Fetch goals and populate the Urgent Goal card
  try {
    const goalsRes = await fetch('/api/expenses/goals');
    if (goalsRes.ok) {
      const goals = await goalsRes.json();
      const now = new Date();

      // Find the goal with the nearest future deadline
      const upcoming = goals
        .filter(g => new Date(g.deadline) >= now)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      const goalNameEl = document.getElementById('goal-name');
      const goalDaysEl = document.getElementById('goal-days');
      const goalBarEl = document.getElementById('goal-progress-bar');
      const goalRemainingEl = document.getElementById('goal-remaining');
      const goalSavedEl = document.getElementById('goal-saved');
      const goalTargetEl = document.getElementById('goal-target');

      if (upcoming.length > 0) {
        const g = upcoming[0];
        const daysLeft = Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24));
        const remaining = Math.max(0, g.targetAmount - g.currentSaved);
        const pct = Math.min(100, Math.round((g.currentSaved / g.targetAmount) * 100));

        if (goalNameEl) goalNameEl.textContent = g.title;
        if (goalDaysEl) goalDaysEl.textContent = `🎯 ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`;
        if (goalBarEl) {
          goalBarEl.style.width = `${pct}%`;
          goalBarEl.className = 'h-2 rounded-full bg-indigo-500 transition-all';
        }
        if (goalRemainingEl) goalRemainingEl.textContent = `$${remaining.toFixed(2)} still needed`;
        if (goalSavedEl) goalSavedEl.textContent = `$${parseFloat(g.currentSaved).toFixed(2)}`;
        if (goalTargetEl) goalTargetEl.textContent = `$${parseFloat(g.targetAmount).toFixed(2)}`;
      } else {
        if (goalNameEl) goalNameEl.textContent = 'No upcoming goals';
        if (goalDaysEl) goalDaysEl.textContent = '—';
        if (goalRemainingEl) goalRemainingEl.textContent = '';
        if (goalSavedEl) goalSavedEl.textContent = '—';
        if (goalTargetEl) goalTargetEl.textContent = '—';
      }
    }
  } catch (e) { console.error('Goals fetch failed', e); }
})();
