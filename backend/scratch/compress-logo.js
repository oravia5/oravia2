import { Jimp } from 'jimp';
import path from 'path';

const srcPath = path.resolve('../frontend/public/favicon.png');
const destPath192 = path.resolve('../frontend/public/logo192.png');
const destPath512 = path.resolve('../frontend/public/logo512.png');
const destPathFavicon = path.resolve('../frontend/public/favicon.png');
const destPathPreview = path.resolve('../frontend/public/logo-preview.png');

async function processLogos() {
  try {
    console.log('Loading source image:', srcPath);
    const image = await Jimp.read(srcPath);

    // 1. Create a 120x120 preview image for social crawlers (extremely lightweight)
    console.log('Generating 120x120 preview logo...');
    const preview = image.clone().resize(120, 120);
    await preview.writeAsync(destPathPreview);
    console.log('Saved preview to:', destPathPreview);

    // 2. Overwrite logo192.png with a properly sized 192x192 logo
    console.log('Generating 192x192 logo...');
    const logo192 = image.clone().resize(192, 192);
    await logo192.writeAsync(destPath192);
    console.log('Saved logo192 to:', destPath192);

    // 3. Overwrite logo512.png with a properly sized 512x512 logo
    console.log('Generating 512x512 logo...');
    const logo512 = image.clone().resize(512, 512);
    await logo512.writeAsync(destPath512);
    console.log('Saved logo512 to:', destPath512);

    // 4. Overwrite favicon.png with a 64x64 favicon
    console.log('Generating 64x64 favicon...');
    const favicon = image.clone().resize(64, 64);
    await favicon.writeAsync(destPathFavicon);
    console.log('Saved favicon to:', destPathFavicon);

    console.log('All image resizing completed successfully!');
  } catch (error) {
    console.error('Image processing failed:', error);
  }
}

processLogos();
