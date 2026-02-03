import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/rules - Get all rules
router.get('/', async (req, res) => {
  try {
    const rules = await dbAll('SELECT * FROM rules ORDER BY created_at DESC');
    res.json({ success: true, rules });
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rules/:id - Get single rule
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await dbGet('SELECT * FROM rules WHERE id = ?', [id]);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ success: true, rule });
  } catch (error) {
    console.error('Error fetching rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rules - Create new rule
router.post('/', async (req, res) => {
  try {
    const { name, description, condition_type, column_name, operator, value, is_active } = req.body;

    if (!name || !column_name || !operator) {
      return res.status(400).json({ 
        error: 'Rule name, column_name, and operator are required' 
      });
    }

    const result = await dbRun(
      `INSERT INTO rules (name, description, condition_type, column_name, operator, value, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, condition_type || 'column_exists', column_name, operator, value || null, is_active !== undefined ? is_active : 1]
    );

    const rule = await dbGet('SELECT * FROM rules WHERE id = ?', [result.lastID]);

    res.json({ success: true, rule });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/rules/:id - Update rule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, condition_type, column_name, operator, value, is_active } = req.body;

    await dbRun(
      `UPDATE rules SET name = ?, description = ?, condition_type = ?, column_name = ?, operator = ?, value = ?, is_active = ?
       WHERE id = ?`,
      [name, description, condition_type, column_name, operator, value, is_active, id]
    );

    const rule = await dbGet('SELECT * FROM rules WHERE id = ?', [id]);

    res.json({ success: true, rule });
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rules/:id - Delete rule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM rules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

