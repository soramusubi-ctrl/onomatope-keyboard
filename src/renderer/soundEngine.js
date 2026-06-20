'use strict';

class SoundEngine {
  constructor() {
    this.soundFiles = {};
    this.soundsPath = '';
    this.volume = 0.7;
    this.mode = 'fun';
    this.lastPlayedSound = {};
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

    let fileIndex = 0;
    if (categoryFiles.length > 1) {
      const lastIndex = this.lastPlayedSound[category];
      do {
        fileIndex = Math.floor(Math.random() * categoryFiles.length);
      } while (fileIndex === lastIndex && categoryFiles.length > 1);
    }

    this.lastPlayedSound[category] = fileIndex;

    const audio = new Audio(categoryFiles[fileIndex]);
    audio.volume = Math.max(0, Math.min(1, throttled ? this.volume * 0.6 : this.volume));
    audio.play().catch((err) => {
      console.warn(`Failed to play ${category}:`, err.message);
    });
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setMode(mode) {
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
