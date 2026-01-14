# Electron 迁移说明

项目已从 Tauri 迁移到 Electron。

## 项目结构

```
SaveSync/
├── main/                    # Electron 主进程代码
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── ipcHandlers.ts       # IPC 处理程序
├── src/                     # 前端 React 代码
├── dist/                    # 前端构建输出
└── dist-electron/           # Electron 主进程构建输出
```

## 安装依赖

```bash
yarn install
```

## 开发模式

启动开发服务器和 Electron：

```bash
yarn electron:dev
```

这将：
1. 启动 Vite 开发服务器（http://localhost:5173）
2. 等待服务器就绪后启动 Electron

## 构建

构建前端和 Electron 主进程：

```bash
yarn build
```

构建 Electron 应用安装包：

```bash
yarn electron:build
```

## 主要变更

### 1. IPC 通信

- **之前（Tauri）**: 使用 `invoke()` 调用 Rust 命令
- **现在（Electron）**: 使用 `window.electronAPI` 调用 IPC 处理程序

### 2. 文件系统操作

- **之前**: Rust 后端处理所有文件操作
- **现在**: Node.js 主进程处理文件操作

### 3. 数据存储

数据存储位置：
- **Windows**: `%APPDATA%/SaveSync/`
- **macOS**: `~/Library/Application Support/SaveSync/`
- **Linux**: `~/.local/share/SaveSync/`

### 4. 依赖变更

- 移除了所有 Tauri 相关依赖
- 添加了 Electron、archiver、extract-zip 等依赖

## 注意事项

1. 确保已安装 Node.js 和 Yarn
2. Electron 主进程代码位于 `main/` 目录
3. 前端代码保持不变，位于 `src/` 目录
4. IPC 通信通过预加载脚本（preload.ts）进行
