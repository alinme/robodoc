import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/templates - Get all templates
router.get('/', async (req, res) => {
  try {
    const templates = await dbAll('SELECT * FROM message_templates ORDER BY created_at DESC');
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await dbGet('SELECT * FROM message_templates WHERE id = ?', [id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates - Create new template
router.post('/', async (req, res) => {
  try {
    const { name, content, html_template, email_subject } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Template name and content are required' });
    }

    const result = await dbRun(
      'INSERT INTO message_templates (name, content, html_template, email_subject) VALUES (?, ?, ?, ?)',
      [name, content, html_template || null, email_subject || null]
    );

    const template = await dbGet('SELECT * FROM message_templates WHERE id = ?', [result.lastID]);

    res.json({ success: true, template });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Template name already exists' });
    }
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, html_template, email_subject } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Template name and content are required' });
    }

    await dbRun(
      'UPDATE message_templates SET name = ?, content = ?, html_template = ?, email_subject = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, content, html_template || null, email_subject || null, id]
    );

    const template = await dbGet('SELECT * FROM message_templates WHERE id = ?', [id]);

    res.json({ success: true, template });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Template name already exists' });
    }
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM message_templates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

