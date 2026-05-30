(async function () {
  // Respect the admin feature toggle before doing anything else.
  try {
    const cfgRes = await fetch('/api/site/config');
    if (cfgRes.ok) {
      const config = await cfgRes.json();
      if (config.aiCoachEnabled === false) {
        document.body.innerHTML = `
          <div class="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-zinc-950 text-white">
            <h1 class="text-2xl font-bold mb-3">This feature is currently disabled</h1>
            <p class="text-zinc-400 mb-6">The AI Coach has been turned off by an administrator.</p>
            <a href="/dashboard.html" class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors">Back to Dashboard</a>
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
