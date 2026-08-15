'use strict';

const { app, BrowserWindow, ipcMain, clipboard, session } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const TRANSLATE_TIMEOUT_MS = 60_000;
const CLI_ARGS = ['-p', '--output-format', 'stream-json', '--verbose'];
const DEFAULT_HTTP_MODEL = 'opencode/big-pickle';
const OMNIROUTE_HEALTH_URL = 'http://localhost:20128/';

const configPath = () => path.join(__dirname, 'config.json');
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const OMNIROUTE_START_SCRIPT = () =>
  path.join(__dirname, '..', 'scripts', 'iniciar-omniroute-servidor.ps1');

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      engine: parsed.engine || 'auto', // 'auto' | 'http' | 'cli'
      apiKey: parsed.apiKey || '',
      model: parsed.model || 'auto',
      baseUrl: parsed.baseUrl || 'http://localhost:20128/api/v1',
    };
  } catch {
    return {
      engine: 'auto',
      apiKey: '',
      model: 'auto',
      baseUrl: 'http://localhost:20128/api/v1',
    };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Falha ao salvar config.json:', err);
    return false;
  }
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Falha ao salvar configurações:', err);
    return false;
  }
}

/* ---------- Verificação e Auto-início do servidor OmniRoute ---------- */

async function omnirouteUp() {
  try {
    const res = await fetch('http://127.0.0.1:20128/api/monitoring/health', { signal: AbortSignal.timeout(1200) });
    return res.status < 500;
  } catch {
    try {
      const res2 = await fetch('http://127.0.0.1:20128/', { signal: AbortSignal.timeout(1200) });
      return res2.status < 500;
    } catch {
      return false;
    }
  }
}

async function ensureOmniroute(id = null) {
  if (await omnirouteUp()) return true;

  if (id) {
    send('translate-status', {
      id,
      message: '⏳ Inicializando motor de IA em segundo plano (aguarde alguns segundos)...',
    });
  }

  const omniMjs = 'C:\\Users\\Work\\AppData\\Roaming\\npm\\node_modules\\omniroute\\bin\\omniroute.mjs';
  const vbsPath = path.join(__dirname, 'scripts', 'run-hidden.vbs');

  if (fs.existsSync(vbsPath) && fs.existsSync(omniMjs)) {
    try {
      const child = spawn('wscript.exe', [vbsPath, omniMjs], {
        windowsHide: true,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } catch (err) {
      console.error('[omniroute] falha ao iniciar via wscript:', err.message);
    }
  } else if (fs.existsSync(omniMjs)) {
    try {
      const child = spawn('node.exe', [omniMjs, 'serve', '--no-open', '--no-tray'], {
        windowsHide: true,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } catch (err) {
      console.error('[omniroute] falha ao iniciar servidor node:', err.message);
    }
  }

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600));
    if (await omnirouteUp()) {
      if (id) {
        send('translate-status', { id, message: '⚡ Motor de IA pronto! Processando tradução...' });
      }
      return true;
    }
  }
  return false;
}

/* ---------- Gerenciamento da Janela Principal ---------- */

let mainWindow = null;
let active = null; // { id, child?, controller?, timer? }

function createWindow() {
  const savedSettings = loadSettings();
  const windowState = savedSettings.windowState || {
    width: 1200,
    height: 740,
    x: undefined,
    y: undefined,
    isMaximized: false,
    alwaysOnTop: false,
  };

  mainWindow = new BrowserWindow({
    width: windowState.width || 1200,
    height: windowState.height || 740,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 540,
    backgroundColor: '#ffffff',
    title: 'Tradutor Claude',
    autoHideMenuBar: true,
    alwaysOnTop: !!windowState.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const saveWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const current = loadSettings();
    saveSettings({
      ...current,
      windowState: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
        alwaysOnTop: mainWindow.isAlwaysOnTop(),
      },
    });
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  mainWindow.on('close', () => {
    saveWindowState();
    // Ao fechar a janela, limpa o texto salvo para abrir limpo na próxima inicialização
    const settings = loadSettings();
    if (settings && typeof settings.lastText === 'string' && settings.lastText) {
      saveSettings({ ...settings, lastText: '' });
    }
  });
}

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/* ---------- Prompts e Instruções de Tradução e Estilo ---------- */

const TONES = {
  neutral: {
    label: 'Natural',
    systemRule: 'Escreva em um tom natural, fluido e equilibrado, com gramática e concordância impecáveis.',
    userRule: 'em tom natural, fluido e equilibrado, corrigindo qualquer erro gramatical.',
  },
  casual: {
    label: 'Casual',
    systemRule: 'Escreva em um tom casual, descontraído, coloquial e amigável, como uma conversa informal entre colegas ou amigos.',
    userRule: 'em tom casual, informal, amigável e descontraído.',
  },
  professional: {
    label: 'Profissional',
    systemRule: 'Escreva em um tom estritamente profissional, corporativo, claro, conciso, educado e objetivo.',
    userRule: 'em tom estritamente corporativo e profissional, claro, conciso e polido.',
  },
  formal: {
    label: 'Formal',
    systemRule: 'Escreva em um tom formal, culto, protocolar e polido, com vocabulário refinado e estrutura impecável.',
    userRule: 'em tom formal, culto, protocolar e polido, adequado a documentos e comunicações oficiais.',
  },
  email: {
    label: 'Para E-mail',
    systemRule: 'Escreva e estruture OBRIGATORIAMENTE como um E-MAIL profissional claro e elegante. Adapte a mensagem para o formato, cortesia e estrutura padrão de e-mail corporativo (com saudação e fechamento adequados se couber no contexto).',
    userRule: 'formatado e redigido como um E-MAIL profissional claro, cortês e bem estruturado (com saudação e despedida adequadas ao teor da mensagem).',
  },
  slack: {
    label: 'Para Slack / Teams',
    systemRule: 'Escreva para chat corporativo (Slack/Teams): direto ao ponto, ágil, conciso e colaborativo.',
    userRule: 'formatado para chat corporativo (Slack/Teams): conciso, direto ao ponto e ágil.',
  },
  whatsapp: {
    label: 'Para WhatsApp',
    systemRule: 'Escreva como mensagem de WhatsApp: espontânea, natural, direta, dinâmica e amigável.',
    userRule: 'formatado como mensagem de WhatsApp: dinâmica, natural e direta.',
  },
  friendly: {
    label: 'Cordial',
    systemRule: 'Escreva em um tom caloroso, gentil, empático, atencioso e muito cordial.',
    userRule: 'em tom acolhedor, cordial, empático e atencioso.',
  },
  persuasive: {
    label: 'Persuasivo',
    systemRule: 'Escreva em um tom altamente persuasivo, convincente, assertivo e focado em valor e benefícios.',
    userRule: 'em tom persuasivo, convincente e impactante, destacando clareza e valor.',
  },
};

function buildPromptMessages(source, target, text, mode, tone) {
  const t = TONES[tone] || TONES.neutral;
  const targetLanguage = target || 'Português';
  const fromLanguage = source && source !== 'auto' ? ` de ${source}` : '';

  let system = '';
  let user = '';

  if (mode === 'polish') {
    system =
      'Você é um redator e revisor textual sênior de elite. ' +
      'Sua missão é aprimorar o texto no mesmo idioma, aplicando rigorosamente o estilo solicitado.\n' +
      `Regra de Estilo: ${t.systemRule}\n` +
      'Responda APENAS com o texto final reescrito, sem explicações preliminares, sem comentários e sem aspas delimitadoras.';
    user =
      `Reescreva e aprimore o texto abaixo mantendo o mesmo idioma.\n` +
      `Estilo e Tom obrigatórios: ${t.userRule}\n\n` +
      `Texto original:\n${text}`;
  } else if (mode === 'translate-polish') {
    system =
      'Você é um tradutor e redator profissional multilíngue de elite. ' +
      'Sua missão é traduzir o texto e adaptá-lo ativamente ao formato e tom de comunicação solicitados.\n' +
      `Regra de Estilo: ${t.systemRule}\n` +
      'Responda APENAS com o texto traduzido e adaptado no estilo solicitado, sem explicações preliminares, sem comentários e sem aspas delimitadoras.';
    user =
      `Traduza o texto abaixo${fromLanguage} para ${targetLanguage} e adapte a redação ao estilo solicitado.\n` +
      `Estilo e Tom obrigatórios: ${t.userRule}\n\n` +
      `Texto original:\n${text}`;
  } else {
    // Mode === 'translate' (tradução direta)
    system =
      'Você é um tradutor multilíngue profissional de alta precisão. ' +
      'Responda APENAS com a tradução final, preservando termos técnicos e formatação Markdown intactos, sem explicações e sem aspas delimitadoras.';
    const toneNote = tone && tone !== 'neutral' ? `\nTom desejado: ${t.userRule}` : '';
    user =
      `Traduza o texto abaixo com alta precisão e fluência${fromLanguage} para ${targetLanguage}.${toneNote}\n\n` +
      `Texto original:\n${text}`;
  }

  return { system, user };
}

function buildPrompt(source, target, text, mode, tone) {
  const { system, user } = buildPromptMessages(source, target, text, mode, tone);
  return `${system}\n\n${user}`;
}

/* ---------- Controle de Processos e Cancelamento ---------- */

function killTree(child) {
  try {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    /* ignorado */
  }
}

function cancelActive() {
  if (active) {
    if (active.timer) clearTimeout(active.timer);
    if (active.controller) active.controller.abort();
    if (active.child) killTree(active.child);
    active = null;
  }
}

function friendlyError(err, stderr) {
  const text = ((err && err.message) || '') + ' ' + (stderr || '');
  if ((err && err.code === 'ENOENT') || /não é reconhecido|not recognized|is not recognized|not found/i.test(text)) {
    return 'Não foi possível encontrar o comando "claude". Verifique se o Claude Code CLI está instalado e presente no PATH.';
  }
  if (/auth|login|not logged|expired|api key|unauthorized/i.test(text)) {
    return 'Problema de autenticação. Verifique sua chave de API ou execute "claude" no terminal para autenticar.';
  }
  const trimmed = (stderr || '').trim();
  return trimmed ? `Erro: ${trimmed.slice(0, 260)}` : 'Falha na tradução. Verifique a conexão e tente novamente.';
}

/* ---------- Motor CLI (claude CLI -p stream-json) ---------- */

function cliTranslate(id, source, target, text, mode, tone) {
  if (active && active.id !== id) return;

  const prompt = buildPrompt(source, target, text, mode, tone);

  let child;
  try {
    child = spawn('claude', CLI_ARGS, {
      shell: process.platform === 'win32',
      windowsHide: true,
      env: process.env,
    });
  } catch (err) {
    send('translate-error', { id, message: friendlyError(err, '') });
    return;
  }

  const timer = setTimeout(() => {
    killTree(child);
    if (active && active.id === id) active = null;
    send('translate-error', { id, message: 'Tempo esgotado (60s). Tente novamente.' });
  }, TRANSLATE_TIMEOUT_MS);

  active = { id, child, timer };

  let stderr = '';
  let finalText = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (active && active.id === id) active = null;
  };

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    if (active?.id !== id) return;
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      return;
    }
    if (evt.type === 'assistant' && Array.isArray(evt.message && evt.message.content)) {
      for (const block of evt.message.content) {
        if (block.type === 'text' && block.text) {
          send('translate-chunk', { id, text: block.text });
        } else if (
          block.type === 'content_block_delta' &&
          block.delta &&
          block.delta.type === 'text_delta' &&
          block.delta.text
        ) {
          send('translate-chunk', { id, text: block.delta.text });
        }
      }
    } else if (evt.type === 'result' && typeof evt.result === 'string' && evt.result) {
      finalText = evt.result;
    }
  });

  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  child.on('error', (err) => {
    const wasActive = active && active.id === id;
    finish();
    if (wasActive) {
      send('translate-error', { id, message: friendlyError(err, stderr) });
    }
  });

  child.on('close', (code) => {
    const wasActive = active && active.id === id;
    finish();
    if (!wasActive) return;

    if (code === 0) {
      if (finalText) send('translate-final', { id, text: finalText });
      send('translate-done', { id });
      return;
    }

    send('translate-error', { id, message: friendlyError(null, stderr) });
  });

  child.stdin.on('error', () => {});
  child.stdin.write(prompt);
  child.stdin.end();
}

/* ---------- Motor HTTP (OpenAI / OmniRoute / Custom API) ---------- */

function httpTranslate(id, cfg, source, target, text, mode, tone) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
    if (active && active.id === id) active = null;
    send('translate-error', { id, message: 'Tempo esgotado (60s). Tente novamente.' });
  }, TRANSLATE_TIMEOUT_MS);

  active = { id, controller, timer };

  const url = `${String(cfg.baseUrl || 'http://127.0.0.1:20128/api/v1').replace(/\/+$/, '')}/chat/completions`;
  const isLocalOmniroute = url.includes('localhost:20128') || url.includes('127.0.0.1:20128');

  const { system, user } = buildPromptMessages(source, target, text, mode, tone);
  const modelToUse = !cfg.model || cfg.model === 'auto' ? DEFAULT_HTTP_MODEL : cfg.model;

  (async () => {
    if (isLocalOmniroute) {
      const isUp = await omnirouteUp();
      if (!isUp) {
        send('translate-status', {
          id,
          message: '⏳ Inicializando motor de IA em segundo plano (aguarde alguns segundos)...',
        });
        const up = await ensureOmniroute(id);
        if (controller.signal.aborted || active?.id !== id) return;
        if (!up) {
          if (cfg.engine === 'http') {
            clearTimeout(timer);
            if (active?.id === id) active = null;
            send('translate-error', {
              id,
              message: 'Servidor OmniRoute local não respondeu a tempo. Verifique as configurações.',
            });
            return;
          }
          // Fallback para CLI
          console.warn('[http] Servidor OmniRoute local indisponível, alternando para motor CLI');
          cliTranslate(id, source, target, text, mode, tone);
          return;
        }
      }
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) {
        headers['Authorization'] = `Bearer ${cfg.apiKey}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      if (controller.signal.aborted || active?.id !== id) return;

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${errBody ? ': ' + errBody.slice(0, 150) : ''}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalText = '';

      const consume = (payload) => {
        if (payload === '[DONE]') return;
        let evt;
        try {
          evt = JSON.parse(payload);
        } catch {
          return;
        }

        if (evt.error) {
          throw new Error(evt.error.message || 'Erro na resposta do provedor de IA');
        }

        const choice = evt.choices && evt.choices[0];
        const delta = choice && choice.delta;
        const piece = delta && (delta.content || delta.text);
        if (typeof piece === 'string' && piece) {
          finalText += piece;
          send('translate-chunk', { id, text: piece });
        }
      };

      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (controller.signal.aborted || active?.id !== id) return;
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });

        // Se o início do buffer já for um erro JSON completo
        if (buffer.trim().startsWith('{"error":')) {
          try {
            const errObj = JSON.parse(buffer.trim());
            if (errObj.error) {
              throw new Error(errObj.error.message || 'Erro no provedor de IA');
            }
          } catch (e) {
            if (e.message.includes('Erro')) throw e;
          }
        }

        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line.startsWith('data:')) consume(line.slice(5).trim());
        }
      }

      if (buffer.trim().startsWith('data:')) {
        consume(buffer.trim().slice(5).trim());
      } else if (buffer.trim().startsWith('{')) {
        try {
          const errObj = JSON.parse(buffer.trim());
          if (errObj.error) {
            throw new Error(errObj.error.message || 'Erro no provedor de IA');
          }
        } catch (e) {
          if (e.message.includes('Erro')) throw e;
        }
      }

      clearTimeout(timer);
      if (active && active.id === id) active = null;

      if (finalText && finalText.trim()) {
        send('translate-final', { id, text: finalText });
        send('translate-done', { id });
      } else {
        if (cfg.engine === 'auto') {
          console.warn('[http] Stream vazio, alternando para motor CLI');
          cliTranslate(id, source, target, text, mode, tone);
        } else {
          send('translate-error', { id, message: 'Resposta vazia da API. Tente novamente.' });
        }
      }
    } catch (err) {
      if (controller.signal.aborted || (active && active.id !== id)) return;
      clearTimeout(timer);
      if (active && active.id === id) active = null;

      console.error(`[http] Erro na requisição (${url}):`, err.message);

      if (cfg.engine === 'auto') {
        console.warn('[http] Falha na chamada HTTP, tentando motor CLI de fallback');
        cliTranslate(id, source, target, text, mode, tone);
      } else {
        send('translate-error', {
          id,
          message: `Falha na API (${err.message.slice(0, 160)}). Verifique sua configuração.`,
        });
      }
    }
  })();
}

/* ---------- Início da Tradução ---------- */

function startTranslation({ id, text, source, target, mode, tone }) {
  if (!text || !text.trim()) {
    send('translate-done', { id });
    return;
  }

  cancelActive();

  const cfg = loadConfig();
  if (cfg.engine === 'cli') {
    cliTranslate(id, source, target, text, mode, tone);
  } else if (cfg.engine === 'http' || (cfg.apiKey && cfg.baseUrl)) {
    httpTranslate(id, cfg, source, target, text, mode, tone);
  } else {
    cliTranslate(id, source, target, text, mode, tone);
  }
}

/* ---------- Inicialização do Aplicativo e IPC ---------- */

app.whenReady().then(() => {
  // Tradução
  ipcMain.on('translate', (_event, payload) => {
    if (payload && typeof payload.id === 'string') startTranslation(payload);
  });
  ipcMain.on('translate:cancel', () => cancelActive());

  // Clipboard
  ipcMain.handle('copy', (_event, text) => {
    clipboard.writeText(String(text || ''));
    return true;
  });
  ipcMain.handle('paste', () => {
    return clipboard.readText();
  });

  // Configurações do usuário
  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.handle('settings:save', (_event, settings) => {
    return saveSettings(settings || {});
  });

  // Configurações do motor
  ipcMain.handle('config:get', () => loadConfig());
  ipcMain.handle('config:save', (_event, config) => {
    return saveConfig(config || {});
  });

  // Testar conexão
  ipcMain.handle('config:test', async (_event, config) => {
    const targetUrl = `${String(config.baseUrl || 'http://localhost:20128/api/v1').replace(/\/+$/, '')}/chat/completions`;
    const t0 = Date.now();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
      const model = !config.model || config.model === 'auto' ? DEFAULT_HTTP_MODEL : config.model;

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping. Responda apenas "OK".' }],
          stream: false,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const ms = Date.now() - t0;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}`, latencyMs: ms };
      }
      return { ok: true, latencyMs: ms, model };
    } catch (err) {
      return { ok: false, error: err.message, latencyMs: Date.now() - t0 };
    }
  });

  // Transcrição de áudio nativa via Python / SpeechRecognition
  ipcMain.handle('transcribe-audio', async (_event, { audioBase64, mimeType, language }) => {
    if (!audioBase64) return { ok: false, error: 'Nenhum áudio recebido.' };

    const tempWav = path.join(os.tmpdir(), `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`);
    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(tempWav, buffer);

      const script = path.join(__dirname, 'scripts', 'transcribe.py');
      const lang = language || 'pt-BR';

      return await new Promise((resolve) => {
        execFile(
          'python',
          [script, tempWav, lang],
          {
            timeout: 20000,
            encoding: 'utf8',
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
          },
          (err, stdout, stderr) => {
          try {
            if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
          } catch {}

          if (err) {
            console.error('[transcribe] Erro ao executar script python:', err, stderr);
            return resolve({ ok: false, error: 'Falha ao processar o áudio localmente.' });
          }

          try {
            const res = JSON.parse(stdout.trim());
            resolve(res);
          } catch (e) {
            console.error('[transcribe] JSON inválido de transcribe.py:', stdout);
            resolve({ ok: false, error: stdout.trim() || 'Resposta inválida do transcritor.' });
          }
        });
      });
    } catch (err) {
      try {
        if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
      } catch {}
      return { ok: false, error: err.message };
    }
  });

  // Controle de janela
  ipcMain.handle('window:set-always-on-top', (_event, flag) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(!!flag);
      return mainWindow.isAlwaysOnTop();
    }
    return false;
  });

  ipcMain.handle('window:get-always-on-top', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return mainWindow.isAlwaysOnTop();
    }
    return false;
  });

  // Ativação do Ditado por Voz Nativo
  ipcMain.handle('dictation:start', () => {
    if (process.platform === 'win32') {
      const script = path.join(__dirname, 'scripts', 'trigger-dictation.ps1');
      if (fs.existsSync(script)) {
        try {
          const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script], {
            windowsHide: true,
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          return true;
        } catch (err) {
          console.error('[dictation] falha ao iniciar ditado:', err);
        }
      }
    }
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });

  createWindow();

  // Inicia o OmniRoute em background na inicialização para agilizar a primeira tradução
  ensureOmniroute().catch(() => {});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
