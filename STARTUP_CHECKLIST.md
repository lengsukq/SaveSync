# 启动检查清单

## ✅ 已完成的检查

1. **前端依赖** - ✅ 已安装
2. **前端代码** - ✅ 无 lint 错误
3. **前端开发服务器** - ✅ 已启动（`yarn dev`）

## ⚠️ 需要检查的项目

### 1. Rust 环境
如果 Rust 未安装，需要：
```bash
# 安装 Rust（如果未安装）
# 访问 https://rustup.rs/ 或运行：
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Tauri 开发环境
启动 Tauri 需要：
```bash
# 确保 Rust 已安装
rustc --version
cargo --version

# 然后启动 Tauri
yarn tauri:dev
```

### 3. 可能遇到的编译错误

#### 问题 1: zip crate 导入
- ✅ 已修复：移除了不必要的 `use zip::ZipArchive;`
- 代码中使用 `zip::ZipArchive::new()` 即可

#### 问题 2: reqwest blocking 模式
- 已配置：`reqwest = { version = "0.12", features = ["blocking", "multipart"] }`
- 如果遇到异步问题，可能需要调整

#### 问题 3: tokio 依赖冲突
- 已添加：`tokio = { version = "1", features = ["full"] }`
- 如果 reqwest blocking 模式有问题，可能需要使用异步版本

## 🔍 启动步骤

### 方式 1: 仅前端（用于测试 UI）
```bash
yarn dev
```
访问：http://localhost:1420

### 方式 2: 完整 Tauri 应用
```bash
yarn tauri:dev
```
这将：
1. 启动前端开发服务器
2. 编译 Rust 后端
3. 打开应用窗口

## 🐛 常见问题

### 问题：Rust 未找到
**解决方案**：
1. 安装 Rust：https://rustup.rs/
2. 重启终端
3. 验证安装：`rustc --version`

### 问题：Cargo 编译错误
**可能原因**：
- 依赖版本不兼容
- 缺少系统依赖（Windows 需要 Visual Studio Build Tools）

**解决方案**：
```bash
cd src-tauri
cargo build
# 查看具体错误信息
```

### 问题：端口被占用
**解决方案**：
- 修改 `vite.config.ts` 中的端口号
- 或关闭占用 1420 端口的程序

### 问题：HeroUI 样式不显示
**检查**：
1. `tailwind.config.js` 是否正确配置
2. `src/styles/index.css` 是否导入
3. HeroUI 版本是否兼容

## 📝 下一步

1. 如果 Rust 环境已配置，运行 `yarn tauri:dev`
2. 检查控制台是否有错误
3. 测试基本功能：
   - 添加游戏存档
   - 创建备份
   - 查看备份历史

## 🔧 调试技巧

### 查看 Rust 编译错误
```bash
cd src-tauri
cargo check
```

### 查看前端错误
- 打开浏览器开发者工具
- 查看控制台输出

### 查看 Tauri 日志
- 在开发模式下，日志会输出到控制台
- 检查是否有 Rust panic 或错误
