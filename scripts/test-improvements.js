'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Iniciando testes de validação das melhorias ===\n');

// 1. Validar config.json
const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
assert(config.engine, 'config.engine deve existir');
assert(config.baseUrl, 'config.baseUrl deve existir');
console.log('✓ config.json validado com sucesso:', config);

// 2. Validar index.html existe e possui elementos-chave
const htmlPath = path.join(__dirname, '..', 'renderer', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
assert(html.includes('id="pin-btn"'), 'Deve conter botão pin');
assert(html.includes('id="theme-btn"'), 'Deve conter botão de tema');
assert(html.includes('id="history-btn"'), 'Deve conter botão de histórico');
assert(html.includes('id="settings-btn"'), 'Deve conter botão de configurações');
assert(html.includes('id="diff-toggle-btn"'), 'Deve conter botão de diff');
assert(html.includes('id="source-tts-btn"'), 'Deve conter botão de TTS');
assert(html.includes('id="paste-btn"'), 'Deve conter botão de colar');
assert(html.includes('id="settings-modal"'), 'Deve conter modal de configurações');
assert(html.includes('id="history-modal"'), 'Deve conter modal de histórico');
console.log('✓ index.html contém todos os novos elementos e modais');

// 3. Validar style.css tem suporte a temas e diff
const cssPath = path.join(__dirname, '..', 'renderer', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');
assert(css.includes('[data-theme="dark"]'), 'CSS deve ter tema escuro');
assert(css.includes('.diff-del'), 'CSS deve ter estilos de diff-del');
assert(css.includes('.diff-add'), 'CSS deve ter estilos de diff-add');
assert(css.includes('.modal-overlay'), 'CSS deve ter estilos de modal');
assert(css.includes('.toast'), 'CSS deve ter estilos de toast');
console.log('✓ style.css contém temas dark/light, diff, modais e animações');

// 4. Testar algoritmo de Diff
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

const original = 'Eu gosto de comer maça';
const improved = 'Eu adoro comer maçã';
const diffResult = computeDiff(tokenize(original), tokenize(improved));
assert(diffResult.some(p => p.type === 'del' && p.text === 'gosto'), 'Diff deve identificar remoção de gosto');
assert(diffResult.some(p => p.type === 'add' && p.text === 'adoro'), 'Diff deve identificar adição de adoro');
console.log('✓ Algoritmo de Diff validado:', diffResult.map(d => `[${d.type}: ${d.text}]`).join(' '));

console.log('\n=== Todos os testes foram executados com sucesso! ===');
