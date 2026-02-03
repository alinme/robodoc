import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { parseExcelFile, getSheetData } from '../services/excelParser.js';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'excel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// POST /api/upload - Upload Excel file and get sheets/columns
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const result = parseExcelFile(filePath);

    if (!result.success) {
      // Clean up file on error
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: result.error });
    }

    try {
      await dbRun(
        `INSERT OR REPLACE INTO uploadedfiles (file_id, original_name, size_bytes, uploaded_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [req.file.filename, req.file.originalname, req.file.size ?? null]
      );
    } catch (dbError) {
      console.error('Error saving uploaded file metadata:', dbError);
    }

    res.json({
      success: true,
      fileId: req.file.filename,
      fileName: req.file.originalname,
      sheets: result.sheets
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/files', async (req, res) => {
  try {
    const files = await dbAll(
      `SELECT file_id AS fileId, original_name AS originalName, size_bytes AS sizeBytes, uploaded_at AS uploadedAt
       FROM uploadedfiles
       ORDER BY uploaded_at DESC
       LIMIT 50`
    );

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const availableFiles = [];

    for (const file of files) {
      const filePath = path.join(uploadsDir, file.fileId);
      if (fs.existsSync(filePath)) {
        availableFiles.push(file);
      } else {
        try {
          await dbRun('DELETE FROM uploadedfiles WHERE file_id = ?', [file.fileId]);
        } catch (cleanupError) {
          console.warn('Failed to remove missing uploaded file record:', cleanupError);
        }
      }
    }

    res.json({ success: true, files: availableFiles });
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const record = await dbGet(
      `SELECT file_id AS fileId, original_name AS originalName, size_bytes AS sizeBytes, uploaded_at AS uploadedAt
       FROM uploadedfiles
       WHERE file_id = ?`,
      [fileId]
    );

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server. Please upload it again.' });
    }

    const result = parseExcelFile(filePath);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      fileId,
      fileName: record?.originalName ?? fileId,
      sheets: result.sheets
    });
  } catch (error) {
    console.error('Error reading uploaded file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, fileId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await dbRun('DELETE FROM uploadedfiles WHERE file_id = ?', [fileId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting uploaded file:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/upload/mappings - Get saved column mappings
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await dbAll('SELECT * FROM column_mappings ORDER BY created_at DESC');
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/mappings - Save a column mapping
router.post('/mappings', async (req, res) => {
  try {
    const { name, name_column, phone_column, email_column, group_column, business_column } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Mapping name is required' });
    }

    const result = await dbRun(
      `INSERT INTO column_mappings (name, name_column, phone_column, email_column, group_column, business_column)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, name_column, phone_column, email_column || null, group_column || null, business_column || null]
    );

    res.json({
      success: true,
      mapping: {
        id: result.lastID,
        name,
        name_column,
        phone_column,
        email_column,
        group_column,
        business_column
      }
    });
  } catch (error) {
    console.error('Error saving mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/upload/mappings/:id - Delete a saved mapping
router.delete('/mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM column_mappings WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/parse - Parse sheet data with header row
router.post('/parse', async (req, res) => {
  try {
    const { fileId, sheetName, headerRow = 1 } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    if (!sheetName) {
      return res.status(400).json({ error: 'sheetName is required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found. Please upload the file again.' });
    }

    const result = getSheetData(filePath, sheetName, Number(headerRow) || 1);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to read sheet data' });
    }

    res.json({
      success: true,
      headers: result.headers,
      rows: result.rows,
      totalRows: result.totalRows
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

