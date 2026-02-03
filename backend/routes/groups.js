import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/groups - Get all groups with contact counts
router.get('/', async (req, res) => {
  try {
    const groups = await dbAll(`
      SELECT 
        g.*,
        COUNT(c.id) as contactCount
      FROM groups g
      LEFT JOIN contacts c ON g.id = c.group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
    
    // Convert contactCount from string to number (SQLite returns as string)
    groups.forEach(group => {
      group.contactCount = parseInt(group.contactCount) || 0;
    });
    
    res.json({ success: true, groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/groups/:id - Get single group with contact count
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [id]);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const countResult = await dbGet('SELECT COUNT(*) as count FROM contacts WHERE group_id = ?', [id]);
    group.contactCount = countResult.count;

    res.json({ success: true, group });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/groups - Create new group
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const result = await dbRun(
      'INSERT INTO groups (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [result.lastID]);

    res.json({ success: true, group });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Group name already exists' });
    }
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/groups/:id - Update group
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await dbRun(
      'UPDATE groups SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    const group = await dbGet('SELECT * FROM groups WHERE id = ?', [id]);

    res.json({ success: true, group });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Group name already exists' });
    }
    console.error('Error updating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if group has contacts
    const countResult = await dbGet('SELECT COUNT(*) as count FROM contacts WHERE group_id = ?', [id]);
    
    if (countResult.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete group with ${countResult.count} contacts. Remove contacts first.` 
      });
    }

    await dbRun('DELETE FROM groups WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/groups/:id/contacts - Get all contacts in a group
router.get('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const contacts = await dbAll(`
      SELECT 
        c.*, 
        g.name as group_name,
        COUNT(CASE WHEN m.status IN ('sent', 'success') THEN 1 END) as sent_count,
        c.whatsapp_valid,
        c.whatsapp_in_contacts,
        c.whatsapp_validated_at
      FROM contacts c 
      LEFT JOIN groups g ON c.group_id = g.id 
      LEFT JOIN messages m ON c.id = m.contact_id
      WHERE c.group_id = ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `, [id]);
    
    // Convert sent_count from string to number
    contacts.forEach(contact => {
      contact.sent_count = parseInt(contact.sent_count) || 0;
    });
    
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching group contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/groups/:id/contacts - Add contacts to group
router.post('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { contactIds } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }
    
    // Verify group exists
    const group = await dbGet('SELECT id FROM groups WHERE id = ?', [id]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Update contacts
    const placeholders = contactIds.map(() => '?').join(',');
    await dbRun(`
      UPDATE contacts 
      SET group_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `, [id, ...contactIds]);
    
    res.json({ success: true, updated: contactIds.length });
  } catch (error) {
    console.error('Error adding contacts to group:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/groups/:id/contacts - Remove contacts from group
router.delete('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { contactIds } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }
    
    // Remove contacts from group (set group_id to NULL)
    const placeholders = contactIds.map(() => '?').join(',');
    await dbRun(`
      UPDATE contacts 
      SET group_id = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders}) AND group_id = ?
    `, [...contactIds, id]);
    
    res.json({ success: true, removed: contactIds.length });
  } catch (error) {
    console.error('Error removing contacts from group:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/groups/:id/contacts/available - Get contacts not in this group (for adding)
router.get('/:id/contacts/available', async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;
    
    let query = `
      SELECT 
        c.*, 
        g.name as group_name,
        COUNT(CASE WHEN m.status IN ('sent', 'success') THEN 1 END) as sent_count
      FROM contacts c 
      LEFT JOIN groups g ON c.group_id = g.id 
      LEFT JOIN messages m ON c.id = m.contact_id
      WHERE c.group_id IS NULL OR c.group_id != ?
    `;
    const params = [id];
    
    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.business LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY c.id ORDER BY c.name ASC LIMIT 100';
    
    const contacts = await dbAll(query, params);
    
    // Convert sent_count from string to number
    contacts.forEach(contact => {
      contact.sent_count = parseInt(contact.sent_count) || 0;
    });
    
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching available contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

