# 图标生成说明

## 自动生成（推荐）

### 方法 1: 使用 sharp（推荐）

```bash
# 安装 sharp
yarn add -D sharp

# 生成图标
yarn generate-icons
```

### 方法 2: 使用在线工具

如果无法安装 sharp，可以使用在线工具：

1. **macOS .icns 文件**:
   - 访问: https://cloudconvert.com/svg-to-icns
   - 上传 `build/icon.svg`
   - 下载生成的 `icon.icns` 文件到 `build/` 目录

2. **Windows .ico 文件**:
   - 访问: https://cloudconvert.com/svg-to-ico
   - 上传 `build/icon.svg`
   - 下载生成的 `icon.ico` 文件到 `build/` 目录

## 手动生成（macOS）

如果你有 ImageMagick 和 iconutil:

```bash
# 安装 ImageMagick
brew install imagemagick

# 将 SVG 转换为 PNG (1024x1024)
convert -background none -resize 1024x1024 build/icon.svg build/icon-1024.png

# 创建 iconset 目录
mkdir -p build/icon.iconset

# 生成不同尺寸
sips -z 16 16 build/icon-1024.png --out build/icon.iconset/icon_16x16.png
sips -z 32 32 build/icon-1024.png --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32 build/icon-1024.png --out build/icon.iconset/icon_32x32.png
sips -z 64 64 build/icon-1024.png --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128 build/icon-1024.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256 build/icon-1024.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256 build/icon-1024.png --out build/icon.iconset/icon_256x256.png
sips -z 512 512 build/icon-1024.png --out build/icon.iconset/icon_256x256@2x.png
sips -z 512 512 build/icon-1024.png --out build/icon.iconset/icon_512x512.png
sips -z 1024 1024 build/icon-1024.png --out build/icon.iconset/icon_512x512@2x.png

# 生成 .icns 文件
iconutil -c icns build/icon.iconset -o build/icon.icns

# 清理临时文件
rm -rf build/icon.iconset build/icon-1024.png
```

## 文件位置

生成的图标文件应该放在 `build/` 目录下：
- `build/icon.icns` - macOS 图标
- `build/icon.ico` - Windows 图标

这些文件会被 electron-builder 自动使用。
