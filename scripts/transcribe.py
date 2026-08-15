#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transcritor de áudio local/nativo para o Tradutor Claude.
Converte arquivos de áudio (.wav) gravados pelo microfone em texto.
"""

import sys
import os
import json

# Garante saída UTF-8 no Windows para preservar acentos (ex: á, é, ã, ç)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def get_speech_recognition():
    try:
        import speech_recognition as sr
        return sr
    except ImportError:
        return None

def transcribe(audio_path, lang="pt-BR"):
    sr = get_speech_recognition()
    if sr is None:
        return {"ok": False, "error": "Módulo SpeechRecognition não instalado"}

    if not os.path.exists(audio_path):
        return {"ok": False, "error": f"Arquivo de áudio não encontrado: {audio_path}"}

    r = sr.Recognizer()
    r.energy_threshold = 300
    r.dynamic_energy_threshold = True

    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = r.record(source)
            text = r.recognize_google(audio_data, language=lang)
            return {"ok": True, "text": text}
    except sr.UnknownValueError:
        return {"ok": False, "error": "Nenhuma fala identificada. Fale mais próximo ao microfone."}
    except sr.RequestError as e:
        return {"ok": False, "error": f"Erro de conexão no serviço de fala: {e}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Informe o caminho do arquivo de áudio"}))
        sys.exit(1)

    audio_file = sys.argv[1]
    lang_tag = sys.argv[2] if len(sys.argv) > 2 else "pt-BR"
    
    # Normaliza tag de idioma (ex: 'pt' -> 'pt-BR', 'en' -> 'en-US', 'es' -> 'es-ES')
    lang_map = {
        'pt': 'pt-BR',
        'pt-BR': 'pt-BR',
        'en': 'en-US',
        'en-US': 'en-US',
        'es': 'es-ES',
        'es-ES': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'ja': 'ja-JP',
        'zh': 'zh-CN',
        'auto': 'pt-BR'
    }
    target_lang = lang_map.get(lang_tag, lang_tag)

    res = transcribe(audio_file, target_lang)
    print(json.dumps(res, ensure_ascii=False))
