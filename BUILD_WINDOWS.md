# Windows 安装包构建指南

## ⚠️ 当前问题

构建失败：缺少 Visual Studio Build Tools（`link.exe` 未找到）

## 🔧 解决方案

### 方案 1：安装 Visual Studio Build Tools（推荐）

这是构建 Windows 应用的标准方式。

#### 步骤：

1. **下载 Visual Studio Build Tools**
   - 访问：https://visualstudio.microsoft.com/zh-hans/downloads/#build-tools-for-visual-studio-2022
   - 或直接下载：https://aka.ms/vs/17/release/vs_buildtools.exe

2. **安装时选择组件**
   - 运行安装程序
   - 选择"使用 C++ 的桌面开发"工作负载
   - 确保包含：
     - ✅ MSVC v143 - VS 2022 C++ x64/x86 生成工具
     - ✅ Windows 10 SDK（最新版本）
     - ✅ C++ CMake 工具（可选）

3. **安装完成后**
   ```powershell
   # 重启终端或计算机
   # 然后重新运行构建
   yarn tauri build
   ```

### 方案 2：使用 GNU 工具链（替代方案）

如果不想安装 Visual Studio，可以使用 MinGW-w64：

```powershell
# 安装 GNU 工具链
rustup toolchain install stable-x86_64-pc-windows-gnu
rustup default stable-x86_64-pc-windows-gnu

# 安装 MinGW-w64
# 下载：https://www.mingw-w64.org/downloads/
# 或使用 Chocolatey: choco install mingw

# 然后构建
yarn tauri build
```

**注意**：GNU 工具链可能不如 MSVC 稳定，建议使用方案 1。

### 方案 3：使用预编译的依赖（快速测试）

如果只是想测试构建流程，可以尝试：

```powershell
# 只构建前端（不编译 Rust）
yarn build

# 检查 Rust 代码（不链接）
cd src-tauri
cargo check
```

## 📦 构建命令

安装好 Build Tools 后：

```powershell
# 完整构建（包含 MSI 和 NSIS 安装包）
yarn tauri build

# 构建产物位置
# MSI: src-tauri/target/release/bundle/msi/SaveSync_1.0.0_x64_en-US.msi
# NSIS: src-tauri/target/release/bundle/nsis/SaveSync_1.0.0_x64-setup.exe
```

## 🔍 验证安装

安装 Visual Studio Build Tools 后，验证：

```powershell
# 查找 link.exe
where.exe link.exe

# 应该返回类似：
# C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.xx.xxxxx\bin\Hostx64\x64\link.exe
```

## 📝 构建配置

当前配置（`src-tauri/tauri.conf.json`）：
- **目标平台**：Windows only
- **安装包格式**：MSI 和 NSIS
- **图标**：需要提供 `src-tauri/icons/icon.ico`

## ⚡ 快速安装脚本

如果使用 Chocolatey：

```powershell
# 以管理员身份运行
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

## 🎯 下一步

1. **安装 Visual Studio Build Tools**（推荐方案 1）
2. **重启终端或计算机**
3. **运行构建命令**：`yarn tauri build`
4. **等待构建完成**（首次构建可能需要 10-30 分钟）
5. **在 `src-tauri/target/release/bundle/` 目录找到安装包**

## 💡 提示

- 首次构建会下载和编译所有 Rust 依赖，需要较长时间
- 后续构建会更快（增量编译）
- 如果网络较慢，可以考虑使用 Rust 国内镜像源
