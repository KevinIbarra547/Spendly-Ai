(function () {
  var WALLET_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>';

  var GEAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>';

  var GRID_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>';
  var CASH_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>';
  var STAR_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>';
  var CHAT_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V20.25a.75.75 0 0 0 1.28.53l4.184-4.183a.39.39 0 0 1 .402-.088A48.35 48.35 0 0 0 11.25 17c2.115 0 4.198-.137 6.24-.402 1.608-.209 2.76-1.614 2.76-3.235V8.511Z" /></svg>';
  var CHART_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>';
  var USER_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>';
  var SHIELD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>';
  var RECURRING_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" /></svg>';
  var FAMILY_ICON    = '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>';

  var INACTIVE = 'nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors';
  var ACTIVE   = 'nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 text-white transition-colors';

  function navLink(href, page, icon, label, extraId) {
    var idAttr = extraId ? ' id="' + extraId + '"' : '';
    return '<a href="' + href + '"' + idAttr + ' data-page="' + page + '" class="' + INACTIVE + '">' + icon + '<span>' + label + '</span></a>';
  }

  var container = document.getElementById('sidebar-container');
  if (!container) return;

  container.innerHTML =
    '<aside class="fixed top-0 left-0 h-screen w-64 flex flex-col border-r border-zinc-800 z-40" style="background:var(--bg-sidebar)">' +

      '<div class="p-5 border-b border-zinc-800">' +
        '<a href="index.html" class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">' + WALLET_ICON + '</div>' +
          '<div>' +
            '<div class="text-white font-bold text-lg leading-tight">Spendly</div>' +
            '<div class="text-zinc-500 text-xs leading-tight">your money\'s smarter friend</div>' +
          '</div>' +
        '</a>' +
      '</div>' +

      '<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">' +
        navLink('dashboard.html', 'dashboard.html', GRID_ICON,   'User Dashboard') +
        navLink('expenses.html',  'expenses.html',  CASH_ICON,   'Expense Log') +
        navLink('goals.html',     'goals.html',     STAR_ICON,   'Goals / Wishlist') +
        navLink('coach.html',     'coach.html',     CHAT_ICON,   'AI Coach') +
        navLink('analytics.html', 'analytics.html', CHART_ICON,     'Analytics') +
        navLink('recurring.html', 'recurring.html', RECURRING_ICON, 'Recurring') +
        navLink('family.html',    'family.html',    FAMILY_ICON,    'Family') +
        navLink('profile.html',   'profile.html',   USER_ICON,      'Profile Settings') +
        navLink('admin.html',     'admin.html',     SHIELD_ICON, 'Admin Dashboard', 'admin-nav-link') +
      '</nav>' +

      '<div id="theme-toggle-btn" style="display:flex;align-items:center;background:#27272a;border:1px solid #3f3f46;border-radius:9999px;padding:4px;margin:0 12px 8px;cursor:pointer" onclick="SpendlyTheme.toggle()">' +
        '<div id="theme-opt-light" class="theme-opt" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:9999px;font-size:12px;font-weight:500;color:#71717a;font-family:inherit">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>' +
          'Light' +
        '</div>' +
        '<div id="theme-opt-dark" class="theme-opt selected" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:9999px;font-size:12px;font-weight:500;color:#71717a;font-family:inherit">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>' +
          'Dark' +
        '</div>' +
      '</div>' +

      '<div id="sidebar-user-card" class="p-4 border-t border-zinc-800" style="border-color:var(--border)">' +
        '<div class="flex items-center gap-3">' +
          '<div id="sidebar-avatar" class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">' +
            '<span id="sidebar-initials"></span>' +
          '</div>' +
          '<div class="min-w-0 flex-1">' +
            '<div id="sidebar-username" class="text-white text-sm font-semibold truncate">...</div>' +
            '<div class="text-zinc-500 text-xs">Free plan</div>' +
          '</div>' +
          '<a href="profile.html" class="text-zinc-400 hover:text-white flex-shrink-0" title="Settings">' + GEAR_ICON + '</a>' +
        '</div>' +
      '</div>' +

    '</aside>';

  // Active link highlighting
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(function (link) {
    if (link.dataset.page === currentPage) {
      link.className = ACTIVE;
    }
  });

  // Signal that the sidebar DOM (including #admin-nav-link) is ready
  document.dispatchEvent(new CustomEvent('sidebar:ready'));

  // Populate user card from /api/auth/me
  (async function () {
    try {
      var res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        var card = document.getElementById('sidebar-user-card');
        if (card) card.style.display = 'none';
        return;
      }
      var user = await res.json();
      var usernameEl = document.getElementById('sidebar-username');
      var avatarEl   = document.getElementById('sidebar-avatar');
      var initialsEl = document.getElementById('sidebar-initials');
      if (usernameEl) usernameEl.textContent = user.username;
      if (avatarEl && initialsEl) {
        var isDefaultPfp = !user.pfp || user.pfp === '/uploads/pfps/default.png';
        if (!isDefaultPfp) {
          avatarEl.innerHTML = '<img src="' + user.pfp + '" class="w-full h-full object-cover" alt="">';
        } else {
          initialsEl.textContent = user.username.slice(0, 2).toUpperCase();
        }
      }
      // Hide admin nav link if user isn't admin
      if (!user || user.isAdmin !== true) {
        var adminLink = document.getElementById('admin-nav-link');
        if (adminLink) adminLink.style.display = 'none';
      }
      // Pulsing yellow dot on Family link for child accounts not yet in a family
      if (user && user.role === 'child' && !user.familyId) {
        var styleTag = document.createElement('style');
        styleTag.textContent = '@keyframes pulse-yellow{0%{box-shadow:0 0 0 0 rgba(234,179,8,0.7)}70%{box-shadow:0 0 0 8px rgba(234,179,8,0)}100%{box-shadow:0 0 0 0 rgba(234,179,8,0)}}';
        document.head.appendChild(styleTag);
        var familyLink = document.querySelector('a[data-page="family.html"]');
        if (familyLink) {
          familyLink.style.position = 'relative';
          var dot = document.createElement('span');
          dot.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#eab308;box-shadow:0 0 0 0 rgba(234,179,8,0.7);animation:pulse-yellow 1.5s ease-in-out infinite;';
          familyLink.appendChild(dot);
        }
      }
    } catch (e) {
      var card = document.getElementById('sidebar-user-card');
      if (card) card.style.display = 'none';
    }
  })();
})();

window.SpendlyTheme = {
  init: function() {
    const saved = localStorage.getItem('spendly-theme') || 'dark';
    if (saved === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    SpendlyTheme._updateBtn();
  },
  toggle: function() {
    const isLight = document.documentElement.classList.contains('theme-light');
    if (isLight) {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('spendly-theme', 'dark');
    } else {
      document.documentElement.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('spendly-theme', 'light');
    }
    SpendlyTheme._updateBtn();
  },
  _updateBtn: function() {
    var isLight = document.documentElement.classList.contains('theme-light');
    var lightOpt = document.getElementById('theme-opt-light');
    var darkOpt = document.getElementById('theme-opt-dark');
    var toggleBtn = document.getElementById('theme-toggle-btn');
    if (!lightOpt || !darkOpt) return;
    var activeStyle = 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:9999px;font-size:12px;font-weight:500;font-family:inherit;background:#18181b;color:#f4f1ec;';
    var inactiveStyle = 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 10px;border-radius:9999px;font-size:12px;font-weight:500;font-family:inherit;background:transparent;color:#71717a;';
    if (isLight) {
      lightOpt.style.cssText = activeStyle.replace('#18181b','#ffffff').replace('#f4f1ec','#09090b');
      darkOpt.style.cssText = inactiveStyle;
      if (toggleBtn) { toggleBtn.style.background = '#f4f4f5'; toggleBtn.style.borderColor = '#d4d4d8'; }
    } else {
      lightOpt.style.cssText = inactiveStyle;
      darkOpt.style.cssText = activeStyle;
      if (toggleBtn) { toggleBtn.style.background = '#27272a'; toggleBtn.style.borderColor = '#3f3f46'; }
    }
  }
};
SpendlyTheme.init();
