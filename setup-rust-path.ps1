# Rust Environment Path Setup Script
# Run this script as Administrator or in your user context

Write-Host "=== Rust Environment Path Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get Rust path
$rustPath = "$env:USERPROFILE\.cargo\bin"
Write-Host "Rust installation path: $rustPath" -ForegroundColor Yellow

# Check if Rust is installed
if (-not (Test-Path "$rustPath\cargo.exe")) {
    Write-Host "ERROR: Rust not found at $rustPath" -ForegroundColor Red
    Write-Host "Please install Rust first: https://rustup.rs/" -ForegroundColor Red
    exit 1
}

Write-Host "Rust installation found!" -ForegroundColor Green
Write-Host ""

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
Write-Host "Current user PATH:" -ForegroundColor Cyan
Write-Host $currentPath -ForegroundColor Gray
Write-Host ""

# Check if Rust path is already in PATH
if ($currentPath -like "*$rustPath*") {
    Write-Host "Rust path is already in user PATH!" -ForegroundColor Green
} else {
    Write-Host "Adding Rust path to user PATH..." -ForegroundColor Yellow
    
    # Add to user PATH
    $newPath = if ($currentPath) { "$currentPath;$rustPath" } else { $rustPath }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    Write-Host "Rust path has been added to user PATH!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Please restart your terminal or computer for changes to take effect." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan

# Add to current session temporarily
$env:PATH += ";$rustPath"

# Test commands
Write-Host "Testing Rust commands..." -ForegroundColor Yellow
Write-Host ""

try {
    $cargoVersion = & cargo --version 2>&1
    Write-Host "cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "cargo: Not available in current session (restart terminal)" -ForegroundColor Yellow
}

try {
    $rustcVersion = & rustc --version 2>&1
    Write-Host "rustc: $rustcVersion" -ForegroundColor Green
} catch {
    Write-Host "rustc: Not available in current session (restart terminal)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen your terminal" -ForegroundColor White
Write-Host "2. Or restart your computer" -ForegroundColor White
Write-Host "3. Run 'cargo --version' to verify" -ForegroundColor White
