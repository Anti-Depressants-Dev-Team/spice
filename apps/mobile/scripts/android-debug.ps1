param([switch] $Check)

$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $mobileRoot "android"

function Get-JavaMajor {
    param([string] $JavaExe)

    if (-not $JavaExe -or -not (Test-Path $JavaExe)) {
        return 0
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $versionOutput = & $JavaExe -version 2>&1 | Out-String
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $match = [regex]::Match($versionOutput, 'version "(\d+)')

    if (-not $match.Success) {
        return 0
    }

    return [int] $match.Groups[1].Value
}

function Resolve-JavaHome {
    $currentJava = $null

    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME "bin\java.exe"
        if (Test-Path $candidate) {
            $currentJava = $candidate
        }
    }

    if (-not $currentJava) {
        $command = Get-Command java -ErrorAction SilentlyContinue
        if ($command) {
            $currentJava = $command.Source
        }
    }

    if ((Get-JavaMajor $currentJava) -ge 21) {
        return $env:JAVA_HOME
    }

    $roots = @(
        "C:\Program Files\Eclipse Adoptium",
        "C:\Program Files\Java",
        "C:\Program Files\Microsoft"
    )

    foreach ($root in $roots) {
        if (-not (Test-Path $root)) {
            continue
        }

        $candidates = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match "jdk-(2[1-9]|[3-9][0-9])" } |
            Sort-Object Name -Descending

        foreach ($candidate in $candidates) {
            $javaExe = Join-Path $candidate.FullName "bin\java.exe"
            if ((Get-JavaMajor $javaExe) -ge 21) {
                return $candidate.FullName
            }
        }
    }

    throw "JDK 21+ was not found. Install JDK 21 or set JAVA_HOME to a JDK 21+ directory."
}

if (-not $env:ANDROID_HOME) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
    }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    throw "Android SDK was not found. Install Android SDK or set ANDROID_HOME."
}

$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$resolvedJavaHome = Resolve-JavaHome

if ($resolvedJavaHome) {
    $env:JAVA_HOME = $resolvedJavaHome
    $env:Path = (Join-Path $env:JAVA_HOME "bin") + ";" + $env:Path
}

Push-Location $androidRoot
try {
    if ($Check) {
        .\gradlew.bat lintDebug testDebugUnitTest assembleDebug
    } else {
        .\gradlew.bat assembleDebug
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Android debug build failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}
