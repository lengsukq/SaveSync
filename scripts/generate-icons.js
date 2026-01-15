#!/usr/bin/env node

/**
 * 生成 Electron 应用图标
 * 使用方法: node scripts/generate-icons.js
 * 需要: yarn add -D sharp (或使用在线工具)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function generateIcons() {
  const PROJECT_ROOT = path.resolve(__dirname, '..');
  const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
  const SVG_ICON = path.join(BUILD_DIR, 'icon.svg');

  // 确保 build 目录存在
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // 检查 SVG 源文件
  if (!fs.existsSync(SVG_ICON)) {
    console.error(`错误: 找不到 ${SVG_ICON}`);
    process.exit(1);
  }

  console.log('生成应用图标...\n');

  // 创建临时目录
  const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'icon-gen-'));
  const cleanup = () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  try {
    // 检查是否有 sharp (用于 SVG 转 PNG)
    let hasSharp = false;
    try {
      require.resolve('sharp');
      hasSharp = true;
    } catch (e) {
      // sharp not installed
    }

    if (hasSharp) {
      console.log('使用 sharp 库生成图标...');
      const sharp = require('sharp');
      
      // 生成不同尺寸的 PNG
      const sizes = [16, 32, 64, 128, 256, 512, 1024];
      const iconsetDir = path.join(tempDir, 'icon.iconset');
      fs.mkdirSync(iconsetDir, { recursive: true });
      
      for (const size of sizes) {
        const pngPath = path.join(iconsetDir, `icon_${size}x${size}.png`);
        await sharp(SVG_ICON)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        
        // 生成 @2x 版本（除了 1024）
        if (size !== 1024) {
          const png2xPath = path.join(iconsetDir, `icon_${size}x${size}@2x.png`);
          await sharp(SVG_ICON)
            .resize(size * 2, size * 2)
            .png()
            .toFile(png2xPath);
        }
      }
      
      // macOS: 生成 .icns
      if (process.platform === 'darwin') {
        console.log('生成 macOS .icns 文件...');
        try {
          execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(BUILD_DIR, 'icon.icns')}"`, {
            stdio: 'inherit'
          });
          console.log('✓ 已生成 build/icon.icns\n');
        } catch (e) {
          console.error('生成 .icns 失败:', e.message);
        }
      }
      
      // Windows: 生成 .ico (需要多个尺寸)
      console.log('生成 Windows .ico 文件...');
      const icoSizes = [16, 32, 48, 64, 128, 256];
      const icoPngs = icoSizes.map(size => 
        path.join(tempDir, `icon-${size}.png`)
      );
      
      for (let i = 0; i < icoSizes.length; i++) {
        await sharp(SVG_ICON)
          .resize(icoSizes[i], icoSizes[i])
          .png()
          .toFile(icoPngs[i]);
      }
      
      // 使用 ImageMagick 合并为 .ico (如果可用)
      try {
        execSync(`convert ${icoPngs.join(' ')} "${path.join(BUILD_DIR, 'icon.ico')}"`, {
          stdio: 'inherit'
        });
        console.log('✓ 已生成 build/icon.ico\n');
      } catch (e) {
        console.warn('警告: 无法生成 .ico 文件（需要 ImageMagick）');
        console.warn('请安装 ImageMagick: brew install imagemagick');
        console.warn('或使用在线工具: https://cloudconvert.com/svg-to-ico\n');
      }
      
    } else {
      console.log('未找到 sharp 库');
      console.log('请运行: yarn add -D sharp');
      console.log('或使用在线工具转换图标:\n');
      console.log('1. macOS .icns: https://cloudconvert.com/svg-to-icns');
      console.log('2. Windows .ico: https://cloudconvert.com/svg-to-ico');
      console.log(`\n源文件位置: ${SVG_ICON}\n`);
      process.exit(1);
    }
    
    console.log('✓ 图标生成完成！');
    console.log(`  - macOS: ${path.join(BUILD_DIR, 'icon.icns')}`);
    console.log(`  - Windows: ${path.join(BUILD_DIR, 'icon.ico')}`);
    
  } catch (error) {
    console.error('生成图标时出错:', error.message);
    process.exit(1);
  }
}

generateIcons().catch(error => {
  console.error('生成图标时出错:', error.message);
  process.exit(1);
});
