$source = "C:\Users\Yabosen\Documents\NEW GITHUB\spice\dist\win-unpacked"
$dest = "$env:LOCALAPPDATA\Programs\Spice"
$exePath = "$dest\Spice.exe"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktop\Spice.lnk"

Write-Host "Manually Brute-Force Installing Spice..." -ForegroundColor Magenta

# 1. Copy Files
if (Test-Path $source) {
    if (Test-Path $dest) {
        Write-Host "Cleaning valid installation directory..."
        Remove-Item $dest -Recurse -Force
    }
    Write-Host "Copying application files to $dest..."
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item "$source\*" $dest -Recurse -Force
}
else {
    Write-Host "Error: Source build not found!" -ForegroundColor Red
    exit 1
}

# 2. Create Shortcut
Write-Host "Creating Desktop Shortcut..."
$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $dest
$shortcut.Description = "Spice Music Player"
$shortcut.IconLocation = "$exePath,0"
$shortcut.Save()

Write-Host "SUCCESS: Installed manually to $dest and created Desktop shortcut." -ForegroundColor Green
