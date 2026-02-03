import express from 'express';
import nodemailer from 'nodemailer';
import { dbGet, dbRun, dbAll } from '../services/database.js';
import { verifyToken } from './auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Helper function to get SMTP settings
async function getSmtpSettings() {
  try {
    const settings = await dbGet('SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1');
    return settings;
  } catch (error) {
    console.error('Error getting SMTP settings:', error);
    return null;
  }
}

// Send email
router.post('/send', async (req, res) => {
  try {
    const { email, subject, message, contact_id, template_id, attachmentIds } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    let status = 'sent';
    let errorMessage = null;
    let messageHistoryId = null;

    // Get SMTP settings
    const smtpSettings = await getSmtpSettings();
    
    if (!smtpSettings) {
      status = 'failed';
      errorMessage = 'SMTP settings not configured';
      // Save to history with failed status
      if (contact_id) {
        const result = await dbRun(
          "INSERT INTO messages_history (contact_id, message_content, template_id, message_type, status, error_message) VALUES (?, ?, ?, ?, ?, ?)",
          [contact_id, message, template_id || null, 'email', status, errorMessage]
        );
        messageHistoryId = result.lastID;
      }
      return res.status(400).json({ error: errorMessage });
    }

    // Create transporter
    // Port 465 uses SSL/TLS (secure: true)
    // Port 587 uses STARTTLS (secure: false, but requiresTLS: true)
    const isSecurePort = smtpSettings.port === 465;
    const useSecure = smtpSettings.secure === 1 || isSecurePort;
    
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: useSecure,
      requireTLS: !useSecure && smtpSettings.port === 587, // Use STARTTLS for port 587
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password
      },
      tls: {
        // Reject unauthorized certificates (set to false only for testing)
        rejectUnauthorized: true
      }
    });

    // Verify connection
    await transporter.verify();

    // Prepare attachments if provided
    // IMPORTANT: Copy files to permanent storage BEFORE sending to avoid deletion issues
    // Use a shared permanent file that can be reused across multiple emails
    const attachments = [];
    const permanentAttachmentPaths = [];
    
    if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      const attachmentsDir = path.join(__dirname, '..', 'attachments');
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }
      
      for (let i = 0; i < attachmentIds.length; i++) {
        const attachmentInfo = attachmentIds[i];
        
        // Check if it's a file path or an attachment ID from database
        if (attachmentInfo.filePath && fs.existsSync(attachmentInfo.filePath)) {
          // Temporary file - check if we already have a permanent copy for this temp file
          // Use a hash of the temp path to create a consistent permanent filename
          const tempPathHash = Buffer.from(attachmentInfo.filePath).toString('base64').replace(/[/+=]/g, '').substring(0, 16);
          const ext = path.extname(attachmentInfo.originalFilename || attachmentInfo.filename || '');
          const sharedPermanentFilename = `email-attachment-shared-${tempPathHash}${ext}`;
          const sharedPermanentPath = path.join(attachmentsDir, sharedPermanentFilename);
          
          // Only copy if permanent file doesn't exist yet (for first email)
          if (!fs.existsSync(sharedPermanentPath)) {
            fs.copyFileSync(attachmentInfo.filePath, sharedPermanentPath);
          }
          
          permanentAttachmentPaths.push({
            tempPath: attachmentInfo.filePath,
            permanentPath: sharedPermanentPath,
            attachmentInfo: attachmentInfo
          });
          
          attachments.push({
            filename: attachmentInfo.originalFilename || attachmentInfo.filename,
            path: sharedPermanentPath
          });
        } else if (attachmentInfo.id) {
          // Already in database - get file path
          const attachment = await dbGet(
            'SELECT * FROM email_attachments WHERE id = ?',
            [attachmentInfo.id]
          );
          if (attachment && attachment.file_path && fs.existsSync(attachment.file_path)) {
            attachments.push({
              filename: attachment.original_filename || attachment.filename,
              path: attachment.file_path
            });
          }
        }
      }
    }

    // Get HTML template if template_id is provided
    let htmlContent = message.replace(/\n/g, '<br>');
    if (template_id) {
      const template = await dbGet('SELECT * FROM message_templates WHERE id = ?', [template_id]);
      if (template && template.html_template) {
        // Replace {BODY} placeholder with the message content
        htmlContent = template.html_template.replace(/{BODY}/g, message.replace(/\n/g, '<br>'));
      }
    }

    // Send email
    const mailOptions = {
      from: smtpSettings.from_email 
        ? `"${smtpSettings.from_name || 'RoboDoc'}" <${smtpSettings.from_email}>`
        : smtpSettings.username,
      to: email,
      subject: subject || 'Message from RoboDoc',
      text: message,
      html: htmlContent,
      replyTo: smtpSettings.reply_to || smtpSettings.from_email || smtpSettings.username,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Save to history
    if (contact_id) {
      const result = await dbRun(
        "INSERT INTO messages_history (contact_id, message_content, template_id, message_type, status) VALUES (?, ?, ?, ?, ?)",
        [contact_id, message, template_id || null, 'email', status]
      );
      messageHistoryId = result.lastID;

      // Save attachment references to database (using pre-copied permanent files)
      // IMPORTANT: Don't rename or delete shared permanent files - they're reused for multiple emails
      if (permanentAttachmentPaths.length > 0) {
        for (const { permanentPath, attachmentInfo } of permanentAttachmentPaths) {
          // Create a unique copy for this specific message history entry
          const ext = path.extname(attachmentInfo.originalFilename || attachmentInfo.filename || '');
          const uniqueFilename = `email-attachment-${messageHistoryId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
          const uniquePath = path.join(path.dirname(permanentPath), uniqueFilename);
          
          // Copy the shared permanent file to a unique location for this message
          fs.copyFileSync(permanentPath, uniquePath);
          
          // Save to database
          await dbRun(
            `INSERT INTO email_attachments (filename, original_filename, file_path, file_size, mime_type, message_history_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uniqueFilename,
              attachmentInfo.originalFilename || attachmentInfo.filename,
              uniquePath,
              attachmentInfo.fileSize || 0,
              attachmentInfo.mimeType || 'application/octet-stream',
              messageHistoryId
            ]
          );
          
          // DON'T delete temporary files here - they may be needed for subsequent emails
          // Temporary files will be cleaned up by a cleanup job or when the session ends
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId,
      messageHistoryId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    const status = 'failed';
    const errorMessage = error.message;
    
    // Save to history with failed status
    if (req.body.contact_id) {
      await dbRun(
        "INSERT INTO messages_history (contact_id, message_content, template_id, message_type, status, error_message) VALUES (?, ?, ?, ?, ?, ?)",
        [req.body.contact_id, req.body.message, req.body.template_id || null, 'email', status, errorMessage]
      );
    }
    
    res.status(500).json({ 
      error: 'Failed to send email',
      details: errorMessage 
    });
  }
});

// Test SMTP connection and send test email
router.post('/test', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    // Check if testEmail exists and is not empty
    if (!testEmail || typeof testEmail !== 'string' || testEmail.trim() === '') {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    const email = testEmail.trim();

    // Get settings from database
    const smtpSettings = await getSmtpSettings();
    if (!smtpSettings) {
      return res.status(400).json({ error: 'SMTP settings not configured. Please save SMTP settings first.' });
    }

    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.username || !smtpSettings.password) {
      return res.status(400).json({ error: 'SMTP settings are incomplete. Please check Host, Port, Username, and Password.' });
    }

    // Create transporter
    // Port 465 uses SSL/TLS (secure: true)
    // Port 587 uses STARTTLS (secure: false, but requiresTLS: true)
    const isSecurePort = smtpSettings.port === 465;
    const useSecure = smtpSettings.secure === 1 || isSecurePort;
    
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: useSecure,
      requireTLS: !useSecure && smtpSettings.port === 587, // Use STARTTLS for port 587
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password
      },
      tls: {
        // Reject unauthorized certificates (set to false only for testing)
        rejectUnauthorized: true
      }
    });

    // Verify connection first
    await transporter.verify();
    
    // Send test email
    const fromEmail = smtpSettings.from_email || smtpSettings.username;
    const fromName = smtpSettings.from_name || 'RoboDoc';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Test Email from RoboDoc',
      text: 'This is a test email from RoboDoc. If you received this, your SMTP settings are working correctly!',
      html: '<p>This is a test email from RoboDoc.</p><p>If you received this, your SMTP settings are working correctly!</p>',
      replyTo: smtpSettings.reply_to || fromEmail
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: `Test email sent successfully to ${email}! Check your inbox.`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

export default router;

