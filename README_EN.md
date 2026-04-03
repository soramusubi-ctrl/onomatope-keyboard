# 🎹 Onomatopoeia Keyboard

> Type with the sound of Japanese anime.  
> ぽ (po). ふわ (fuwa). えへ (ehe).  
> Every keystroke plays a cute Japanese sound effect.

[日本語のREADMEはこちら](README.md)

**Onomatopoeia Keyboard** is a desktop app that plays Japanese sound words (onomatopoeia) as you type. Instead of generic mechanical clicks, your keyboard will sound like a manga panel come to life.

Built with Electron, uiohook-napi, and Web Audio API.  
Supports macOS and Windows.

![App Screenshot](assets/icon.png)

## 🌐 Why This Exists (The Concept)

When manga and anime are translated into English, the original Japanese sound words are often replaced or removed. But if you love Japanese pop culture, you know those sounds *are* the vibe.

- **ぽ (po)** — a soft, gentle tap
- **ふわ (fuwa)** — light, floating, airy
- **えへ (ehe)** — a shy, embarrassed giggle

These nuanced sounds get flattened into generic English words like "tap", "whoosh", or "heh". The charm of the original Japanese expression disappears.

This app lets you experience those sounds every time you type — not as a translation, but as the real thing.

## ✨ Features

- **Global Key Detection**: Works in any app (browser, code editor, terminal).
- **Key-Type Sounds**: Different sounds for letters, Space, Enter, Backspace, and modifier keys.
- **4 Sound Modes**:
  - 🌸 **Quiet**: Subtle and elegant (*ぽ, ぴ, ふわ*)
  - 🎉 **Fun**: Bright and pop (*ぽぽ, ぽわーん, ぴんぽーん*)
  - 🐱 **えへ**: Shy, cute, very anime (*えへ, にゃ, やったー*)
  - 🌀 **Chaos**: Unpredictable and dramatic (*ぐわ, びよーん, じゃーん*)
- **Volume Control & Night Mode**
- **Sound Throttle**: Rapid keystrokes are automatically throttled so sounds never become overwhelming.
- **Bilingual UI**: Auto-detects your OS language, or manually switch between English and Japanese in Settings.

## 🚀 Installation

```bash
git clone https://github.com/soramusubi-ctrl/onomatope-keyboard.git
cd onomatope-keyboard
npm install
npm start
```

### macOS Note
On first launch, you'll need to grant Accessibility permission in *System Settings → Privacy & Security → Accessibility*. This is required for global keyboard detection.

## 🛠 Tech Stack

- Electron v28
- uiohook-napi (for global keyboard hooks)
- Web Audio API (for low-latency playback)
- electron-store (for settings persistence)

## 📅 Planned Features

- Target specific apps only
- Custom voice/sound imports
- More sound variations
- Standalone executables for easy distribution

## 📄 License

MIT
