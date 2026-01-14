# Windows 安装包构建解决方案

## 当前问题

构建失败：找不到 `kernel32.lib`（Windows SDK 库文件）

## ✅ 解决方案：使用 Visual Studio 开发者命令提示符

这是最可靠的方法，可以确保所有环境变量正确设置。

### 步骤：

1. **打开 Visual Studio 开发者命令提示符**
   - 按 `Win` 键
   - 搜索 "Developer Command Prompt for VS 2022"
   - 或 "x64 Native Tools Command Prompt for VS 2022"
   - 以管理员身份运行（推荐）

2. **导航到项目目录**
   ```cmd
   cd C:\Users\leo\WebstormProjects\SaveSync
   ```

3. **运行构建命令**
   ```cmd
   yarn tauri build
   ```

### 为什么这个方法有效？

Visual Studio 开发者命令提示符会自动设置：
- ✅ PATH（包含 link.exe）
- ✅ LIB（包含 Windows SDK 库路径）
- ✅ INCLUDE（包含头文件路径）
- ✅ 所有必要的环境变量

## 🔍 检查 Windows SDK 安装

如果仍然失败，可能需要安装 Windows SDK：

1. **打开 Visual Studio Installer**
2. **修改 Visual Studio 2022 Community**
3. **确保已安装**：
   - ✅ Windows 10 SDK（最新版本）
   - ✅ Windows 11 SDK（如果可用）

## 📝 替代方案：手动设置环境变量

如果不想使用开发者命令提示符，可以手动设置：

```powershell
# 在 PowerShell 中运行（需要根据实际路径调整）
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community"
$msvcPath = "$vsPath\VC\Tools\MSVC\14.44.35207"
$sdkPath = "C:\Program Files (x86)\Windows Kits\10"

# 设置 PATH
$env:PATH = "$msvcPath\bin\Hostx64\x64;$env:PATH"

# 设置 LIB（库文件路径）
$sdkLib = Get-ChildItem "$sdkPath\Lib" -Directory | Sort-Object Name -Descending | Select-Object -First 1
$env:LIB = "$msvcPath\lib\x64;$sdkLib\um\x64;$sdkLib\ucrt\x64;$env:LIB"

# 设置 INCLUDE（头文件路径）
$sdkInclude = $sdkLib.Name
$env:INCLUDE = "$msvcPath\include;$sdkPath\Include\$sdkInclude\um;$sdkPath\Include\$sdkInclude\shared;$sdkPath\Include\$sdkInclude\ucrt;$env:INCLUDE"

# 然后运行构建
yarn tauri build
```

## 🎯 推荐方法

**最简单可靠的方法**：使用 Visual Studio 开发者命令提示符

1. 打开 "x64 Native Tools Command Prompt for VS 2022"
2. `cd C:\Users\leo\WebstormProjects\SaveSync`
3. `yarn tauri build`

这样就能确保所有环境变量正确设置！
