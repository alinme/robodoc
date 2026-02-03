import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Storage directory
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = req.body.folderPath || '';
    const targetDir = folderPath 
      ? path.join(STORAGE_DIR, folderPath)
      : STORAGE_DIR;
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

// Custom storage to preserve folder structure
const folderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Temporary directory for uploads (will be moved to final location)
    const tempDir = path.join(STORAGE_DIR, '.temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Use a unique name to avoid conflicts, we'll use the original path later
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: folderStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
});

// Helper function to get relative path from storage directory
function getRelativePath(fullPath) {
  const relative = path.relative(STORAGE_DIR, fullPath);
  return relative.replace(/\\/g, '/'); // Normalize to forward slashes
}

// Helper function to get file info
function getFileInfo(filePath) {
  const stats = fs.statSync(filePath);
  const relativePath = getRelativePath(filePath);
  const isDirectory = stats.isDirectory();
  
  return {
    name: path.basename(filePath),
    path: relativePath,
    fullPath: filePath,
    isDirectory,
    size: isDirectory ? null : stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString()
  };
}

// GET /api/storage - List files and folders
router.get('/', async (req, res) => {
  try {
    const { folderPath = '' } = req.query;
    const targetDir = folderPath 
      ? path.join(STORAGE_DIR, folderPath)
      : STORAGE_DIR;

    // Security: ensure path is within storage directory
    const resolvedPath = path.resolve(targetDir);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedPath.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const items = fs.readdirSync(targetDir).map(item => {
      const itemPath = path.join(targetDir, item);
      return getFileInfo(itemPath);
    });

    // Sort: folders first, then files, both alphabetically
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      currentPath: folderPath,
      items
    });
  } catch (error) {
    console.error('Error listing storage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle preflight OPTIONS request for CORS - must be before POST route
router.options('/upload', (req, res) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// POST /api/storage/upload - Upload file(s) with optional folder structure preservation
router.post('/upload', upload.array('files', 1000), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const preserveStructure = req.body.preserveStructure === 'true';
    const folderPath = req.body.folderPath || '';
    const folderName = req.body.folderName || '';
    
    const targetDir = folderPath 
      ? path.join(STORAGE_DIR, folderPath)
      : STORAGE_DIR;

    // Security check
    const resolvedTarget = path.resolve(targetDir);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedTarget.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const uploadedFiles = [];

    if (preserveStructure) {
      // Handle folder upload with structure preservation
      // The browser sends files with webkitRelativePath in the request
      // We need to extract it from the form data or use a custom approach
      
      // Get file paths from form data - browser sends them with webkitRelativePath
      const filePaths = req.body.filePaths ? JSON.parse(req.body.filePaths) : [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        let relativePath = '';
        
        // Try to get path from filePaths array (sent from frontend)
        if (filePaths[i]) {
          relativePath = filePaths[i];
        } else if (file.originalname && file.originalname.includes('/')) {
          // Fallback: try to get from originalname
          relativePath = file.originalname;
        } else {
          // No path info, just use filename
          relativePath = file.originalname;
        }

        // Remove the root folder name if provided (first segment)
        let pathParts = relativePath.split(/[/\\]/).filter(p => p);
        if (folderName && pathParts[0] === folderName) {
          pathParts = pathParts.slice(1);
        }
        
        const finalRelativePath = pathParts.join('/');
        const finalPath = path.join(targetDir, finalRelativePath);
        const finalDir = path.dirname(finalPath);

        // Create directory structure if needed
        if (!fs.existsSync(finalDir)) {
          fs.mkdirSync(finalDir, { recursive: true });
        }

        // Move file from temp location to final location
        if (file.path !== finalPath) {
          fs.renameSync(file.path, finalPath);
        }

        uploadedFiles.push({
          name: path.basename(finalPath),
          path: getRelativePath(finalPath),
          size: file.size,
          mimetype: file.mimetype
        });
      }
    } else {
      // Handle regular file upload (no structure preservation)
      for (const file of req.files) {
        // Move from temp to final location
        const finalPath = path.join(targetDir, file.originalname);
        
        // Handle filename conflicts
        let counter = 1;
        let actualPath = finalPath;
        while (fs.existsSync(actualPath)) {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          actualPath = path.join(targetDir, `${name}_${counter}${ext}`);
          counter++;
        }
        
        fs.renameSync(file.path, actualPath);
        
        uploadedFiles.push({
          name: path.basename(actualPath),
          path: getRelativePath(actualPath),
          size: file.size,
          mimetype: file.mimetype
        });
      }
    }

    res.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)${preserveStructure ? ' with folder structure' : ''}`
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/storage/folder - Create folder
router.post('/folder', async (req, res) => {
  try {
    const { folderName, parentPath = '' } = req.body;

    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Sanitize folder name
    const sanitizedName = folderName.replace(/[<>:"/\\|?*]/g, '');
    if (sanitizedName !== folderName) {
      return res.status(400).json({ error: 'Invalid folder name. Cannot contain: < > : " / \\ | ? *' });
    }

    const targetDir = parentPath 
      ? path.join(STORAGE_DIR, parentPath, sanitizedName)
      : path.join(STORAGE_DIR, sanitizedName);

    // Security check
    const resolvedPath = path.resolve(targetDir);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedPath.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (fs.existsSync(targetDir)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }

    fs.mkdirSync(targetDir, { recursive: true });

    res.json({
      success: true,
      folder: getFileInfo(targetDir),
      message: 'Folder created successfully'
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/storage - Delete file or folder
router.delete('/', async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const targetPath = path.join(STORAGE_DIR, filePath);

    // Security check
    const resolvedPath = path.resolve(targetPath);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedPath.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    const stats = fs.statSync(targetPath);
    
    if (stats.isDirectory()) {
      // Delete directory recursively
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      // Delete file
      fs.unlinkSync(targetPath);
    }

    res.json({
      success: true,
      message: 'Deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file/folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/storage/folders - Get all folders recursively
router.get('/folders', async (req, res) => {
  try {
    const folders = [];
    
    function scanDirectory(dirPath, relativePath = '') {
      if (!fs.existsSync(dirPath)) return;
      
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          const folderRelativePath = relativePath ? `${relativePath}/${item}` : item;
          folders.push({
            name: item,
            path: folderRelativePath
          });
          
          // Recursively scan subdirectories
          scanDirectory(itemPath, folderRelativePath);
        }
      }
    }
    
    scanDirectory(STORAGE_DIR);
    
    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/storage/rename - Rename file or folder
router.post('/rename', async (req, res) => {
  try {
    const { filePath, newName } = req.body;

    if (!filePath || !newName) {
      return res.status(400).json({ error: 'File path and new name are required' });
    }

    // Sanitize new name
    const sanitizedName = newName.replace(/[<>:"/\\|?*]/g, '');
    if (sanitizedName !== newName) {
      return res.status(400).json({ error: 'Invalid name. Cannot contain: < > : " / \\ | ? *' });
    }

    const sourcePath = path.join(STORAGE_DIR, filePath);

    // Security check
    const resolvedSource = path.resolve(sourcePath);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedSource.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    // Get parent directory and new path
    const parentDir = path.dirname(sourcePath);
    const newPath = path.join(parentDir, sanitizedName);

    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'A file or folder with this name already exists' });
    }

    // Rename
    fs.renameSync(sourcePath, newPath);

    res.json({
      success: true,
      message: 'Renamed successfully',
      newPath: getRelativePath(newPath)
    });
  } catch (error) {
    console.error('Error renaming file/folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/storage/move - Move file or folder
router.post('/move', async (req, res) => {
  try {
    const { filePath, destinationPath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const sourcePath = path.join(STORAGE_DIR, filePath);
    const destDir = destinationPath 
      ? path.join(STORAGE_DIR, destinationPath)
      : STORAGE_DIR;

    // Security checks
    const resolvedSource = path.resolve(sourcePath);
    const resolvedDest = path.resolve(destDir);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedSource.startsWith(resolvedStorage) || !resolvedDest.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'File or folder not found' });
    }

    if (!fs.existsSync(destDir)) {
      return res.status(404).json({ error: 'Destination folder not found' });
    }

    const stats = fs.statSync(destDir);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Destination is not a folder' });
    }

    // Check if destination is inside source (would cause error)
    if (resolvedDest.startsWith(resolvedSource + path.sep)) {
      return res.status(400).json({ error: 'Cannot move folder into itself' });
    }

    const fileName = path.basename(sourcePath);
    const newPath = path.join(destDir, fileName);

    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'A file or folder with this name already exists in the destination' });
    }

    // Move
    fs.renameSync(sourcePath, newPath);

    res.json({
      success: true,
      message: 'Moved successfully',
      newPath: getRelativePath(newPath)
    });
  } catch (error) {
    console.error('Error moving file/folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/storage/download - Download file
router.get('/download', async (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const targetPath = path.join(STORAGE_DIR, filePath);

    // Security check
    const resolvedPath = path.resolve(targetPath);
    const resolvedStorage = path.resolve(STORAGE_DIR);
    
    if (!resolvedPath.startsWith(resolvedStorage)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download a folder' });
    }

    const fileName = path.basename(targetPath);
    
    // Properly encode filename for Content-Disposition header
    // Create a safe ASCII-only filename for basic compatibility (fallback)
    // Only allow printable ASCII characters (space through ~)
    const safeFileName = fileName
      .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscore for safe version
      .replace(/["\\]/g, '_'); // Replace quotes and backslashes with underscore (they cause issues)
    
    // Use RFC 5987 encoding for proper Unicode support
    // This handles all Unicode characters including Romanian characters (ș, ă, etc.)
    // encodeURIComponent already handles all special characters properly
    const encodedFileName = encodeURIComponent(fileName);
    
    // Set header with both simple ASCII version and RFC 5987 encoded version
    // Modern browsers will use the filename* parameter, older ones will use filename
    // Use only the RFC 5987 version if filename contains non-ASCII characters
    let contentDisposition;
    if (/[^\x20-\x7E]/.test(fileName)) {
      // Contains non-ASCII characters - use only RFC 5987 encoding
      contentDisposition = `attachment; filename*=UTF-8''${encodedFileName}`;
    } else {
      // ASCII-only filename - use both for compatibility
      contentDisposition = `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
    }
    
    res.setHeader('Content-Disposition', contentDisposition);
    
    // Try to detect MIME type
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    
    const fileStream = fs.createReadStream(targetPath);
    
    // Handle stream errors
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file: ' + err.message });
      }
    });
    
    // Handle response errors
    res.on('error', (err) => {
      console.error('Response error:', err);
      fileStream.destroy();
    });
    
    // Handle client disconnect
    req.on('close', () => {
      fileStream.destroy();
    });
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
