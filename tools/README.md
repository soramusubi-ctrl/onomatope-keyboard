# Tools

## Sync voice materials

作業用フォルダの `wav` を `assets/sounds` に反映します。

### 実行

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-voice-materials.ps1
```

### 反映前の確認だけ

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-voice-materials.ps1 -DryRun
```

### 別テンプレート名を使う

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\sync-voice-materials.ps1 -TemplateName "my-voice-pack"
```
