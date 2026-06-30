'use strict';

class SoundEngine {
  constructor() {
    this.soundFiles = {};
    this.soundsPath = '';
    this.volume = 0.7;
    this.mode = 'fun';
    this.lastPlayedSound = {};
    this.activeAudio = new Set();
    this.isLoaded = false;
  }

  async init(soundsPath, volume, mode) {
    this.soundsPath = soundsPath;
    this.volume = volume;
    this.mode = mode;

    await this.loadSounds();
    this.isLoaded = true;
    console.log('SoundEngine initialized');
  }

  async loadSounds() {
    const modes = ['quiet', 'fun', 'ehe', 'chaos'];
    const categories = ['char', 'space', 'enter', 'backspace', 'modifier'];

    for (const mode of modes) {
      this.soundFiles[mode] = {};

      for (const category of categories) {
        const files = [];
        const maxVariants = category === 'char' ? 3 : 1;

        for (let i = 1; i <= maxVariants; i += 1) {
          const filename = `${category}_${i}.wav`;
          const fileUrl = this.toFileUrl(`${this.soundsPath}/${mode}/${filename}`);
          files.push(fileUrl);
        }

        this.soundFiles[mode][category] = files;
      }
    }

    console.log('Sound files indexed:', Object.keys(this.soundFiles));
  }

  toFileUrl(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    return encodeURI(`file://${normalized}`);
  }

  play(category, throttled = false) {
    if (!this.isLoaded) return;

    const modeFiles = this.soundFiles[this.mode];
    if (!modeFiles) return;

    const categoryFiles = modeFiles[category];
    if (!categoryFiles || categoryFiles.length === 0) return;

    // Prevent long custom voice clips from stacking endlessly.
    // The keyboard should feel snappy: each new key press replaces any currently playing clip.
    this.stopAll();

    let fileIndex = 0;
    if (categoryFiles.length > 1) {
      const lastIndex = this.lastPlayedSound[category];
      do {
        fileIndex = Math.floor(Math.random() * categoryFiles.length);
      } while (fileIndex === lastIndex && categoryFiles.length > 1);
    }

    this.lastPlayedSound[category] = fileIndex;

    const audio = new Audio(categoryFiles[fileIndex]);
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, throttled ? this.volume * 0.6 : this.volume));

    const cleanup = () => {
      this.activeAudio.delete(audio);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };

    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    this.activeAudio.add(audio);

    audio.play().catch((err) => {
      cleanup();
      console.warn(`Failed to play ${category}:`, err.message);
    });
  }

  stopAll() {
    this.activeAudio.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      } catch (err) {
        console.warn('Failed to stop audio:', err.message);
      }
    });
    this.activeAudio.clear();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.activeAudio.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  setMode(mode) {
    if (mode !== this.mode) {
      this.stopAll();
    }
    this.mode = mode;
  }

  testPlay(category) {
    this.play(category, false);
  }

  async resume() {
    return Promise.resolve();
  }
}

window.SoundEngine = SoundEngine;
