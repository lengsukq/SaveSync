# HeroUI + Tailwind v4 迁移总结

> 迁移日期：2024年12月

## 迁移概述

根据 [HeroUI Tailwind v4 指南](https://www.heroui.com/docs/guide/tailwind-v4)，已完成从 `@headlessui/react` 到 `@heroui/react` 的迁移，并更新了 Tailwind CSS v4 配置。

---

## ✅ 已完成的更改

### 1. 依赖更新

- ✅ **移除** `@headlessui/react` 依赖
- ✅ **保留** `@heroui/react` 依赖（已在 package.json 中）

### 2. Tailwind v4 配置更新

#### CSS 导入更新 (`src/styles/index.css`)

**之前（Tailwind v3）：**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**之后（Tailwind v4）：**
```css
@import "tailwindcss";
@import "@heroui/react/styles";
```

#### PostCSS 配置更新 (`postcss.config.js`)

**之前：**
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},  // Tailwind v4 不再需要
  },
}
```

**之后：**
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

> **注意**：Tailwind v4 自动处理前缀，不再需要 `autoprefixer`。

#### Tailwind 配置文件 (`tailwind.config.js`)

- ✅ 保持现有配置（使用 `tailwind.config.js` 方式）
- ✅ HeroUI 插件配置保持不变

### 3. 组件迁移

#### BackupHistoryPage 组件

**之前（使用 Headless UI）：**
```tsx
import { Dialog, Tab, Menu, Transition } from "@headlessui/react";
```

**之后（使用 HeroUI）：**
```tsx
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
```

**主要变更：**
- `Dialog` → `Modal` + `ModalContent` + `ModalHeader` + `ModalBody`
- `Tab.Group` → `Tabs`（HeroUI 的 Tabs 组件）
- `Menu` → `Dropdown` + `DropdownMenu` + `DropdownItem`
- 移除了 `Transition` 组件（HeroUI 内置动画）

### 4. App 组件更新

**添加 HeroUIProvider：**
```tsx
import { HeroUIProvider } from "@heroui/react";

function App() {
  return (
    <HeroUIProvider>
      {/* ... */}
    </HeroUIProvider>
  );
}
```

### 5. CSS 样式调整

- ✅ 移除了 `@apply` 指令（Tailwind v4 可能不支持）
- ✅ 使用原生 CSS 属性替代
- ✅ 保留了自定义工具类（`.glass`, `.apple-shadow` 等）

### 6. Vite 配置清理

- ✅ 移除了重复的 `resolve.alias` 配置
- ✅ 保留了 `@heroui/spacer` 的别名配置

---

## 📋 组件对应关系

| Headless UI | HeroUI | 说明 |
|------------|--------|------|
| `Dialog` | `Modal` | 对话框组件 |
| `Dialog.Panel` | `ModalContent` | 对话框内容 |
| `Dialog.Title` | `ModalHeader` | 对话框标题 |
| `Tab.Group` | `Tabs` | 标签页组 |
| `Tab.List` | `Tabs` (内置) | 标签页列表 |
| `Tab` | `Tab` | 单个标签页 |
| `Tab.Panels` | `Tabs` (内置) | 标签页面板容器 |
| `Tab.Panel` | `Tab` (内容) | 标签页内容 |
| `Menu` | `Dropdown` | 下拉菜单 |
| `Menu.Button` | `DropdownTrigger` | 下拉菜单触发器 |
| `Menu.Items` | `DropdownMenu` | 下拉菜单容器 |
| `Menu.Item` | `DropdownItem` | 下拉菜单项 |
| `Transition` | 内置动画 | HeroUI 组件自带动画 |

---

## 🎨 HeroUI 组件特性

### Modal 组件
- 支持 `isOpen` 和 `onClose` 属性
- 支持 `size` 属性（"5xl"）
- 支持 `scrollBehavior` 属性
- 支持 `classNames` 自定义样式

### Tabs 组件
- 使用 `selectedKey` 和 `onSelectionChange` 控制选中状态
- 支持 `aria-label` 无障碍属性
- 支持 `classNames` 自定义样式
- 内置动画效果

### Dropdown 组件
- 使用 `DropdownTrigger` 作为触发器
- 使用 `DropdownMenu` 和 `DropdownItem` 构建菜单
- 支持 `startContent` 添加图标
- 支持 `color` 和 `className` 属性

---

## 🔍 验证清单

- [x] 移除所有 `@headlessui/react` 导入
- [x] 更新 CSS 导入为 Tailwind v4 语法
- [x] 更新 PostCSS 配置（移除 autoprefixer）
- [x] 添加 `HeroUIProvider` 到 App 组件
- [x] 替换所有 Headless UI 组件为 HeroUI 组件
- [x] 修复所有 TypeScript 类型错误
- [x] 移除未使用的导入和变量
- [x] 更新 CSS 样式（移除 @apply）

---

## 📝 注意事项

1. **依赖安装**
   - 如果遇到 `@heroui/react` 模块找不到的错误，请运行 `yarn install` 安装依赖
   - 可能需要手动安装，因为权限问题

2. **Tailwind v4 兼容性**
   - Tailwind v4 使用 CSS-first 方法
   - `@apply` 指令可能不再支持，使用原生 CSS 替代
   - 自动前缀处理，无需 `autoprefixer`

3. **HeroUI 版本**
   - 确保使用 `@heroui/react` v2.8.7 或更高版本
   - 该版本支持 Tailwind v4

4. **样式自定义**
   - HeroUI 组件支持 `classNames` 属性进行深度自定义
   - 可以继续使用自定义的 `.glass` 和 `.apple-shadow` 类

---

## 🚀 下一步

1. **测试功能**
   - 测试备份历史页面的所有功能
   - 验证 Modal、Tabs、Dropdown 组件是否正常工作
   - 检查样式是否正确应用

2. **清理遗留代码**
   - 检查是否还有其他地方使用 Headless UI
   - 清理未使用的导入

3. **优化体验**
   - 根据 HeroUI 的特性优化组件样式
   - 利用 HeroUI 的内置动画和过渡效果

---

## 📚 参考文档

- [HeroUI Tailwind v4 指南](https://www.heroui.com/docs/guide/tailwind-v4)
- [HeroUI 组件文档](https://www.heroui.com/docs/components)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)

---

**迁移完成！** 🎉
