param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "SPICE"),
  [string]$ManifestUrl = "https://music.spice-app.xyz/api/updates/local-windows",
  [string]$LocalUrl = "http://127.0.0.1:3939"
)

$ErrorActionPreference = "Stop"
$fallbackDownloadUrl = "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip"
$fallbackHashUrl = "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.sha256"
$script:StatusBox = $null
$script:VersionLabel = $null
$script:InstallLabel = $null
$script:RuntimeLabel = $null

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Normalize-SpiceUrl {
  param(
    [string]$Value,
    [string]$Fallback
  )

  $candidate = if ([string]::IsNullOrWhiteSpace($Value)) { $Fallback } else { $Value.Trim() }
  if ($candidate -notmatch "^[a-zA-Z][a-zA-Z0-9+.-]*://") {
    $scheme = if ($candidate -match "^(localhost|127\.0\.0\.1|\[?::1\]?)(:|/|$)") { "http" } else { "https" }
    $candidate = "${scheme}://$candidate"
  }

  $parsed = [System.Uri]$null
  if (-not [System.Uri]::TryCreate($candidate, [System.UriKind]::Absolute, [ref]$parsed)) {
    throw "Invalid SPICE URL: $candidate"
  }

  if ($parsed.Scheme -ne "http" -and $parsed.Scheme -ne "https") {
    throw "SPICE only supports http or https URLs. Got: $($parsed.Scheme)"
  }

  return $parsed.AbsoluteUri.TrimEnd("/")
}

function Join-SpiceUrl {
  param(
    [string]$BaseUrl,
    [string]$Path
  )

  return "$($BaseUrl.TrimEnd("/"))/$($Path.TrimStart("/"))"
}

$script:ManifestUrl = Normalize-SpiceUrl $ManifestUrl "https://music.spice-app.xyz/api/updates/local-windows"
$script:LocalUrl = Normalize-SpiceUrl $LocalUrl "http://127.0.0.1:3939"

function Write-SpiceStatus {
  param([string]$Message)

  if ($script:StatusBox) {
    $script:StatusBox.AppendText("[$((Get-Date).ToString("HH:mm:ss"))] $Message`r`n")
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

  Write-SpiceStatus "Manifest download URL is invalid. Using latest GitHub release."
  return $fallbackDownloadUrl
}

function Get-SpiceDownloadInfo {
  try {
    $manifest = Invoke-RestMethod -Uri $script:ManifestUrl -Headers @{ Accept = "application/json" }
    $downloadUrl = Resolve-SpiceDownloadUrl ([string]$manifest.download.url)
    $sha256 = [string]$manifest.download.sha256
    if ([string]::IsNullOrWhiteSpace($sha256) -and $downloadUrl -eq $fallbackDownloadUrl) {
      $sha256 = Get-SpiceFallbackHash
    }
    return @{
      Version = [string]$manifest.version
      DownloadUrl = $downloadUrl
      Sha256 = $sha256
    }
  } catch {
    return @{
      Version = "latest"
      DownloadUrl = $fallbackDownloadUrl
      Sha256 = Get-SpiceFallbackHash
    }
  }
}

function Get-SpiceInstalledVersion {
  $manifestPath = Join-Path $InstallDir "spice-local-manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    return "not installed"
  }

  try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    return [string]$manifest.version
  } catch {
    return "unknown"
  }
}

function New-SpiceShortcut {
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

function Install-SpiceRuntime {
  $download = Get-SpiceDownloadInfo
  if ([string]::IsNullOrWhiteSpace($download.DownloadUrl)) {
    throw "No SPICE local runtime download URL is available yet."
  }

  $tempRoot = Join-Path $env:TEMP ("spice-local-manager-" + [guid]::NewGuid().ToString("N"))
  $zipPath = Join-Path $tempRoot "spice-local-windows.zip"
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

  try {
    Write-SpiceStatus "Downloading SPICE local runtime $($download.Version)..."
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
    New-SpiceShortcut
    Write-SpiceStatus "Installed SPICE local runtime at $InstallDir"
  } finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Start-SpiceRuntime {
  $startScript = Join-Path $InstallDir "start-spice-local.ps1"
  if (-not (Test-Path -LiteralPath $startScript)) {
    throw "SPICE is not installed at $InstallDir."
  }

  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`"" -WorkingDirectory $InstallDir -WindowStyle Hidden
  Write-SpiceStatus "Starting SPICE local runtime..."
}

function Test-SpiceRuntime {
  try {
    $runtime = Invoke-RestMethod -Uri (Join-SpiceUrl $script:LocalUrl "api/runtime") -TimeoutSec 2
    return "running ($($runtime.localRuntimeVersion))"
  } catch {
    return "not running"
  }
}

function Refresh-SpiceState {
  $script:VersionLabel.Text = "Installed version: $(Get-SpiceInstalledVersion)"
  $script:InstallLabel.Text = "Install folder: $InstallDir"
  $script:RuntimeLabel.Text = "Local runtime: $(Test-SpiceRuntime)"
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "SPICE Local Manager"
$form.Size = New-Object System.Drawing.Size(560, 430)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(8, 10, 14)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = "SPICE Local Manager"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(20, 18)
$title.Size = New-Object System.Drawing.Size(500, 36)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Install, update, start, and open the local SPICE runtime."
$subtitle.Location = New-Object System.Drawing.Point(22, 60)
$subtitle.Size = New-Object System.Drawing.Size(500, 24)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$form.Controls.Add($subtitle)

$script:VersionLabel = New-Object System.Windows.Forms.Label
$script:VersionLabel.Location = New-Object System.Drawing.Point(22, 104)
$script:VersionLabel.Size = New-Object System.Drawing.Size(500, 24)
$form.Controls.Add($script:VersionLabel)

$script:InstallLabel = New-Object System.Windows.Forms.Label
$script:InstallLabel.Location = New-Object System.Drawing.Point(22, 132)
$script:InstallLabel.Size = New-Object System.Drawing.Size(500, 24)
$script:InstallLabel.ForeColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$form.Controls.Add($script:InstallLabel)

$script:RuntimeLabel = New-Object System.Windows.Forms.Label
$script:RuntimeLabel.Location = New-Object System.Drawing.Point(22, 160)
$script:RuntimeLabel.Size = New-Object System.Drawing.Size(500, 24)
$script:RuntimeLabel.ForeColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$form.Controls.Add($script:RuntimeLabel)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = "Install / Update"
$installButton.Location = New-Object System.Drawing.Point(22, 205)
$installButton.Size = New-Object System.Drawing.Size(150, 38)
$installButton.Add_Click({
  try {
    Install-SpiceRuntime
    Refresh-SpiceState
  } catch {
    Write-SpiceStatus $_.Exception.Message
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "SPICE Local Manager", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})
$form.Controls.Add($installButton)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = "Start"
$startButton.Location = New-Object System.Drawing.Point(184, 205)
$startButton.Size = New-Object System.Drawing.Size(90, 38)
$startButton.Add_Click({
  try {
    Start-SpiceRuntime
    Start-Sleep -Milliseconds 800
    Refresh-SpiceState
  } catch {
    Write-SpiceStatus $_.Exception.Message
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "SPICE Local Manager", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})
$form.Controls.Add($startButton)

$openButton = New-Object System.Windows.Forms.Button
$openButton.Text = "Open local SPICE"
$openButton.Location = New-Object System.Drawing.Point(286, 205)
$openButton.Size = New-Object System.Drawing.Size(130, 38)
$openButton.Add_Click({
  try {
    Start-Process -FilePath $script:LocalUrl
  } catch {
    Write-SpiceStatus $_.Exception.Message
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "SPICE Local Manager", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
  }
})
$form.Controls.Add($openButton)

$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = "Refresh"
$refreshButton.Location = New-Object System.Drawing.Point(428, 205)
$refreshButton.Size = New-Object System.Drawing.Size(90, 38)
$refreshButton.Add_Click({ Refresh-SpiceState })
$form.Controls.Add($refreshButton)

$script:StatusBox = New-Object System.Windows.Forms.TextBox
$script:StatusBox.Location = New-Object System.Drawing.Point(22, 265)
$script:StatusBox.Size = New-Object System.Drawing.Size(496, 92)
$script:StatusBox.Multiline = $true
$script:StatusBox.ScrollBars = "Vertical"
$script:StatusBox.ReadOnly = $true
$script:StatusBox.BackColor = [System.Drawing.Color]::FromArgb(2, 6, 23)
$script:StatusBox.ForeColor = [System.Drawing.Color]::FromArgb(219, 234, 254)
$form.Controls.Add($script:StatusBox)

Refresh-SpiceState
Write-SpiceStatus "Ready."
[void]$form.ShowDialog()
