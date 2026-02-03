import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { dbRun, dbGet, dbAll } from '../services/database.js';
import { extractCentralizatorFromWorkbookWithConfigs } from '../services/excelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function normalizeKey(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function csvEscape(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

// GET /api/centralizator - List records with optional search
router.get('/', async (req, res) => {
  try {
    const { search = '', limit = 200, offset = 0 } = req.query;
    const params = [];
    let query = `SELECT * FROM centralizator_schools WHERE 1=1`;

    if (search) {
      query += ` AND (
        name_normalized LIKE ? OR
        address_normalized LIKE ? OR
        state_region_normalized LIKE ? OR
        protocol_number_normalized LIKE ?
      )`;
      const like = `%${normalizeKey(search)}%`;
      params.push(like, like, like, like);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const records = await dbAll(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM centralizator_schools WHERE 1=1`;
    const countParams = [];
    if (search) {
      countQuery += ` AND (
        name_normalized LIKE ? OR
        address_normalized LIKE ? OR
        state_region_normalized LIKE ? OR
        protocol_number_normalized LIKE ?
      )`;
      const like = `%${normalizeKey(search)}%`;
      countParams.push(like, like, like, like);
    }

    const countResult = await dbGet(countQuery, countParams);

    res.json({
      success: true,
      records,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching centralizator records:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/centralizator/columns - List distinct JSON keys
router.get('/columns', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    let query = `SELECT raw_data FROM centralizator_schools WHERE 1=1`;

    if (search) {
      query += ` AND (
        name_normalized LIKE ? OR
        address_normalized LIKE ? OR
        state_region_normalized LIKE ? OR
        protocol_number_normalized LIKE ?
      )`;
      const like = `%${normalizeKey(search)}%`;
      params.push(like, like, like, like);
    }

    const rows = await dbAll(query, params);
    const keys = new Set();

    for (const row of rows) {
      if (!row?.raw_data) continue;
      try {
        const parsed = JSON.parse(row.raw_data);
        Object.keys(parsed || {}).forEach(key => {
          if (key && key.trim()) {
            keys.add(key);
          }
        });
      } catch (error) {
        console.warn('Failed to parse centralizator raw_data:', error.message);
      }
    }

    res.json({
      success: true,
      keys: Array.from(keys).sort((a, b) => a.localeCompare(b))
    });
  } catch (error) {
    console.error('Error fetching centralizator columns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/centralizator/export - Export records to CSV
router.get('/export', async (req, res) => {
  try {
    const { search = '', columns = '' } = req.query;
    const params = [];
    let query = `SELECT name, address, state_region, protocol_number, raw_data FROM centralizator_schools WHERE 1=1`;

    if (search) {
      query += ` AND (
        name_normalized LIKE ? OR
        address_normalized LIKE ? OR
        state_region_normalized LIKE ? OR
        protocol_number_normalized LIKE ?
      )`;
      const like = `%${normalizeKey(search)}%`;
      params.push(like, like, like, like);
    }

    query += ` ORDER BY updated_at DESC`;
    const rows = await dbAll(query, params);
    const requestedColumns = columns
      ? String(columns).split(',').map(col => col.trim()).filter(Boolean)
      : [];

    const baseColumns = ['name', 'address', 'state_region', 'protocol_number'];
    const header = [...baseColumns, ...requestedColumns];
    const csvRows = [header.map(csvEscape).join(',')];

    for (const row of rows) {
      let rawData = {};
      if (row.raw_data) {
        try {
          rawData = JSON.parse(row.raw_data);
        } catch (error) {
          console.warn('Failed to parse centralizator raw_data:', error.message);
        }
      }

      const line = [
        row.name,
        row.address,
        row.state_region,
        row.protocol_number,
        ...requestedColumns.map(col => rawData?.[col] ?? '')
      ].map(csvEscape).join(',');

      csvRows.push(line);
    }

    const csvContent = csvRows.join('\n');
    const filename = `centralizator-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error('Error exporting centralizator:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/centralizator/mappings
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await dbAll('SELECT * FROM centralizator_mappings ORDER BY created_at DESC');
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching centralizator mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/centralizator/mappings
router.post('/mappings', async (req, res) => {
  try {
    const { name, school_name_column, address_column, protocol_number_column } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Mapping name is required' });
    }

    const result = await dbRun(
      `INSERT INTO centralizator_mappings (name, school_name_column, address_column, protocol_number_column)
       VALUES (?, ?, ?, ?)`,
      [name, school_name_column, address_column, protocol_number_column]
    );

    res.json({
      success: true,
      mapping: {
        id: result.lastID,
        name,
        school_name_column,
        address_column,
        protocol_number_column
      }
    });
  } catch (error) {
    console.error('Error saving centralizator mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/centralizator/preview
router.post('/preview', async (req, res) => {
  try {
    const { fileId, sheetConfigs = [] } = req.body;

    if (!fileId || !Array.isArray(sheetConfigs) || sheetConfigs.length === 0) {
      return res.status(400).json({ error: 'fileId and sheetConfigs are required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = extractCentralizatorFromWorkbookWithConfigs(filePath, sheetConfigs);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const preview = [];
    const rowKeyMap = new Map();

    for (const record of result.records) {
      const previewItem = {
        ...record,
        status: 'new',
        issues: [],
        existingRecord: null,
        canImport: true
      };

      const key = `${normalizeKey(record.schoolName)}|${normalizeKey(record.address)}|${normalizeKey(record.stateRegion)}`;

      if (!record.schoolName || !record.schoolName.trim()) {
        previewItem.issues.push('Missing school name');
        previewItem.canImport = false;
      }

      if (rowKeyMap.has(key)) {
        previewItem.status = 'duplicate_in_file';
        const firstIndex = rowKeyMap.get(key);
        previewItem.issues.push(`Duplicate in file (first seen at row ${firstIndex})`);
        const firstItem = preview[firstIndex - 1];
        if (firstItem && firstItem.status === 'new') {
          firstItem.status = 'duplicate_in_file';
          firstItem.issues.push(`Duplicate in file (also at row ${preview.length + 1})`);
        }
      } else {
        rowKeyMap.set(key, preview.length + 1);
      }

      const existing = await dbGet(
        `SELECT id, name, address, state_region AS stateRegion, protocol_number AS protocolNumber, raw_data AS rawData
         FROM centralizator_schools
         WHERE LOWER(name) = ? AND LOWER(address) = ? AND LOWER(state_region) = ?`,
        [normalizeKey(record.schoolName), normalizeKey(record.address), normalizeKey(record.stateRegion)]
      );

      if (existing) {
        previewItem.status = 'duplicate';
        previewItem.existingRecord = existing;
        previewItem.issues.push('Record already exists (will update on import)');
      }

      preview.push(previewItem);
    }

    const stats = {
      total: preview.length,
      new: preview.filter(p => p.status === 'new').length,
      duplicate: preview.filter(p => p.status === 'duplicate').length,
      duplicate_in_file: preview.filter(p => p.status === 'duplicate_in_file').length,
      with_issues: preview.filter(p => p.issues.length > 0).length,
      cannot_import: preview.filter(p => !p.canImport).length
    };

    res.json({
      success: true,
      preview,
      stats
    });
  } catch (error) {
    console.error('Centralizator preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/centralizator/import
router.post('/import', async (req, res) => {
  try {
    const { fileId, sheetConfigs = [], rows } = req.body;

    if (!fileId || !Array.isArray(sheetConfigs) || sheetConfigs.length === 0) {
      return res.status(400).json({ error: 'fileId and sheetConfigs are required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    let recordsToImport = [];
    if (rows && Array.isArray(rows) && rows.length > 0) {
      recordsToImport = rows;
    } else {
      const result = extractCentralizatorFromWorkbookWithConfigs(filePath, sheetConfigs);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      recordsToImport = result.records;
    }

    const imported = [];
    const skipped = [];
    let newCount = 0;
    let updatedCount = 0;

    for (const record of recordsToImport) {
      try {
        if (!record.schoolName || !record.schoolName.trim()) {
          skipped.push({ ...record, error: 'Missing school name' });
          continue;
        }

        const existing = await dbGet(
          `SELECT id FROM centralizator_schools
           WHERE name_normalized = ? AND address_normalized = ? AND state_region_normalized = ?`,
          [
            normalizeKey(record.schoolName),
            normalizeKey(record.address),
            normalizeKey(record.stateRegion)
          ]
        );

        if (existing) {
          await dbRun(
            `UPDATE centralizator_schools
             SET name = ?, address = ?, state_region = ?, protocol_number = ?, raw_data = ?, source_file = ?,
                 name_normalized = ?, address_normalized = ?, state_region_normalized = ?, protocol_number_normalized = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              record.schoolName,
              record.address,
              record.stateRegion,
              record.protocolNumber || null,
              record.rawData || '{}',
              fileId,
              normalizeKey(record.schoolName),
              normalizeKey(record.address),
              normalizeKey(record.stateRegion),
              normalizeKey(record.protocolNumber),
              existing.id
            ]
          );
          imported.push({ ...record, id: existing.id, updated: true });
          updatedCount++;
        } else {
          const insertResult = await dbRun(
            `INSERT INTO centralizator_schools
             (name, address, state_region, protocol_number, raw_data, source_file,
              name_normalized, address_normalized, state_region_normalized, protocol_number_normalized)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.schoolName,
              record.address,
              record.stateRegion,
              record.protocolNumber || null,
              record.rawData || '{}',
              fileId,
              normalizeKey(record.schoolName),
              normalizeKey(record.address),
              normalizeKey(record.stateRegion),
              normalizeKey(record.protocolNumber)
            ]
          );
          imported.push({ ...record, id: insertResult.lastID, updated: false });
          newCount++;
        }
      } catch (error) {
        console.error('Error importing centralizator record:', error);
        skipped.push({ ...record, error: error.message });
      }
    }

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    res.json({
      success: true,
      imported: imported.length,
      new: newCount,
      updated: updatedCount,
      skipped: skipped.length,
      totalProcessed: recordsToImport.length,
      records: imported,
      errors: skipped
    });
  } catch (error) {
    console.error('Centralizator import error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
