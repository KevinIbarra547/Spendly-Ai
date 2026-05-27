(async function () {
  const meRes = await fetch('/api/auth/me');
  if (!meRes.ok) {
    document.getElementById('auth-banner').style.display = 'block';
    const dz = document.getElementById('drop-zone');
    dz.style.pointerEvents = 'none';
    dz.style.opacity = '0.5';
    return;
  }

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('preview');
  const scanBtn = document.getElementById('scan-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resultForm = document.getElementById('result-form');
  const saveBtn = document.getElementById('save-btn');
  const rescanBtn = document.getElementById('rescan-btn');
  const status = document.getElementById('status');

  let currentFile = null;

  function showStatus(msg, kind) {
    const classes = {
      error:   'bg-red-50 text-red-700 p-3 rounded mt-4 transition-opacity duration-200 text-sm',
      success: 'bg-green-50 text-green-700 p-3 rounded mt-4 transition-opacity duration-200 text-sm',
      info:    'bg-blue-50 text-blue-700 p-3 rounded mt-4 transition-opacity duration-200 text-sm'
    };
    status.className = classes[kind] || classes.success;
    status.textContent = msg;
    status.style.display = 'block';
    if (kind !== 'info') setTimeout(() => { status.style.display = 'none'; }, 4000);
  }

  function selectFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showStatus('Please choose an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showStatus('Image must be under 5 MB.', 'error');
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('preview-img').src = e.target.result;
      preview.style.display = 'block';
      dropZone.style.display = 'none';
      resultForm.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => selectFile(e.target.files[0]));

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-indigo-50');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-indigo-50');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-indigo-50');
    selectFile(e.dataTransfer.files[0]);
  });

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const MAX = 1280;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (Math.max(img.naturalWidth, img.naturalHeight) <= MAX) {
          resolve(file);
          return;
        }
        const scale = MAX / Math.max(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Canvas resize failed')); return; }
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }

  function reset() {
    currentFile = null;
    fileInput.value = '';
    preview.style.display = 'none';
    resultForm.style.display = 'none';
    dropZone.style.display = 'flex';
  }
  resetBtn.addEventListener('click', reset);
  rescanBtn.addEventListener('click', reset);

  scanBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    try {
      showStatus('Optimizing image…', 'info');
      const blob = await resizeImage(currentFile);
      const formData = new FormData();
      formData.append('receipt', blob, 'receipt.jpg');
      const res = await fetch('/api/ai/scanner', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Scanner failed' }));
        showStatus(err.error || 'Scanner failed', 'error');
        return;
      }
      const data = await res.json();
      document.getElementById('result-amount').value = data.amount;
      document.getElementById('result-merchant').value = data.merchant;
      document.getElementById('result-date').value = data.date;
      document.getElementById('result-category').value = data.category;
      document.getElementById('result-notes').value = 'Scanned receipt';
      preview.style.display = 'none';
      resultForm.style.display = 'block';
      showStatus('Receipt scanned! Review and save.', 'success');
    } catch (err) {
      showStatus('Network error: ' + err.message, 'error');
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan Receipt';
    }
  });

  saveBtn.addEventListener('click', async () => {
    const expense = {
      amount: parseFloat(document.getElementById('result-amount').value),
      merchant: document.getElementById('result-merchant').value.trim(),
      date: document.getElementById('result-date').value,
      category: document.getElementById('result-category').value,
      notes: document.getElementById('result-notes').value.trim() || 'Scanned receipt'
    };
    if (!expense.amount || !expense.merchant || !expense.date || !expense.category) {
      showStatus('Please fill in all fields.', 'error');
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        showStatus(err.error || 'Save failed', 'error');
        return;
      }
      showStatus('Expense saved!', 'success');
      setTimeout(reset, 1500);
    } catch (err) {
      showStatus('Network error: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Expense';
    }
  });
})();
