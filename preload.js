'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('translator', {
  translate: (payload) => ipcRenderer.send('translate', payload),
  cancel: () => ipcRenderer.send('translate:cancel'),
  copy: (text) => ipcRenderer.invoke('copy', text),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  onChunk: (cb) => ipcRenderer.on('translate-chunk', (_e, data) => cb(data)),
  onFinal: (cb) => ipcRenderer.on('translate-final', (_e, data) => cb(data)),
  onDone: (cb) => ipcRenderer.on('translate-done', (_e, data) => cb(data)),
  onError: (cb) => ipcRenderer.on('translate-error', (_e, data) => cb(data)),
});
