param(
  [string]$TemplateName = "yukio-template",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot "voice-materials\$TemplateName"
$targetRoot = Join-Path $projectRoot "assets\sounds"

if (-not (Test-Path -LiteralPath $sourceRoot)) {
  throw "Template folder not found: $sourceRoot"
}

$modes = @("quiet", "fun", "ehe", "chaos")
$copied = @()

foreach ($mode in $modes) {
  $sourceMode = Join-Path $sourceRoot $mode
  $targetMode = Join-Path $targetRoot $mode

  if (-not (Test-Path -LiteralPath $sourceMode)) {
    continue
  }

  if (-not (Test-Path -LiteralPath $targetMode)) {
    New-Item -ItemType Directory -Path $targetMode | Out-Null
  }

  $wavFiles = Get-ChildItem -LiteralPath $sourceMode -File -Filter *.wav
  foreach ($file in $wavFiles) {
    $destination = Join-Path $targetMode $file.Name

    if ($DryRun) {
      $copied += "[DRYRUN] $($file.FullName) -> $destination"
      continue
    }

    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    $copied += "$($file.FullName) -> $destination"
  }
}

if ($copied.Count -eq 0) {
  Write-Host "No wav files found under $sourceRoot"
  exit 0
}

Write-Host "Synced voice materials:"
$copied | ForEach-Object { Write-Host $_ }
