$maxRetries = 20
$retryCount = 0
$success = $false

while (-not $success -and $retryCount -lt $maxRetries) {
    $retryCount++
    Write-Host "Attempt $retryCount of $maxRetries to build installer..." -ForegroundColor Cyan
    
    # Run the build command
    cmd /c "npm run dist"
    
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host "Build SUCCESSFUL on attempt $retryCount!" -ForegroundColor Green
    } else {
        Write-Host "Build failed. Retrying in 2 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $success) {
    Write-Host "Failed to build after $maxRetries attempts." -ForegroundColor Red
    exit 1
}
