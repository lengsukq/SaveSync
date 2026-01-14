# Build script using Visual Studio Developer Command Prompt environment

$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community"
$vcvars = Join-Path $vsPath "VC\Auxiliary\Build\vcvars64.bat"

if (-not (Test-Path $vcvars)) {
    Write-Host "Error: vcvars64.bat not found at $vcvars" -ForegroundColor Red
    Write-Host "Please ensure Visual Studio 2022 Community is installed with C++ tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "Setting up Visual Studio environment..." -ForegroundColor Cyan
Write-Host "Using: $vcvars" -ForegroundColor Gray

# Create a temporary batch file to set environment and run build
$buildScript = @"
@echo off
call "$vcvars" >nul 2>&1
if errorlevel 1 (
    echo Failed to initialize Visual Studio environment
    exit /b 1
)
cd /d "%~dp0"
call yarn tauri build
"@

$buildScriptPath = Join-Path $PSScriptRoot "temp-build.bat"
$buildScript | Out-File -FilePath $buildScriptPath -Encoding ASCII

Write-Host "Running build with Visual Studio environment..." -ForegroundColor Cyan
& cmd /c $buildScriptPath

$exitCode = $LASTEXITCODE
Remove-Item $buildScriptPath -ErrorAction SilentlyContinue

exit $exitCode
