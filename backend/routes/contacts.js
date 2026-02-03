import express from 'express';
import { extractContactsFromSheet } from '../services/excelParser.js';
import { dbRun, dbGet, dbAll } from '../services/database.js';
import { validateAndFormatPhone } from '../services/phoneValidator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// POST /api/contacts/preview - Preview import and validate contacts
router.post('/preview', async (req, res) => {
  try {
    const { fileId, sheetName, columnMapping, rules = [], headerRow = 1 } = req.body;

    if (!fileId || !sheetName || !columnMapping) {
      return res.status(400).json({ error: 'fileId, sheetName, and columnMapping are required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract contacts from Excel
    const result = extractContactsFromSheet(filePath, sheetName, columnMapping, rules, headerRow);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Validate each contact and check for duplicates
    const preview = [];
    const phoneMap = new Map(); // Track phone numbers to detect duplicates within the file

    for (const contact of result.contacts) {
      const previewItem = {
        ...contact,
        status: 'new',
        issues: [],
        existingContact: null,
        canImport: true
      };

      // Check if phone already exists in database
      const existing = await dbGet('SELECT id, name, phone, email, group_id, business FROM contacts WHERE phone = ?', [contact.phone]);
      
      if (existing) {
        previewItem.status = 'duplicate';
        previewItem.existingContact = existing;
        previewItem.issues.push(`Phone number already exists: ${existing.name}`);
      }

      // Check for duplicates within the same file
      if (phoneMap.has(contact.phone)) {
        previewItem.status = 'duplicate_in_file';
        const firstOccurrenceIndex = phoneMap.get(contact.phone);
        previewItem.issues.push(`Duplicate phone number in file (first seen at row ${firstOccurrenceIndex})`);
        // Also mark the first occurrence as duplicate if it wasn't already
        const firstItem = preview[firstOccurrenceIndex - 1];
        if (firstItem && firstItem.status === 'new') {
          firstItem.status = 'duplicate_in_file';
          firstItem.issues.push(`Duplicate phone number in file (also at row ${preview.length + 1})`);
        }
      } else {
        phoneMap.set(contact.phone, preview.length + 1);
      }

      // Validate email format if provided
      if (contact.email && contact.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact.email.trim())) {
          previewItem.issues.push('Invalid email format');
          previewItem.canImport = true; // Still allow import, just warn
        }
      }

      // Check for missing required fields
      if (!contact.name || !contact.name.trim()) {
        previewItem.issues.push('Missing name');
        previewItem.canImport = false;
      }

      if (!contact.phone || !contact.phone.trim()) {
        previewItem.issues.push('Missing phone');
        previewItem.canImport = false;
      }

      preview.push(previewItem);
    }

    // Count statistics
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
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/contacts/import - Import contacts from Excel file
router.post('/import', async (req, res) => {
  try {
    const { fileId, sheetName, columnMapping, groupId, groupName, rules = [], headerRow = 1, correctedContacts } = req.body;

    if (!fileId || !sheetName || !columnMapping) {
      return res.status(400).json({ error: 'fileId, sheetName, and columnMapping are required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileId);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Handle group creation/selection
    let finalGroupId = groupId;
    if (groupName && !groupId) {
      // Create new group
      const groupResult = await dbRun(
        'INSERT INTO groups (name, description) VALUES (?, ?)',
        [groupName, `Imported from ${fileId}`]
      );
      finalGroupId = groupResult.lastID;
    }

    // Use corrected contacts if provided, otherwise extract from Excel
    let contactsToImport = [];
    
    if (correctedContacts && Array.isArray(correctedContacts) && correctedContacts.length > 0) {
      // Use user-corrected contacts - validate phone numbers
      const { validateAndFormatPhone } = await import('../services/phoneValidator.js');
      for (const contact of correctedContacts) {
        const phoneValidation = validateAndFormatPhone(contact.phone);
        if (phoneValidation.valid) {
          contact.phone = phoneValidation.formatted;
          contactsToImport.push(contact);
        } else {
          console.warn(`Skipping corrected contact "${contact.name}" - Invalid phone: ${phoneValidation.error}`);
        }
      }
    } else {
      // Extract contacts from Excel (headerRow is 1-indexed)
      const result = extractContactsFromSheet(filePath, sheetName, columnMapping, rules, headerRow);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      contactsToImport = result.contacts;
    }

    // Import contacts into database
    const imported = [];
    const skipped = [];
    let newCount = 0;
    let updatedCount = 0;

    for (const contact of contactsToImport) {
      try {
        // Handle merge actions if specified
        if (contact.mergeAction === 'update' && contact.mergeTargetId) {
          // Update existing contact with merged data
          await dbRun(
            `UPDATE contacts SET name = ?, email = ?, group_id = ?, business = ?, source_file = ?, raw_data = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [contact.name, contact.email || null, finalGroupId, contact.business, fileId, contact.rawData || '{}', contact.mergeTargetId]
          );
          imported.push({ ...contact, id: contact.mergeTargetId, updated: true });
          updatedCount++;
          continue;
        }

        // Try to insert or update contact
        const existing = await dbGet('SELECT id FROM contacts WHERE phone = ?', [contact.phone]);
        
        if (existing) {
          // Update existing contact
          await dbRun(
            `UPDATE contacts SET name = ?, email = ?, group_id = ?, business = ?, source_file = ?, raw_data = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [contact.name, contact.email || null, finalGroupId, contact.business, fileId, contact.rawData || '{}', existing.id]
          );
          imported.push({ ...contact, id: existing.id, updated: true });
          updatedCount++;
        } else {
          // Insert new contact
          const insertResult = await dbRun(
            `INSERT INTO contacts (name, phone, email, group_id, business, source_file, raw_data)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [contact.name, contact.phone, contact.email || null, finalGroupId, contact.business, fileId, contact.rawData || '{}']
          );
          imported.push({ ...contact, id: insertResult.lastID, updated: false });
          newCount++;
        }
      } catch (error) {
        console.error('Error importing contact:', error);
        skipped.push({ ...contact, error: error.message });
      }
    }

    // Clean up uploaded file
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
      totalProcessed: contactsToImport.length,
      contacts: imported,
      errors: skipped
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts - Get all contacts with filters
router.get('/', async (req, res) => {
  try {
    const { groupId, business, search, limit = 100, offset = 0 } = req.query;
    
    let query = `SELECT 
      c.*, 
      g.name as group_name,
      COUNT(CASE WHEN m.status IN ('sent', 'success') THEN 1 END) as sent_count,
      c.whatsapp_valid,
      c.whatsapp_in_contacts,
      c.whatsapp_validated_at
    FROM contacts c 
    LEFT JOIN groups g ON c.group_id = g.id 
    LEFT JOIN messages m ON c.id = m.contact_id
    WHERE 1=1`;
    const params = [];

    if (groupId) {
      query += ' AND c.group_id = ?';
      params.push(groupId);
    }

    if (business) {
      query += ' AND c.business LIKE ?';
      params.push(`%${business}%`);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.business LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const contacts = await dbAll(query, params);
    
    // Convert sent_count from string to number (SQLite returns as string)
    contacts.forEach(contact => {
      contact.sent_count = parseInt(contact.sent_count) || 0;
    });
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM contacts c WHERE 1=1';
    const countParams = [];
    
    if (groupId) {
      countQuery += ' AND c.group_id = ?';
      countParams.push(groupId);
    }
    
    if (business) {
      countQuery += ' AND c.business LIKE ?';
      countParams.push(`%${business}%`);
    }
    
    if (search) {
      countQuery += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.business LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await dbGet(countQuery, countParams);

    res.json({
      success: true,
      contacts,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/export - Export contacts to Gmail CSV format
router.get('/export', async (req, res) => {
  try {
    const { groupId, contactIds } = req.query;
    
    let contacts = [];
    
    if (contactIds) {
      // Export specific contacts by IDs
      const ids = Array.isArray(contactIds) ? contactIds : contactIds.split(',');
      const placeholders = ids.map(() => '?').join(',');
      contacts = await dbAll(
        `SELECT c.*, g.name as group_name 
         FROM contacts c 
         LEFT JOIN groups g ON c.group_id = g.id 
         WHERE c.id IN (${placeholders})`,
        ids
      );
    } else if (groupId) {
      // Export contacts from a specific group
      contacts = await dbAll(
        `SELECT c.*, g.name as group_name 
         FROM contacts c 
         LEFT JOIN groups g ON c.group_id = g.id 
         WHERE c.group_id = ?`,
        [groupId]
      );
    } else {
      // Export all contacts
      contacts = await dbAll(
        `SELECT c.*, g.name as group_name 
         FROM contacts c 
         LEFT JOIN groups g ON c.group_id = g.id`
      );
    }

    // Generate Gmail CSV format
    // Gmail CSV format: Name, Given Name, Family Name, E-mail 1 - Type, E-mail 1 - Value, Phone 1 - Type, Phone 1 - Value
    const csvRows = [];
    
    // Header row
    csvRows.push('Name,Given Name,Family Name,E-mail 1 - Type,E-mail 1 - Value,Phone 1 - Type,Phone 1 - Value');
    
    // Data rows
    for (const contact of contacts) {
      const name = (contact.name || '').replace(/"/g, '""');
      const nameParts = (contact.name || '').split(' ');
      const givenName = (nameParts[0] || '').replace(/"/g, '""');
      const familyName = (nameParts.slice(1).join(' ') || '').replace(/"/g, '""');
      const email = (contact.email || '').replace(/"/g, '""');
      const phone = (contact.phone || '').replace(/"/g, '""');
      
      // Only include contacts with email addresses
      if (email && email.trim()) {
        csvRows.push(
          `"${name}","${givenName}","${familyName}","* My Contacts","${email}","Mobile","${phone}"`
        );
      }
    }

    const csvContent = csvRows.join('\n');
    
    // Set headers for CSV download
    const filename = groupId 
      ? `contacts-group-${groupId}-${new Date().toISOString().split('T')[0]}.csv`
      : contactIds
      ? `contacts-selected-${new Date().toISOString().split('T')[0]}.csv`
      : `contacts-all-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    res.send('\ufeff' + csvContent); // Add BOM for UTF-8 Excel compatibility
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// GET /api/contacts/:id - Get single contact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await dbGet(
      `SELECT 
        c.*, 
        g.name as group_name,
        COUNT(CASE WHEN m.status IN ('sent', 'success') THEN 1 END) as sent_count,
        c.whatsapp_valid,
        c.whatsapp_in_contacts,
        c.whatsapp_validated_at
      FROM contacts c 
      LEFT JOIN groups g ON c.group_id = g.id 
      LEFT JOIN messages m ON c.id = m.contact_id
      WHERE c.id = ?
      GROUP BY c.id`,
      [id]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Convert sent_count from string to number
    contact.sent_count = parseInt(contact.sent_count) || 0;

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, group_id, business } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Validate and format phone number
    const phoneValidation = validateAndFormatPhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: `Invalid phone number: ${phoneValidation.error}` });
    }

    const formattedPhone = phoneValidation.formatted;

    // Check if phone number is being changed and if it conflicts with another contact
    const currentContact = await dbGet('SELECT phone FROM contacts WHERE id = ?', [id]);
    if (currentContact && currentContact.phone !== formattedPhone) {
      const existing = await dbGet('SELECT id FROM contacts WHERE phone = ? AND id != ?', [formattedPhone, id]);
      if (existing) {
        return res.status(400).json({ error: 'Contact with this phone number already exists' });
      }
    }

    await dbRun(
      'UPDATE contacts SET name = ?, phone = ?, email = ?, group_id = ?, business = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, formattedPhone, email || null, group_id || null, business || null, id]
    );

    const contact = await dbGet(
      'SELECT c.*, g.name as group_name FROM contacts c LEFT JOIN groups g ON c.group_id = g.id WHERE c.id = ?',
      [id]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, contact });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }
    console.error('Error updating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/contacts - Create new contact
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, group_id, business } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Validate and format phone number
    const phoneValidation = validateAndFormatPhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: `Invalid phone number: ${phoneValidation.error}` });
    }

    const formattedPhone = phoneValidation.formatted;

    // Check if contact with same phone already exists
    const existing = await dbGet('SELECT id FROM contacts WHERE phone = ?', [formattedPhone]);
    if (existing) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }

    const result = await dbRun(
      'INSERT INTO contacts (name, phone, email, group_id, business) VALUES (?, ?, ?, ?, ?)',
      [name, formattedPhone, email || null, group_id || null, business || null]
    );

    const contact = await dbGet(
      'SELECT c.*, g.name as group_name FROM contacts c LEFT JOIN groups g ON c.group_id = g.id WHERE c.id = ?',
      [result.lastID]
    );

    res.json({ success: true, contact });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }
    console.error('Error creating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/all - Delete all contacts
router.delete('/all', async (req, res) => {
  try {
    // Delete related records first to avoid foreign key constraint errors
    // Delete messages associated with contacts
    await dbRun('DELETE FROM messages WHERE contact_id IS NOT NULL');
    
    // Delete contact_calls (this has ON DELETE CASCADE, but let's be explicit)
    await dbRun('DELETE FROM contact_calls');
    
    // Now delete all contacts
    const result = await dbRun('DELETE FROM contacts');
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting all contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/bulk - Delete selected contacts
router.delete('/bulk', async (req, res) => {
  try {
    const { contactIds } = req.body;
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }
    
    // Delete related records first to avoid foreign key constraint errors
    const placeholders = contactIds.map(() => '?').join(',');
    
    // Delete messages associated with these contacts
    await dbRun(
      `DELETE FROM messages WHERE contact_id IN (${placeholders})`,
      contactIds
    );
    
    // Delete contact_calls (has ON DELETE CASCADE, but being explicit)
    await dbRun(
      `DELETE FROM contact_calls WHERE contact_id IN (${placeholders})`,
      contactIds
    );
    
    // Now delete the contacts
    const result = await dbRun(
      `DELETE FROM contacts WHERE id IN (${placeholders})`,
      contactIds
    );
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related records first to avoid foreign key constraint errors
    // Delete messages associated with this contact
    await dbRun('DELETE FROM messages WHERE contact_id = ?', [id]);
    
    // Delete contact_calls (has ON DELETE CASCADE, but being explicit)
    await dbRun('DELETE FROM contact_calls WHERE contact_id = ?', [id]);
    
    // Now delete the contact
    await dbRun('DELETE FROM contacts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/contacts/validate - Validate phone numbers for contacts
router.post('/validate', async (req, res) => {
  try {
    const { contactIds } = req.body; // Array of contact IDs, or null/undefined for all
    
    let query = 'SELECT id, name, phone FROM contacts';
    const params = [];
    
    if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
      const placeholders = contactIds.map(() => '?').join(',');
      query += ` WHERE id IN (${placeholders})`;
      params.push(...contactIds);
    }
    
    const contacts = await dbAll(query, params);
    
    const results = {
      valid: [],
      invalid: [],
      updated: 0
    };
    
    for (const contact of contacts) {
      const validation = validateAndFormatPhone(contact.phone);
      
      if (validation.valid) {
        // Check if phone needs to be updated (formatted differently)
        if (contact.phone !== validation.formatted) {
          // Update the contact with the formatted phone
          await dbRun(
            'UPDATE contacts SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [validation.formatted, contact.id]
          );
          results.updated++;
        }
        results.valid.push({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          formatted: validation.formatted
        });
      } else {
        results.invalid.push({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          error: validation.error
        });
      }
    }
    
    res.json({
      success: true,
      total: contacts.length,
      valid: results.valid.length,
      invalid: results.invalid.length,
      updated: results.updated,
      results: results
    });
  } catch (error) {
    console.error('Error validating contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

