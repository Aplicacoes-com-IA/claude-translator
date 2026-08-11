'use strict';

// Teste de fumaça headless: compara latência e funcionamento de várias invocações
// do CLI claude para achar a MAIS RÁPIDA que funciona neste ambiente (o modelo
// padrão demora ~15s; o objetivo é achar um modelo rápido tipo Haiku).

const { spawn, execSync } = require('child_process');
const readline = require('readline');

const PROMPT =
  process.argv[2] ||
  'Translate to Portuguese. Respond ONLY with the translation: Good morning, how are you today?';

// Candidatas (prefixos de provedor vistos no erro "Ambiguous model" deste ambiente)
const VARIANTS = [
  { name: 'A: padrão (sem --model)', args: ['-p', '--output-format', 'stream-json', '--verbose'] },
  {
    name: 'B: lma/claude-haiku-4-5-20251001',
    args: ['-p', '--output-format', 'stream-json', '--model', 'lma/claude-haiku-4-5-20251001', '--verbose'],
  },
  {
    name: 'C: cc/claude-haiku-4-5-20251001',
    args: ['-p', '--output-format', 'stream-json', '--model', 'cc/claude-haiku-4-5-20251001', '--verbose'],
  },
];

let index = 0;

function runNext() {
  if (index >= VARIANTS.length) {
    console.log('\n== fim ==');
    return;
  }
  run(VARIANTS[index++]);
}

function run(variant) {
  let firstLine = null;
  let stderr = '';
  let finalText = null;
  const seen = new Set();
  const t0 = Date.now();
  console.log(`\n== ${variant.name} ==\n   claude ${variant.args.join(' ')}`);

  const child = spawn('claude', variant.args, {
    shell: process.platform === 'win32', // Windows: `claude` é um shim .cmd
    windowsHide: true,
    env: process.env,
  });

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    if (firstLine === null) firstLine = line.slice(0, 90);
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      return;
    }
    if (evt.type) seen.add(evt.type);
    if (evt.type === 'result' && typeof evt.result === 'string' && evt.result) finalText = evt.result;
  });

  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  child.on('error', (err) => report(variant, err, stderr, seen, finalText, Date.now() - t0, null));
  child.on('close', (code) => report(variant, null, stderr, seen, finalText, Date.now() - t0, code));

  child.stdin.on('error', () => {});
  child.stdin.write(PROMPT);
  child.stdin.end();
}

function report(variant, err, stderr, seen, finalText, ms, code) {
  console.log('  exit:', code, '| tempo:', ms, 'ms');
  console.log('  eventos:', [...seen].join(', ') || '(nenhum)');
  console.log('  stderr:', stderr ? stderr.trim().slice(0, 300) : '(vazio)');
  if (err) console.log('  error:', err.message);
  if (finalText) console.log('  resultado:', JSON.stringify(finalText));
  const ok = code === 0 && finalText && !/error|issue with the selected model/i.test(finalText);
  console.log(ok ? '  => OK ✅' : '  => FALHOU ❌');
  runNext();
}

try {
  const where = execSync(process.platform === 'win32' ? 'where claude' : 'which claude', {
    encoding: 'utf8',
    shell: true,
  }).trim();
  console.log('Caminho do claude:', where.split(/\r?\n/).join(' | '));
} catch {
  console.log('Caminho do claude: (não localizado)');
}

runNext();
