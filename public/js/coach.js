(async function () {
  // Respect the admin feature toggle before doing anything else.
  try {
    const cfgRes = await fetch('/api/site/config');
    if (cfgRes.ok) {
      const config = await cfgRes.json();
      if (config.aiCoachEnabled === false) {
        document.body.innerHTML = `
          <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b">
            <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6)">
              <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#f87171">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V20.25a.75.75 0 0 0 1.28.53l4.184-4.183a.39.39 0 0 1 .402-.088A48.35 48.35 0 0 0 11.25 17c2.115 0 4.198-.137 6.24-.402 1.608-.209 2.76-1.614 2.76-3.235V8.511Z"/>
                </svg>
              </div>
              <h1 style="font-size:20px;font-weight:700;color:#f4f1ec;margin-bottom:8px">AI Coach Disabled</h1>
              <p style="font-size:13px;color:#71717a;line-height:1.6;margin-bottom:28px">The admin has temporarily disabled the AI Coach. Please check back later.</p>
              <a href="/dashboard.html" style="display:block;background:#6366f1;color:#fff;border-radius:10px;padding:12px 20px;font-size:14px;font-weight:600;text-decoration:none;font-family:inherit">← Back to Dashboard</a>
            </div>
          </div>`;
        return;
      }
    }
  } catch (e) { /* if the config can't be read, fail open */ }

  // Check auth first
  const meRes = await fetch('/api/auth/me');
  if (!meRes.ok) {
    document.getElementById('auth-banner').style.display = 'block';
    document.getElementById('chat-input').disabled = true;
    document.getElementById('send-btn').disabled = true;
    return;
  }

  const MAX_MESSAGES = 20;
  const messages = [];

  const thread = document.getElementById('message-thread');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');
  const suggestionChips = document.getElementById('suggestion-chips');

  function addBubble(role, content) {
    const wrap = document.createElement('div');
    wrap.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';
    const bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] mb-2'
      : 'bg-zinc-800 text-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%] mb-2';
    bubble.textContent = content;
    wrap.appendChild(bubble);
    thread.appendChild(wrap);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    if (suggestionChips) suggestionChips.style.display = 'none';
    addBubble('user', text);
    messages.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    const assistantBubble = addBubble('assistant', '…');

    try {
      const trimmed = messages.slice(-MAX_MESSAGES);

      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: trimmed })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        assistantBubble.textContent = '⚠️ ' + (err.error || 'Coach is unavailable.');
        sendBtn.disabled = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload);
            if (data.delta) {
              fullResponse += data.delta;
              assistantBubble.textContent = fullResponse;
              thread.scrollTop = thread.scrollHeight;
            } else if (data.error) {
              assistantBubble.textContent = '⚠️ ' + data.error;
            }
          } catch (e) {
            // ignore parse errors mid-stream
          }
        }
      }

      if (fullResponse) {
        messages.push({ role: 'assistant', content: fullResponse });
      }

      // Check if the response contains a LOG_EXPENSE instruction
      const logMatch = fullResponse.match(/LOG_EXPENSE:(\{[^}]+\})/);
      if (logMatch) {
        try {
          const expenseData = JSON.parse(logMatch[1]);
          // Remove the JSON line from the displayed bubble
          assistantBubble.textContent = fullResponse
            .replace(/LOG_EXPENSE:\{[^}]+\}/, '')
            .trim();

          // Log the expense via API
          const logRes = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(expenseData)
          });

          if (logRes.ok) {
            const successNote = document.createElement('div');
            successNote.style.cssText =
              'font-size:11px;color:#4ade80;margin-top:4px;margin-left:4px;' +
              'display:flex;align-items:center;gap:4px;';
            successNote.innerHTML =
              '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" ' +
              'stroke-width="2" stroke="currentColor">' +
              '<path stroke-linecap="round" stroke-linejoin="round" ' +
              'd="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>' +
              '</svg>' +
              'Expense logged to your log';
            assistantBubble.parentElement.appendChild(successNote);
          }
        } catch (e) {
          console.error('Failed to parse or log expense:', e);
        }
      }
    } catch (err) {
      assistantBubble.textContent = '⚠️ Network error: ' + err.message;
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  clearBtn.addEventListener('click', () => {
    messages.length = 0;
    thread.innerHTML = '';
    addBubble('assistant', "Hey! I'm your Spendly Coach. What's on your mind?");
  });

  addBubble('assistant', "Hey! I'm your Spendly Coach. What's on your mind?");

  // Check for prefilled prompt from recurring page
  const prefill = localStorage.getItem('coach-prefill');
  if (prefill) {
    localStorage.removeItem('coach-prefill');
    input.value = prefill;
    sendMessage();
  }

  if (messages.length > 1 && suggestionChips) suggestionChips.style.display = 'none';

  if (suggestionChips) {
    suggestionChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      const prompt = chip.dataset.prompt;
      if (!prompt) return;
      input.value = prompt;
      suggestionChips.style.display = 'none';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
  }
})();
