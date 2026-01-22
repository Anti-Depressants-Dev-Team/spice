$maxRetries = 10
$retryCount = 0
$success = $false

# Clean cache specific to winCodeSign to avoid corruption issues
if (Test-Path "C:\Users\Yabosen\AppData\Local\electron-builder\Cache\winCodeSign") {
    Write-Host "Cleaning winCodeSign cache..."
    Remove-Item "C:\Users\Yabosen\AppData\Local\electron-builder\Cache\winCodeSign" -Recurse -Force
}

while (-not $success -and $retryCount -lt $maxRetries) {
    $retryCount++
    Write-Host "`nAttempt $retryCount of $maxRetries to build installer..." -ForegroundColor Cyan
    
    # Run command and capture output
    $header = "Attempt $retryCount"
    npm run dist 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "Build SUCCESSFUL on attempt $retryCount!" -ForegroundColor Green
    }
    else {
        Write-Host "Build failed." -ForegroundColor Yellow
        # Check if it was a timeout (which takes time) or instant fail
        Start-Sleep -Seconds 5
    }
}

if (-not $success) {
    Write-Host "Failed to build after $maxRetries attempts." -ForegroundColor Red
    exit 1
}
