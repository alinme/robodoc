import express from 'express';
import { getConnectionStatus, getQRCode, isConnected, getWhatsAppGroups, createWhatsAppGroup, addParticipantsToWhatsAppGroup, validateContactWhatsApp } from '../services/whatsappService.js';
import { dbRun, dbGet, dbAll } from '../services/database.js';

const router = express.Router();

// GET /api/whatsapp/status - Get WhatsApp connection status
router.get('/status', async (req, res) => {
  try {
    const { getClient } = await import('../services/whatsappService.js');
    const client = getClient();
    const status = getConnectionStatus();
    const connected = isConnected();
    
    res.json({
      success: true,
      status,
      connected,
      clientExists: !!client
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whatsapp/qr - Get QR code for authentication
router.get('/qr', (req, res) => {
  try {
    const qrData = getQRCode();
    const status = getConnectionStatus();
    
    // Log for debugging
    console.log('QR endpoint called - status:', status, 'hasQR:', !!qrData.qr, 'hasImage:', !!qrData.image);
    
    // Return QR code if we have it (either qr string or image)
    if (qrData.image || qrData.qr) {
      return res.json({
        success: true,
        qr: qrData.qr,
        image: qrData.image
      });
    }
    
    // If status is connecting, return a message that QR is coming
    if (status === 'connecting') {
      return res.json({
        success: false,
        message: 'QR code is being generated. Please wait a few seconds and refresh.',
        status: 'generating'
      });
    }
    
    return res.json({
      success: false,
      message: 'No QR code available. WhatsApp may already be authenticated or not connecting.'
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/restart - Restart WhatsApp client
router.post('/restart', async (req, res) => {
  try {
    const { initializeWhatsApp, getClient } = await import('../services/whatsappService.js');
    const client = getClient();
    
    if (client) {
      try {
        await client.destroy();
        console.log('WhatsApp client destroyed');
      } catch (err) {
        console.warn('Error destroying client:', err.message);
      }
    }
    
    // Force reinitialization
    await initializeWhatsApp(true);
    
    res.json({
      success: true,
      message: 'WhatsApp client restarted. Please wait a few seconds for the QR code to appear.'
    });
  } catch (error) {
    console.error('Error restarting WhatsApp client:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/logout - Logout and clear session (forces new QR code)
router.post('/logout', async (req, res) => {
  try {
    const { getClient } = await import('../services/whatsappService.js');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const client = getClient();
    
    // Clear authentication data first (before destroying client)
    const authPath = path.join(__dirname, '..', '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Authentication data cleared');
      } catch (err) {
        console.warn('Error clearing auth data:', err.message);
      }
    }
    
    // Destroy client (ignore errors - they're expected when browser is closing)
    if (client) {
      try {
        // Don't call logout() - just destroy, as logout might fail
        await Promise.race([
          client.destroy(),
          new Promise((resolve) => setTimeout(resolve, 5000)) // 5 second timeout
        ]);
        console.log('WhatsApp client destroyed');
      } catch (err) {
        // Protocol errors are expected when destroying - ignore them
        console.log('Client destroyed (errors are expected)');
      }
    }
    
    // Wait a moment before reinitializing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize
    const { initializeWhatsApp } = await import('../services/whatsappService.js');
    await initializeWhatsApp(true);
    
    res.json({
      success: true,
      message: 'WhatsApp session cleared. A new QR code will appear shortly.'
    });
  } catch (error) {
    console.error('Error logging out WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whatsapp/groups - Get all WhatsApp groups
router.get('/groups', async (req, res) => {
  try {
    const groups = await getWhatsAppGroups();
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Error getting WhatsApp groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/groups - Create a new WhatsApp group
router.post('/groups', async (req, res) => {
  try {
    const { name, participantPhones } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!participantPhones || !Array.isArray(participantPhones) || participantPhones.length === 0) {
      return res.status(400).json({ error: 'At least one participant phone number is required' });
    }

    const result = await createWhatsAppGroup(name.trim(), participantPhones);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error creating WhatsApp group:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/groups/:id/participants - Add participants to an existing WhatsApp group
router.post('/groups/:id/participants', async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { participantPhones } = req.body;

    if (!participantPhones || !Array.isArray(participantPhones) || participantPhones.length === 0) {
      return res.status(400).json({ error: 'At least one participant phone number is required' });
    }

    const result = await addParticipantsToWhatsAppGroup(groupId, participantPhones);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error adding participants to WhatsApp group:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/validate-contacts - Validate WhatsApp accounts for contacts
router.post('/validate-contacts', async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }

    if (!isConnected()) {
      return res.status(400).json({ error: 'WhatsApp is not connected. Please wait for the connection to be established.' });
    }

    // Get contacts from database
    const placeholders = contactIds.map(() => '?').join(',');
    const contacts = await dbAll(
      `SELECT id, name, phone FROM contacts WHERE id IN (${placeholders})`,
      contactIds
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'No contacts found with the provided IDs' });
    }

    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    let inContactsCount = 0;
    let notInContactsCount = 0;

    // Validate each contact
    for (const contact of contacts) {
      try {
        const validation = await validateContactWhatsApp(contact.phone);
        
        const whatsappValid = validation.whatsappValid ? 1 : 0;
        const whatsappInContacts = validation.whatsappInContacts ? 1 : 0;

        // Update database with validation results
        try {
          await dbRun(
            `UPDATE contacts 
             SET whatsapp_valid = ?,
                 whatsapp_in_contacts = ?,
                 whatsapp_validated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [whatsappValid, whatsappInContacts, contact.id]
          );
        } catch (dbError) {
          console.error(`Error updating contact ${contact.id} in database:`, dbError);
        }

        // Track counts
        if (validation.whatsappValid) {
          validCount++;
        } else {
          invalidCount++;
        }

        if (validation.whatsappInContacts) {
          inContactsCount++;
        } else {
          notInContactsCount++;
        }

        results.push({
          contactId: contact.id,
          phone: contact.phone,
          whatsappValid: validation.whatsappValid,
          whatsappInContacts: validation.whatsappInContacts,
          error: validation.error || null
        });
      } catch (error) {
        console.error(`Error validating contact ${contact.id}:`, error);
        results.push({
          contactId: contact.id,
          phone: contact.phone,
          whatsappValid: false,
          whatsappInContacts: false,
          error: error.message
        });
        invalidCount++;
        notInContactsCount++;
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: contacts.length,
        valid: validCount,
        invalid: invalidCount,
        inContacts: inContactsCount,
        notInContacts: notInContactsCount
      }
    });
  } catch (error) {
    console.error('Error validating contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

