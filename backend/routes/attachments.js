import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for email attachment uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const attachmentsDir = path.join(__dirname, '..', 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'email-attachment-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit per file
  fileFilter: (req, file, cb) => {
    // Allow most file types for email attachments
    cb(null, true);
  }
});

// POST /api/attachments/upload - Upload email attachment
router.post('/upload', upload.array('attachments', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];
    
    for (const file of req.files) {
      uploadedFiles.push({
        id: null, // Will be set when saved to message
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
      });
    }

    res.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attachments/:id - Download attachment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const attachment = await dbGet(
      'SELECT * FROM email_attachments WHERE id = ?',
      [id]
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = attachment.file_path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Attachment file not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/attachments/:id - Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const attachment = await dbGet(
      'SELECT * FROM email_attachments WHERE id = ?',
      [id]
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Delete file from disk
    if (fs.existsSync(attachment.file_path)) {
      try {
        fs.unlinkSync(attachment.file_path);
      } catch (err) {
        console.warn('Error deleting attachment file:', err.message);
      }
    }

    // Delete from database (CASCADE will handle message_history relationship)
    await dbRun('DELETE FROM email_attachments WHERE id = ?', [id]);

    res.json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attachments/message/:messageId - Get attachments for a message
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const attachments = await dbAll(
      'SELECT * FROM email_attachments WHERE message_history_id = ?',
      [messageId]
    );

    res.json({
      success: true,
      attachments
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
