import express from 'express';
import { sendMessage } from '../services/whatsappService.js';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// POST /api/messages/send - Send message to contact(s)
router.post('/send', async (req, res) => {
  try {
    const { contactIds, groupId, template, delay = 1000 } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Message template is required' });
    }

    if (!contactIds && !groupId) {
      return res.status(400).json({ error: 'Either contactIds or groupId is required' });
    }

    // Get contacts to send to
    let contacts = [];
    if (contactIds && contactIds.length > 0) {
      const placeholders = contactIds.map(() => '?').join(',');
      contacts = await dbAll(
        `SELECT * FROM contacts WHERE id IN (${placeholders})`,
        contactIds
      );
    } else if (groupId) {
      contacts = await dbAll('SELECT * FROM contacts WHERE group_id = ?', [groupId]);
    }

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found to send messages to' });
    }

    const results = [];
    
    // Send messages with delay between each
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Replace placeholders in template
      let finalMessage = template;
      finalMessage = finalMessage.replace(/{Name}/g, contact.name || '');
      finalMessage = finalMessage.replace(/{GivenName}/g, contact.name.split(' ')[0] || '');
      finalMessage = finalMessage.replace(/{Business}/g, contact.business || '');
      finalMessage = finalMessage.replace(/{Group}/g, contact.group || '');
      finalMessage = finalMessage.replace(/{Email}/g, contact.email || '');

      try {
        // Create message record
        const messageResult = await dbRun(
          `INSERT INTO messages (contact_id, group_id, template, final_message, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [contact.id, contact.group_id, template, finalMessage]
        );

        // Send message
        const sendResult = await sendMessage(contact.phone, finalMessage);
        
        // Update message record
        await dbRun(
          `UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [messageResult.lastID]
        );

        results.push({
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          success: true,
          messageId: sendResult.messageId
        });

        // Delay before next message (except for last one)
        if (i < contacts.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Error sending message to ${contact.phone}:`, error);
        
        // Create failed message record
        await dbRun(
          `INSERT INTO messages (contact_id, group_id, template, final_message, status, error_message)
           VALUES (?, ?, ?, ?, 'failed', ?)`,
          [contact.id, contact.group_id, template, finalMessage, error.message]
        );

        results.push({
          contactId: contact.id,
          contactName: contact.name,
          phone: contact.phone,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error sending messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/history - Get message history (unified from messages and messages_history tables)
router.get('/history', async (req, res) => {
  try {
    const { contactId, groupId, status, limit = 100, offset = 0 } = req.query;
    
    // Get messages from both tables (WhatsApp messages and email messages)
    // First get WhatsApp messages
    let whatsappQuery = `
      SELECT 
        m.id,
        m.contact_id,
        m.group_id,
        m.template,
        m.final_message,
        m.final_message as message_content,
        m.sent_at,
        m.status,
        m.error_message,
        'whatsapp' as message_type,
        NULL as template_id,
        c.name as contact_name,
        c.phone,
        c.email,
        g.name as group_name
      FROM messages m
      LEFT JOIN contacts c ON m.contact_id = c.id
      LEFT JOIN groups g ON m.group_id = g.id
      WHERE 1=1
    `;
    const whatsappParams = [];

    if (contactId) {
      whatsappQuery += ' AND m.contact_id = ?';
      whatsappParams.push(contactId);
    }

    if (groupId) {
      whatsappQuery += ' AND m.group_id = ?';
      whatsappParams.push(groupId);
    }

    if (status) {
      whatsappQuery += ' AND m.status = ?';
      whatsappParams.push(status);
    }

    // Get email messages
    let emailQuery = `
      SELECT 
        mh.id,
        mh.contact_id,
        NULL as group_id,
        NULL as template,
        mh.message_content,
        mh.message_content as final_message,
        mh.sent_at,
        mh.status,
        mh.error_message,
        mh.message_type,
        mh.template_id,
        c.name as contact_name,
        c.phone,
        c.email,
        NULL as group_name
      FROM messages_history mh
      LEFT JOIN contacts c ON mh.contact_id = c.id
      WHERE mh.message_type = 'email'
    `;
    const emailParams = [];

    if (contactId) {
      emailQuery += ' AND mh.contact_id = ?';
      emailParams.push(contactId);
    }

    if (status) {
      emailQuery += ' AND mh.status = ?';
      emailParams.push(status);
    }

    // Get both and combine
    const whatsappMessages = await dbAll(whatsappQuery, whatsappParams);
    const emailMessages = await dbAll(emailQuery, emailParams);
    
    // Combine and sort
    let messages = [...whatsappMessages, ...emailMessages];
    messages.sort((a, b) => {
      const dateA = new Date(a.sent_at || 0).getTime();
      const dateB = new Date(b.sent_at || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });
    
    // Apply pagination
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    messages = messages.slice(offsetNum, offsetNum + limitNum);

    // Get attachments for email messages
    for (const message of messages) {
      if (message.message_type === 'email' && message.id) {
        const attachments = await dbAll(
          'SELECT * FROM email_attachments WHERE message_history_id = ?',
          [message.id]
        );
        message.attachments = attachments;
      } else {
        message.attachments = [];
      }
    }

    // Get total count (from both tables)
    let whatsappCountQuery = 'SELECT COUNT(*) as total FROM messages m WHERE 1=1';
    const whatsappCountParams = [];
    
    if (contactId) {
      whatsappCountQuery += ' AND m.contact_id = ?';
      whatsappCountParams.push(contactId);
    }
    
    if (groupId) {
      whatsappCountQuery += ' AND m.group_id = ?';
      whatsappCountParams.push(groupId);
    }
    
    if (status) {
      whatsappCountQuery += ' AND m.status = ?';
      whatsappCountParams.push(status);
    }

    let emailCountQuery = "SELECT COUNT(*) as total FROM messages_history mh WHERE mh.message_type = 'email'";
    const emailCountParams = [];

    if (contactId) {
      emailCountQuery += ' AND mh.contact_id = ?';
      emailCountParams.push(contactId);
    }
    
    if (status) {
      emailCountQuery += ' AND mh.status = ?';
      emailCountParams.push(status);
    }

    const whatsappCountResult = await dbGet(whatsappCountQuery, whatsappCountParams);
    const emailCountResult = await dbGet(emailCountQuery, emailCountParams);
    
    const total = (whatsappCountResult?.total || 0) + (emailCountResult?.total || 0);

    res.json({
      success: true,
      messages,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/messages/retry/:id - Retry failed message
router.post('/retry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await dbGet('SELECT m.*, c.phone, c.name FROM messages m JOIN contacts c ON m.contact_id = c.id WHERE m.id = ?', [id]);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    try {
      const sendResult = await sendMessage(message.phone, message.final_message);
      
      await dbRun(
        `UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?`,
        [id]
      );

      res.json({
        success: true,
        messageId: sendResult.messageId
      });
    } catch (error) {
      await dbRun(
        `UPDATE messages SET error_message = ? WHERE id = ?`,
        [error.message, id]
      );
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error retrying message:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/messages/:id - Delete a single message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM messages WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/messages/contact/:contactId - Delete all messages for a contact
router.delete('/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const result = await dbRun('DELETE FROM messages WHERE contact_id = ?', [contactId]);
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting contact messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/messages/all - Delete all messages
router.delete('/all', async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM messages');
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting all messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/messages/bulk - Delete multiple messages
router.delete('/bulk', async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }
    
    const placeholders = messageIds.map(() => '?').join(',');
    const result = await dbRun(
      `DELETE FROM messages WHERE id IN (${placeholders})`,
      messageIds
    );
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

