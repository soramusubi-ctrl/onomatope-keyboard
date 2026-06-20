'use strict';

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

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
let rendererReady = false;
const lastKeyTime = {};

function getKeyCategory(keycode) {
  const SPACE = new Set([57]);
  const ENTER_TAB = new Set([28, 284, 15]);
  const BACKSPACE_DEL = new Set([14, 211]);
  const MODIFIERS = new Set([42, 54, 29, 157, 56, 184, 1, 219, 220, 221, 58, 325, 70]);
  const NAV_KEYS = new Set([200, 208, 203, 205, 199, 207, 201, 209, 210, 311]);
  const FUNCTION_KEYS = new Set([59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88]);

  if (SPACE.has(keycode)) return 'space';
  if (ENTER_TAB.has(keycode)) return 'enter';
  if (BACKSPACE_DEL.has(keycode)) return 'backspace';
  if (MODIFIERS.has(keycode) || NAV_KEYS.has(keycode) || FUNCTION_KEYS.has(keycode)) return 'modifier';
  return 'char';
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!rendererReady || mainWindow.webContents.isLoadingMainFrame()) return;

  try {
    mainWindow.webContents.send(channel, payload);
  } catch (err) {
    console.error(`Failed to send ${channel}:`, err.message);
  }
}

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

      if (now - lastTime < throttle && Math.random() < 0.5) {
        return;
      }

      lastKeyTime[category] = now;

      sendToRenderer('play-sound', {
        category,
        keycode: event.keycode,
        throttled: now - lastTime < throttle * 2
      });
    });

    uIOhook.start();
    keyboardHook = uIOhook;
    console.log('Keyboard hook started');
  } catch (err) {
    console.error('Failed to start keyboard hook:', err.message);
  }
}

function stopKeyboardHook() {
  if (!keyboardHook) return;
  try {
    keyboardHook.stop();
  } catch {}
  keyboardHook = null;
  console.log('Keyboard hook stopped');
}

function getAppIcon() {
  const assetsDir = path.join(__dirname, '../assets');
  if (IS_WIN) {
    const icoPath = path.join(assetsDir, 'icon.ico');
    const pngPath = path.join(assetsDir, 'icon.png');
    const fs = require('fs');
    return fs.existsSync(icoPath) ? icoPath : pngPath;
  }
  return path.join(assetsDir, 'icon.png');
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  try {
    const size = IS_WIN ? 16 : 22;
    const img = nativeImage.createFromPath(iconPath).resize({ width: size, height: size });
    if (IS_MAC) img.setTemplateImage(true);
    return img;
  } catch {
    return nativeImage.createEmpty();
  }
}

function createWindow() {
  const bounds = store.get('windowBounds', { width: 420, height: 580 });
  const platformOptions = IS_MAC
    ? {
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        trafficLightPosition: { x: 14, y: 14 }
      }
    : {
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
      webSecurity: false
    },
    icon: getAppIcon(),
    show: false
  });

  rendererReady = false;
  const diagnosticMode = process.argv.includes('--no-audio');
  const loadOptions = diagnosticMode ? { search: 'disableAudio=1' } : undefined;
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'), loadOptions);

  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true;
    console.log('Renderer finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, code, description, validatedURL) => {
    rendererReady = false;
    console.error('Renderer failed to load:', { code, description, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    rendererReady = false;
    console.error('Renderer process gone:', details);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}] ${sourceId}:${line} ${message}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    store.set('windowBounds', { width, height });
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    rendererReady = false;
    mainWindow = null;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
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
      label: isEnabled ? 'ON（クリックでOFF）' : 'OFF（クリックでON）',
      click: () => {
        isEnabled = !isEnabled;
        store.set('enabled', isEnabled);
        sendToRenderer('toggle-enabled', isEnabled);
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

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('オノマトペキーボード');
  updateTrayMenu();

  if (IS_MAC) {
    tray.on('click', toggleWindow);
  } else {
    tray.on('double-click', toggleWindow);
  }
}

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

ipcMain.handle('get-platform', () => process.platform);

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  setTimeout(startKeyboardHook, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  isQuitting = true;
  stopKeyboardHook();
});
