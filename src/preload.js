'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 設定の取得・保存
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // 音声ファイルパスの取得
  getSoundsPath: () => ipcRenderer.invoke('get-sounds-path'),

  // ON/OFFトグル
  toggleEnabled: () => ipcRenderer.invoke('toggle-enabled'),

  // プラットフォーム情報
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Windows: フレームレスウィンドウ操作
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // メインプロセスからのイベント受信
  onPlaySound: (callback) => {
    ipcRenderer.on('play-sound', (event, data) => callback(data));
  },
  onToggleEnabled: (callback) => {
    ipcRenderer.on('toggle-enabled', (event, value) => callback(value));
  },

  // イベントリスナーの削除
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
