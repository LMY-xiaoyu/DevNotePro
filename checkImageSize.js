const fs = require('fs');
const sharp = require('sharp');

async function checkImageSize() {
  try {
    const image = await sharp('static/app.png').metadata();
    console.log(`Image size: ${image.width}x${image.height}`);
  } catch (error) {
    console.error('Error checking image size:', error);
  }
}

checkImageSize();