(async function () {

  // Auth check
  let user;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) { window.location.href = '/'; return; }
    user = await res.json();
  } catch (e) { window.location.href = '/'; return; }

  // Cached child dashboard data — used by doSubmitAllocation to find allowanceId
  let _childData = null;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmt(n) {
    return '$' + Number(n || 0).toFixed(2);
  }

  function showView(id) {
    ['view-setup', 'view-parent', 'view-child'].forEach(v => {
      const el = document.getElementById(v);
      if (el) el.style.display = v === id ? 'block' : 'none';
    });
  }

  // Grade color helpers
  const GRADE_COLOR = { A: '#4ade80', B: '#60a5fa', C: '#fbbf24', D: '#f87171', F: '#f87171' };
  const GRADE_BG    = {
    A: 'rgba(34,197,94,0.15)', B: 'rgba(59,130,246,0.15)',
    C: 'rgba(245,158,11,0.15)', D: 'rgba(239,68,68,0.15)', F: 'rgba(239,68,68,0.15)'
  };

  // ── ROUTE TO CORRECT VIEW ──────────────────────────────────────────────────

  async function init() {
    // Users without the new role field land in setup
    if (!user.role || !user.familyId) {
      showView('view-setup');
      return;
    }

    if (user.role === 'parent') {
      showView('view-parent');
      await loadParentDashboard();
    } else if (user.role === 'child') {
      showView('view-child');
      await loadChildView();
    } else {
      showView('view-setup');
    }
  }

  // ── PARENT DASHBOARD ──────────────────────────────────────────────────────

  async function loadParentDashboard() {
    try {
      const [groupRes, membersRes] = await Promise.all([
        fetch('/api/family/group',   { credentials: 'include' }),
        fetch('/api/family/members', { credentials: 'include' })
      ]);
      if (!groupRes.ok) { showView('view-setup'); return; }

      const family   = await groupRes.json();
      const children = membersRes.ok ? await membersRes.json() : [];

      // Store invite code in the hidden span so the invite modal can read it
      const inviteCodeEl = document.getElementById('invite-code-display');
      if (inviteCodeEl) inviteCodeEl.textContent = family.inviteCode || '';

      renderParentDashboard({
        groupName:  family.name || user.username + "'s Family",
        inviteCode: family.inviteCode || '',
        children
      });
    } catch (e) {
      showView('view-setup');
    }
  }

  function renderParentDashboard(data) {
    const groupNameEl = document.getElementById('group-name-display');
    const grid        = document.getElementById('children-grid');
    if (groupNameEl) groupNameEl.textContent = data.groupName;
    if (!grid) return;

    if (!data.children || data.children.length === 0) {
      grid.innerHTML = `
        <div class="card" style="text-align:center;padding:48px 24px">
          <p style="font-size:14px;color:var(--fg3);margin-bottom:16px">
            No children linked yet. Share your invite code to get started.
          </p>
          <div style="background:var(--bg-elevated);border:1px solid var(--border);
            border-radius:8px;padding:12px 20px;display:inline-block;
            font-size:20px;font-weight:700;letter-spacing:0.2em;
            color:var(--fg1);cursor:pointer"
            onclick="navigator.clipboard.writeText('${escapeHtml(data.inviteCode)}');
              this.textContent='Copied!';
              setTimeout(()=>{this.textContent='${escapeHtml(data.inviteCode)}'},2000)">
            ${escapeHtml(data.inviteCode || '------')}
          </div>
          <p style="font-size:12px;margin-top:8px;color:var(--fg3)">Click to copy invite code</p>
        </div>`;
      return;
    }

    grid.innerHTML = data.children.map(child => {
      const isPending = (child.pendingAllowance || 0) > 0;

      // Allocation bars — backend stores cumulative dollar amounts; derive percentages
      const alloc = child.allocations || { savingsGoal: 0, food: 0, freeSpending: 0 };
      const totalAlloc = (alloc.savingsGoal || 0) + (alloc.food || 0) + (alloc.freeSpending || 0);
      const savePct  = totalAlloc > 0 ? Math.round((alloc.savingsGoal || 0) / totalAlloc * 100) : 0;
      const spendPct = totalAlloc > 0 ? Math.round((alloc.food        || 0) / totalAlloc * 100) : 0;
      const givePct  = totalAlloc > 0 ? Math.round((alloc.freeSpending|| 0) / totalAlloc * 100) : 0;

      const grade     = child.recentGrade;
      const gradeColor = GRADE_COLOR[grade] || '#a1a1aa';
      const gradeBg   = GRADE_BG[grade]    || 'rgba(113,113,122,0.15)';

      // First savings goal (if any)
      const goal    = child.savingsGoals && child.savingsGoals[0];
      const goalPct = goal
        ? Math.min(100, Math.round((Number(goal.currentSaved) / Number(goal.targetAmount)) * 100))
        : 0;

      return `
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:50%;
              background:rgba(99,102,241,0.2);display:flex;align-items:center;
              justify-content:center;font-size:16px;font-weight:700;
              color:#a5b4fc;flex-shrink:0">
              ${escapeHtml((child.username || '?').slice(0, 2).toUpperCase())}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:16px;font-weight:700;color:var(--fg1)">
                ${escapeHtml(child.username)}
              </div>
              ${child.recentAllowance
                ? `<div style="font-size:12px;color:var(--fg3)">
                    Last allowance ${fmt(child.recentAllowance.amount)}
                    on ${new Date(child.recentAllowance.receivedAt).toLocaleDateString()}
                   </div>`
                : ''}
            </div>
            ${isPending
              ? `<span class="badge badge-amber">Pending</span>`
              : `<span class="badge badge-green">Allocated</span>`
            }
          </div>

          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;
              font-size:11px;color:var(--fg3);margin-bottom:6px">
              <span>Allocation</span>
              ${grade
                ? `<span style="padding:2px 8px;border-radius:9999px;font-size:11px;
                    font-weight:700;background:${gradeBg};color:${gradeColor}">
                    Grade ${escapeHtml(grade)}</span>`
                : `<span style="padding:2px 8px;border-radius:9999px;font-size:11px;
                    background:rgba(113,113,122,0.15);color:#a1a1aa">No grade yet</span>`
              }
            </div>
            <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--bg-elevated)">
              <div style="width:${savePct}%;background:#22c55e"></div>
              <div style="width:${spendPct}%;background:#6366f1"></div>
              <div style="width:${givePct}%;background:#a855f7"></div>
            </div>
            <div style="display:flex;justify-content:space-between;
              font-size:11px;color:var(--fg3);margin-top:4px">
              <span>Save ${savePct}%</span>
              <span>Food ${spendPct}%</span>
              <span>Free ${givePct}%</span>
            </div>
          </div>

          ${goal
            ? `<div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;
                  font-size:11px;color:var(--fg3);margin-bottom:4px">
                  <span>${escapeHtml(goal.title)}</span>
                  <span>${goalPct}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill-green" style="width:${goalPct}%"></div>
                </div>
               </div>`
            : `<div style="font-size:12px;color:var(--fg3);margin-bottom:14px">No savings goal set</div>`
          }

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn-primary" style="font-size:12px;padding:7px 12px"
              onclick="openAllowanceModal('${escapeHtml(child.id)}','${escapeHtml(child.username)}')">
              Send allowance
            </button>
            <button class="btn-ghost" style="font-size:12px;padding:7px 12px"
              onclick="openNoteModal('${escapeHtml(child.id)}','${escapeHtml(child.username)}')">
              Leave a note
            </button>
            <button class="btn-ghost" style="font-size:12px;padding:7px 12px"
              onclick="openChildViewModal('${escapeHtml(child.id)}')">
              View dashboard
            </button>
          </div>
        </div>`;
    }).join('');
  }

  // ── CHILD VIEW ────────────────────────────────────────────────────────────

  async function loadChildView() {
    try {
      const res = await fetch('/api/family/dashboard', { credentials: 'include' });
      if (!res.ok) { showView('view-setup'); return; }
      const data = await res.json();
      _childData = data;
      renderChildView(data);
    } catch (e) {
      showView('view-setup');
    }
  }

  function applyGradeUI(grade, feedback) {
    const gradeEl      = document.getElementById('grade-section');
    const letterEl     = document.getElementById('grade-letter');
    const feedbackEl   = document.getElementById('grade-feedback');
    const warningEl    = document.getElementById('grade-warning');
    const successEl    = document.getElementById('grade-success');
    const submitBtn    = document.getElementById('submit-allocation-btn');

    if (!gradeEl) return;
    gradeEl.style.display = 'block';

    if (letterEl) {
      letterEl.textContent      = grade;
      letterEl.style.background = GRADE_BG[grade]    || 'rgba(113,113,122,0.15)';
      letterEl.style.color      = GRADE_COLOR[grade] || '#a1a1aa';
    }
    if (feedbackEl) feedbackEl.textContent = feedback || '';

    const isBad = ['C', 'D', 'F'].includes(grade);
    if (warningEl) warningEl.style.display = isBad ? 'block' : 'none';
    if (successEl) successEl.style.display = isBad ? 'none'  : 'block';
    if (submitBtn) submitBtn.disabled      = !isBad;
  }

  function renderChildView(data) {
    // Pending allowance banner
    const bannerEl  = document.getElementById('pending-banner');
    const amountEl  = document.getElementById('pending-amount');
    if (bannerEl) {
      const hasPending = (data.pendingAllowance || 0) > 0;
      bannerEl.style.display = hasPending ? 'block' : 'none';
      if (amountEl) amountEl.textContent = fmt(data.pendingAllowance);
    }

    // Seed slider allowance amount for dollar display
    const saveSlider = document.getElementById('slider-save');
    if (saveSlider && data.pendingAllowance > 0) {
      saveSlider.dataset.allowance = data.pendingAllowance;
    }

    // Set saved allocation as slider defaults if already allocated
    const latestAllocated = (data.allowanceHistory || [])
      .slice().reverse()
      .find(e => e.allocatedAt !== null);

    if (latestAllocated && latestAllocated.allocation) {
      // Convert dollar amounts back to rough percentages
      const a = latestAllocated.allocation;
      const total = (a.savingsGoal || 0) + (a.food || 0) + (a.freeSpending || 0);
      if (total > 0) {
        const s = document.getElementById('slider-save');
        const sp = document.getElementById('slider-spend');
        const g = document.getElementById('slider-give');
        if (s) s.value = Math.round((a.savingsGoal  || 0) / total * 100);
        if (sp) sp.value = Math.round((a.food       || 0) / total * 100);
        if (g) g.value  = Math.round((a.freeSpending|| 0) / total * 100);
      }
    }
    updateSliderDisplay();

    // Grade section — from latest allocated entry
    if (latestAllocated && latestAllocated.grade) {
      applyGradeUI(latestAllocated.grade, latestAllocated.gradeFeedback);
    }

    // Parent note
    const noteEl     = document.getElementById('parent-note');
    const noteTextEl = document.getElementById('note-text');
    if (noteEl && data.familyNote) {
      noteEl.style.display = 'block';
      if (noteTextEl) noteTextEl.textContent = data.familyNote.message || '';
    }

    // Clear any stale AI suggestion banner from a previous render
    const stale = document.getElementById('ai-suggestion-banner');
    if (stale) stale.remove();

    // Only fetch an AI suggestion when there's something to allocate.
    // Skipping when pendingAllowance === 0 also preserves the dataset.locked
    // state on the submit button after a confirmed A/B grade.
    if ((data.pendingAllowance || 0) > 0) {
      fetchAISuggestion();
    }
  }

  async function fetchAISuggestion() {
    const submitBtn = document.getElementById('submit-allocation-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Getting AI suggestion…';
      submitBtn.disabled    = true;
    }

    try {
      const res = await fetch('/api/ai/suggest-allocation', { credentials: 'include' });
      if (!res.ok) throw new Error('Suggestion failed');
      const suggestion = await res.json();

      const saveSlider  = document.getElementById('slider-save');
      const spendSlider = document.getElementById('slider-spend');
      const giveSlider  = document.getElementById('slider-give');
      if (saveSlider && spendSlider && giveSlider) {
        saveSlider.value  = suggestion.save;
        spendSlider.value = suggestion.spend;
        giveSlider.value  = suggestion.give;
        updateSliderDisplay();
      }

      const allocationSection = document.getElementById('allocation-section');
      if (allocationSection && suggestion.reasoning) {
        const existing = document.getElementById('ai-suggestion-banner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'ai-suggestion-banner';
        banner.style.cssText =
          'background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);' +
          'border-radius:10px;padding:12px 14px;font-size:12px;color:#a5b4fc;' +
          'margin-bottom:16px;display:flex;align-items:flex-start;gap:8px;';
        banner.innerHTML =
          '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" ' +
          'stroke-width="1.5" stroke="currentColor" style="flex-shrink:0;margin-top:1px">' +
          '<path stroke-linecap="round" stroke-linejoin="round" ' +
          'd="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 ' +
          '12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 ' +
          '0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"/>' +
          '</svg>' +
          '<span><strong>Buddy suggests:</strong> ' + escapeHtml(suggestion.reasoning) +
          ' Feel free to adjust the sliders.</span>';
        allocationSection.insertBefore(banner, allocationSection.firstChild);
      }

      if (submitBtn) {
        submitBtn.textContent = 'Submit allocation →';
        submitBtn.disabled    = false;
      }
    } catch (err) {
      console.error('AI suggestion failed:', err);
      if (submitBtn) {
        submitBtn.textContent = 'Submit allocation →';
        submitBtn.disabled    = false;
      }
    }
  }

  // Slider total logic — keeps running dollar totals and validates 100%
  window.updateSliderDisplay = function () {
    const saveSlider  = document.getElementById('slider-save');
    const spendSlider = document.getElementById('slider-spend');
    const giveSlider  = document.getElementById('slider-give');
    if (!saveSlider || !spendSlider || !giveSlider) return;

    const save  = parseInt(saveSlider.value)  || 0;
    const spend = parseInt(spendSlider.value) || 0;
    const give  = parseInt(giveSlider.value)  || 0;
    const total = save + spend + give;

    const totalEl  = document.getElementById('slider-total');
    const submitBtn = document.getElementById('submit-allocation-btn');
    const saveAmt  = document.getElementById('save-amount');
    const spendAmt = document.getElementById('spend-amount');
    const giveAmt  = document.getElementById('give-amount');
    const savePct  = document.getElementById('save-pct');
    const spendPct = document.getElementById('spend-pct');
    const givePct  = document.getElementById('give-pct');

    if (totalEl) {
      totalEl.textContent = 'Total: ' + total + '%';
      totalEl.style.color = total === 100 ? '#4ade80' : '#f87171';
    }
    // Only enable submit if total is 100% AND no "confirmed" A/B grade blocking resubmit
    if (submitBtn && !submitBtn.dataset.locked) {
      submitBtn.disabled = total !== 100;
    }

    const allowance = parseFloat(saveSlider.dataset.allowance || '0');
    if (saveAmt)  saveAmt.textContent  = fmt(allowance * save  / 100);
    if (spendAmt) spendAmt.textContent = fmt(allowance * spend / 100);
    if (giveAmt)  giveAmt.textContent  = fmt(allowance * give  / 100);

    if (savePct)  savePct.textContent  = save  + '%';
    if (spendPct) spendPct.textContent = spend + '%';
    if (givePct)  givePct.textContent  = give  + '%';
  };

  window.doSubmitAllocation = async function () {
    const save  = parseInt(document.getElementById('slider-save').value)  || 0;
    const spend = parseInt(document.getElementById('slider-spend').value) || 0;
    const give  = parseInt(document.getElementById('slider-give').value)  || 0;

    if (save + spend + give !== 100) return;

    // Find the latest unallocated allowance entry for its ID
    const history      = _childData?.allowanceHistory || [];
    const pendingEntry = history.slice().reverse().find(e => !e.allocatedAt);
    if (!pendingEntry) {
      alert('No pending allowance to allocate.');
      return;
    }

    const submitBtn = document.getElementById('submit-allocation-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Grading your split…';
      submitBtn.disabled    = true;
    }

    try {
      const res = await fetch('/api/family/allocate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          savingsGoal:  save,
          food:         spend,
          freeSpending: give,
          allowanceId:  pendingEntry.id
        })
      });

      if (res.ok) {
        const result = await res.json();
        applyGradeUI(result.grade, result.feedback);

        const isBad = ['C', 'D', 'F'].includes(result.grade);
        if (submitBtn) {
          submitBtn.textContent = isBad ? 'Adjust and resubmit →' : 'Submitted ✓';
        }

        if (result.passed) {
          if (_childData) _childData.pendingAllowance = result.pendingAllowance || 0;
          const bannerEl = document.getElementById('pending-banner');
          if (bannerEl) bannerEl.style.display = 'none';
          if (submitBtn) submitBtn.dataset.locked = 'true';
        }

        setTimeout(() => {
          const gradeEl = document.getElementById('grade-section');
          if (gradeEl) gradeEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        if (submitBtn) {
          submitBtn.textContent = 'Submit allocation →';
          submitBtn.disabled    = false;
        }
        const err = await res.json();
        alert(err.error || 'Submission failed');
      }
    } catch (e) {
      if (submitBtn) {
        submitBtn.textContent = 'Submit allocation →';
        submitBtn.disabled    = false;
      }
      alert('Network error');
    }
  };

  // ── SETUP VIEW ────────────────────────────────────────────────────────────

  window.showCreateGroup = function () {
    document.getElementById('create-group-panel').style.display = 'block';
    document.getElementById('join-group-panel').style.display   = 'none';
  };

  window.showJoinGroup = function () {
    document.getElementById('join-group-panel').style.display   = 'block';
    document.getElementById('create-group-panel').style.display = 'none';
  };

  window.doCreateGroup = async function () {
    const name = document.getElementById('group-name-input')?.value.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/family/group', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const fresh = await fetch('/api/auth/me', { credentials: 'include' });
        if (fresh.ok) user = await fresh.json();
        init();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create group');
      }
    } catch (e) { alert('Network error'); }
  };

  window.doJoinGroup = async function () {
    const code    = document.getElementById('invite-code-input').value.trim().toUpperCase();
    const errorEl = document.getElementById('join-error');
    if (!code) return;
    errorEl.style.display = 'none';
    try {
      const res = await fetch('/api/family/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });
      if (res.ok) {
        const fresh = await fetch('/api/auth/me', { credentials: 'include' });
        if (fresh.ok) user = await fresh.json();
        init();
      } else {
        const err = await res.json();
        errorEl.textContent   = err.error || 'Invalid invite code';
        errorEl.style.display = 'block';
      }
    } catch (e) {
      errorEl.textContent   = 'Network error';
      errorEl.style.display = 'block';
    }
  };

  // ── MODALS ────────────────────────────────────────────────────────────────

  window.openAllowanceModal = function (childId, childName) {
    document.getElementById('allowance-child-id').value         = childId;
    document.getElementById('allowance-child-name').textContent = childName;
    document.getElementById('allowance-modal').style.display    = 'flex';
  };

  window.closeAllowanceModal = function () {
    document.getElementById('allowance-modal').style.display = 'none';
    document.getElementById('allowance-amount').value        = '';
  };

  window.doSendAllowance = async function () {
    const childId    = document.getElementById('allowance-child-id').value;
    const amount     = parseFloat(document.getElementById('allowance-amount').value);
    const recurrence = document.getElementById('allowance-type').value;
    if (!amount || amount <= 0) return;
    try {
      const res = await fetch('/api/family/allowance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ childId, amount, recurrence })
      });
      if (res.ok) {
        const sendBtn = document.querySelector('[onclick="doSendAllowance()"]');
        if (sendBtn) sendBtn.textContent = 'Sent! ✓';
        setTimeout(async () => {
          if (sendBtn) sendBtn.textContent = 'Send →';
          closeAllowanceModal();
          await loadParentDashboard();
        }, 800);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send allowance');
      }
    } catch (e) { alert('Network error'); }
  };

  window.openNoteModal = function (childId, childName) {
    document.getElementById('note-child-id').value         = childId;
    document.getElementById('note-child-name').textContent = childName;
    document.getElementById('note-input').value            = '';
    document.getElementById('note-modal').style.display    = 'flex';
  };

  window.closeNoteModal = function () {
    document.getElementById('note-modal').style.display = 'none';
  };

  window.doSaveNote = async function () {
    const childId = document.getElementById('note-child-id').value;
    const message = document.getElementById('note-input').value.trim();
    if (!message) return;
    try {
      const res = await fetch('/api/family/note', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ childId, message })
      });
      if (res.ok) {
        closeNoteModal();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save note');
      }
    } catch (e) { alert('Network error'); }
  };

  window.openChildViewModal = function (childId) {
    document.getElementById('child-view-modal').style.display = 'flex';
    document.getElementById('child-view-frame').src =
      '/family-child-readonly.html?childId=' + childId;
  };

  window.closeChildViewModal = function () {
    document.getElementById('child-view-modal').style.display = 'none';
    document.getElementById('child-view-frame').src = '';
  };

  window.showInviteModal = function () {
    const code        = document.getElementById('invite-code-display').textContent.trim();
    const displayEl   = document.getElementById('invite-code-modal-display');
    if (displayEl) displayEl.textContent = code;
    document.getElementById('invite-modal').style.display = 'flex';
  };

  window.closeInviteModal = function () {
    document.getElementById('invite-modal').style.display = 'none';
  };

  init();

})();
