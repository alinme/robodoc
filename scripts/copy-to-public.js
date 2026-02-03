import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const backendPublicDir = path.join(rootDir, 'backend', 'public');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');

console.log('📦 Copying frontend build to backend/public...');
console.log(`Source: ${frontendDistDir}`);
console.log(`Destination: ${backendPublicDir}`);

// Check if dist directory exists
if (!fs.existsSync(frontendDistDir)) {
  console.error('❌ Frontend dist directory not found:', frontendDistDir);
  console.error('   Please run "pnpm run build" first.');
  process.exit(1);
}

// Remove existing public directory contents
if (fs.existsSync(backendPublicDir)) {
  console.log('Removing existing public directory...');
  fs.rmSync(backendPublicDir, { recursive: true, force: true });
}

// Create public directory
fs.mkdirSync(backendPublicDir, { recursive: true });

// Copy all files from dist to public
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) {
    console.warn(`Source does not exist: ${src}`);
    return;
  }
  
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src);
    items.forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursiveSync(frontendDistDir, backendPublicDir);
  console.log('✅ Files copied successfully');
  console.log(`📁 Frontend files are now in: ${backendPublicDir}`);
} catch (error) {
  console.error('❌ Error copying files:', error.message);
  process.exit(1);
}

