'use strict';

// Probe HTTP: testa rotas de API (opencode Zen direto + OmniRoute local) com a
// chave fornecida, mede latência e mostra qual modelo/rota funciona. Não imprime a chave.

const KEY = process.env.OMNIROUTE_KEY;
if (!KEY) {
  console.log('Defina a chave com: OMNIROUTE_KEY="..." node scripts/http-probe.js');
  process.exit(1);
}

const PROMPT =
  'Translate to Portuguese. Respond ONLY with the translation: Good morning, how are you today?';

const TARGETS = [
  {
    name: 'opencode Zen (direto)',
    base: 'https://opencode.ai/zen/v1',
    models: ['claude-haiku-4-5', 'gpt-5-nano'],
  },
  {
    name: 'OmniRoute local',
    base: 'http://localhost:20128/api/v1',
    models: [
      'opencode/big-pickle',
      'big-pickle',
      'opencode-zen/claude-haiku-4-5',
      'cc/claude-haiku-4-5-20251001',
    ],
  },
];

async function probe(base, model) {
  const url = `${base}/chat/completions`;
  const t0 = Date.now();
  console.log(`\n== ${model} @ ${base}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Você é um tradutor profissional. Responda APENAS com a tradução, sem explicações.',
          },
          { role: 'user', content: PROMPT },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const ms = Date.now() - t0;
    const body = await res.text();
    let content = null;
    try {
      const j = JSON.parse(body);
      content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    } catch {
      /* corpo não-JSON */
    }
    console.log(`   status: ${res.status} | ${ms} ms | headers model: ${res.headers.get('x-omniroute-model') || '-'}`);
    if (content) console.log(`   conteúdo: ${JSON.stringify(content)}`);
    else console.log(`   resposta: ${body.replace(/\s+/g, ' ').slice(0, 300)}`);
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`   ERRO (${ms} ms): ${err.message}`);
  }
}

(async () => {
  try {
    await fetch('http://localhost:20128/', { signal: AbortSignal.timeout(2000) });
    console.log('OmniRoute local: no ar ✅');
  } catch {
    console.log('OmniRoute local: FORA DO AR (para usá-lo, rode o script iniciar-omniroute-servidor.ps1)');
  }

  for (const t of TARGETS) {
    console.log(`\n----- ${t.name} -----`);
    for (const m of t.models) {
      await probe(t.base, m);
    }
  }
  console.log('\n== fim ==');
})();
