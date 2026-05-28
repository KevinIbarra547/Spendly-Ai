// Savings Goals — full CRUD wired to /api/expenses/goals

const listEl = document.getElementById('goal-list');
const errorBanner = document.getElementById('error-banner');

const goalModal = document.getElementById('goal-modal');
const goalModalTitle = document.getElementById('goal-modal-title');
const goalForm = document.getElementById('goal-form');
const goalIdField = document.getElementById('goal-id');
const titleField = document.getElementById('field-title');
const targetField = document.getElementById('field-target');
const savedField = document.getElementById('field-saved');
const deadlineField = document.getElementById('field-deadline');

const savingsModal = document.getElementById('savings-modal');
const savingsModalTitle = document.getElementById('savings-modal-title');
const savingsForm = document.getElementById('savings-form');
const savingsGoalIdField = document.getElementById('savings-goal-id');
const addAmountField = document.getElementById('field-add-amount');

const API = '/api/expenses/goals';

let goals = [];
let errorTimer = null;

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => errorBanner.classList.add('hidden'), 4000);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function populateSidebar() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return;
    const user = await res.json();
    document.getElementById('sidebar-username').textContent = user.username;
    const avatarEl = document.getElementById('sidebar-avatar');
    const initialsEl = document.getElementById('sidebar-initials');
    const isDefaultPfp = !user.pfp || user.pfp === '/uploads/pfps/default.png';
    if (!isDefaultPfp) {
      avatarEl.innerHTML = `<img src="${user.pfp}" class="w-full h-full object-cover" alt="">`;
    } else {
      initialsEl.textContent = user.username.slice(0, 2).toUpperCase();
    }
  } catch (e) { /* ignore */ }
}

async function loadGoals() {
  listEl.innerHTML = '<p class="text-slate-400 col-span-full text-center py-10">Loading…</p>';
  try {
    const res = await fetch(API, { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) throw new Error('Failed to load goals');
    goals = await res.json();
    render();
  } catch (err) {
    listEl.innerHTML = '';
    showError(err.message);
  }
}

function render() {
  if (goals.length === 0) {
    listEl.innerHTML = '<p class="text-slate-400 col-span-full text-center py-10">No goals yet. Create your first one!</p>';
    return;
  }

  listEl.innerHTML = goals.map((g) => {
    const target = Number(g.targetAmount) || 0;
    const saved = Number(g.currentSaved) || 0;
    const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
    const reached = saved >= target && target > 0;
    return `
      <div class="bg-slate-800 rounded-2xl p-5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-white font-bold">${escapeHtml(g.title)}</h3>
          ${reached ? '<span class="bg-green-700 text-green-100 text-xs px-2 py-0.5 rounded-full flex-shrink-0">🎉 Goal Reached!</span>' : ''}
        </div>
        <p class="text-slate-400 text-sm mt-1">$${saved.toFixed(2)} of $${target.toFixed(2)}</p>
        <div class="bg-slate-700 rounded-full h-2 mt-3">
          <div class="bg-indigo-500 rounded-full h-2" style="width: ${pct}%"></div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-indigo-400 text-xs font-semibold">${pct.toFixed(0)}%</span>
          ${g.deadline ? `<span class="text-slate-500 text-xs">Due ${escapeHtml(g.deadline)}</span>` : ''}
        </div>
        <div class="flex items-center gap-2 mt-4">
          <button data-savings="${escapeHtml(g.id)}" class="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg">Add Savings</button>
          <button data-edit="${escapeHtml(g.id)}" class="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg">Edit</button>
          <button data-delete="${escapeHtml(g.id)}" class="bg-slate-700 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-savings]').forEach((btn) => {
    btn.addEventListener('click', () => openSavings(btn.dataset.savings));
  });
  listEl.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(btn.dataset.edit));
  });
  listEl.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteGoal(btn.dataset.delete));
  });
}

function openAdd() {
  goalModalTitle.textContent = 'Add Goal';
  goalIdField.value = '';
  titleField.value = '';
  targetField.value = '';
  savedField.value = '';
  deadlineField.value = '';
  goalModal.classList.remove('hidden');
}

function openEdit(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  goalModalTitle.textContent = 'Edit Goal';
  goalIdField.value = g.id;
  titleField.value = g.title;
  targetField.value = g.targetAmount;
  savedField.value = g.currentSaved;
  deadlineField.value = g.deadline || '';
  goalModal.classList.remove('hidden');
}

function closeGoalModal() {
  goalModal.classList.add('hidden');
}

function openSavings(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  savingsModalTitle.textContent = `Add Savings to ${g.title}`;
  savingsGoalIdField.value = g.id;
  addAmountField.value = '';
  savingsModal.classList.remove('hidden');
}

function closeSavingsModal() {
  savingsModal.classList.add('hidden');
}

async function submitGoal(ev) {
  ev.preventDefault();
  const id = goalIdField.value;
  const payload = {
    title: titleField.value.trim(),
    targetAmount: parseFloat(targetField.value),
    currentSaved: savedField.value === '' ? 0 : parseFloat(savedField.value),
    deadline: deadlineField.value,
  };
  const url = id ? `${API}/${id}` : API;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save goal');
    }
    closeGoalModal();
    await loadGoals();
  } catch (err) {
    showError(err.message);
  }
}

async function submitSavings(ev) {
  ev.preventDefault();
  const id = savingsGoalIdField.value;
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  const addAmount = parseFloat(addAmountField.value);
  if (isNaN(addAmount) || addAmount <= 0) {
    showError('Enter a valid amount to add');
    return;
  }
  const newSaved = (Number(g.currentSaved) || 0) + addAmount;

  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentSaved: newSaved }),
      credentials: 'include',
    });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add savings');
    }
    closeSavingsModal();
    await loadGoals();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteGoal(id) {
  if (!window.confirm('Delete this goal?')) return;
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) throw new Error('Failed to delete goal');
    await loadGoals();
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById('add-goal-btn').addEventListener('click', openAdd);
document.getElementById('goal-cancel-btn').addEventListener('click', closeGoalModal);
document.getElementById('savings-cancel-btn').addEventListener('click', closeSavingsModal);
goalModal.addEventListener('click', (e) => { if (e.target === goalModal) closeGoalModal(); });
savingsModal.addEventListener('click', (e) => { if (e.target === savingsModal) closeSavingsModal(); });
goalForm.addEventListener('submit', submitGoal);
savingsForm.addEventListener('submit', submitSavings);

populateSidebar();
loadGoals();
