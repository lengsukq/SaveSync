# 快速构建 Windows 安装包指南

## 🚨 当前问题

构建失败，需要安装 **Visual Studio Build Tools**

## ⚡ 快速解决方案

### 步骤 1：安装 Visual Studio Build Tools

**方法 A：直接下载安装（推荐）**

1. 访问：https://visualstudio.microsoft.com/zh-hans/downloads/#build-tools-for-visual-studio-2022
2. 下载 "Build Tools for Visual Studio 2022"
3. 运行安装程序
4. **重要**：选择 "使用 C++ 的桌面开发" 工作负载
5. 确保勾选：
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 生成工具
   - ✅ Windows 10 SDK（最新版本）
6. 点击"安装"，等待完成（约 5-10 分钟）

**方法 B：使用 Chocolatey（需要管理员权限）**

```powershell
# 以管理员身份运行 PowerShell
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### 步骤 2：重启终端

安装完成后，**关闭并重新打开终端**，让环境变量生效。

### 步骤 3：验证安装

```powershell
# 检查 link.exe 是否可用
where.exe link.exe

# 应该返回类似：
# C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\...
```

### 步骤 4：构建安装包

```powershell
cd C:\Users\leo\WebstormProjects\SaveSync
yarn tauri build
```

## 📦 构建产物位置

构建成功后，安装包位于：

- **MSI 安装包**：`src-tauri/target/release/bundle/msi/SaveSync_1.0.0_x64_en-US.msi`
- **NSIS 安装包**：`src-tauri/target/release/bundle/nsis/SaveSync_1.0.0_x64-setup.exe`

## ⏱️ 构建时间

- **首次构建**：10-30 分钟（需要下载和编译所有 Rust 依赖）
- **后续构建**：2-5 分钟（增量编译）

## 🎯 一键检查脚本

运行项目根目录的检查脚本：

```powershell
powershell -ExecutionPolicy Bypass -File install-build-tools.ps1
```

## ⚠️ 注意事项

1. **图标文件**：当前配置中图标路径已清空，构建会使用默认图标
   - 如需自定义图标，请将 `.ico` 文件放到 `src-tauri/icons/` 目录
   - 然后更新 `tauri.conf.json` 中的 `icon` 配置

2. **网络要求**：首次构建需要下载大量 Rust 依赖，确保网络畅通

3. **磁盘空间**：确保至少有 5GB 可用空间（用于 Rust 编译缓存）

## 🔧 如果仍然失败

1. **检查 Rust 环境**：
   ```powershell
   cargo --version
   rustc --version
   ```

2. **清理并重新构建**：
   ```powershell
   cd src-tauri
   cargo clean
   cd ..
   yarn tauri build
   ```

3. **检查错误信息**：查看具体错误，可能需要安装额外的 Windows SDK 组件

## 📝 构建配置说明

当前配置（`src-tauri/tauri.conf.json`）：
- ✅ 只构建 Windows 平台
- ✅ 生成 MSI 和 NSIS 两种安装包格式
- ✅ 应用名称：SaveSync
- ✅ 版本：1.0.0

## 🎉 构建成功后

安装包可以直接分发给用户安装使用！
