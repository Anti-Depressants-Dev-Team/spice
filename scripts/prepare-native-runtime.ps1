param(
  [string]$BackendRepo = "",
  [string]$RuntimeZipUrl = "",
  [switch]$SkipBackendBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$targetRoot = Join-Path $repoRoot "native-runtime"
$targetRuntime = Join-Path $targetRoot "spice-local-windows"

if (-not $RuntimeZipUrl) {
  $RuntimeZipUrl = $env:SPICE_NATIVE_RUNTIME_ZIP_URL
}
if (-not $RuntimeZipUrl) {
  $RuntimeZipUrl = "https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/spice-local-windows.zip"
}

function Invoke-BackendScript {
  param(
    [string]$BackendPath,
    [string]$Script
  )

  Push-Location $BackendPath
  try {
    & npm --workspace "@spice/backend" run $Script
    if ($LASTEXITCODE -ne 0) {
      throw "npm workspace script '$Script' exited with code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

function Reset-TargetRuntime {
  $resolvedTargetRoot = Resolve-Path -LiteralPath $targetRoot -ErrorAction SilentlyContinue
  if (-not $resolvedTargetRoot) {
    New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
    $resolvedTargetRoot = Resolve-Path -LiteralPath $targetRoot
  }

  $candidate = Join-Path $targetRoot "spice-local-windows"
  $candidateFull = [System.IO.Path]::GetFullPath($candidate)
  $targetRootFull = [System.IO.Path]::GetFullPath($resolvedTargetRoot.Path)
  if (-not $candidateFull.StartsWith($targetRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to reset unexpected runtime path: $candidateFull"
  }

  Remove-Item -LiteralPath $candidateFull -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $candidateFull | Out-Null
}

function Copy-RuntimeFromBackend {
  param([string]$BackendPath)

  $backendFull = Resolve-Path -LiteralPath $BackendPath
  if (-not $SkipBackendBuild) {
    Invoke-BackendScript -BackendPath $backendFull.Path -Script "build:local"
    Invoke-BackendScript -BackendPath $backendFull.Path -Script "package:local:windows"
  }

  $sourceRuntime = Join-Path $backendFull.Path "apps/backend/dist/spice-local-windows"
  if (-not (Test-Path -LiteralPath (Join-Path $sourceRuntime "start-spice-local.ps1"))) {
    throw "Backend runtime package was not found at $sourceRuntime"
  }

  Reset-TargetRuntime
  Copy-Item -Path (Join-Path $sourceRuntime "*") -Destination $targetRuntime -Recurse -Force
}

function Copy-RuntimeFromRelease {
  $scratch = Join-Path ([System.IO.Path]::GetTempPath()) ("spice-native-runtime-" + [System.Guid]::NewGuid().ToString("N"))
  $zipPath = Join-Path $scratch "spice-local-windows.zip"
  $expanded = Join-Path $scratch "expanded"

  try {
    New-Item -ItemType Directory -Force -Path $expanded | Out-Null
    Write-Host "Downloading SPICE local runtime from $RuntimeZipUrl"
    Invoke-WebRequest -Uri $RuntimeZipUrl -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath $expanded -Force

    $sourceRuntime = $expanded
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRuntime "start-spice-local.ps1"))) {
      $nested = Get-ChildItem -LiteralPath $expanded -Directory -Recurse |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "start-spice-local.ps1") } |
        Select-Object -First 1
      if ($nested) {
        $sourceRuntime = $nested.FullName
      }
    }

    if (-not (Test-Path -LiteralPath (Join-Path $sourceRuntime "start-spice-local.ps1"))) {
      throw "Downloaded runtime zip did not contain start-spice-local.ps1"
    }

    Reset-TargetRuntime
    Copy-Item -Path (Join-Path $sourceRuntime "*") -Destination $targetRuntime -Recurse -Force
  } finally {
    Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
  }
}

if (-not $BackendRepo) {
  $BackendRepo = $env:SPICE_BACKEND_REPO
}
if (-not $BackendRepo) {
  $BackendRepo = $repoRoot.Path
}

if (Test-Path -LiteralPath (Join-Path $BackendRepo "apps/backend/package.json")) {
  Write-Host "Preparing native runtime from backend checkout: $BackendRepo"
  Copy-RuntimeFromBackend -BackendPath $BackendRepo
} else {
  Write-Host "Backend checkout not found. Preparing native runtime from latest release."
  Copy-RuntimeFromRelease
}

$manifestPath = Join-Path $targetRuntime "spice-local-manifest.json"
if (Test-Path -LiteralPath $manifestPath) {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  Write-Host "Prepared bundled SPICE local runtime $($manifest.version) at $targetRuntime"
} else {
  Write-Host "Prepared bundled SPICE local runtime at $targetRuntime"
}

New-Item -ItemType File -Force -Path (Join-Path $targetRuntime ".gitkeep") | Out-Null
