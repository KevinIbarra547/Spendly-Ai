const CHART_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

function fmt(n) {
  return '$' + Number(n).toFixed(2);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showEmpty(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideCanvas(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function renderCategoryChart(expenses) {
  if (!expenses.length) {
    showEmpty('category-empty');
    hideCanvas('categoryChart');
    return;
  }

  const totals = {};
  expenses.forEach(exp => {
    const cat = exp.category || 'Other';
    totals[cat] = (totals[cat] || 0) + Number(exp.amount);
  });

  const labels = Object.keys(totals);
  const data = labels.map(l => totals[l]);

  new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#1e293b',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            padding: 14,
            font: { size: 12 },
            boxWidth: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

function renderTrendChart(expenses) {
  if (!expenses.length) {
    showEmpty('trend-empty');
    hideCanvas('trendChart');
    return;
  }

  const daily = {};
  expenses.forEach(exp => {
    const d = (exp.date || '').slice(0, 10);
    if (d) daily[d] = (daily[d] || 0) + Number(exp.amount);
  });

  const dates = Object.keys(daily).sort();
  if (!dates.length) {
    showEmpty('trend-empty');
    hideCanvas('trendChart');
    return;
  }

  new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Spending',
        data: dates.map(d => daily[d]),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 8, font: { size: 11 } },
          grid: { color: '#1e293b' },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => fmt(v),
          },
          grid: { color: '#1e293b' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}

function renderWeeklyChart(expenses) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));

  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

  let thisWeek = 0;
  let lastWeek = 0;

  expenses.forEach(exp => {
    const d = new Date((exp.date || '').slice(0, 10) + 'T00:00:00');
    if (d >= startOfWeek) {
      thisWeek += Number(exp.amount);
    } else if (d >= startOfPrevWeek) {
      lastWeek += Number(exp.amount);
    }
  });

  if (thisWeek === 0 && lastWeek === 0) {
    showEmpty('weekly-empty');
    hideCanvas('weeklyChart');
    return;
  }

  document.getElementById('weekly-stats').classList.remove('hidden');
  document.getElementById('weekly-stats').classList.add('grid');
  document.getElementById('last-week-total').textContent = fmt(lastWeek);
  document.getElementById('this-week-total').textContent = fmt(thisWeek);

  const diff = thisWeek - lastWeek;
  const weekTotalEl = document.getElementById('this-week-total');
  if (lastWeek > 0) {
    weekTotalEl.classList.add(diff > 0 ? 'text-red-400' : 'text-green-400');
    weekTotalEl.classList.remove('text-white');
  }

  new Chart(document.getElementById('weeklyChart'), {
    type: 'bar',
    data: {
      labels: ['Last Week', 'This Week'],
      datasets: [{
        data: [lastWeek, thisWeek],
        backgroundColor: ['#334155', '#6366f1'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 12 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => fmt(v),
          },
          grid: { color: '#1e293b' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}

function renderGoalProgress(goals) {
  const emptyEl = document.getElementById('goals-empty');
  const listEl = document.getElementById('goals-list');

  if (!goals.length) {
    emptyEl.classList.remove('hidden');
    return;
  }

  goals.forEach(goal => {
    const target = Number(goal.targetAmount) || 0;
    const saved = Number(goal.currentSaved) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

    const deadlineText = goal.deadline
      ? new Date(goal.deadline.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

    const barColor = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-indigo-400';

    const card = document.createElement('div');
    card.className = 'bg-zinc-900 rounded-2xl p-5 border border-zinc-800';
    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-white font-semibold text-sm leading-tight">${escapeHtml(goal.title)}</h3>
        <span class="text-xs font-bold ml-3 flex-shrink-0 ${pct >= 100 ? 'text-green-400' : 'text-indigo-400'}">${pct}%</span>
      </div>
      <div class="w-full bg-zinc-800 rounded-full h-2 mb-3">
        <div class="${barColor} h-2 rounded-full" style="width:${pct}%"></div>
      </div>
      <div class="flex justify-between text-xs text-zinc-400">
        <span>${fmt(saved)} saved</span>
        <span>${fmt(target)} goal</span>
      </div>
      ${deadlineText ? `<p class="mt-2 text-xs text-zinc-500">Deadline: ${deadlineText}</p>` : ''}
      ${pct >= 100 ? '<p class="mt-2 text-xs font-medium text-green-400">Goal reached!</p>' : ''}
    `;
    listEl.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  try {
    const authRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (authRes.status === 401) {
      window.location.href = 'index.html';
      return;
    }
  } catch {
    window.location.href = 'index.html';
    return;
  }

  // Dark theme defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = '#334155';

  // Fetch data in parallel
  let expenses = [];
  let goals = [];

  try {
    const [expRes, goalRes] = await Promise.all([
      fetch('/api/expenses', { credentials: 'include' }),
      fetch('/api/expenses/goals', { credentials: 'include' }),
    ]);
    if (expRes.ok) expenses = await expRes.json();
    if (goalRes.ok) goals = await goalRes.json();
  } catch {
    // network error — render empty states below
  }

  renderCategoryChart(expenses);
  renderTrendChart(expenses);
  renderWeeklyChart(expenses);
  renderGoalProgress(goals);
});
