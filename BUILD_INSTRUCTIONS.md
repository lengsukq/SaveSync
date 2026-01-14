# Windows 安装包构建说明

## 当前状态

❌ **缺少 Visual Studio Build Tools** - 需要安装才能构建

## 快速安装步骤

### 1. 安装 Visual Studio Build Tools

**下载地址**：
- 直接下载：https://aka.ms/vs/17/release/vs_buildtools.exe
- 或访问：https://visualstudio.microsoft.com/zh-hans/downloads/#build-tools-for-visual-studio-2022

**安装时选择**：
1. 运行安装程序
2. 选择 **"使用 C++ 的桌面开发"** 工作负载
3. 确保勾选：
   - MSVC v143 - VS 2022 C++ x64/x86 生成工具
   - Windows 10 SDK（最新版本）
4. 点击"安装"

### 2. 重启终端

安装完成后，**关闭并重新打开 PowerShell 终端**

### 3. 验证安装

```powershell
where.exe link.exe
```

应该返回类似：
```
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\...\link.exe
```

### 4. 构建安装包

```powershell
cd C:\Users\leo\WebstormProjects\SaveSync
yarn tauri build
```

## 构建产物

构建成功后，安装包位于：

- **MSI**: `src-tauri/target/release/bundle/msi/SaveSync_1.0.0_x64_en-US.msi`
- **NSIS**: `src-tauri/target/release/bundle/nsis/SaveSync_1.0.0_x64-setup.exe`

## 注意事项

1. **首次构建**：需要 10-30 分钟（下载和编译 Rust 依赖）
2. **图标**：当前使用默认图标，如需自定义请添加 `src-tauri/icons/icon.ico`
3. **磁盘空间**：确保至少有 5GB 可用空间

## 如果安装 Build Tools 后仍然失败

1. 重启计算机（确保环境变量完全加载）
2. 检查 Rust 环境：
   ```powershell
   cargo --version
   rustc --version
   ```
3. 清理并重新构建：
   ```powershell
   cd src-tauri
   cargo clean
   cd ..
   yarn tauri build
   ```

## 使用 Chocolatey 快速安装（可选）

如果已安装 Chocolatey，可以快速安装：

```powershell
# 以管理员身份运行
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
