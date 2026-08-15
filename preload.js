'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('translator', {
  // Tradução
  translate: (payload) => ipcRenderer.send('translate', payload),
  cancel: () => ipcRenderer.send('translate:cancel'),

  // Área de transferência e áudio
  copy: (text) => ipcRenderer.invoke('copy', text),
  paste: () => ipcRenderer.invoke('paste'),
  startDictation: () => ipcRenderer.invoke('dictation:start'),
  transcribeAudio: (payload) => ipcRenderer.invoke('transcribe-audio', payload),

  // Configurações do usuário (interface e preferências)
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Configurações do motor (API / CLI / config.json)
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  testConnection: (config) => ipcRenderer.invoke('config:test', config),

  // Controle de janela
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),

  // Eventos de streaming e status da tradução
  onStatus: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('translate-status', handler);
    return () => ipcRenderer.removeListener('translate-status', handler);
  },
  onChunk: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('translate-chunk', handler);
    return () => ipcRenderer.removeListener('translate-chunk', handler);
  },
  onFinal: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('translate-final', handler);
    return () => ipcRenderer.removeListener('translate-final', handler);
  },
  onDone: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('translate-done', handler);
    return () => ipcRenderer.removeListener('translate-done', handler);
  },
  onError: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('translate-error', handler);
    return () => ipcRenderer.removeListener('translate-error', handler);
  },
});
