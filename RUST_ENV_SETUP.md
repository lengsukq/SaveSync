# Rust 环境变量配置指南

## ✅ 当前状态

**Rust 路径已正确配置在系统 PATH 中！**

- Rust 安装路径：`C:\Users\leo\.cargo\bin`
- 已在用户 PATH 中：✅ 是
- cargo 版本：1.92.0
- rustc 版本：1.92.0

## 🔄 如果新终端中仍然找不到 Rust

### 方法 1：刷新当前会话（临时）

在 PowerShell 中运行：

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

然后测试：
```powershell
cargo --version
rustc --version
```

### 方法 2：重启终端（推荐）

关闭当前终端窗口，重新打开一个新的终端窗口，PATH 会自动加载。

### 方法 3：重启计算机（如果方法 2 不行）

有时系统需要完全重启才能加载新的环境变量。

## 📝 验证配置

在任何新的终端窗口中运行：

```powershell
# 检查 cargo
cargo --version

# 检查 rustc
rustc --version

# 检查 rustup
rustup --version
```

如果这些命令都能正常工作，说明配置成功！

## 🛠️ 手动配置（如果需要）

如果自动配置失败，可以手动添加：

1. 按 `Win + R`，输入 `sysdm.cpl`，回车
2. 点击"高级"选项卡
3. 点击"环境变量"按钮
4. 在"用户变量"部分，找到 `Path` 变量
5. 点击"编辑"
6. 确认 `%USERPROFILE%\.cargo\bin` 或 `C:\Users\leo\.cargo\bin` 存在
7. 如果不存在，点击"新建"添加：`%USERPROFILE%\.cargo\bin`
8. 点击"确定"保存

## 🎯 快速测试

运行项目根目录的 `setup-rust-path.ps1` 脚本：

```powershell
powershell -ExecutionPolicy Bypass -File setup-rust-path.ps1
```

这个脚本会：
- 检查 Rust 是否安装
- 检查 PATH 配置
- 自动添加（如果需要）
- 验证配置

## ⚠️ 注意事项

- **用户 PATH** vs **系统 PATH**：
  - 用户 PATH：只影响当前用户（推荐）
  - 系统 PATH：影响所有用户（需要管理员权限）

- **当前会话** vs **新会话**：
  - 环境变量更改只影响新打开的终端
  - 当前打开的终端需要刷新或重启

## 🚀 现在可以做什么

配置完成后，你可以：

```bash
# 运行 Tauri 开发服务器
yarn tauri:dev

# 构建 Tauri 应用
yarn tauri build

# 直接使用 Rust 工具
cargo build
cargo check
```
