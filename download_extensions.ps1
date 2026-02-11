$ErrorActionPreference = "Stop"

$uBlockOriginUrl = "https://github.com/gorhill/uBlock/releases/download/1.69.0/uBlock0_1.69.0.chromium.zip"
# uBlock Origin Lite URL (Manual download recommended if needed)
# $uBlockLiteUrl = "https://github.com/uBlockOrigin/uBOL-home/releases/download/..."

$destDir = Join-Path $PSScriptRoot "src\extensions"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir
}

function Download-And-Extract ($url, $name, $outFolder) {
    $zipPath = Join-Path $destDir "$name.zip"
    $extractPath = Join-Path $destDir $outFolder
    
    Write-Host "Downloading $name from $url..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipPath
    } catch {
        Write-Error "Failed to download $name. Error: $_"
        return
    }
    
    Write-Host "Extracting $name to $extractPath..."
    if (Test-Path $extractPath) {
        Remove-Item -Recurse -Force $extractPath
    }
    
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    
    # Clean up zip
    Remove-Item $zipPath
    Write-Host "$name installed successfully."
}

# uBlock Origin
if (-not (Test-Path (Join-Path $destDir "ublock0"))) {
    Download-And-Extract $uBlockOriginUrl "ublock_origin" "ublock0"
} else {
    Write-Host "uBlock Origin already exists."
}

# uBlock Origin Lite
# Automated download is currently unreliable due to dynamic release URLs. 
# Users can manually extract uBOLite.chromium.mv3.zip to src/extensions/ubolite
Write-Warning "uBlock Origin Lite was skipped. To use it, manually extract the extension to src/extensions/ubolite"

Write-Host "Done."
