# 🌐 Tradutor Claude — Desktop AI Translator

<div align="center">

![Tradutor Claude Banner](https://img.shields.io/badge/Tradutor%20Claude-Desktop%20App-0078D4?style=for-the-badge&logo=electron&logoColor=white)
[![Electron](https://img.shields.io/badge/Electron-30.0.0-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-AI%20Gateway-FF4088?style=flat-square)](https://github.com/Aplicacoes-com-IA)
[![Organization](https://img.shields.io/badge/Org-Aplicações%20com%20IA-blueviolet?style=flat-square)](https://github.com/Aplicacoes-com-IA)

**Aplicativo desktop de alta performance para tradução, aprimoramento textual e transcrição de voz com Inteligência Artificial.**

[Funcionalidades](#-principais-funcionalidades) • [Arquitetura](#-arquitetura-do-projeto) • [Instalação](#-como-instalar-e-rodar) • [Configuração](#-configuração-do-motor-de-ia) • [Atalhos](#-atalhos-de-teclado) • [Autor](#-autor)

</div>

---

## 🚀 Principais Funcionalidades

### 1. 🎙️ Entrada por Voz 100% Nativa
- **Gravação e Transcrição em Tempo Real**: Captura áudio do microfone em formato PCM WAV 16kHz de alta definição.
- **Transcrição Precisa com Acentuação**: Processamento local via Python com suporte completo a caracteres UTF-8 (acentos e pontuação em Português, Inglês, Espanhol, Francês, Alemão, etc.).
- **Edição no Painel de Origem**: O texto falado é inserido diretamente no campo esquerdo, permitindo revisão ou correção antes e durante a tradução.

### 2. 🎭 Adaptação de Estilos e Tons de Voz
Alterne entre modos especializados para adequar o texto ao contexto exato de comunicação:
- **Modos de Operação**:
  - **Traduzir**: Tradução multilíngue direta de alta precisão.
  - **Traduzir e Melhorar**: Traduz adaptando a fluência, concordância e estilo.
  - **Apenas Melhorar (Revisão)**: Aprimora a redação mantendo o idioma original.
- **Tons Disponíveis**:
  - ✉️ **Para E-mail**: Estrutura a mensagem no padrão cortês e profissional de e-mail corporativo.
  - 💬 **Para Slack / Teams**: Mensagens dinâmicas, concisas e diretas ao ponto.
  - 📱 **Para WhatsApp**: Redação fluida, espontânea e natural.
  - 💼 **Profissional / Formal**: Vocabulário técnico, protocolar e polido.
  - 🤝 **Cordial & Persuasivo**: Ajustes de empatia ou copywriting focado em ação.

### 3. ⚡ Motor Híbrido Resiliente (OmniRoute + Claude CLI)
- **OmniRoute HTTP Gateway**: Tradução com latência ultrabaixa (~2s) e streaming contínuo com suporte a tokens de raciocínio (*reasoning tokens*).
- **Fallback Automático Claude CLI**: Se o servidor local estiver indisponível ou atingir limites, o aplicativo alterna automaticamente para o motor `claude` CLI sem interromper a experiência do usuário.
- **Inicialização 100% Silenciosa**: Inicialização do daemon de IA via Windows Script Host (`wscript.exe`) com flags `--no-open --no-tray`, sem abas de terminal ou abas indesejadas no navegador.

### 4. 🔍 Comparador Diff & Renderizador Markdown
- **Visualizador Diff**: Destaque visual palavra por palavra das alterações sugeridas no modo de melhoria textual.
- **Modo Markdown**: Renderização rica de tabelas, blocos de código, negrito, itálico e listas.
- **Síntese de Voz (TTS)**: Reprodução de áudio nativa tanto para o texto original quanto para a tradução.

### 5. 🌓 Interface Moderna e Responsiva
- Abas de idiomas superiores integradas (estilo Google Translate / DeepL) sem cortes em qualquer resolução de tela.
- Suporte a temas **Escuro (Dark)** e **Claro (Light)** com detecção automática do sistema.
- Modo **Fixar no Topo (Always on Top)** para uso produtivo lado a lado com outros aplicativos.

---

## 🛠️ Arquitetura do Projeto

```
claude-translator/
├── main.js                  # Processo Principal do Electron (IPC, Gestão de Janela e Motores IA)
├── preload.js               # Context Bridge seguro entre Electron e Renderer
├── package.json             # Dependências e scripts do projeto
├── config.json              # Configurações locais da API / Provedor (ignorado no Git)
├── renderer/
│   ├── index.html           # Estrutura semântica da interface
│   ├── style.css            # Design system, temas dark/light, diff e animações
│   └── app.js               # Lógica de interface, Web Audio API (WAV 16kHz) e eventos
└── scripts/
    ├── run-hidden.vbs       # Launcher WScript para inicialização 100% oculta
    ├── transcribe.py        # Motor de transcrição de áudio em Python (UTF-8)
    ├── trigger-dictation.ps1 # Helper opcional de ditado
    └── test-improvements.js # Suíte de validação e testes automatizados
```

---

## 💻 Como Instalar e Rodar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Python 3.10+](https://www.python.org/) com a biblioteca `SpeechRecognition`:
  ```bash
  pip install SpeechRecognition
  ```
- (Opcional) [OmniRoute](https://github.com/Aplicacoes-com-IA) ou [Claude Code CLI](https://docs.anthropic.com/claude/docs/claude-code).

### Passo a Passo

1. **Clone o Repositório**:
   ```bash
   git clone https://github.com/Aplicacoes-com-IA/claude-translator.git
   cd claude-translator
   ```

2. **Instale as Dependências do Node**:
   ```bash
   npm install
   ```

3. **Inicie o Aplicativo**:
   ```bash
   npm start
   ```

---

## ⚙️ Configuração do Motor de IA

O aplicativo lê as preferências a partir do menu **Opções** na interface ou pelo arquivo `config.json`:

```json
{
  "engine": "auto",
  "baseUrl": "http://localhost:20128/api/v1",
  "apiKey": "sua-chave-aqui",
  "model": "opencode/big-pickle"
}
```

| Parâmetro | Descrição |
| :--- | :--- |
| `engine` | `auto` (OmniRoute com fallback para CLI), `http` (Apenas API) ou `cli` (Apenas Claude CLI). |
| `baseUrl` | Endpoint da API compatível com OpenAI (Padrão OmniRoute: `http://localhost:20128/api/v1`). |
| `apiKey` | Chave de autenticação Bearer para o gateway ou provedor. |
| `model` | Modelo de IA desejado (`opencode/big-pickle`, `claude-3-5-sonnet`, `gpt-4o`, etc.). |

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + Enter` | Traduzir ou Melhorar texto imediatamente |
| `Esc` | Fechar modais abertos |
| `🎙️ Voz` (Clique) | Iniciar / Parar gravação de voz |

---

## 👤 Autor

Desenvolvido e mantido por **[Adrian Oliveira](https://github.com/adrian-oliv)** sob a organização **[Aplicações com IA](https://github.com/Aplicacoes-com-IA)**.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
