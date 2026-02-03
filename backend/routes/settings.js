import express from 'express';
import { dbGet, dbRun, dbAll } from '../services/database.js';

const router = express.Router();

// Get SMTP settings
router.get('/smtp', async (req, res) => {
  try {
    const settings = await dbGet('SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1');
    
    if (!settings) {
      return res.json({ 
        host: '',
        port: 587,
        secure: 0,
        username: '',
        password: '',
        from_name: '',
        from_email: '',
        reply_to: ''
      });
    }

    // Return all settings including password
    res.json({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password: settings.password || '', // Return password so it can be edited
      from_name: settings.from_name || '',
      from_email: settings.from_email || '',
      reply_to: settings.reply_to || ''
    });
  } catch (error) {
    console.error('Error getting SMTP settings:', error);
    res.status(500).json({ error: 'Failed to get SMTP settings' });
  }
});

// Save SMTP settings
router.post('/smtp', async (req, res) => {
  try {
    const { host, port, secure, username, password, from_name, from_email, reply_to } = req.body;

    if (!host || !port || !username) {
      return res.status(400).json({ error: 'Host, port, and username are required' });
    }

    // Check if settings exist
    const existing = await dbGet('SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1');

    if (existing) {
      // If password is not provided or empty, keep the existing password
      const passwordToUse = password && password.trim() !== '' ? password : existing.password;
      
      if (!passwordToUse) {
        return res.status(400).json({ error: 'Password is required' });
      }

      // Update existing settings
      await dbRun(
        `UPDATE smtp_settings 
         SET host = ?, port = ?, secure = ?, username = ?, password = ?, from_name = ?, from_email = ?, reply_to = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [host, port, secure ? 1 : 0, username, passwordToUse, from_name || null, from_email || null, reply_to || null, existing.id]
      );
    } else {
      // Insert new settings - password is required for new settings
      if (!password || password.trim() === '') {
        return res.status(400).json({ error: 'Password is required for new SMTP settings' });
      }

      await dbRun(
        `INSERT INTO smtp_settings (host, port, secure, username, password, from_name, from_email, reply_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [host, port, secure ? 1 : 0, username, password, from_name || null, from_email || null, reply_to || null]
      );
    }

    res.json({ success: true, message: 'SMTP settings saved successfully' });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

export default router;

