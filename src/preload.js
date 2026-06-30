'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  getSoundsPath: () => ipcRenderer.invoke('get-sounds-path'),
  toggleEnabled: () => ipcRenderer.invoke('toggle-enabled'),
  getPlatform: () => process.platform,
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onPlaySound: (callback) => {
    ipcRenderer.on('play-sound', (event, data) => callback(data));
  },
  onToggleEnabled: (callback) => {
    ipcRenderer.on('toggle-enabled', (event, value) => callback(value));
  },
  onStopSounds: (callback) => {
    ipcRenderer.on('stop-sounds', () => callback());
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
