import express from 'express';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

function sanitizeCallType(type) {
  if (!type) return null;
  const normalized = String(type).toLowerCase();
  return normalized === 'phone' || normalized === 'whatsapp' ? normalized : null;
}

async function getCallRecord(contactId) {
  return dbGet(
    `SELECT 
      c.id as contact_id,
      c.name,
      c.phone,
      c.group_id,
      g.name as group_name,
      c.business,
      IFNULL(cc.call_count, 0) as call_count,
      cc.observations,
      cc.last_called_at,
      cc.last_call_type
    FROM contacts c
    LEFT JOIN groups g ON c.group_id = g.id
    LEFT JOIN contact_calls cc ON c.id = cc.contact_id
    WHERE c.id = ?`,
    [contactId]
  );
}

router.get('/', async (req, res) => {
  try {
    const { groupId, search, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        c.id as contact_id,
        c.name,
        c.phone,
        c.group_id,
        g.name as group_name,
        c.business,
        IFNULL(cc.call_count, 0) as call_count,
        cc.observations,
        cc.last_called_at,
        cc.last_call_type
      FROM contacts c
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN contact_calls cc ON c.id = cc.contact_id
      WHERE 1=1`;

    const params = [];

    if (groupId) {
      query += ' AND c.group_id = ?';
      params.push(groupId);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.business LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY c.name COLLATE NOCASE ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const records = await dbAll(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM contacts c WHERE 1=1';
    const countParams = [];

    if (groupId) {
      countQuery += ' AND c.group_id = ?';
      countParams.push(groupId);
    }

    if (search) {
      countQuery += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.business LIKE ?)';
      const term = `%${search}%`;
      countParams.push(term, term, term);
    }

    const countResult = await dbGet(countQuery, countParams);

    res.json({
      success: true,
      records,
      total: countResult?.total || 0,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (error) {
    console.error('Error fetching call records:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const record = await getCallRecord(contactId);

    if (!record) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, record });
  } catch (error) {
    console.error('Error fetching call record:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:contactId/call', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { callType, observations = null } = req.body;

    const validatedCallType = sanitizeCallType(callType);
    if (!validatedCallType) {
      return res.status(400).json({ error: 'callType must be either "phone" or "whatsapp"' });
    }

    const contact = await dbGet('SELECT id FROM contacts WHERE id = ?', [contactId]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await dbRun(
      `INSERT INTO contact_calls (contact_id, call_count, last_called_at, last_call_type, observations)
       VALUES (?, 1, CURRENT_TIMESTAMP, ?, ?)
       ON CONFLICT(contact_id) DO UPDATE SET
         call_count = contact_calls.call_count + 1,
         last_called_at = CURRENT_TIMESTAMP,
         last_call_type = excluded.last_call_type,
         observations = CASE 
           WHEN excluded.observations IS NOT NULL THEN excluded.observations 
           ELSE contact_calls.observations 
         END,
         updated_at = CURRENT_TIMESTAMP`,
      [contactId, validatedCallType, observations]
    );

    const record = await getCallRecord(contactId);
    res.json({ success: true, record });
  } catch (error) {
    console.error('Error recording call:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { callCount, observations } = req.body;

    if (callCount !== undefined) {
      const parsedCount = parseInt(callCount, 10);
      if (Number.isNaN(parsedCount) || parsedCount < 0) {
        return res.status(400).json({ error: 'callCount must be a non-negative integer' });
      }
    }

    const contact = await dbGet('SELECT id FROM contacts WHERE id = ?', [contactId]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const existing = await dbGet('SELECT * FROM contact_calls WHERE contact_id = ?', [contactId]);

    if (!existing) {
      await dbRun(
        `INSERT INTO contact_calls (contact_id, call_count, observations)
         VALUES (?, ?, ?)`,
        [contactId, callCount !== undefined ? callCount : 0, observations ?? null]
      );
    } else {
      const updates = [];
      const params = [];

      if (callCount !== undefined) {
        updates.push('call_count = ?');
        params.push(callCount);
      }

      if (observations !== undefined) {
        updates.push('observations = ?');
        params.push(observations);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      await dbRun(
        `UPDATE contact_calls SET ${updates.join(', ')} WHERE contact_id = ?`,
        [...params, contactId]
      );
    }

    const record = await getCallRecord(contactId);
    res.json({ success: true, record });
  } catch (error) {
    console.error('Error updating call record:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


