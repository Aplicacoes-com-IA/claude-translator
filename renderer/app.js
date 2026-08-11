'use strict';

const LANGUAGES = [
  { code: 'auto', label: 'Detectar idioma' },
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Holandês' },
  { code: 'ja', label: 'Japonês' },
  { code: 'ko', label: 'Coreano' },
  { code: 'zh', label: 'Chinês' },
  { code: 'ru', label: 'Russo' },
  { code: 'ar', label: 'Árabe' },
  { code: 'hi', label: 'Hindi' },
];

const AUTO_DEBOUNCE_MS = 1200;
const PERSIST_DEBOUNCE_MS = 800;

const langLabel = (code) => {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? l.label : code;
};

const state = {
  source: 'auto',
  target: 'pt',
  auto: true,
  currentId: null,
  startTime: null,
};

const $ = (id) => document.getElementById(id);

const sourceSelect = $('source-lang');
const targetSelect = $('target-lang');
const sourceText = $('source-text');
const outputEl = $('target-text');
const charCount = $('char-count');
const targetCharCount = $('target-char-count');
const statusEl = $('status');
const translateBtn = $('translate-btn');
const swapBtn = $('swap-btn');
const clearBtn = $('clear-btn');
const copyBtn = $('copy-btn');
const autoToggle = $('auto-toggle');

let debounceTimer = null;
let persistTimer = null;

/* ---------- Render dos selects ---------- */

function fillSelect(select, options, selected) {
  select.innerHTML = '';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.code;
    o.textContent = opt.label;
    if (opt.code === selected) o.selected = true;
    select.appendChild(o);
  }
}

function refreshSelects() {
  fillSelect(sourceSelect, LANGUAGES, state.source);
  fillSelect(targetSelect, LANGUAGES.filter((l) => l.code !== 'auto'), state.target);
  swapBtn.disabled = state.source === 'auto';
}

/* ---------- Estado visual ---------- */

function setStatus(text) {
  statusEl.textContent = text || '';
  const spinner = statusEl.querySelector('.spinner');
  if (spinner) spinner.remove();
}

function setLoading(on) {
  translateBtn.disabled = on;
  if (on) {
    setStatus('');
    const s = document.createElement('span');
    s.className = 'spinner';
    s.setAttribute('aria-hidden', 'true');
    statusEl.prepend(s);
  }
}

function updateCounts() {
  charCount.textContent = String(sourceText.value.length);
  targetCharCount.textContent = String(outputEl.textContent.length);
}

function resetOutput() {
  if (state.currentId) {
    window.translator.cancel();
    state.currentId = null;
  }
  outputEl.textContent = '';
  statusEl.classList.remove('error');
  setLoading(false);
  setStatus('');
  updateCounts();
}

function finish(ok, message) {
  setLoading(false);
  if (ok) {
    const secs = state.startTime ? ((Date.now() - state.startTime) / 1000).toFixed(1) : null;
    setStatus(secs ? `Traduzido em ${secs}s` : 'Traduzido');
  } else {
    statusEl.classList.add('error');
    setStatus(message || 'Falha na tradução. Tente novamente.');
  }
  updateCounts();
}

/* ---------- Tradução ---------- */

function payloadSource() {
  return state.source === 'auto' ? 'auto' : langLabel(state.source);
}

function payloadTarget() {
  return langLabel(state.target);
}

function doTranslate() {
  const text = sourceText.value;
  if (!text.trim()) {
    resetOutput();
    return;
  }

  window.translator.cancel();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  state.currentId = id;
  state.startTime = Date.now();

  outputEl.textContent = '';
  statusEl.classList.remove('error');
  setLoading(true);

  window.translator.translate({
    id,
    text,
    source: payloadSource(),
    target: payloadTarget(),
  });
}

function scheduleAuto() {
  if (!state.auto) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doTranslate, AUTO_DEBOUNCE_MS);
}

/* ---------- Eventos do Claude ---------- */

window.translator.onChunk(({ id, text }) => {
  if (id !== state.currentId) return;
  outputEl.textContent += text;
  updateCounts();
});

window.translator.onFinal(({ id, text }) => {
  if (id !== state.currentId) return;
  outputEl.textContent = text;
  updateCounts();
});

window.translator.onDone(({ id }) => {
  if (id !== state.currentId) return;
  finish(true);
});

window.translator.onError(({ id, message }) => {
  if (id !== state.currentId) return;
  finish(false, message);
});

/* ---------- Interações ---------- */

sourceText.addEventListener('input', () => {
  updateCounts();
  scheduleAuto();
  schedulePersist();
});

sourceText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    clearTimeout(debounceTimer);
    doTranslate();
  }
});

translateBtn.addEventListener('click', () => {
  clearTimeout(debounceTimer);
  doTranslate();
});

swapBtn.addEventListener('click', () => {
  if (state.source === 'auto') return;
  const prevSource = state.source;
  state.source = state.target;
  state.target = prevSource;
  refreshSelects();
  persist();

  if (outputEl.textContent.trim()) {
    sourceText.value = outputEl.textContent;
    resetOutput();
    updateCounts();
  }
  if (sourceText.value.trim()) doTranslate();
});

sourceSelect.addEventListener('change', () => {
  state.source = sourceSelect.value;
  refreshSelects();
  persist();
  if (sourceText.value.trim()) scheduleAuto();
});

targetSelect.addEventListener('change', () => {
  state.target = targetSelect.value;
  refreshSelects();
  persist();
  if (sourceText.value.trim()) doTranslate();
});

autoToggle.addEventListener('change', () => {
  state.auto = autoToggle.checked;
  persist();
});

clearBtn.addEventListener('click', () => {
  sourceText.value = '';
  resetOutput();
  sourceText.focus();
});

copyBtn.addEventListener('click', async () => {
  const text = outputEl.textContent;
  if (!text.trim()) return;
  await window.translator.copy(text);
  copyBtn.textContent = '✓';
  setTimeout(() => {
    copyBtn.textContent = '⧉';
  }, 1500);
});

/* ---------- Configurações ---------- */

function persist() {
  window.translator.saveSettings({
    source: state.source,
    target: state.target,
    auto: state.auto,
    lastText: sourceText.value,
  });
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, PERSIST_DEBOUNCE_MS);
}

async function init() {
  refreshSelects();
  const s = await window.translator.getSettings();
  if (s) {
    if (s.source && LANGUAGES.some((l) => l.code === s.source)) state.source = s.source;
    if (s.target && LANGUAGES.some((l) => l.code === s.target)) state.target = s.target;
    if (typeof s.auto === 'boolean') state.auto = s.auto;
  }
  autoToggle.checked = state.auto;
  refreshSelects();
  if (s && typeof s.lastText === 'string') sourceText.value = s.lastText;
  updateCounts();
}

init();
