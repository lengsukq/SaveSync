# SaveSync - 游戏存档同步工具

一个基于 Tauri + React + TypeScript 开发的现代化游戏存档管理工具，支持本地备份和 WebDAV 云端同步。

## 功能特性

- 🎮 **游戏存档管理** - 添加、编辑、删除游戏存档配置
- 💾 **本地备份** - 自动或手动创建游戏存档备份
- 📚 **备份历史** - 查看所有备份记录，支持恢复和删除
- ⚙️ **灵活配置** - 自定义存档路径、名称、描述等
- 🎨 **现代化 UI** - 基于 HeroUI 的美观界面
- 🔒 **安全可靠** - 使用 Tauri 框架，安全高效

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI 框架**: HeroUI + Tailwind CSS
- **状态管理**: Zustand
- **后端**: Tauri 2.0 (Rust)
- **包管理**: Yarn

## 开发环境要求

- Node.js 18+ 和 Yarn
- Rust 1.70+ 和 Cargo
- Windows 10+ (主要平台，支持跨平台)

## 安装和运行

### 1. 安装依赖

```bash
yarn install
```

### 2. 开发模式运行

```bash
yarn tauri:dev
```

这将启动开发服务器，自动打开应用窗口。

### 3. 构建生产版本

```bash
yarn tauri:build
```

构建产物将位于 `src-tauri/target/release/` 目录。

## 项目结构

```
SaveSync/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── stores/            # Zustand 状态管理
│   ├── services/          # 业务逻辑服务
│   ├── types/             # TypeScript 类型定义
│   ├── constants/          # 常量定义
│   └── styles/            # 样式文件
├── src-tauri/             # Tauri 后端
│   ├── src/
│   │   ├── main.rs        # 应用入口
│   │   ├── commands.rs    # Tauri 命令
│   │   └── models.rs      # 数据模型
│   └── Cargo.toml         # Rust 依赖
└── package.json           # Node.js 依赖
```

## 使用说明

### 添加游戏存档

1. 点击"添加游戏存档"按钮
2. 填写游戏名称
3. 选择游戏存档目录路径
4. 可选：添加描述信息
5. 点击"创建"保存

### 创建备份

- 在游戏存档卡片上点击"立即备份"按钮
- 或通过菜单选择"创建备份"

### 查看备份历史

- 点击游戏存档卡片上的菜单按钮
- 选择"查看备份历史"
- 可以恢复或删除备份

## 开发指南

### 代码规范

项目遵循 `.cursorrules` 中定义的代码规范：
- 使用 TypeScript 严格模式
- 组件文件不超过 150 行
- 单一职责原则
- 清晰的命名和结构

### 添加新功能

1. 在 `src/types/` 中定义类型
2. 在 `src-tauri/src/commands.rs` 中添加 Rust 命令
3. 在 `src/services/` 中添加服务方法
4. 在 `src/components/` 中创建 UI 组件

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
