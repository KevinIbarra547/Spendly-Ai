// Expense Log — full CRUD wired to /api/expenses

const listEl = document.getElementById('expense-list');
const errorBanner = document.getElementById('error-banner');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');

const modal = document.getElementById('expense-modal');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('expense-form');
const idField = document.getElementById('expense-id');
const amountField = document.getElementById('field-amount');
const merchantField = document.getElementById('field-merchant');
const dateField = document.getElementById('field-date');
const categoryField = document.getElementById('field-category');
const notesField = document.getElementById('field-notes');

let expenses = [];
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

function todayStr() {
  return new Date().toISOString().split('T')[0];
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

async function loadExpenses() {
  listEl.innerHTML = '<p class="text-slate-400 text-center py-10">Loading…</p>';
  try {
    const res = await fetch('/api/expenses', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) throw new Error('Failed to load expenses');
    expenses = await res.json();
    render();
  } catch (err) {
    listEl.innerHTML = '';
    showError(err.message);
  }
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;

  let filtered = expenses.filter((e) => {
    const matchesTerm = !term
      || (e.merchant && e.merchant.toLowerCase().includes(term))
      || (e.notes && e.notes.toLowerCase().includes(term));
    const matchesCat = !cat || e.category === cat;
    return matchesTerm && matchesCat;
  });

  if (expenses.length === 0) {
    listEl.innerHTML = '<p class="text-slate-400 text-center py-10">No expenses yet. Add your first one!</p>';
    return;
  }
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="text-slate-400 text-center py-10">No expenses match your filters.</p>';
    return;
  }

  filtered = filtered.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

  listEl.innerHTML = filtered.map((e) => `
    <div class="bg-slate-800 rounded-2xl p-4 mb-3 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-white font-semibold">${escapeHtml(e.merchant)}</span>
          <span class="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">${escapeHtml(e.category)}</span>
        </div>
        <div class="text-slate-400 text-sm mt-1">${escapeHtml(e.date)}</div>
        ${e.notes ? `<div class="text-slate-400 text-sm mt-1">${escapeHtml(e.notes)}</div>` : ''}
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <span class="text-white font-bold">$${Number(e.amount).toFixed(2)}</span>
        <button data-edit="${escapeHtml(e.id)}" class="text-slate-400 hover:text-white" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button data-delete="${escapeHtml(e.id)}" class="text-slate-400 hover:text-red-400" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(btn.dataset.edit));
  });
  listEl.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteExpense(btn.dataset.delete));
  });
}

function openAdd() {
  modalTitle.textContent = 'Add Expense';
  idField.value = '';
  amountField.value = '';
  merchantField.value = '';
  dateField.value = todayStr();
  categoryField.value = 'Food';
  notesField.value = '';
  modal.classList.remove('hidden');
}

function openEdit(id) {
  const e = expenses.find((x) => x.id === id);
  if (!e) return;
  modalTitle.textContent = 'Edit Expense';
  idField.value = e.id;
  amountField.value = e.amount;
  merchantField.value = e.merchant;
  dateField.value = e.date;
  categoryField.value = e.category;
  notesField.value = e.notes || '';
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

async function submitForm(ev) {
  ev.preventDefault();
  const payload = {
    amount: parseFloat(amountField.value),
    merchant: merchantField.value.trim(),
    date: dateField.value,
    category: categoryField.value,
    notes: notesField.value.trim(),
  };
  const id = idField.value;
  const url = id ? `/api/expenses/${id}` : '/api/expenses';
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
      throw new Error(err.error || 'Failed to save expense');
    }
    closeModal();
    await loadExpenses();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteExpense(id) {
  if (!window.confirm('Delete this expense?')) return;
  try {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.status === 401) {
      window.location.href = 'index.html';
      return;
    }
    if (!res.ok) throw new Error('Failed to delete expense');
    await loadExpenses();
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById('add-expense-btn').addEventListener('click', openAdd);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
form.addEventListener('submit', submitForm);
searchInput.addEventListener('input', render);
categoryFilter.addEventListener('change', render);

populateSidebar();
loadExpenses();
