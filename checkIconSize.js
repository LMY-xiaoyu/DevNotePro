const sizeOf = require('image-size');
const fs = require('fs');

try {
  const dimensions = sizeOf('static/app.png');
  console.log('当前图标大小:', dimensions.width, 'x', dimensions.height);
} catch (error) {
  console.error('检查图标大小失败:', error);
}