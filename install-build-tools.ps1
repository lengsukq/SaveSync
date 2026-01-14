# Visual Studio Build Tools 安装助手脚本
# 这个脚本会检查并指导安装 Visual Studio Build Tools

Write-Host "=== Visual Studio Build Tools 检查 ===" -ForegroundColor Cyan
Write-Host ""

# 检查是否已安装
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\BuildTools"
$vsPath2019 = "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools"
$vsPath2017 = "C:\Program Files (x86)\Microsoft Visual Studio\2017\BuildTools"

$installed = $false
$linkPath = $null

# 检查 2022
if (Test-Path $vsPath) {
    $linkPath = Get-ChildItem -Path "$vsPath\VC\Tools\MSVC" -Recurse -Filter "link.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($linkPath) {
        Write-Host "✅ 找到 Visual Studio 2022 Build Tools" -ForegroundColor Green
        Write-Host "   Link.exe 路径: $($linkPath.FullName)" -ForegroundColor Gray
        $installed = $true
    }
}

# 检查 2019
if (-not $installed -and (Test-Path $vsPath2019)) {
    $linkPath = Get-ChildItem -Path "$vsPath2019\VC\Tools\MSVC" -Recurse -Filter "link.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($linkPath) {
        Write-Host "✅ 找到 Visual Studio 2019 Build Tools" -ForegroundColor Green
        Write-Host "   Link.exe 路径: $($linkPath.FullName)" -ForegroundColor Gray
        $installed = $true
    }
}

# 检查 2017
if (-not $installed -and (Test-Path $vsPath2017)) {
    $linkPath = Get-ChildItem -Path "$vsPath2017\VC\Tools\MSVC" -Recurse -Filter "link.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($linkPath) {
        Write-Host "✅ 找到 Visual Studio 2017 Build Tools" -ForegroundColor Green
        Write-Host "   Link.exe 路径: $($linkPath.FullName)" -ForegroundColor Gray
        $installed = $true
    }
}

# 使用 where 命令检查
if (-not $installed) {
    try {
        $whereResult = where.exe link.exe 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 找到 link.exe: $whereResult" -ForegroundColor Green
            $installed = $true
        }
    } catch {
        # 忽略错误
    }
}

Write-Host ""

if ($installed) {
    Write-Host "✅ Visual Studio Build Tools 已安装！" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在可以运行构建命令：" -ForegroundColor Yellow
    Write-Host "  yarn tauri build" -ForegroundColor White
} else {
    Write-Host "❌ 未找到 Visual Studio Build Tools" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== 安装指南 ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 下载 Visual Studio Build Tools 2022：" -ForegroundColor Yellow
    Write-Host "   https://visualstudio.microsoft.com/zh-hans/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 或直接下载安装程序：" -ForegroundColor Yellow
    Write-Host "   https://aka.ms/vs/17/release/vs_buildtools.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. 安装时选择：" -ForegroundColor Yellow
    Write-Host "   ✅ '使用 C++ 的桌面开发' 工作负载" -ForegroundColor White
    Write-Host "   ✅ MSVC v143 - VS 2022 C++ x64/x86 生成工具" -ForegroundColor White
    Write-Host "   ✅ Windows 10 SDK（最新版本）" -ForegroundColor White
    Write-Host ""
    Write-Host "4. 安装完成后，重启终端并运行此脚本再次检查" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== 使用 Chocolatey 快速安装（需要管理员权限）===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "以管理员身份运行 PowerShell，然后执行：" -ForegroundColor Yellow
    Write-Host "  choco install visualstudio2022buildtools --package-parameters `"--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended`"" -ForegroundColor White
}

Write-Host ""
Write-Host "=== 当前 Rust 工具链 ===" -ForegroundColor Cyan
rustup toolchain list
Write-Host ""
Write-Host "需要: x86_64-pc-windows-msvc" -ForegroundColor Yellow
