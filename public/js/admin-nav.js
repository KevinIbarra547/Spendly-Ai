// admin-nav.js — hides the Admin Dashboard sidebar link from non-admins.
// Runs on every page that has a sidebar. The backend admin routes are
// independently protected by requireAdmin, so this is purely cosmetic —
// but non-admins should never see the link under any circumstance.
(async function () {
  function hideAdminLink() {
    const link = document.getElementById('admin-nav-link');
    if (link) link.style.display = 'none';
  }

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      hideAdminLink();
      return;
    }
    const user = await res.json();
    if (!user || user.isAdmin !== true) {
      hideAdminLink();
    }
    // isAdmin === true: leave the link visible.
  } catch (err) {
    hideAdminLink();
  }
})();
