const sharp = require('sharp');
const fs = require('fs');

async function resizeIcon() {
  try {
    // 检查图标是否存在
    if (!fs.existsSync('static/app.png')) {
      console.error('图标文件不存在');
      return;
    }
    
    // 获取当前图标信息
    const metadata = await sharp('static/app.png').metadata();
    console.log(`当前图标大小: ${metadata.width}x${metadata.height}`);
    
    // 如果图标已经满足256x256，不需要调整
    if (metadata.width >= 256 && metadata.height >= 256) {
      console.log('图标大小已经满足要求');
      return;
    }
    
    // 调整图标大小到256x256
    await sharp('static/app.png')
      .resize(256, 256, { fit: 'contain', background: 'transparent' })
      .toFile('static/app-resized.png');
    
    console.log('图标已调整到256x256');
    
    // 替换原图标
    fs.unlinkSync('static/app.png');
    fs.renameSync('static/app-resized.png', 'static/app.png');
    console.log('图标已替换');
  } catch (error) {
    console.error('调整图标大小失败:', error);
  }
}

resizeIcon();