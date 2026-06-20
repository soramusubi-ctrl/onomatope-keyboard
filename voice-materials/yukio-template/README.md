# Yukio Voice Pack Template

このフォルダは、自作の音素材を整理してから `assets/sounds` に差し替えるための作業用テンプレートです。

## 使い方

1. 各フォルダに `wav` を入れます
2. ファイル名は下の一覧に合わせます
3. 置き換えたいときは、対応するファイルを `assets/sounds/<mode>/` にコピーします

## 目安

- 形式: `wav`
- 長さ: 0.1秒 から 0.8秒くらい
- 音量: 大きすぎないようにそろえる
- 無音: 先頭と末尾はできるだけ短くする

## ファイル一覧

### quiet

- `quiet/char_1.wav`
- `quiet/char_2.wav`
- `quiet/char_3.wav`
- `quiet/space_1.wav`
- `quiet/enter_1.wav`
- `quiet/backspace_1.wav`
- `quiet/modifier_1.wav`

### fun

- `fun/char_1.wav`
- `fun/char_2.wav`
- `fun/char_3.wav`
- `fun/space_1.wav`
- `fun/enter_1.wav`
- `fun/backspace_1.wav`
- `fun/modifier_1.wav`

### ehe

- `ehe/char_1.wav`
- `ehe/char_2.wav`
- `ehe/char_3.wav`
- `ehe/space_1.wav`
- `ehe/enter_1.wav`
- `ehe/backspace_1.wav`
- `ehe/modifier_1.wav`

### chaos

- `chaos/char_1.wav`
- `chaos/char_2.wav`
- `chaos/char_3.wav`
- `chaos/space_1.wav`
- `chaos/enter_1.wav`
- `chaos/backspace_1.wav`
- `chaos/modifier_1.wav`

## おすすめの中身

- `char_*`: 「ぽ」「ぴ」「こ」など短い音
- `space_1`: 「ふわ」など少し伸びる音
- `enter_1`: 「ぽん」「やった」など決定感のある音
- `backspace_1`: 「すっ」「あれ」など引く感じの音
- `modifier_1`: 「ちっ」「ぴっ」など軽い音

## コピー先

- 元の再生先: `assets/sounds/quiet`
- 元の再生先: `assets/sounds/fun`
- 元の再生先: `assets/sounds/ehe`
- 元の再生先: `assets/sounds/chaos`

## 一括反映コマンド

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-voice-materials.ps1
```

反映前に確認だけしたいとき:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-voice-materials.ps1 -DryRun
```
