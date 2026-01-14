# Create a simple placeholder icon for Tauri
# This script creates a basic ICO file using PowerShell

$iconDir = "src-tauri\icons"
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
}

Write-Host "Creating placeholder icon..." -ForegroundColor Yellow
Write-Host "Note: For production, replace this with a proper icon file" -ForegroundColor Gray
Write-Host ""

# Create a simple text file as placeholder (Tauri will use default if icon is missing)
# Actually, we need a real ICO file. Let's use Tauri's icon generator or create a minimal one.

# Check if we can use Tauri icon generator
$hasIconGenerator = $false
try {
    $result = yarn tauri icon --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        $hasIconGenerator = $true
    }
} catch {
    $hasIconGenerator = $false
}

if ($hasIconGenerator) {
    Write-Host "Tauri icon generator is available" -ForegroundColor Green
    Write-Host "To generate icons, place a 1024x1024 PNG file and run:" -ForegroundColor Yellow
    Write-Host "  yarn tauri icon path/to/icon.png" -ForegroundColor White
} else {
    Write-Host "Creating minimal icon placeholder..." -ForegroundColor Yellow
    # For now, we'll need to manually create or download an icon
    Write-Host "Please create or download an icon.ico file and place it in: $iconDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Quick solution: Download a free icon from:" -ForegroundColor Cyan
Write-Host "  - https://www.flaticon.com/" -ForegroundColor White
Write-Host "  - https://icons8.com/" -ForegroundColor White
Write-Host "  - Or use any 256x256 ICO file" -ForegroundColor White
Write-Host ""
Write-Host "Then place it as: $iconDir\icon.ico" -ForegroundColor Yellow
