import express from 'express';
import { dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Total Contacts
    const totalContacts = await dbGet('SELECT COUNT(*) as count FROM contacts');
    
    // Total Groups
    const totalGroups = await dbGet('SELECT COUNT(*) as count FROM groups');
    
    // Total Messages Sent (status = 'sent' or 'success')
    const totalMessages = await dbGet(`
      SELECT COUNT(*) as count FROM messages 
      WHERE status IN ('sent', 'success')
    `);
    
    // Messages sent today
    const messagesToday = await dbGet(`
      SELECT COUNT(*) as count FROM messages 
      WHERE status IN ('sent', 'success') 
      AND sent_at IS NOT NULL
      AND DATE(sent_at) = DATE('now')
    `);
    
    // Messages sent this week
    const messagesThisWeek = await dbGet(`
      SELECT COUNT(*) as count FROM messages 
      WHERE status IN ('sent', 'success') 
      AND sent_at IS NOT NULL
      AND sent_at >= datetime('now', '-7 days')
    `);
    
    // Messages sent this month
    const messagesThisMonth = await dbGet(`
      SELECT COUNT(*) as count FROM messages 
      WHERE status IN ('sent', 'success') 
      AND sent_at IS NOT NULL
      AND sent_at >= datetime('now', 'start of month')
    `);
    
    // Contacts added today
    const contactsToday = await dbGet(`
      SELECT COUNT(*) as count FROM contacts 
      WHERE DATE(created_at) = DATE('now')
    `);
    
    // Contacts added this week
    const contactsThisWeek = await dbGet(`
      SELECT COUNT(*) as count FROM contacts 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    
    // Contacts added this month
    const contactsThisMonth = await dbGet(`
      SELECT COUNT(*) as count FROM contacts 
      WHERE created_at >= datetime('now', 'start of month')
    `);
    
    // Total Templates
    const totalTemplates = await dbGet('SELECT COUNT(*) as count FROM message_templates');
    
    // Messages by status
    const messagesByStatus = await dbAll(`
      SELECT status, COUNT(*) as count 
      FROM messages 
      GROUP BY status
    `);
    
    // Top groups by contact count
    const topGroups = await dbAll(`
      SELECT 
        g.id,
        g.name,
        g.description,
        COUNT(c.id) as contact_count,
        g.created_at
      FROM groups g
      LEFT JOIN contacts c ON g.id = c.group_id
      GROUP BY g.id
      ORDER BY contact_count DESC
      LIMIT 5
    `);
    
    // Recent messages (last 10)
    const recentMessages = await dbAll(`
      SELECT 
        m.id,
        m.status,
        m.sent_at,
        m.error_message,
        c.name as contact_name,
        c.phone as contact_phone,
        g.name as group_name
      FROM messages m
      LEFT JOIN contacts c ON m.contact_id = c.id
      LEFT JOIN groups g ON m.group_id = g.id
      ORDER BY m.sent_at DESC, m.id DESC
      LIMIT 10
    `);
    
    // Recent contacts (last 10)
    const recentContacts = await dbAll(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.business,
        c.created_at,
        g.name as group_name
      FROM contacts c
      LEFT JOIN groups g ON c.group_id = g.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    
    // Contacts by group distribution
    const contactsByGroup = await dbAll(`
      SELECT 
        COALESCE(g.name, 'No Group') as group_name,
        COUNT(c.id) as count
      FROM contacts c
      LEFT JOIN groups g ON c.group_id = g.id
      GROUP BY g.id
      ORDER BY count DESC
    `);
    
    // Messages sent in last 7 days (for chart)
    const messagesLast7Days = await dbAll(`
      SELECT 
        DATE(sent_at) as date,
        COUNT(*) as count
      FROM messages
      WHERE status IN ('sent', 'success')
        AND sent_at IS NOT NULL
        AND sent_at >= datetime('now', '-7 days')
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `);
    
    res.json({
      success: true,
      stats: {
        totalContacts: totalContacts.count,
        totalGroups: totalGroups.count,
        totalMessages: totalMessages.count,
        messagesToday: messagesToday.count,
        messagesThisWeek: messagesThisWeek.count,
        messagesThisMonth: messagesThisMonth.count,
        contactsToday: contactsToday.count,
        contactsThisWeek: contactsThisWeek.count,
        contactsThisMonth: contactsThisMonth.count,
        totalTemplates: totalTemplates.count,
        messagesByStatus: messagesByStatus.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        topGroups: topGroups.map(g => ({
          ...g,
          contact_count: parseInt(g.contact_count) || 0
        })),
        recentMessages,
        recentContacts,
        contactsByGroup,
        messagesLast7Days
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

