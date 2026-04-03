'use strict';

/**
 * オノマトペキーボード音 - 音声エンジン
 * Web Audio API を使用して効果音を管理・再生する
 */
class SoundEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.soundBuffers = {};
    this.soundsPath = '';
    this.volume = 0.7;
    this.mode = 'fun';
    this.lastPlayTime = {};
    this.lastPlayedSound = {};
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  async init(soundsPath, volume, mode) {
    this.soundsPath = soundsPath;
    this.volume = volume;
    this.mode = mode;

    // AudioContext の初期化
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.audioContext.destination);

    await this.loadSounds();
    this.isLoaded = true;
    console.log('✅ SoundEngine initialized');
  }

  async loadSounds() {
    const modes = ['quiet', 'fun', 'ehe', 'chaos'];
    const categories = ['char', 'space', 'enter', 'backspace', 'modifier'];
    
    const loadPromises = [];
    
    for (const mode of modes) {
      this.soundBuffers[mode] = {};
      
      for (const category of categories) {
        this.soundBuffers[mode][category] = [];
        
        // 各カテゴリに複数の音声バリエーションを読み込む
        const maxVariants = category === 'char' ? 3 : 1;
        
        for (let i = 1; i <= maxVariants; i++) {
          const filename = `${category}_${i}.wav`;
          const filePath = `file://${this.soundsPath}/${mode}/${filename}`;
          
          const loadPromise = this.loadAudioBuffer(filePath)
            .then(buffer => {
              if (buffer) {
                this.soundBuffers[mode][category].push(buffer);
              }
            })
            .catch(err => {
              console.warn(`⚠️ Could not load: ${filePath}`, err.message);
            });
          
          loadPromises.push(loadPromise);
        }
      }
    }
    
    await Promise.allSettled(loadPromises);
    console.log('🎵 Sound buffers loaded:', Object.keys(this.soundBuffers));
  }

  async loadAudioBuffer(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
      throw new Error(`Failed to load ${url}: ${err.message}`);
    }
  }

  /**
   * 音を再生する
   * @param {string} category - キー種別 (char/space/enter/backspace/modifier)
   * @param {boolean} throttled - 連打間引き中かどうか
   */
  play(category, throttled = false) {
    if (!this.isLoaded || !this.audioContext) return;
    
    // AudioContext が suspended の場合は resume
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const modeBuffers = this.soundBuffers[this.mode];
    if (!modeBuffers) return;
    
    const categoryBuffers = modeBuffers[category];
    if (!categoryBuffers || categoryBuffers.length === 0) return;
    
    // ランダムに音を選択（同じ音の連続を避ける）
    let bufferIndex;
    if (categoryBuffers.length > 1) {
      const lastIndex = this.lastPlayedSound[category];
      do {
        bufferIndex = Math.floor(Math.random() * categoryBuffers.length);
      } while (bufferIndex === lastIndex && categoryBuffers.length > 1);
    } else {
      bufferIndex = 0;
    }
    
    this.lastPlayedSound[category] = bufferIndex;
    const buffer = categoryBuffers[bufferIndex];
    
    // 音量調整（連打時は少し下げる）
    const gainValue = throttled ? this.volume * 0.6 : this.volume;
    
    // ソースノードを作成して再生
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = gainValue;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    source.start(0);
    
    // 再生終了後にクリーンアップ
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  /**
   * テスト再生（指定カテゴリの音を再生）
   */
  testPlay(category) {
    this.play(category, false);
  }

  /**
   * AudioContext を再開（ユーザーインタラクション後に必要）
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// グローバルにエクスポート
window.SoundEngine = SoundEngine;
