// admin.js — admin dashboard logic (CP09).
// Loads the live site config into the controls, then pushes any change
// straight back to the server. A 403 from any admin call kicks the
// visitor back to the dashboard (they aren't an admin).
(async function () {
  const coachToggle = document.getElementById('toggle-coach');
  const scannerToggle = document.getElementById('toggle-scanner');
  const motdInput = document.getElementById('motd-input');
  const saveMotdBtn = document.getElementById('save-motd');
  const motdStatus = document.getElementById('motd-status');

  function bounceIf403(res) {
    if (res.status === 403) {
      window.location.href = '/dashboard.html';
      return true;
    }
    return false;
  }

  async function postConfig(payload) {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (bounceIf403(res)) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  // Load current config into the controls.
  try {
    const res = await fetch('/api/site/config');
    if (res.ok) {
      const config = await res.json();
      if (coachToggle) coachToggle.checked = !!config.aiCoachEnabled;
      if (scannerToggle) scannerToggle.checked = !!config.receiptScannerEnabled;
      if (motdInput) motdInput.value = config.tipOfTheDay || '';
    }
  } catch (err) {
    /* leave defaults in place */
  }

  // Toggles push their state immediately.
  if (coachToggle) {
    coachToggle.addEventListener('change', () => {
      postConfig({ aiCoachEnabled: coachToggle.checked });
    });
  }
  if (scannerToggle) {
    scannerToggle.addEventListener('change', () => {
      postConfig({ receiptScannerEnabled: scannerToggle.checked });
    });
  }

  // Save the message of the day on demand.
  if (saveMotdBtn) {
    saveMotdBtn.addEventListener('click', async () => {
      const updated = await postConfig({ tipOfTheDay: motdInput ? motdInput.value : '' });
      if (updated && motdStatus) {
        motdStatus.textContent = 'Saved!';
        motdStatus.style.display = 'inline';
        setTimeout(() => { motdStatus.style.display = 'none'; }, 2000);
      }
    });
  }
})();
