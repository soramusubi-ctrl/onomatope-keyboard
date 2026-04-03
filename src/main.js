'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

// ストア初期化
const store = new Store({
  defaults: {
    enabled: true,
    volume: 0.7,
    mode: 'fun',
    nightMode: false,
    throttleMs: 80,
    targetApps: [],
    windowBounds: { width: 420, height: 580 }
  }
});

let mainWindow = null;
let tray = null;
let keyboardHook = null;
let isEnabled = store.get('enabled');
let isQuitting = false;

// キーボードフック管理
let lastKeyTime = {};

// ============================================================
// キーコード分類（uiohook-napi / libuiohook 共通コード）
// Mac・Windows・Linux 共通のスキャンコードを使用
// ============================================================
function getKeyCategory(keycode) {
  // libuiohook のスキャンコード（プラットフォーム共通）
  // https://github.com/kwhat/libuiohook/blob/master/include/uiohook.h

  // Space: 57
  const SPACE = new Set([57]);

  // Enter: 28（メイン）, 284（テンキー）, Tab: 15
  const ENTER_TAB = new Set([28, 284, 15]);

  // Backspace: 14, Delete: 211
  const BACKSPACE_DEL = new Set([14, 211]);

  // 修飾キー
  // Shift L/R: 42, 54
  // Ctrl L/R: 29, 157
  // Alt L/R: 56, 184
  // Esc: 1
  // Win/Cmd L/R: 219, 220
  // Menu/App: 221
  // CapsLock: 58
  // NumLock: 325
  // ScrollLock: 70
  const MODIFIERS = new Set([42, 54, 29, 157, 56, 184, 1, 219, 220, 221, 58, 325, 70]);

  // 矢印キー: Up: 200, Down: 208, Left: 203, Right: 205
  // Home: 199, End: 207, PgUp: 201, PgDn: 209
  // Insert: 210, PrintScreen: 311
  const NAV_KEYS = new Set([200, 208, 203, 205, 199, 207, 201, 209, 210, 311]);

  // ファンクションキー F1〜F12: 59〜68, 87, 88
  const FUNCTION_KEYS = new Set([59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88]);

  if (SPACE.has(keycode)) return 'space';
  if (ENTER_TAB.has(keycode)) return 'enter';
  if (BACKSPACE_DEL.has(keycode)) return 'backspace';
  if (MODIFIERS.has(keycode)) return 'modifier';
  if (NAV_KEYS.has(keycode)) return 'modifier';
  if (FUNCTION_KEYS.has(keycode)) return 'modifier';
  return 'char';
}

// ============================================================
// キーボードフック
// ============================================================
function startKeyboardHook() {
  if (keyboardHook) return;

  try {
    const { uIOhook } = require('uiohook-napi');

    uIOhook.on('keydown', (event) => {
      if (!isEnabled) return;

      const category = getKeyCategory(event.keycode);
      const now = Date.now();
      const lastTime = lastKeyTime[category] || 0;
      const throttle = store.get('throttleMs', 80);

      // 連打間引き（throttle未満の間隔は50%の確率でスキップ）
      if (now - lastTime < throttle) {
        if (Math.random() < 0.5) return;
      }

      lastKeyTime[category] = now;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('play-sound', {
          category,
          keycode: event.keycode,
          throttled: now - lastTime < throttle * 2
        });
      }
    });

    uIOhook.start();
    keyboardHook = uIOhook;
    console.log('✅ Keyboard hook started');
  } catch (err) {
    console.error('❌ Failed to start keyboard hook:', err.message);
    // フォールバック: フックなしで動作継続（権限不足など）
  }
}

function stopKeyboardHook() {
  if (keyboardHook) {
    try {
      keyboardHook.stop();
    } catch (e) {}
    keyboardHook = null;
    console.log('⏹ Keyboard hook stopped');
  }
}

// ============================================================
// ウィンドウ作成（Mac・Windows 共通）
// ============================================================
function createWindow() {
  const bounds = store.get('windowBounds', { width: 420, height: 580 });

  // プラットフォーム別のウィンドウオプション
  const platformOptions = IS_MAC
    ? {
        // macOS: ネイティブなすりガラス風タイトルバー
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        trafficLightPosition: { x: 14, y: 14 }
      }
    : {
        // Windows: カスタムフレームレスウィンドウ
        frame: false,
        titleBarStyle: 'hidden'
      };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 380,
    minHeight: 500,
    maxWidth: 600,
    maxHeight: 700,
    resizable: true,
    backgroundColor: '#1a1a2e',
    ...platformOptions,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // ローカルWAVファイルアクセスのため
    },
    icon: getAppIcon(),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    store.set('windowBounds', { width, height });
  });

  // Windows: ウィンドウを閉じてもトレイに常駐（×ボタンで非表示）
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ============================================================
// アイコンパス取得（プラットフォーム別）
// ============================================================
function getAppIcon() {
  const assetsDir = path.join(__dirname, '../assets');
  if (IS_WIN) {
    // Windows: ICOファイルがあれば使用、なければPNG
    const icoPath = path.join(assetsDir, 'icon.ico');
    const pngPath = path.join(assetsDir, 'icon.png');
    const fs = require('fs');
    return fs.existsSync(icoPath) ? icoPath : pngPath;
  }
  return path.join(assetsDir, 'icon.png');
}

function getTrayIcon() {
  const assetsDir = path.join(__dirname, '../assets');
  try {
    if (IS_WIN) {
      // Windows: 16x16 PNG をトレイに使用
      const iconPath = path.join(assetsDir, 'tray-icon.png');
      return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else if (IS_MAC) {
      // macOS: テンプレートイメージ（白黒自動切換え）
      const iconPath = path.join(assetsDir, 'tray-icon.png');
      const img = nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 });
      img.setTemplateImage(true);
      return img;
    } else {
      // Linux
      const iconPath = path.join(assetsDir, 'tray-icon.png');
      return nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 });
    }
  } catch (e) {
    return nativeImage.createEmpty();
  }
}

// ============================================================
// システムトレイ
// ============================================================
function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('オノマトペキーボード');
  updateTrayMenu();

  // Mac: クリックでウィンドウ表示/非表示
  // Windows: ダブルクリックでウィンドウ表示
  if (IS_MAC) {
    tray.on('click', toggleWindow);
  } else {
    tray.on('double-click', toggleWindow);
  }
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: isEnabled ? '🔊 ON（クリックでOFF）' : '🔇 OFF（クリックでON）',
      click: () => {
        isEnabled = !isEnabled;
        store.set('enabled', isEnabled);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('toggle-enabled', isEnabled);
        }
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: '設定を開く',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
}

// ============================================================
// IPC ハンドラー
// ============================================================
ipcMain.handle('get-settings', () => ({
  enabled: store.get('enabled'),
  volume: store.get('volume'),
  mode: store.get('mode'),
  nightMode: store.get('nightMode'),
  throttleMs: store.get('throttleMs'),
  targetApps: store.get('targetApps')
}));

ipcMain.handle('set-settings', (event, settings) => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key, value);
  });
  if ('enabled' in settings) {
    isEnabled = settings.enabled;
    updateTrayMenu();
  }
  return { success: true };
});

ipcMain.handle('get-sounds-path', () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sounds');
  }
  return path.join(__dirname, '../assets/sounds');
});

ipcMain.handle('toggle-enabled', () => {
  isEnabled = !isEnabled;
  store.set('enabled', isEnabled);
  updateTrayMenu();
  return isEnabled;
});

// プラットフォーム情報をレンダラーに提供
ipcMain.handle('get-platform', () => process.platform);

// Windows: ウィンドウ操作（フレームレスのため）
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

// ============================================================
// アプリライフサイクル
// ============================================================
app.whenReady().then(() => {
  createWindow();
  createTray();

  // キーボードフック開始（少し遅延してアクセシビリティ権限確認後に）
  setTimeout(startKeyboardHook, 1000);

  // macOS: Dock アイコンクリックでウィンドウ再表示
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Mac・Windows ともにトレイ常駐のため、ここでは終了しない
  // 終了はトレイメニューの「終了」から行う
});

app.on('before-quit', () => {
  isQuitting = true;
  stopKeyboardHook();
});
