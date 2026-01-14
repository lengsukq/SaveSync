# Windows 安装包构建说明

## 🚀 快速构建

使用提供的构建脚本，它会自动配置所有必要的环境变量：

```powershell
.\build.ps1
```

### 清理构建缓存

如果需要完全重新构建：

```powershell
.\build.ps1 -Clean
```

## 📋 构建脚本功能

`build.ps1` 脚本会自动：

1. ✅ **检测 Visual Studio** - 自动查找已安装的 Visual Studio
2. ✅ **检测 MSVC 工具链** - 自动选择最新版本
3. ✅ **检测 Windows SDK** - 自动选择最新版本（支持 Windows 11 SDK）
4. ✅ **配置环境变量** - 自动设置 PATH、LIB、INCLUDE
5. ✅ **验证环境** - 检查 link.exe 和 kernel32.lib
6. ✅ **运行构建** - 执行 `yarn tauri build`

## 📦 构建产物

构建成功后，安装包位于：

- **MSI 安装包**: `src-tauri\target\release\bundle\msi\SaveSync_1.0.0_x64_en-US.msi`
- **NSIS 安装包**: `src-tauri\target\release\bundle\nsis\SaveSync_1.0.0_x64-setup.exe`

## ⚙️ 系统要求

- ✅ Visual Studio 2022 Community/Professional/Enterprise
- ✅ Windows 10/11 SDK
- ✅ Rust 1.70+ (已安装)
- ✅ Node.js 18+ 和 Yarn (已安装)

## 🔧 手动构建（如果脚本失败）

如果自动脚本有问题，可以手动使用 Visual Studio 开发者命令提示符：

1. 打开 "x64 Native Tools Command Prompt for VS 2022"
2. 导航到项目目录：`cd C:\Users\leo\WebstormProjects\SaveSync`
3. 运行：`yarn tauri build`

## 📝 注意事项

- **首次构建**：需要 10-30 分钟（下载和编译所有 Rust 依赖）
- **后续构建**：2-5 分钟（增量编译）
- **磁盘空间**：确保至少有 5GB 可用空间
- **网络**：首次构建需要下载大量依赖，确保网络畅通

## 🎨 自定义图标

当前使用默认图标。要自定义：

1. 准备一个 1024x1024 的 PNG 图标文件
2. 运行：`yarn tauri icon path/to/your-icon.png`
3. 这会自动生成所有平台所需的图标文件

## ✅ 构建成功标志

构建成功时，你会看到：

```
Build SUCCESS!

Installers:
  MSI: C:\Users\leo\WebstormProjects\SaveSync\src-tauri\target\release\bundle\msi\SaveSync_1.0.0_x64_en-US.msi
  NSIS: C:\Users\leo\WebstormProjects\SaveSync\src-tauri\target\release\bundle\nsis\SaveSync_1.0.0_x64-setup.exe
```

## 🐛 常见问题

### 问题：找不到 link.exe
**解决**：确保 Visual Studio Build Tools 已安装，包含 "使用 C++ 的桌面开发" 工作负载

### 问题：找不到 kernel32.lib
**解决**：确保 Windows SDK 已安装（Windows 10/11 SDK）

### 问题：构建很慢
**解决**：首次构建正常，后续会更快。可以使用 `-Clean` 清理缓存后重新构建
