'use strict';

/**
 * オノマトペキーボード音 - レンダラープロセス
 * UI制御・設定管理・音声エンジン連携
 * Mac・Windows 共通
 */

// カテゴリごとのオノマトペ表示テキスト
const ONOMATOPOEIA = {
  quiet: {
    char: ['ぽ', 'ぴ', 'こ', 'とん', 'ぽつ'],
    space: ['ふわ', 'すー', 'ほわ'],
    enter: ['ぽん', 'こん', 'ぽーん'],
    backspace: ['すっ', 'きゅ', 'ぴゅ'],
    modifier: ['ちっ', 'ぴ', 'こ']
  },
  fun: {
    char: ['ぽぽ', 'きゅ', 'ぴこ', 'ぽん', 'ぴっ'],
    space: ['ぽわーん', 'ふわー', 'ぽわ'],
    enter: ['ぴんぽーん！', 'やったー', 'ぽーん'],
    backspace: ['ぴゅ', 'すーっ', 'ぴゅるる'],
    modifier: ['ぴっ', 'ぽっ', 'きゅ']
  },
  ehe: {
    char: ['えへ', 'にゃ', 'ふふ', 'うふ', 'えへへ'],
    space: ['ほわ〜', 'ふわわ', 'えへ〜'],
    enter: ['やったー！', 'えへへ', 'ぴゃー'],
    backspace: ['あれ〜', 'えっ', 'あわわ'],
    modifier: ['ぴょ', 'にゃっ', 'えへ']
  },
  chaos: {
    char: ['ぐわ', 'びよーん', 'ぴぴぴ', 'ぐるぐる', 'ぐにゃ'],
    space: ['どーん！', 'ぼーん', 'ぐわーん'],
    enter: ['じゃーん！', 'ばーん！', 'どかーん！'],
    backspace: ['ぐしゃ', 'ぼろろ', 'ぐちゃ'],
    modifier: ['ぴゅるるる', 'ぐるぐる', 'ぎゅいーん']
  }
};

const CATEGORY_ICONS = {
  char: '⌨️',
  space: '⎵',
  enter: '↵',
  backspace: '⌫',
  modifier: '⇧'
};

const PLATFORM_LABELS = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux'
};

class OnomatopeApp {
  constructor() {
    this.soundEngine = new SoundEngine();
    this.lang = 'ja';
    this.i18n = window.I18N || {};
    this.onomatopoeiaEn = window.ONOMATOPOEIA_EN || {};
    this.settings = {
      enabled: true,
      volume: 0.7,
      mode: 'fun',
      nightMode: false,
      throttleMs: 80
    };
    this.platform = 'darwin';
    this.isInitialized = false;
    this.recentTimeout = null;
  }

  async init() {
    try {
      // プラットフォーム情報を取得してbodyにクラスを付与
      this.platform = await window.electronAPI.getPlatform();
      document.body.classList.add(`platform-${this.platform === 'win32' ? 'win' : this.platform === 'darwin' ? 'mac' : 'linux'}`);

      // バージョン情報にプラットフォームを表示
      const platformEl = document.getElementById('version-platform');
      if (platformEl) {
        platformEl.textContent = PLATFORM_LABELS[this.platform] || this.platform;
      }

      // 設定を読み込む
      const savedSettings = await window.electronAPI.getSettings();
      this.settings = { ...this.settings, ...savedSettings };

      // 音声ファイルパスを取得
      const soundsPath = await window.electronAPI.getSoundsPath();

      // 音声エンジンを初期化
      await this.soundEngine.init(soundsPath, this.settings.volume, this.settings.mode);

      // 言語設定を初期化
      this.initLanguage();

      // UIを初期化
      this.initUI();

      // イベントリスナーを設定
      this.setupEventListeners();

      // メインプロセスからのイベントを受信
      this.setupIPCListeners();

      this.isInitialized = true;
      console.log(`✅ OnomatopeApp initialized on ${this.platform}`);
    } catch (err) {
      console.error('❌ Failed to initialize app:', err);
      this.showError('初期化に失敗しました: ' + err.message);
    }
  }

  initLanguage() {
    // 保存済み言語設定を優先、なければOS自動検出
    const savedLangPref = this.settings.langPref || 'auto';
    if (savedLangPref === 'en') {
      this.lang = 'en';
    } else if (savedLangPref === 'ja') {
      this.lang = 'ja';
    } else {
      // auto: OSの言語設定を取得
      const userLang = navigator.language || navigator.userLanguage;
      this.lang = userLang.startsWith('ja') ? 'ja' : 'en';
    }
    this.langPref = savedLangPref;
    document.documentElement.lang = this.lang;
    this.applyTranslations();
    this.updateLangButtons();
  }

  updateLangButtons() {
    const pref = this.langPref || 'auto';
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === pref);
    });
  }

  applyTranslations() {
    const dict = this.i18n[this.lang] || this.i18n['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
    
    // ON/OFFトグルの状態も更新
    this.updateToggleUI(this.settings.enabled);
    // 言語ボタンのアクティブ状態を更新
    this.updateLangButtons();
  }

  initUI() {
    // ON/OFFトグル
    const enabledToggle = document.getElementById('enabled-toggle');
    enabledToggle.checked = this.settings.enabled;
    this.updateToggleUI(this.settings.enabled);

    // 音量スライダー
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    volumeSlider.value = Math.round(this.settings.volume * 100);
    volumeValue.textContent = `${Math.round(this.settings.volume * 100)}%`;
    this.updateSliderTrack(volumeSlider);

    // モードボタン
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.settings.mode);
    });

    // 連打間引きスライダー
    const throttleSlider = document.getElementById('throttle-slider');
    const throttleValue = document.getElementById('throttle-value');
    throttleSlider.value = this.settings.throttleMs;
    throttleValue.textContent = `${this.settings.throttleMs}ms`;
    this.updateSliderTrack(throttleSlider);

    // ナイトモード
    const nightModeToggle = document.getElementById('night-mode-toggle');
    nightModeToggle.checked = this.settings.nightMode;
    if (this.settings.nightMode) {
      document.body.classList.add('night-mode');
    }
  }

  setupEventListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // ON/OFFトグル
    const enabledToggle = document.getElementById('enabled-toggle');
    enabledToggle.addEventListener('change', async () => {
      this.settings.enabled = enabledToggle.checked;
      this.updateToggleUI(this.settings.enabled);
      await this.saveSettings({ enabled: this.settings.enabled });
      await this.soundEngine.resume();
    });

    // 音量スライダー
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    volumeSlider.addEventListener('input', () => {
      const vol = volumeSlider.value / 100;
      this.settings.volume = vol;
      volumeValue.textContent = `${volumeSlider.value}%`;
      this.soundEngine.setVolume(this.settings.nightMode ? vol * 0.5 : vol);
      this.updateSliderTrack(volumeSlider);
    });
    volumeSlider.addEventListener('change', async () => {
      await this.saveSettings({ volume: this.settings.volume });
    });

    // モードボタン
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mode = btn.dataset.mode;
        this.settings.mode = mode;
        this.soundEngine.setMode(mode);
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.mode === mode);
        });
        await this.saveSettings({ mode });
        await this.soundEngine.resume();
        this.soundEngine.testPlay('char');
        this.showRecentSound('char', false);
      });
    });

    // テスト再生ボタン
    document.querySelectorAll('.test-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const category = btn.dataset.category;
        await this.soundEngine.resume();
        this.soundEngine.testPlay(category);
        this.showRecentSound(category, false);
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => { btn.style.transform = ''; }, 150);
      });
    });

    // 設定タブの再生ボタン
    document.querySelectorAll('.play-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const category = btn.dataset.category;
        await this.soundEngine.resume();
        this.soundEngine.testPlay(category);
        btn.textContent = '♪';
        setTimeout(() => { btn.textContent = '▶'; }, 500);
      });
    });

    // 連打間引きスライダー
    const throttleSlider = document.getElementById('throttle-slider');
    const throttleValue = document.getElementById('throttle-value');
    throttleSlider.addEventListener('input', () => {
      this.settings.throttleMs = parseInt(throttleSlider.value);
      throttleValue.textContent = `${throttleSlider.value}ms`;
      this.updateSliderTrack(throttleSlider);
    });
    throttleSlider.addEventListener('change', async () => {
      await this.saveSettings({ throttleMs: this.settings.throttleMs });
    });

    // ナイトモード
    const nightModeToggle = document.getElementById('night-mode-toggle');
    nightModeToggle.addEventListener('change', async () => {
      this.settings.nightMode = nightModeToggle.checked;
      document.body.classList.toggle('night-mode', this.settings.nightMode);
      this.soundEngine.setVolume(
        this.settings.nightMode ? this.settings.volume * 0.5 : this.settings.volume
      );
      await this.saveSettings({ nightMode: this.settings.nightMode });
    });

    // Windows: カスタムウィンドウボタン
    const btnMinimize = document.getElementById('btn-minimize');
    const btnClose = document.getElementById('btn-close');
    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
      });
    }
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        window.electronAPI.closeWindow();
      });
    }

    // 言語切替ボタン
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pref = btn.dataset.lang;
        this.langPref = pref;
        if (pref === 'en') {
          this.lang = 'en';
        } else if (pref === 'ja') {
          this.lang = 'ja';
        } else {
          // auto
          const userLang = navigator.language || navigator.userLanguage;
          this.lang = userLang.startsWith('ja') ? 'ja' : 'en';
        }
        document.documentElement.lang = this.lang;
        this.applyTranslations();
        await this.saveSettings({ langPref: pref });
      });
    });

    // ウィンドウクリックで AudioContext を再開
    document.addEventListener('click', () => {
      this.soundEngine.resume();
    }, { once: true });
  }

  setupIPCListeners() {
    window.electronAPI.onPlaySound((data) => {
      if (!this.settings.enabled || !this.isInitialized) return;
      const { category, throttled } = data;
      const vol = this.settings.nightMode
        ? this.settings.volume * 0.5
        : this.settings.volume;
      this.soundEngine.setVolume(vol);
      this.soundEngine.play(category, throttled);
      this.showRecentSound(category, throttled);
    });

    window.electronAPI.onToggleEnabled((enabled) => {
      this.settings.enabled = enabled;
      const enabledToggle = document.getElementById('enabled-toggle');
      enabledToggle.checked = enabled;
      this.updateToggleUI(enabled);
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  updateToggleUI(enabled) {
    const card = document.getElementById('main-toggle-card');
    const status = document.getElementById('toggle-status');
    const subtitle = document.getElementById('toggle-subtitle');
    const soundWave = document.getElementById('sound-wave');
    const dict = this.i18n[this.lang] || this.i18n['en'];

    if (enabled) {
      card.classList.remove('disabled');
      status.textContent = dict.statusOn || 'ON';
      subtitle.textContent = dict.statusSubtitleOn || 'キーボード音が鳴ります';
      soundWave.classList.remove('paused');
    } else {
      card.classList.add('disabled');
      status.textContent = dict.statusOff || 'OFF';
      subtitle.textContent = dict.statusSubtitleOff || '音は鳴りません';
      soundWave.classList.add('paused');
    }
  }

  showRecentSound(category, throttled) {
    const recentIcon = document.getElementById('recent-icon');
    const recentText = document.getElementById('recent-text');
    if (!recentIcon || !recentText) return;

    const mode = this.settings.mode;
    const dict = this.lang === 'ja' ? ONOMATOPOEIA : this.onomatopoeiaEn;
    const texts = dict[mode]?.[category] || ['...'];
    const text = texts[Math.floor(Math.random() * texts.length)];
    const icon = CATEGORY_ICONS[category] || '🎹';
    
    const i18nDict = this.i18n[this.lang] || this.i18n['en'];
    const suffix = throttled ? (i18nDict.throttledSuffix || '（間引き中）') : '';

    recentIcon.textContent = icon;
    recentText.textContent = text + suffix;
    recentText.classList.add('active');
    recentIcon.classList.add('bounce');

    const card = document.querySelector('.main-toggle-section .toggle-card');
    if (card && this.settings.enabled) {
      card.classList.add('key-flash');
      setTimeout(() => card.classList.remove('key-flash'), 300);
    }

    clearTimeout(this.recentTimeout);
    this.recentTimeout = setTimeout(() => {
      recentText.classList.remove('active');
    }, 1500);

    setTimeout(() => {
      recentIcon.classList.remove('bounce');
    }, 300);
  }

  updateSliderTrack(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value);
    const progress = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--progress', `${progress}%`);
  }

  async saveSettings(partial) {
    try {
      await window.electronAPI.setSettings(partial);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  showError(message) {
    const recentText = document.getElementById('recent-text');
    if (recentText) {
      recentText.textContent = '⚠️ ' + message;
      recentText.style.color = '#ff6b6b';
    }
  }
}

// アプリを起動
const app = new OnomatopeApp();

document.addEventListener('DOMContentLoaded', () => {
  app.init().catch(console.error);
});
