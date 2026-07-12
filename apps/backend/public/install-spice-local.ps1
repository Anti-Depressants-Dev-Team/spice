param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "SPICE"),
  [string]$ManifestUrl = "https://music.spice-app.xyz/api/updates/local-windows",
  [switch]$NoShortcut,
  [switch]$Start
)

$ErrorActionPreference = "Stop"
$fallbackDownloadUrl = "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip"
$fallbackHashUrl = "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.sha256"

function Get-SpiceDownloadInfo {
  param([string]$Url)

  try {
    $manifest = Invoke-RestMethod -Uri $Url -Headers @{ Accept = "application/json" }
    return @{
      Version = [string]$manifest.version
      DownloadUrl = [string]$manifest.download.url
      Sha256 = [string]$manifest.download.sha256
    }
  } catch {
    Write-Warning "Could not read the SPICE update manifest. Falling back to the latest GitHub release."
    return @{
      Version = "latest"
      DownloadUrl = $fallbackDownloadUrl
      Sha256 = ""
    }
  }
}

function Get-SpiceFallbackHash {
  try {
    $hashLine = (Invoke-WebRequest -UseBasicParsing -Uri $fallbackHashUrl).Content.Trim()
    return ($hashLine -split "\s+")[0]
  } catch {
    return ""
  }
}

function Resolve-SpiceDownloadUrl {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $fallbackDownloadUrl
  }

  $parsed = [System.Uri]$null
  if ([System.Uri]::TryCreate($Value.Trim(), [System.UriKind]::Absolute, [ref]$parsed) -and
    ($parsed.Scheme -eq "http" -or $parsed.Scheme -eq "https")) {
    return $parsed.AbsoluteUri
  }

  Write-Warning "The update manifest download URL is invalid. Falling back to the latest GitHub release."
  return $fallbackDownloadUrl
}

$download = Get-SpiceDownloadInfo -Url $ManifestUrl
$download.DownloadUrl = Resolve-SpiceDownloadUrl $download.DownloadUrl
if ([string]::IsNullOrWhiteSpace($download.Sha256) -and $download.DownloadUrl -eq $fallbackDownloadUrl) {
  $download.Sha256 = Get-SpiceFallbackHash
}

$tempRoot = Join-Path $env:TEMP ("spice-local-install-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "spice-local-windows.zip"
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

try {
  Write-Host "Downloading SPICE local runtime..."
  Invoke-WebRequest -UseBasicParsing -Uri $download.DownloadUrl -OutFile $zipPath

  if (-not [string]::IsNullOrWhiteSpace($download.Sha256)) {
    $actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $download.Sha256.ToLowerInvariant()) {
      throw "Downloaded ZIP hash mismatch. Expected $($download.Sha256), got $actualHash."
    }
  }

  $replaceTargets = @(".next", "apps", "node_modules", "public", "start-spice-local.cmd", "start-spice-local.ps1", "check-spice-local-update.ps1", "spice-local-manifest.json", ".env.local.example")
  foreach ($target in $replaceTargets) {
    $path = Join-Path $InstallDir $target
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }

  Expand-Archive -LiteralPath $zipPath -DestinationPath $InstallDir -Force

  if (-not $NoShortcut) {
    $shortcutDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
    $shortcutPath = Join-Path $shortcutDir "SPICE Local Runtime.lnk"
    $targetScript = Join-Path $InstallDir "start-spice-local.ps1"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$targetScript`""
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.IconLocation = "powershell.exe,0"
    $shortcut.Save()
  }

  Write-Host "SPICE local runtime installed at $InstallDir"
  Write-Host "Run start-spice-local.ps1, then open http://127.0.0.1:3939"

  if ($Start) {
    & (Join-Path $InstallDir "start-spice-local.ps1")
  }
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
