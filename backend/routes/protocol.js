import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getSheetData } from '../services/excelParser.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

router.post('/data', async (req, res) => {
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
    console.error('Protocol data error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


