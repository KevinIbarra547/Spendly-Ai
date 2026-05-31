(async function () {
  // Auth check
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) { window.location.href = '/'; return; }
  } catch (e) { window.location.href = '/'; return; }

  const CAT_BG = {
    Food: 'rgba(249,115,22,0.2)', Transport: 'rgba(59,130,246,0.2)',
    Transportation: 'rgba(59,130,246,0.2)', Entertainment: 'rgba(168,85,247,0.2)',
    Shopping: 'rgba(236,72,153,0.2)', Health: 'rgba(34,197,94,0.2)',
    Coffee: 'rgba(234,179,8,0.2)', Groceries: 'rgba(20,184,166,0.2)',
    Subscriptions: 'rgba(99,102,241,0.2)', Other: 'rgba(113,113,122,0.2)'
  };
  const CAT_FG = {
    Food: '#fdba74', Transport: '#93c5fd', Transportation: '#93c5fd',
    Entertainment: '#d8b4fe', Shopping: '#f9a8d4', Health: '#86efac',
    Coffee: '#fde047', Groceries: '#5eead4',
    Subscriptions: '#a5b4fc', Other: '#a1a1aa'
  };

  function getCatBg(c) { return CAT_BG[c] || CAT_BG.Other; }
  function getCatFg(c) { return CAT_FG[c] || CAT_FG.Other; }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const BADGE_CONF = {
    locked: { bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', text: 'Locked-in' },
    auto:   { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc', text: 'Auto-detected' },
    likely: { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', text: 'Likely recurring' }
  };

  let allData = [];

  function getActive()    { return allData.filter(r => !r.isCancelled); }
  function getCancelled() { return allData.filter(r => r.isCancelled); }

  function calcMonthly() {
    return getActive().reduce((s, r) => s + r.monthlyAmount, 0);
  }

  function renderBadge(confidence) {
    const b = BADGE_CONF[confidence] || BADGE_CONF.likely;
    return `<span style="display:inline-flex;align-items:center;padding:3px 8px;
      border-radius:9999px;font-size:11px;font-weight:600;
      background:${b.bg};color:${b.color}">${b.text}</span>`;
  }

  function renderCancelledBadge() {
    return `<span style="display:inline-flex;align-items:center;padding:3px 8px;
      border-radius:9999px;font-size:11px;font-weight:600;
      background:rgba(34,197,94,0.15);color:#4ade80">Cancelled</span>`;
  }

  function renderIconChip(category) {
    const bg = getCatBg(category);
    const fg = getCatFg(category);
    return `<div style="width:36px;height:36px;border-radius:10px;
      background:${bg};display:flex;align-items:center;
      justify-content:center;flex-shrink:0">
      <svg style="color:${fg}" width="18" height="18" fill="none"
        viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"/>
      </svg>
    </div>`;
  }

  function renderActiveList() {
    const active = getActive();
    const container = document.getElementById('active-list');
    if (!container) return;
    if (active.length === 0) {
      container.innerHTML = '<p style="color:var(--fg3);font-size:13px;' +
        'text-align:center;padding:16px 0">No active subscriptions.</p>';
      return;
    }
    container.innerHTML = active.map((r, idx) => `
      <div>
        <div class="recurring-row">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            ${renderIconChip(r.category)}
            <div style="min-width:0">
              <div style="font-size:14px;font-weight:600;color:var(--fg1)">
                ${escapeHtml(r.merchant)}
              </div>
              <div style="font-size:12px;color:var(--fg3)">
                Seen ${r.monthCount} month${r.monthCount > 1 ? 's' : ''} in a row
              </div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:16px">
            <div style="font-size:16px;font-weight:700;color:var(--fg1);
              font-variant-numeric:tabular-nums">
              $${r.monthlyAmount.toFixed(2)}/mo
            </div>
            <div style="margin-top:4px">${renderBadge(r.confidence)}</div>
          </div>
        </div>
        <div id="action-${idx}" class="action-row">
          <a href="${escapeHtml(r.cancelUrl)}" target="_blank"
            rel="noopener noreferrer" class="cancel-link"
            title="Opens ${escapeHtml(r.merchant)}'s cancellation page in a new tab">
            How to cancel ↗
          </a>
          <button class="mark-btn" onclick="showConfirm(${idx})">
            Mark as cancelled
          </button>
        </div>
        <div id="confirm-${idx}" class="confirm-row" style="display:none">
          <span>Mark <strong>${escapeHtml(r.merchant)}</strong> as cancelled?</span>
          <button class="confirm-yes" onclick="doCancel('${escapeHtml(r.merchant)}',${idx})">
            Yes, cancelled
          </button>
          <button class="confirm-no" onclick="hideConfirm(${idx})">
            Not yet
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderCancelledList() {
    const cancelled = getCancelled();
    const section = document.getElementById('cancelled-section');
    const heading = document.getElementById('cancelled-heading');
    const items   = document.getElementById('cancelled-items');
    if (!section || !heading || !items) return;

    if (cancelled.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    heading.textContent = `Cancelled (${cancelled.length})`;
    items.innerHTML = cancelled.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:12px 0;border-bottom:1px solid var(--border);opacity:0.6">
        <div style="display:flex;align-items:center;gap:12px">
          ${renderIconChip(r.category)}
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--fg1);
              text-decoration:line-through">
              ${escapeHtml(r.merchant)}
            </div>
            <div style="margin-top:4px">${renderCancelledBadge()}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;color:var(--fg3);
            text-decoration:line-through;font-variant-numeric:tabular-nums">
            $${r.monthlyAmount.toFixed(2)}/mo
          </div>
          <button class="mark-btn" style="margin-top:6px;color:var(--accent)"
            onclick="doRestore('${escapeHtml(r.merchant)}')">
            Restore
          </button>
        </div>
      </div>
    `).join('');
  }

  function renderSummary() {
    const active     = getActive();
    const summaryCard = document.getElementById('summary-card');
    const monthlyEl  = document.getElementById('summary-monthly');
    const countEl    = document.getElementById('summary-count');
    const yearlyEl   = document.getElementById('summary-yearly');
    if (!summaryCard) return;

    if (active.length === 0) {
      summaryCard.style.display = 'none';
      return;
    }

    summaryCard.style.display = 'block';
    const monthly = calcMonthly();
    const yearly  = monthly * 12;
    monthlyEl.textContent = '$' + monthly.toFixed(2);
    countEl.textContent   = active.length + ' detected';
    yearlyEl.innerHTML    = `That's <strong style="color:var(--fg1)">` +
      `$${yearly.toFixed(2)}/year</strong> on subscriptions. ` +
      `The Coach can help you decide what to cut.`;
  }

  function renderAll() {
    renderActiveList();
    renderCancelledList();
    renderSummary();

    const active = getActive();
    document.getElementById('active-section').style.display =
      active.length > 0 ? 'block' : 'none';
    document.getElementById('empty-state').style.display =
      allData.length === 0 ? 'block' : 'none';
  }

  // Global functions needed by inline onclick handlers
  window.showConfirm = function (idx) {
    document.getElementById('action-' + idx).style.display = 'none';
    document.getElementById('confirm-' + idx).style.display = 'flex';
  };

  window.hideConfirm = function (idx) {
    document.getElementById('action-' + idx).style.display = 'flex';
    document.getElementById('confirm-' + idx).style.display = 'none';
  };

  window.doCancel = async function (merchant, idx) {
    try {
      await fetch('/api/expenses/recurring/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchant })
      });
      const item = allData.find(r =>
        r.merchant.toLowerCase() === merchant.toLowerCase()
      );
      if (item) item.isCancelled = true;
      renderAll();
    } catch (e) {
      console.error('Cancel failed:', e);
    }
  };

  window.doRestore = async function (merchant) {
    try {
      await fetch('/api/expenses/recurring/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ merchant })
      });
      const item = allData.find(r =>
        r.merchant.toLowerCase() === merchant.toLowerCase()
      );
      if (item) item.isCancelled = false;
      renderAll();
    } catch (e) {
      console.error('Restore failed:', e);
    }
  };

  window.toggleCancelled = function () {
    const list  = document.getElementById('cancelled-list');
    const arrow = document.getElementById('cancelled-arrow');
    const isHidden = list.style.display === 'none';
    list.style.display  = isHidden ? 'block' : 'none';
    arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
  };

  window.goToCoach = function () {
    localStorage.setItem('coach-prefill',
      'Which of my subscriptions should I cancel to save money?');
    window.location.href = '/coach.html';
  };

  // Fetch and render
  try {
    const res = await fetch('/api/expenses/recurring', { credentials: 'include' });
    document.getElementById('loading-state').style.display = 'none';
    if (res.ok) {
      allData = await res.json();
      renderAll();
    } else {
      document.getElementById('empty-state').style.display = 'block';
    }
  } catch (e) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    console.error('Failed to load recurring data:', e);
  }
})();
