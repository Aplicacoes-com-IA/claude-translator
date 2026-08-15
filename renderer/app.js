'use strict';

/* ==========================================================================
   Catálogo de Idiomas & Configurações de Voz
   ========================================================================== */

const LANGUAGES = [
  { code: 'auto', label: 'Detectar idioma', voice: null },
  { code: 'pt', label: 'Português', voice: 'pt-BR' },
  { code: 'en', label: 'Inglês', voice: 'en-US' },
  { code: 'es', label: 'Espanhol', voice: 'es-ES' },
  { code: 'fr', label: 'Francês', voice: 'fr-FR' },
  { code: 'de', label: 'Alemão', voice: 'de-DE' },
  { code: 'it', label: 'Italiano', voice: 'it-IT' },
  { code: 'ja', label: 'Japonês', voice: 'ja-JP' },
  { code: 'ko', label: 'Coreano', voice: 'ko-KR' },
  { code: 'zh', label: 'Chinês (Simplificado)', voice: 'zh-CN' },
  { code: 'ru', label: 'Russo', voice: 'ru-RU' },
  { code: 'ar', label: 'Árabe', voice: 'ar-SA' },
  { code: 'hi', label: 'Hindi', voice: 'hi-IN' },
  { code: 'nl', label: 'Holandês', voice: 'nl-NL' },
  { code: 'pl', label: 'Polonês', voice: 'pl-PL' },
  { code: 'tr', label: 'Turco', voice: 'tr-TR' },
  { code: 'sv', label: 'Sueco', voice: 'sv-SE' },
  { code: 'uk', label: 'Ucraniano', voice: 'uk-UA' },
  { code: 'vi', label: 'Vietnamita', voice: 'vi-VN' },
  { code: 'el', label: 'Grego', voice: 'el-GR' },
  { code: 'he', label: 'Hebraico', voice: 'he-IL' },
  { code: 'id', label: 'Indonésio', voice: 'id-ID' },
  { code: 'cs', label: 'Tcheco', voice: 'cs-CZ' },
  { code: 'da', label: 'Dinamarquês', voice: 'da-DK' },
  { code: 'fi', label: 'Finlandês', voice: 'fi-FI' },
  { code: 'no', label: 'Norueguês', voice: 'no-NO' },
  { code: 'ro', label: 'Romeno', voice: 'ro-RO' },
  { code: 'hu', label: 'Húngaro', voice: 'hu-HU' },
  { code: 'th', label: 'Tailandês', voice: 'th-TH' },
];

const SOURCE_DEFAULT_TABS = ['auto', 'pt', 'en', 'es'];
const TARGET_DEFAULT_TABS = ['pt', 'en', 'es', 'fr'];

const MODES = [
  { code: 'translate', label: 'Traduzir' },
  { code: 'translate-polish', label: 'Traduzir e melhorar' },
  { code: 'polish', label: 'Melhorar (mesmo idioma)' },
];

const TONES = [
  { code: 'neutral', label: 'Natural / Fluente' },
  { code: 'casual', label: 'Casual & Amigável' },
  { code: 'professional', label: 'Profissional & Corporativo' },
  { code: 'formal', label: 'Formal & Culto' },
  { code: 'email', label: 'Para E-mail' },
  { code: 'slack', label: 'Para Slack / Teams' },
  { code: 'whatsapp', label: 'Para WhatsApp' },
  { code: 'friendly', label: 'Cordial & Acolhedor' },
  { code: 'persuasive', label: 'Persuasivo' },
];

/* ==========================================================================
   Estado da Aplicação
   ========================================================================== */

const state = {
  source: 'auto',
  target: 'pt',
  auto: true,
  mode: 'translate',
  tone: 'neutral',
  debounceMs: 1200,
  theme: 'system', // 'system' | 'light' | 'dark'
  alwaysOnTop: false,
  renderMarkdown: false,
  showDiff: false,
  currentId: null,
  startTime: null,
  lastTranslatedSource: '',
  lastTranslatedResult: '',
};

/* ==========================================================================
   Seletores DOM
   ========================================================================== */

const $ = (id) => document.getElementById(id);

// Barra de navegação
const pinBtn = $('pin-btn');
const themeBtn = $('theme-btn');
const themeIcon = $('theme-icon');
const themeLabel = $('theme-label');
const historyBtn = $('history-btn');
const settingsBtn = $('settings-btn');
const autoToggle = $('auto-toggle');

// Painel Origem
const sourceLangTabs = $('source-lang-tabs');
const sourceText = $('source-text');
const charCount = $('char-count');
const pasteBtn = $('paste-btn');
const micBtn = $('mic-btn');
const micIcon = $('mic-icon');
const micLabel = $('mic-label');
const sourceTtsBtn = $('source-tts-btn');
const clearBtn = $('clear-btn');
const swapBtn = $('swap-btn');

// Painel Destino
const targetLangTabs = $('target-lang-tabs');
const outputEl = $('target-text');
const diffViewEl = $('diff-view');
const targetCharCount = $('target-char-count');
const statusEl = $('status');
const markdownToggleBtn = $('markdown-toggle-btn');
const diffToggleBtn = $('diff-toggle-btn');
const targetTtsBtn = $('target-tts-btn');
const copyBtn = $('copy-btn');
const copyIcon = $('copy-icon');
const copyLabel = $('copy-label');

// Barra inferior
const modeSelect = $('mode-select');
const toneSelect = $('tone-select');
const translateBtn = $('translate-btn');
const translateLabel = $('translate-label');

// Modal de Configurações
const settingsModal = $('settings-modal');
const closeSettingsBtn = $('close-settings-btn');
const cancelSettingsBtn = $('cancel-settings-btn');
const saveSettingsBtn = $('save-settings-btn');
const cfgEngine = $('cfg-engine');
const cfgBaseUrl = $('cfg-base-url');
const cfgApiKey = $('cfg-api-key');
const cfgModel = $('cfg-model');
const cfgDebounce = $('cfg-debounce');
const debounceVal = $('debounce-val');
const toggleKeyVisibility = $('toggle-key-visibility');
const testConnectionBtn = $('test-connection-btn');
const testResultStatus = $('test-result-status');

// Modal de Histórico
const historyModal = $('history-modal');
const closeHistoryBtn = $('close-history-btn');
const historySearchInput = $('history-search-input');
const historyList = $('history-list');
const clearAllHistoryBtn = $('clear-all-history-btn');

// Contêiner de Toasts
const toastContainer = $('toast-container');

let debounceTimer = null;
let persistTimer = null;

/* ==========================================================================
   Auxiliares & Notificações (Toasts)
   ========================================================================== */

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span style="color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'}">${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 2900);
}

const langLabel = (code) => {
  const l = LANGUAGES.find((x) => x.code === code);
  return l ? l.label : code;
};

function countWords(str) {
  const matches = str.trim().match(/[\S]+/g);
  return matches ? matches.length : 0;
}

function updateCounts() {
  const sText = sourceText.value;
  const sChars = sText.length;
  const sWords = countWords(sText);
  charCount.textContent = `${sChars} caractere${sChars === 1 ? '' : 's'} • ${sWords} palavra${sWords === 1 ? '' : 's'}`;

  const tText = outputEl.textContent;
  const tChars = tText.length;
  const tWords = countWords(tText);
  targetCharCount.textContent = `${tChars} caractere${tChars === 1 ? '' : 's'} • ${tWords} palavra${tWords === 1 ? '' : 's'}`;
}

/* ==========================================================================
   Gerenciamento de Tema
   ========================================================================== */

function applyTheme(theme) {
  state.theme = theme;
  if (theme === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeIcon.textContent = '🌓';
    themeLabel.textContent = 'Auto';
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '🌙';
    themeLabel.textContent = 'Escuro';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = '☀️';
    themeLabel.textContent = 'Claro';
  }
}

function cycleTheme() {
  const next = state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'system' : 'light';
  applyTheme(next);
  persistSettings();
  showToast(`Tema alterado para: ${themeLabel.textContent}`);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'system') applyTheme('system');
});

/* ==========================================================================
   Abas Unificadas de Idioma (Estilo Google Tradutor / DeepL)
   ========================================================================== */

function renderLangTabs(container, defaultTabs, currentLang, isSource, onSelect) {
  container.innerHTML = '';

  let visibleTabs = [...defaultTabs];
  const isCustom = !defaultTabs.includes(currentLang);
  if (isCustom) {
    visibleTabs = [...defaultTabs.slice(0, defaultTabs.length - 1), currentLang];
  }

  for (const code of visibleTabs) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `lang-tab ${code === currentLang ? 'active' : ''}`;
    tab.textContent = code === 'auto' ? 'Detectar idioma' : langLabel(code);
    tab.addEventListener('click', () => onSelect(code));
    container.appendChild(tab);
  }

  const moreWrapper = document.createElement('div');
  moreWrapper.className = `lang-tab-more ${isCustom ? 'active' : ''}`;
  moreWrapper.title = 'Selecionar outro idioma';

  const select = document.createElement('select');
  select.setAttribute('aria-label', isSource ? 'Mais idiomas de origem' : 'Mais idiomas de destino');

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Outros idiomas...';
  placeholder.disabled = true;
  placeholder.selected = !isCustom;
  select.appendChild(placeholder);

  const availableLangs = isSource ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto');
  for (const lang of availableLangs) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.label;
    if (lang.code === currentLang) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', (e) => {
    if (e.target.value) onSelect(e.target.value);
  });

  const moreText = document.createElement('span');
  moreText.className = 'more-text';
  moreText.innerHTML = `<span>Mais</span><span class="more-chevron">▾</span>`;

  moreWrapper.appendChild(select);
  moreWrapper.appendChild(moreText);
  container.appendChild(moreWrapper);
}

function refreshSelects() {
  renderLangTabs(sourceLangTabs, SOURCE_DEFAULT_TABS, state.source, true, (code) => {
    state.source = code;
    refreshSelects();
    persistSettings();
    if (sourceText.value.trim()) scheduleAuto();
  });

  renderLangTabs(targetLangTabs, TARGET_DEFAULT_TABS, state.target, false, (code) => {
    state.target = code;
    refreshSelects();
    persistSettings();
    if (sourceText.value.trim()) doTranslate();
  });

  swapBtn.disabled = state.source === 'auto';
}

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

function refreshControls() {
  const improving = state.mode === 'translate-polish' || state.mode === 'polish';
  toneSelect.disabled = !improving;
  diffToggleBtn.style.display = improving ? 'inline-flex' : 'none';

  translateLabel.textContent =
    state.mode === 'polish' ? 'Melhorar' : state.mode === 'translate-polish' ? 'Traduzir e melhorar' : 'Traduzir';
}

/* ==========================================================================
   Renderizador Markdown Simples e Seguro
   ========================================================================== */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSimpleMarkdown(raw) {
  if (!raw) return '';
  const lines = raw.split('\n');
  const out = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('> ')) {
      out.push(`<blockquote>${escapeHtml(line.slice(2))}</blockquote>`);
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      out.push(`<li>${formatInlineMarkdown(line.trim().slice(2))}</li>`);
    } else if (line.trim() === '') {
      out.push('<br/>');
    } else {
      out.push(`<p>${formatInlineMarkdown(line)}</p>`);
    }
  }

  if (inCodeBlock && codeBuffer.length) {
    out.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  }

  return out.join('');
}

function formatInlineMarkdown(text) {
  let esc = escapeHtml(text);
  esc = esc.replace(/`([^`]+)`/g, '<code>$1</code>');
  esc = esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  esc = esc.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return esc;
}

function updateOutputView() {
  const text = state.lastTranslatedResult || outputEl.textContent;
  if (state.showDiff && (state.mode === 'polish' || state.mode === 'translate-polish')) {
    outputEl.style.display = 'none';
    diffViewEl.style.display = 'block';
    renderDiff(sourceText.value, text);
  } else {
    diffViewEl.style.display = 'none';
    outputEl.style.display = 'block';
    if (state.renderMarkdown) {
      outputEl.classList.add('markdown-rendered');
      outputEl.innerHTML = renderSimpleMarkdown(text);
    } else {
      outputEl.classList.remove('markdown-rendered');
      outputEl.textContent = text;
    }
  }
}

/* ==========================================================================
   Mecanismo de Comparação Diff (Word-Level)
   ========================================================================== */

function tokenize(text) {
  return text.match(/[\w\u00C0-\u017F]+|[^\w\s\u00C0-\u017F]+|\s+/gu) || [];
}

function computeDiff(origTokens, newTokens) {
  const n = origTokens.length;
  const m = newTokens.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === newTokens[j - 1]) {
      result.unshift({ type: 'same', text: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', text: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'del', text: origTokens[i - 1] });
      i--;
    }
  }
  return result;
}

function renderDiff(original, improved) {
  if (!original || !improved) {
    diffViewEl.innerHTML = '<span style="color: var(--text-muted)">Nada para comparar.</span>';
    return;
  }
  const origTokens = tokenize(original);
  const newTokens = tokenize(improved);
  const diff = computeDiff(origTokens, newTokens);

  let html = '';
  for (const part of diff) {
    const esc = escapeHtml(part.text);
    if (part.type === 'del') {
      html += `<span class="diff-del">${esc}</span>`;
    } else if (part.type === 'add') {
      html += `<span class="diff-add">${esc}</span>`;
    } else {
      html += esc;
    }
  }
  diffViewEl.innerHTML = html;
}

/* ==========================================================================
   Síntese de Voz (Text to Speech)
   ========================================================================== */

let activeUtterance = null;

function speakText(text, langCode, buttonEl) {
  if (!('speechSynthesis' in window)) {
    showToast('Síntese de voz não suportada pelo sistema.', 'error');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (buttonEl) buttonEl.classList.remove('active');
    return;
  }

  if (!text || !text.trim()) {
    showToast('Não há texto para reproduzir.', 'info');
    return;
  }

  const langObj = LANGUAGES.find((l) => l.code === langCode);
  const voiceTag = (langObj && langObj.voice) || 'pt-BR';

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceTag;

  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.replace('_', '-').startsWith(voiceTag.slice(0, 2)));
  if (match) utterance.voice = match;

  if (buttonEl) buttonEl.classList.add('active');

  utterance.onend = () => {
    if (buttonEl) buttonEl.classList.remove('active');
    activeUtterance = null;
  };

  utterance.onerror = () => {
    if (buttonEl) buttonEl.classList.remove('active');
    activeUtterance = null;
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/* ==========================================================================
   Entrada por Voz Nativa (Gravação WAV & Transcrição no App)
   ========================================================================== */

let audioContext = null;
let audioStream = null;
let scriptProcessor = null;
let audioSourceNode = null;
let pcmBuffers = [];
let isWavRecording = false;
let recordStartTime = null;
let recordTimerInterval = null;

function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (sampleRate * channels * bytesPerSample)
  view.setUint16(32, 2, true); // Block align (channels * bytesPerSample)
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function initAudioRecording() {
  async function toggleRecording() {
    if (isWavRecording) {
      await stopAndTranscribe();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioSourceNode = audioContext.createMediaStreamSource(audioStream);

      // Buffer 4096, 1 input channel, 1 output channel
      scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      pcmBuffers = [];

      scriptProcessor.onaudioprocess = (e) => {
        if (!isWavRecording) return;
        const input = e.inputBuffer.getChannelData(0);
        pcmBuffers.push(new Float32Array(input));
      };

      audioSourceNode.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      isWavRecording = true;
      recordStartTime = Date.now();

      micBtn.classList.add('recording');
      micIcon.textContent = '⏹️';
      micLabel.textContent = 'Concluir (0s)';
      setStatus('Gravando voz... Fale e clique em Concluir.', 'info');
      showToast('🎙️ Gravando áudio... Fale e clique em Concluir ao terminar.', 'info');

      recordTimerInterval = setInterval(() => {
        const secs = Math.floor((Date.now() - recordStartTime) / 1000);
        micLabel.textContent = `Concluir (${secs}s)`;
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      showToast(`Permissão ou erro no microfone: ${err.message}`, 'error');
    }
  }

  async function stopAndTranscribe() {
    if (recordTimerInterval) {
      clearInterval(recordTimerInterval);
      recordTimerInterval = null;
    }
    isWavRecording = false;

    if (scriptProcessor) {
      try { scriptProcessor.disconnect(); } catch {}
    }
    if (audioSourceNode) {
      try { audioSourceNode.disconnect(); } catch {}
    }
    if (audioStream) {
      try {
        audioStream.getTracks().forEach((t) => t.stop());
      } catch {}
      audioStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close(); } catch {}
      audioContext = null;
    }

    micBtn.classList.remove('recording');
    micIcon.textContent = '🎙️';
    micLabel.textContent = 'Voz';

    if (pcmBuffers.length === 0) {
      setStatus('', '');
      return;
    }

    let totalSamples = pcmBuffers.reduce((acc, b) => acc + b.length, 0);
    if (totalSamples < 8000) {
      showToast('Áudio muito curto. Fale uma frase completa.', 'info');
      setStatus('', '');
      return;
    }

    let merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const b of pcmBuffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    const wavBuffer = encodeWAV(merged, 16000);

    // Converte para Base64
    let binary = '';
    const bytes = new Uint8Array(wavBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = btoa(binary);

    setStatus('Transcrevendo áudio...', 'info');
    showToast('⏳ Processando transcrição da voz...', 'info');

    try {
      const res = await window.translator.transcribeAudio({
        audioBase64,
        language: state.source,
      });

      if (res && res.ok && res.text && res.text.trim()) {
        const current = sourceText.value.trim();
        const spokenText = res.text.trim();
        sourceText.value = current ? `${current} ${spokenText}` : spokenText;
        updateCounts();
        showToast(`✓ Voz transcrita com sucesso!`, 'success');
        setStatus('Áudio transcrito', 'success');

        sourceText.focus();
        const len = sourceText.value.length;
        sourceText.setSelectionRange(len, len);

        if (state.auto) scheduleAuto();
      } else {
        const msg = (res && res.error) || 'Nenhum texto identificado';
        showToast(`Aviso de voz: ${msg}`, 'error');
        setStatus('Falha na transcrição', 'error');
      }
    } catch (err) {
      console.error('Erro na transcrição:', err);
      showToast(`Erro na transcrição: ${err.message}`, 'error');
      setStatus('Erro na transcrição', 'error');
    }
  }

  micBtn.addEventListener('click', toggleRecording);
}

/* ==========================================================================
   Histórico Local
   ========================================================================== */

const HISTORY_KEY = 'claude_translator_history';
const MAX_HISTORY = 60;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (err) {
    console.error('Falha ao salvar histórico:', err);
  }
}

function addToHistory(entry) {
  const history = getHistory();
  if (history.length > 0 && history[0].sourceText === entry.sourceText && history[0].targetText === entry.targetText) {
    return;
  }
  history.unshift({
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    ...entry,
  });
  saveHistory(history);
}

function renderHistoryList(filter = '') {
  const history = getHistory();
  const filtered = filter
    ? history.filter(
        (h) =>
          h.sourceText.toLowerCase().includes(filter.toLowerCase()) ||
          h.targetText.toLowerCase().includes(filter.toLowerCase())
      )
    : history;

  if (filtered.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <p>${filter ? 'Nenhum resultado encontrado para a busca.' : 'Nenhuma tradução no histórico ainda.'}</p>
      </div>`;
    return;
  }

  historyList.innerHTML = '';
  for (const item of filtered) {
    const card = document.createElement('div');
    card.className = 'history-item';
    card.innerHTML = `
      <div class="history-item-header">
        <div class="history-badges">
          <span class="history-badge">${langLabel(item.source)} → ${langLabel(item.target)}</span>
          <span class="history-badge">${item.mode === 'polish' ? 'Melhoria' : 'Tradução'}</span>
        </div>
        <span>${item.date} ${item.timestamp}</span>
      </div>
      <div class="history-content">
        <div class="history-text-col">
          <span class="history-text-label">Original:</span>
          <div class="history-text-snippet">${escapeHtml(item.sourceText)}</div>
        </div>
        <div class="history-text-col">
          <span class="history-text-label">Resultado:</span>
          <div class="history-text-snippet">${escapeHtml(item.targetText)}</div>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="history-btn restore-btn">Restaurar</button>
        <button class="history-btn copy-btn">Copiar</button>
        <button class="history-btn delete-btn" style="color: var(--error)">Excluir</button>
      </div>
    `;

    card.querySelector('.restore-btn').addEventListener('click', () => {
      sourceText.value = item.sourceText;
      outputEl.textContent = item.targetText;
      state.source = item.source;
      state.target = item.target;
      state.mode = item.mode || 'translate';
      state.tone = item.tone || 'neutral';
      state.lastTranslatedSource = item.sourceText;
      state.lastTranslatedResult = item.targetText;

      refreshSelects();
      refreshControls();
      updateCounts();
      updateOutputView();
      historyModal.style.display = 'none';
      showToast('Tradução restaurada com sucesso!', 'success');
    });

    card.querySelector('.copy-btn').addEventListener('click', async () => {
      await window.translator.copy(item.targetText);
      showToast('Resultado copiado!', 'success');
    });

    card.querySelector('.delete-btn').addEventListener('click', () => {
      const updated = getHistory().filter((h) => h.id !== item.id);
      saveHistory(updated);
      renderHistoryList(historySearchInput.value);
    });

    historyList.appendChild(card);
  }
}

/* ==========================================================================
   Estado Visual & Fluxo de Tradução
   ========================================================================== */

function setStatus(text, type = 'info') {
  statusEl.className = `status ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
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
    const label = document.createElement('span');
    label.textContent = 'Processando...';
    statusEl.appendChild(label);
  }
}

function resetOutput() {
  if (state.currentId) {
    window.translator.cancel();
    state.currentId = null;
  }
  outputEl.textContent = '';
  diffViewEl.innerHTML = '';
  state.lastTranslatedResult = '';
  setLoading(false);
  setStatus('');
  updateCounts();
}

function finish(ok, message) {
  setLoading(false);
  if (ok) {
    const secs = state.startTime ? ((Date.now() - state.startTime) / 1000).toFixed(1) : null;
    setStatus(secs ? `Concluído em ${secs}s` : 'Concluído', 'success');

    state.lastTranslatedSource = sourceText.value;
    state.lastTranslatedResult = outputEl.textContent;

    if (sourceText.value.trim() && outputEl.textContent.trim()) {
      addToHistory({
        source: state.source,
        target: state.target,
        sourceText: sourceText.value,
        targetText: outputEl.textContent,
        mode: state.mode,
        tone: state.tone,
      });
    }
  } else {
    setStatus(message || 'Falha na tradução. Tente novamente.', 'error');
  }
  updateCounts();
  updateOutputView();
}

/* ==========================================================================
   Disparo da Tradução
   ========================================================================== */

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
  diffViewEl.innerHTML = '';
  setLoading(true);

  window.translator.translate({
    id,
    text,
    source: payloadSource(),
    target: payloadTarget(),
    mode: state.mode,
    tone: state.tone,
  });
}

function scheduleAuto() {
  if (!state.auto) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doTranslate, state.debounceMs);
}

/* ==========================================================================
   Eventos do Backend (IPC Streaming)
   ========================================================================== */

window.translator.onStatus(({ id, message }) => {
  if (id !== state.currentId) return;
  if (message) {
    statusEl.textContent = message;
    statusEl.className = 'status';
  }
});

window.translator.onChunk(({ id, text }) => {
  if (id !== state.currentId) return;
  outputEl.textContent += text;
  state.lastTranslatedResult = outputEl.textContent;
  updateCounts();
});

window.translator.onFinal(({ id, text }) => {
  if (id !== state.currentId) return;
  outputEl.textContent = text;
  state.lastTranslatedResult = text;
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

/* ==========================================================================
   Interações de Interface & Event Listeners
   ========================================================================== */

sourceText.addEventListener('input', () => {
  updateCounts();
  scheduleAuto();
  schedulePersistSettings();
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
  persistSettings();

  if (outputEl.textContent.trim()) {
    sourceText.value = outputEl.textContent;
    resetOutput();
    updateCounts();
  }
  if (sourceText.value.trim()) doTranslate();
});

modeSelect.addEventListener('change', () => {
  state.mode = modeSelect.value;
  refreshControls();
  updateOutputView();
  persistSettings();
  if (sourceText.value.trim()) doTranslate();
});

toneSelect.addEventListener('change', () => {
  state.tone = toneSelect.value;
  persistSettings();
  if (sourceText.value.trim()) doTranslate();
});

autoToggle.addEventListener('change', () => {
  state.auto = autoToggle.checked;
  persistSettings();
  showToast(state.auto ? 'Auto-tradução ativada' : 'Auto-tradução desativada');
});

clearBtn.addEventListener('click', () => {
  sourceText.value = '';
  resetOutput();
  sourceText.focus();
});

pasteBtn.addEventListener('click', async () => {
  const text = await window.translator.paste();
  if (text) {
    sourceText.value = text;
    updateCounts();
    showToast('Texto colado!', 'info');
    if (state.auto) scheduleAuto();
    sourceText.focus();
  }
});

sourceTtsBtn.addEventListener('click', () => {
  speakText(sourceText.value, state.source, sourceTtsBtn);
});

targetTtsBtn.addEventListener('click', () => {
  speakText(outputEl.textContent, state.target, targetTtsBtn);
});

copyBtn.addEventListener('click', async () => {
  const text = outputEl.textContent;
  if (!text.trim()) return;
  await window.translator.copy(text);
  copyIcon.textContent = '✓';
  copyLabel.textContent = 'Copiado';
  showToast('Tradução copiada para a área de transferência!', 'success');
  setTimeout(() => {
    copyIcon.textContent = '⧉';
    copyLabel.textContent = 'Copiar';
  }, 1800);
});

markdownToggleBtn.addEventListener('click', () => {
  state.renderMarkdown = !state.renderMarkdown;
  markdownToggleBtn.classList.toggle('active', state.renderMarkdown);
  updateOutputView();
  showToast(state.renderMarkdown ? 'Visualização Markdown ativada' : 'Texto puro ativado');
});

diffToggleBtn.addEventListener('click', () => {
  state.showDiff = !state.showDiff;
  diffToggleBtn.classList.toggle('active', state.showDiff);
  updateOutputView();
  showToast(state.showDiff ? 'Comparador Diff ativado' : 'Comparador Diff desativado');
});

pinBtn.addEventListener('click', async () => {
  const next = !state.alwaysOnTop;
  const isPinned = await window.translator.setAlwaysOnTop(next);
  state.alwaysOnTop = isPinned;
  pinBtn.classList.toggle('active', isPinned);
  showToast(isPinned ? 'Janela fixada no topo 📌' : 'Janela desafixada');
});

themeBtn.addEventListener('click', cycleTheme);

/* ==========================================================================
   Modais: Histórico e Configurações
   ========================================================================== */

historyBtn.addEventListener('click', () => {
  historySearchInput.value = '';
  renderHistoryList();
  historyModal.style.display = 'flex';
  historySearchInput.focus();
});

closeHistoryBtn.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

historySearchInput.addEventListener('input', () => {
  renderHistoryList(historySearchInput.value);
});

clearAllHistoryBtn.addEventListener('click', () => {
  if (confirm('Deseja realmente limpar todo o histórico de traduções?')) {
    saveHistory([]);
    renderHistoryList();
    showToast('Histórico limpo!', 'info');
  }
});

settingsBtn.addEventListener('click', async () => {
  const cfg = await window.translator.getConfig();
  cfgEngine.value = cfg.engine || 'auto';
  cfgBaseUrl.value = cfg.baseUrl || 'http://localhost:20128/api/v1';
  cfgApiKey.value = cfg.apiKey || '';
  cfgModel.value = cfg.model || 'auto';
  cfgDebounce.value = state.debounceMs;
  debounceVal.textContent = `${state.debounceMs}ms`;
  testResultStatus.textContent = '';

  settingsModal.style.display = 'flex';
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

cancelSettingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

toggleKeyVisibility.addEventListener('click', () => {
  if (cfgApiKey.type === 'password') {
    cfgApiKey.type = 'text';
    toggleKeyVisibility.textContent = '🔒';
  } else {
    cfgApiKey.type = 'password';
    toggleKeyVisibility.textContent = '👁️';
  }
});

cfgDebounce.addEventListener('input', () => {
  debounceVal.textContent = `${cfgDebounce.value}ms`;
});

testConnectionBtn.addEventListener('click', async () => {
  testResultStatus.className = 'test-result loading';
  testResultStatus.textContent = '⏳ Testando conexão...';
  testConnectionBtn.disabled = true;

  const res = await window.translator.testConnection({
    baseUrl: cfgBaseUrl.value,
    apiKey: cfgApiKey.value,
    model: cfgModel.value,
  });

  testConnectionBtn.disabled = false;
  if (res.ok) {
    testResultStatus.className = 'test-result success';
    testResultStatus.textContent = `✅ Sucesso! Conectado em ${res.latencyMs}ms (${res.model})`;
  } else {
    testResultStatus.className = 'test-result error';
    testResultStatus.textContent = `❌ Erro: ${res.error}`;
  }
});

saveSettingsBtn.addEventListener('click', async () => {
  const newConfig = {
    engine: cfgEngine.value,
    baseUrl: cfgBaseUrl.value.trim(),
    apiKey: cfgApiKey.value.trim(),
    model: cfgModel.value.trim() || 'auto',
  };

  await window.translator.saveConfig(newConfig);
  state.debounceMs = Number(cfgDebounce.value) || 1200;
  persistSettings();

  settingsModal.style.display = 'none';
  showToast('Configurações salvas com sucesso!', 'success');
});

// Fechar modais ao clicar no backdrop
window.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.style.display = 'none';
  if (e.target === historyModal) historyModal.style.display = 'none';
});

/* ==========================================================================
   Atalhos Globais de Teclado
   ========================================================================== */

window.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape') {
    if (settingsModal.style.display === 'flex') {
      settingsModal.style.display = 'none';
      return;
    }
    if (historyModal.style.display === 'flex') {
      historyModal.style.display = 'none';
      return;
    }
    if (state.currentId) {
      window.translator.cancel();
      finish(false, 'Tradução cancelada.');
    }
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault();
    settingsBtn.click();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
    e.preventDefault();
    historyBtn.click();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (!swapBtn.disabled) swapBtn.click();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
    copyBtn.click();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault();
    pasteBtn.click();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    micBtn.click();
    return;
  }
});

/* ==========================================================================
   Persistência e Inicialização
   ========================================================================== */

function persistSettings() {
  window.translator.saveSettings({
    source: state.source,
    target: state.target,
    auto: state.auto,
    mode: state.mode,
    tone: state.tone,
    debounceMs: state.debounceMs,
    theme: state.theme,
    lastText: sourceText.value,
  });
}

function schedulePersistSettings() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistSettings, 600);
}

async function init() {
  const isPinned = await window.translator.getAlwaysOnTop();
  state.alwaysOnTop = !!isPinned;
  pinBtn.classList.toggle('active', isPinned);

  const s = await window.translator.getSettings();
  if (s) {
    if (s.source && LANGUAGES.some((l) => l.code === s.source)) state.source = s.source;
    if (s.target && LANGUAGES.some((l) => l.code === s.target)) state.target = s.target;
    if (typeof s.auto === 'boolean') state.auto = s.auto;
    if (s.mode && MODES.some((m) => m.code === s.mode)) state.mode = s.mode;
    if (s.tone && TONES.some((t) => t.code === s.tone)) state.tone = s.tone;
    if (typeof s.debounceMs === 'number') state.debounceMs = s.debounceMs;
    if (s.theme) applyTheme(s.theme);
    else applyTheme('system');
  } else {
    applyTheme('system');
  }

  autoToggle.checked = state.auto;
  fillSelect(modeSelect, MODES, state.mode);
  fillSelect(toneSelect, TONES, state.tone);
  refreshSelects();
  refreshControls();
  initAudioRecording();

  if (s && typeof s.lastText === 'string') sourceText.value = s.lastText;
  updateCounts();
}

init();
