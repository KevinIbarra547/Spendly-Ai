let originalData = {};
let selectedFile = null;

async function init() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = 'index.html';
      return;
    }
    const user = await res.json();
    originalData = { ...user };

    populateSidebar(user);
    populateForm(user);
    highlightNav();
  } catch (err) {
    window.location.href = '/';
  }
}

function populateSidebar(user) {
  const avatarEl = document.getElementById('sidebar-avatar');
  const initialsEl = document.getElementById('sidebar-initials');
  const usernameEl = document.getElementById('sidebar-username');
  if (usernameEl) usernameEl.textContent = user.username;

  const isDefaultPfp = !user.pfp || user.pfp === '/uploads/pfps/default.png';
  if (avatarEl && initialsEl) {
    if (!isDefaultPfp) {
      avatarEl.innerHTML = `<img src="${user.pfp}" class="w-full h-full object-cover" alt="">`;
    } else {
      initialsEl.textContent = user.username.slice(0, 2).toUpperCase();
    }
  }
}

function highlightNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === currentPage) {
      link.classList.remove('text-zinc-400', 'hover:text-white', 'hover:bg-zinc-800');
      link.classList.add('text-white', 'bg-indigo-500');
    }
  });
}

function populateForm(user) {
  document.getElementById('field-username').value = user.username || '';
  document.getElementById('field-email').value = user.email || '';
  document.getElementById('field-schoolName').value = user.schoolName || '';
  document.getElementById('field-graduationYear').value = user.graduationYear || '';
  document.getElementById('field-monthlyBudgetCap').value = user.monthlyBudgetCap || '';
  document.getElementById('field-studentStatus').value = user.studentStatus || 'Freshman';
  document.getElementById('field-primaryFinancialGoal').value = user.primaryFinancialGoal || '';

  document.getElementById('header-username').textContent = user.username;
  document.getElementById('header-email').textContent = user.email;

  const pfpPreview = document.getElementById('pfp-preview');
  const pfpInitials = document.getElementById('pfp-initials');
  const isDefaultPfp = !user.pfp || user.pfp === '/uploads/pfps/default.png';
  if (!isDefaultPfp) {
    pfpPreview.innerHTML = `<img src="${user.pfp}" class="w-full h-full object-cover" alt="">`;
  } else {
    pfpInitials.textContent = user.username.slice(0, 2).toUpperCase();
  }
}

function showStatus(message, isError) {
  const el = document.getElementById('status-message');
  el.textContent = message;
  el.className = isError
    ? 'mb-6 p-4 rounded-xl text-sm font-medium bg-red-900/50 text-red-300 border border-red-700'
    : 'mb-6 p-4 rounded-xl text-sm font-medium bg-green-900/50 text-green-300 border border-green-700';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

document.getElementById('pfp-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const pfpPreview = document.getElementById('pfp-preview');
    pfpPreview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover" alt="">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('save-btn').addEventListener('click', async () => {
  const username = document.getElementById('field-username').value.trim();
  const email = document.getElementById('field-email').value.trim();
  const schoolName = document.getElementById('field-schoolName').value.trim();
  const graduationYear = parseInt(document.getElementById('field-graduationYear').value);
  const monthlyBudgetCap = parseFloat(document.getElementById('field-monthlyBudgetCap').value) || 0;
  const studentStatus = document.getElementById('field-studentStatus').value;
  const primaryFinancialGoal = document.getElementById('field-primaryFinancialGoal').value.trim();

  const patch = {};
  if (username !== originalData.username) patch.username = username;
  if (email !== originalData.email) patch.email = email;
  if (schoolName !== originalData.schoolName) patch.schoolName = schoolName;
  if (!isNaN(graduationYear) && graduationYear !== originalData.graduationYear) patch.graduationYear = graduationYear;
  if (monthlyBudgetCap !== originalData.monthlyBudgetCap) patch.monthlyBudgetCap = monthlyBudgetCap;
  if (studentStatus !== originalData.studentStatus) patch.studentStatus = studentStatus;
  if (primaryFinancialGoal !== originalData.primaryFinancialGoal) patch.primaryFinancialGoal = primaryFinancialGoal;
  if (selectedFile) {
    const formData = new FormData();
    formData.append('pfp', selectedFile);
    const uploadRes = await fetch('/api/auth/pfp', {
      method: 'POST',
      body: formData
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
      showStatus(err.error || 'Upload failed', true);
      return;
    }
    const { pfp } = await uploadRes.json();
    patch.pfp = pfp;
  }

  if (Object.keys(patch).length === 0) {
    showStatus('No changes to save.', false);
    return;
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });

    const result = await res.json();
    if (res.ok) {
      originalData = { ...result };
      selectedFile = null;
      populateForm(result);
      populateSidebar(result);
      showStatus('Profile updated successfully!', false);
    } else {
      showStatus(result.error || 'Failed to save changes.', true);
    }
  } catch (err) {
    showStatus('Error: ' + err.message, true);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error('Logout failed', e);
  }
  window.location.href = '/';
});

init();
