'use strict';

const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TRANSLATE_TIMEOUT_MS = 60_000;

// Flags confirmadas no `claude --help` e validadas no smoke test deste ambiente:
// --no-use-tools/--max-turns não existem; --model é ambíguo aqui (roteamento
// multi-provedor), então usa-se o modelo padrão configurado no CLI. O prompt vai
// via stdin, não como argumento.
const CLI_ARGS = ['-p', '--output-format', 'stream-json', '--verbose'];

// Motor HTTP rápido: OmniRoute local (localhost:20128) com o modelo free
// `opencode/big-pickle` — validado no http-probe: status 200, ~4s (contra 13-15s
// do CLI). As credenciais ficam em config.json (fora do source). Se o servidor
// estiver fora do ar ou a chamada falhar, cai automaticamente para o motor CLI.
const configPath = () => path.join(__dirname, 'config.json');
const DEFAULT_HTTP_MODEL = 'opencode/big-pickle';

const OMNIROUTE_HEALTH_URL = 'http://localhost:20128/';
const OMNIROUTE_START_SCRIPT = () =>
  path.join(__dirname, '..', 'scripts', 'iniciar-omniroute-servidor.ps1');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return {};
  }
}

/* ---------- Auto-início do servidor OmniRoute ---------- */

async function omnirouteUp() {
  try {
    const res = await fetch(OMNIROUTE_HEALTH_URL, { signal: AbortSignal.timeout(800) });
    return res.status < 500;
  } catch {
    return false;
  }
}

// Garante que o servidor local (localhost:20128) esteja no ar; se não estiver,
// dispara o script iniciar-omniroute-servidor.ps1 (que já checa a porta e é
// idempotente) e aguarda subir por até ~5s.
async function ensureOmniroute() {
  if (await omnirouteUp()) return true;

  try {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', OMNIROUTE_START_SCRIPT(),
    ], { windowsHide: true, detached: true, stdio: 'ignore' });
    child.unref();
  } catch (err) {
    console.error('[omniroute] falha ao iniciar servidor:', err.message);
    return false;
  }

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await omnirouteUp()) return true;
  }
  return false;
}

let mainWindow = null;
let active = null; // { id, child?, controller? }

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

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
  } catch (err) {
    console.error('Falha ao salvar configurações:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 820,
    minHeight: 520,
    backgroundColor: '#ffffff',
    title: 'Tradutor Claude',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', () => {
    // Ao fechar a janela, apaga o texto salvo para que o app reabra vazio.
    // Idiomas e o toggle de auto-tradução continuam sendo lembrados.
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

function translationInstruction(source, target) {
  const from = source && source !== 'auto' ? ` de ${source}` : '';
  const to = target || 'Português';
  return `Traduza o texto abaixo${from} para ${to}.`;
}

function buildPrompt(source, target, text) {
  return (
    `Você é um tradutor profissional. ${translationInstruction(source, target)} ` +
    `Responda APENAS com a tradução, sem explicações, sem aspas, sem título, sem texto adicional.\n\n${text}`
  );
}

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
    if (active.controller) active.controller.abort();
    if (active.child) killTree(active.child);
    active = null;
  }
}

function friendlyError(err, stderr) {
  const text = ((err && err.message) || '') + ' ' + stderr;
  if (err && err.code === 'ENOENT' || /não é reconhecido|not recognized|is not recognized|not found/i.test(text)) {
    return 'Não foi possível encontrar o comando "claude". Verifique se o Claude Code está instalado e no PATH.';
  }
  if (/auth|login|not logged|expired|api key/i.test(text)) {
    return 'Problema de autenticação do Claude. Abra um terminal e rode "claude" uma vez para entrar.';
  }
  const trimmed = (stderr || '').trim();
  return trimmed ? `Falha na tradução: ${trimmed.slice(0, 300)}` : 'Falha na tradução. Tente novamente.';
}

/* ---------- Motor CLI (claude -p, stream-json) ---------- */

function cliTranslate(id, source, target, text) {
  const prompt = buildPrompt(source, target, text);

  const child = spawn('claude', CLI_ARGS, {
    shell: process.platform === 'win32', // Windows: `claude` é um shim .cmd
    windowsHide: true,
    env: process.env,
  });

  active = { id, child };

  let stderr = '';
  let finalText = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (active && active.id === id) active = null;
  };

  const timer = setTimeout(() => {
    killTree(child);
    finish();
    send('translate-error', { id, message: 'Tempo esgotado (60s). Tente novamente.' });
  }, TRANSLATE_TIMEOUT_MS);

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
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
    finish();
    send('translate-error', { id, message: friendlyError(err, stderr) });
  });

  child.on('close', (code) => {
    const wasActive = active && active.id === id;
    finish();
    if (!wasActive) return; // cancelada ou substituída

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

/* ---------- Motor HTTP (OmniRoute local, OpenAI-compatível, SSE) ---------- */

function httpTranslate(id, cfg, source, target, text) {
  const controller = new AbortController();
  active = { id, controller };

  const url = `${String(cfg.baseUrl || '').replace(/\/+$/, '')}/chat/completions`;
  const system =
    'Você é um tradutor profissional. Responda APENAS com a tradução, sem explicações, sem aspas, sem título, sem texto adicional.';
  const user = `${translationInstruction(source, target)}\n\n${text}`;

  let finalText = null;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (active && active.id === id) active = null;
  };

  const timer = setTimeout(() => {
    controller.abort();
    finish();
    send('translate-error', { id, message: 'Tempo esgotado (60s). Tente novamente.' });
  }, TRANSLATE_TIMEOUT_MS);

  (async () => {
    const up = await ensureOmniroute();
    if (!up) {
      finish();
      send('translate-error', {
        id,
        message: 'Servidor OmniRoute offline e não pôde ser iniciado. Verifique se o OmniRoute está instalado.',
      });
      return;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model || DEFAULT_HTTP_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${errBody ? ': ' + errBody.slice(0, 120) : ''}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const consume = (payload) => {
        if (payload === '[DONE]') return;
        let evt;
        try {
          evt = JSON.parse(payload);
        } catch {
          return;
        }
        const choice = evt.choices && evt.choices[0];
        const delta = choice && choice.delta;
        const piece = delta && (delta.content || delta.text);
        if (typeof piece === 'string' && piece) {
          finalText = (finalText || '') + piece;
          send('translate-chunk', { id, text: piece });
        }
      };

      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line.startsWith('data:')) consume(line.slice(5).trim());
        }
      }
      if (buffer.trim().startsWith('data:')) consume(buffer.trim().slice(5).trim());

      finish();
      if (finalText) {
        send('translate-final', { id, text: finalText });
        send('translate-done', { id });
      } else {
        console.error('[http] stream vazio, caindo para CLI');
        cliTranslate(id, source, target, text);
      }
    } catch (err) {
      if (controller.signal.aborted) return; // cancelada ou substituída
      finish();
      console.error(`[http] falhou (${url}):`, err.message);
      cliTranslate(id, source, target, text); // fallback
    }
  })();
}

/* ---------- Ponto de entrada da tradução ---------- */

function startTranslation({ id, text, source, target }) {
  if (!text || !text.trim()) {
    send('translate-done', { id });
    return;
  }

  cancelActive();

  const cfg = loadConfig();
  if (cfg.apiKey && cfg.baseUrl) {
    httpTranslate(id, cfg, source, target, text);
  } else {
    cliTranslate(id, source, target, text);
  }
}

app.whenReady().then(() => {
  ipcMain.on('translate', (_event, payload) => {
    if (payload && typeof payload.id === 'string') startTranslation(payload);
  });
  ipcMain.on('translate:cancel', () => cancelActive());

  ipcMain.handle('copy', (_event, text) => {
    clipboard.writeText(String(text));
    return true;
  });
  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.handle('settings:save', (_event, settings) => {
    saveSettings(settings || {});
    return true;
  });

  createWindow();

  // Já inicia o OmniRoute na abertura para a primeira tradução não esperar.
  ensureOmniroute().then((ok) =>
    console.log(ok ? '[omniroute] servidor no ar' : '[omniroute] servidor indisponível')
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
