# 图标生成说明

## 快速生成图标（推荐）

由于需要二进制图标文件，最简单的方法是使用在线工具：

### 1. 生成 macOS 图标 (.icns)

1. 访问: https://cloudconvert.com/svg-to-icns
2. 上传 `build/icon.svg` 文件
3. 点击 "Convert" 转换
4. 下载生成的 `icon.icns` 文件
5. 将文件保存到 `build/icon.icns`

### 2. 生成 Windows 图标 (.ico)

1. 访问: https://cloudconvert.com/svg-to-ico
2. 上传 `build/icon.svg` 文件
3. 点击 "Convert" 转换
4. 下载生成的 `icon.ico` 文件
5. 将文件保存到 `build/icon.ico`

## 使用脚本生成（需要安装依赖）

如果你已经安装了 `sharp` 库：

```bash
# 安装 sharp
yarn add -D sharp

# 生成图标
yarn generate-icons
```

## 图标文件位置

生成后，确保以下文件存在：
- `build/icon.icns` - macOS 图标
- `build/icon.ico` - Windows 图标

这些文件会在构建 Electron 应用时自动使用。
