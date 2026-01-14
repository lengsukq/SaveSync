# SaveSync - 游戏存档同步工具

一个基于 Electron + React + TypeScript 开发的现代化游戏存档管理工具，支持本地备份和 WebDAV 云端同步。

## 功能特性

- 🎮 **游戏存档管理** - 添加、编辑、删除游戏存档配置
- 💾 **本地备份** - 自动或手动创建游戏存档备份
- 📚 **备份历史** - 查看所有备份记录，支持恢复和删除
- ⚙️ **灵活配置** - 自定义存档路径、名称、描述等
- 🎨 **现代化 UI** - 基于 HeroUI 的美观界面
- 🔒 **安全可靠** - 使用 Electron 框架，跨平台支持

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI 框架**: HeroUI + Tailwind CSS
- **状态管理**: Zustand
- **桌面框架**: Electron 30
- **包管理**: Yarn

## 开发环境要求

- Node.js 18+ 和 Yarn
- Windows 10+ / macOS / Linux

## 安装和运行

### 1. 安装依赖

```bash
yarn install
```

### 2. 开发模式运行

```bash
yarn electron:dev
```

这将启动 Vite 开发服务器和 Electron 应用。

### 3. 构建生产版本

```bash
yarn build
```

构建前端和 Electron 主进程代码。

### 4. 构建安装包

```bash
yarn electron:build
```

构建 Electron 应用安装包。

## 项目结构

```
SaveSync/
├── main/                   # Electron 主进程代码
│   ├── main.ts            # 主进程入口
│   ├── preload.ts         # 预加载脚本
│   └── ipcHandlers.ts     # IPC 处理程序
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── stores/            # Zustand 状态管理
│   ├── services/          # 业务逻辑服务
│   ├── types/             # TypeScript 类型定义
│   ├── constants/          # 常量定义
│   └── styles/            # 样式文件
├── dist/                   # 前端构建输出
├── dist-electron/          # Electron 主进程构建输出
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
2. 在 `main/ipcHandlers.ts` 中添加 IPC 处理程序
3. 在 `main/preload.ts` 中暴露 API
4. 在 `src/services/` 中添加服务方法
5. 在 `src/components/` 中创建 UI 组件

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
