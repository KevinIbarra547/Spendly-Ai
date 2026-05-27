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
      link.classList.add('text-white', 'bg-indigo-600');
    }
  });
})();
