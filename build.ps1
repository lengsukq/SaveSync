# SaveSync Windows Installer Build Script
# Automatically configures Visual Studio and Windows SDK environment

param(
    [switch]$Clean = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SaveSync Windows Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Detect Visual Studio
Write-Host "[1/5] Detecting Visual Studio..." -ForegroundColor Yellow
$vsPaths = @(
    "C:\Program Files\Microsoft Visual Studio\2022\Community",
    "C:\Program Files\Microsoft Visual Studio\2022\Professional",
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise",
    "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community",
    "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools"
)

$vsPath = $null
foreach ($path in $vsPaths) {
    if (Test-Path $path) {
        $vcvars = Join-Path $path "VC\Auxiliary\Build\vcvars64.bat"
        if (Test-Path $vcvars) {
            $vsPath = $path
            Write-Host "  Found: $vsPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $vsPath) {
    Write-Host "  ERROR: Visual Studio not found" -ForegroundColor Red
    Write-Host "  Please install Visual Studio 2022 or Build Tools" -ForegroundColor Yellow
    exit 1
}

# Step 2: Detect MSVC toolchain
Write-Host "[2/5] Detecting MSVC toolchain..." -ForegroundColor Yellow
$msvcPath = Join-Path $vsPath "VC\Tools\MSVC"
$msvcVersions = Get-ChildItem -Path $msvcPath -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($msvcVersions.Count -eq 0) {
    Write-Host "  ERROR: MSVC toolchain not found" -ForegroundColor Red
    exit 1
}
$msvcVersion = $msvcVersions[0].Name
$msvcFullPath = Join-Path $msvcPath $msvcVersion
Write-Host "  MSVC Version: $msvcVersion" -ForegroundColor Green

# Step 3: Detect Windows SDK
Write-Host "[3/5] Detecting Windows SDK..." -ForegroundColor Yellow
$sdkBasePath = "C:\Program Files (x86)\Windows Kits\10"
if (-not (Test-Path $sdkBasePath)) {
    Write-Host "  ERROR: Windows SDK not found" -ForegroundColor Red
    Write-Host "  Please install Windows 10/11 SDK" -ForegroundColor Yellow
    exit 1
}

$sdkVersions = Get-ChildItem -Path "$sdkBasePath\Lib" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
if ($sdkVersions.Count -eq 0) {
    Write-Host "  ERROR: Windows SDK libraries not found" -ForegroundColor Red
    exit 1
}
$sdkVersion = $sdkVersions[0].Name
Write-Host "  Windows SDK Version: $sdkVersion" -ForegroundColor Green

# Step 4: Configure environment variables
Write-Host "[4/5] Configuring build environment..." -ForegroundColor Yellow

# PATH: MSVC toolchain
$msvcBinPath = Join-Path $msvcFullPath "bin\Hostx64\x64"
$env:PATH = "$msvcBinPath;$env:PATH"

# LIB: MSVC libraries + Windows SDK libraries
$msvcLibPath = Join-Path $msvcFullPath "lib\x64"
$sdkLibUm = Join-Path "$sdkBasePath\Lib\$sdkVersion" "um\x64"
$sdkLibUcrt = Join-Path "$sdkBasePath\Lib\$sdkVersion" "ucrt\x64"
$env:LIB = "$msvcLibPath;$sdkLibUm;$sdkLibUcrt;$env:LIB"

# INCLUDE: MSVC headers + Windows SDK headers
$msvcInclude = Join-Path $msvcFullPath "include"
$sdkIncludeUm = Join-Path "$sdkBasePath\Include\$sdkVersion" "um"
$sdkIncludeShared = Join-Path "$sdkBasePath\Include\$sdkVersion" "shared"
$sdkIncludeUcrt = Join-Path "$sdkBasePath\Include\$sdkVersion" "ucrt"
$env:INCLUDE = "$msvcInclude;$sdkIncludeUm;$sdkIncludeShared;$sdkIncludeUcrt;$env:INCLUDE"

# Verify critical files
$linkExe = Join-Path $msvcBinPath "link.exe"
$kernel32Lib = Join-Path $sdkLibUm "kernel32.lib"

if (-not (Test-Path $linkExe)) {
    Write-Host "  ERROR: link.exe not found: $linkExe" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $kernel32Lib)) {
    Write-Host "  ERROR: kernel32.lib not found: $kernel32Lib" -ForegroundColor Red
    exit 1
}

Write-Host "  Environment configured successfully" -ForegroundColor Green

# Step 5: Clean (optional)
if ($Clean) {
    Write-Host "[5/5] Cleaning build cache..." -ForegroundColor Yellow
    if (Test-Path "src-tauri\target") {
        Remove-Item -Path "src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Build cache cleaned" -ForegroundColor Green
    }
    if (Test-Path "dist") {
        Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Frontend build cleaned" -ForegroundColor Green
    }
} else {
    Write-Host "[5/5] Skipping clean (use -Clean to clean cache)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting build..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Run build
$buildStartTime = Get-Date
yarn tauri build
$buildExitCode = $LASTEXITCODE
$buildEndTime = Get-Date
$buildDuration = $buildEndTime - $buildStartTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($buildExitCode -eq 0) {
    Write-Host "  Build SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installers:" -ForegroundColor Yellow
    $msiPath = "src-tauri\target\release\bundle\msi\*.msi"
    $nsisPath = "src-tauri\target\release\bundle\nsis\*.exe"
    
    if (Test-Path $msiPath) {
        $msiFile = Get-Item $msiPath | Select-Object -First 1
        $msiSize = [math]::Round($msiFile.Length / 1MB, 2)
        Write-Host "  MSI:" -ForegroundColor Cyan
        Write-Host "    $($msiFile.FullName)" -ForegroundColor White
        Write-Host "    Size: $msiSize MB" -ForegroundColor Gray
    }
    if (Test-Path $nsisPath) {
        $nsisFile = Get-Item $nsisPath | Select-Object -First 1
        $nsisSize = [math]::Round($nsisFile.Length / 1MB, 2)
        Write-Host "  NSIS:" -ForegroundColor Cyan
        Write-Host "    $($nsisFile.FullName)" -ForegroundColor White
        Write-Host "    Size: $nsisSize MB" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "You can now distribute these installers!" -ForegroundColor Green
} else {
    Write-Host "  Build FAILED (exit code: $buildExitCode)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tips:" -ForegroundColor Yellow
    Write-Host "  - Check error messages above" -ForegroundColor White
    Write-Host "  - Ensure Visual Studio Build Tools are installed" -ForegroundColor White
    Write-Host "  - Ensure Windows SDK is installed" -ForegroundColor White
    Write-Host "  - Try: .\build.ps1 -Clean" -ForegroundColor White
}

Write-Host ""
Write-Host "Build time: $($buildDuration.ToString('mm\:ss'))" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

exit $buildExitCode
