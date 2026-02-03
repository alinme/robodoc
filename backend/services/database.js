import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database', 'robo-doc.db');
let db = null;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite database');
    });
  }
  return db;
}

// Promisify database methods
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export async function initializeDatabase() {
  const db = getDatabase();
  
  // Enable foreign keys
  await dbRun('PRAGMA foreign_keys = ON');

  // Create tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      group_id INTEGER,
      business TEXT,
      source_file TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      UNIQUE(phone)
    )
  `);

  // Add email column to existing contacts table if it doesn't exist
  try {
    await dbRun('ALTER TABLE contacts ADD COLUMN email TEXT');
  } catch (err) {
    // Column already exists, ignore
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add email column to contacts:', err.message);
    }
  }

  // Add WhatsApp validation columns to existing contacts table if they don't exist
  try {
    await dbRun('ALTER TABLE contacts ADD COLUMN whatsapp_valid INTEGER DEFAULT NULL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add whatsapp_valid column to contacts:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE contacts ADD COLUMN whatsapp_in_contacts INTEGER DEFAULT NULL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add whatsapp_in_contacts column to contacts:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE contacts ADD COLUMN whatsapp_validated_at TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add whatsapp_validated_at column to contacts:', err.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      group_id INTEGER,
      template TEXT,
      final_message TEXT,
      sent_at DATETIME,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS contact_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER UNIQUE,
      call_count INTEGER DEFAULT 0,
      last_called_at DATETIME,
      last_call_type TEXT,
      observations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS column_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_column TEXT,
      phone_column TEXT,
      email_column TEXT,
      group_column TEXT,
      business_column TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add email_column to existing column_mappings table if it doesn't exist
  try {
    await dbRun('ALTER TABLE column_mappings ADD COLUMN email_column TEXT');
  } catch (err) {
    // Column already exists, ignore
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add email_column to column_mappings:', err.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      condition_type TEXT,
      column_name TEXT,
      operator TEXT,
      value TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS rule_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id INTEGER,
      rule_id INTEGER,
      FOREIGN KEY (mapping_id) REFERENCES column_mappings(id),
      FOREIGN KEY (rule_id) REFERENCES rules(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add html_template column to message_templates if it doesn't exist
  try {
    await dbRun('ALTER TABLE message_templates ADD COLUMN html_template TEXT');
  } catch (err) {
    // Column already exists, ignore
  }

  // Add email_subject column to message_templates if it doesn't exist
  try {
    await dbRun('ALTER TABLE message_templates ADD COLUMN email_subject TEXT');
  } catch (err) {
    // Column already exists, ignore
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS uploadedfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      size_bytes INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS centralizator_schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      state_region TEXT NOT NULL,
      protocol_number TEXT,
      name_normalized TEXT,
      address_normalized TEXT,
      state_region_normalized TEXT,
      protocol_number_normalized TEXT,
      raw_data TEXT,
      source_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, address, state_region)
    )
  `);

  try {
    await dbRun('ALTER TABLE centralizator_schools ADD COLUMN name_normalized TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add name_normalized column:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE centralizator_schools ADD COLUMN address_normalized TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add address_normalized column:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE centralizator_schools ADD COLUMN state_region_normalized TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add state_region_normalized column:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE centralizator_schools ADD COLUMN protocol_number_normalized TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add protocol_number_normalized column:', err.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS centralizator_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      school_name_column TEXT,
      address_column TEXT,
      protocol_number_column TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS smtp_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      secure INTEGER DEFAULT 0,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      from_name TEXT,
      from_email TEXT,
      reply_to TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add reply_to column to existing smtp_settings table if it doesn't exist
  try {
    await dbRun('ALTER TABLE smtp_settings ADD COLUMN reply_to TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add reply_to column to smtp_settings:', err.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      message_content TEXT NOT NULL,
      template_id INTEGER,
      message_type TEXT DEFAULT 'whatsapp',
      status TEXT DEFAULT 'sent',
      error_message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (template_id) REFERENCES message_templates(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS email_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      message_history_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_history_id) REFERENCES messages_history(id) ON DELETE CASCADE
    )
  `);

  // App settings table for storing configuration (like password)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders and Planning tables
  // Check if orders table exists with old schema and migrate if needed
  try {
    const columns = await dbAll("PRAGMA table_info(orders)");
    if (columns && columns.length > 0) {
      const hasOldSchema = columns.some((col) => col.name === 'start_address' || col.name === 'delivery_date');
      
      if (hasOldSchema) {
        // Migrate from old schema to new schema
        console.log('Migrating orders table from old schema to new schema...');
        
        // Check if there are dependent tables (schools)
        const hasSchools = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name='schools'");
        
        // Create new table with temporary name
        await dbRun(`
          CREATE TABLE IF NOT EXISTS orders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            delivery_month TEXT,
            delivery_year INTEGER,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy data if any exists
        const existingOrders = await dbAll('SELECT * FROM orders');
        if (existingOrders && existingOrders.length > 0) {
          for (const order of existingOrders) {
            // Extract month/year from delivery_date if it exists
            let delivery_month = null;
            let delivery_year = null;
            if (order.delivery_date) {
              try {
                const date = new Date(order.delivery_date);
                delivery_month = date.toLocaleString('en-US', { month: 'long' });
                delivery_year = date.getFullYear();
              } catch (e) {
                // Ignore parsing errors
              }
            }
            
            await dbRun(
              `INSERT INTO orders_new (id, name, delivery_month, delivery_year, status, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                order.id,
                order.name,
                delivery_month,
                delivery_year,
                order.status || 'draft',
                order.notes || null,
                order.created_at || new Date().toISOString(),
                order.updated_at || new Date().toISOString()
              ]
            );
          }
        }
        
        // If schools table exists, we need to handle foreign keys
        // Drop foreign key constraints temporarily by recreating dependent tables
        if (hasSchools && hasSchools.length > 0) {
          // Temporarily disable foreign keys
          await dbRun('PRAGMA foreign_keys = OFF');
        }
        
        // Drop old table
        await dbRun('DROP TABLE IF EXISTS orders');
        
        // Rename new table
        await dbRun('ALTER TABLE orders_new RENAME TO orders');
        
        if (hasSchools && hasSchools.length > 0) {
          // Re-enable foreign keys
          await dbRun('PRAGMA foreign_keys = ON');
        }
        
        console.log('Orders table migration completed');
      }
    }
  } catch (err) {
    // Table doesn't exist yet, will be created below
    if (!err.message.includes('no such table')) {
      console.log('Error checking orders table:', err.message);
    }
  }
  
  // Create orders table with new schema (or ensure it exists after migration)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      delivery_month TEXT,
      delivery_year INTEGER,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS delivery_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      delivery_date DATE,
      delivery_hour TIME,
      start_address TEXT,
      start_latitude REAL,
      start_longitude REAL,
      fuel_type TEXT,
      fuel_cost_per_liter REAL,
      total_km REAL,
      two_way_km REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      kits_count INTEGER DEFAULT 0,
      city_type TEXT CHECK(city_type IN ('urban', 'rural', 'urban-small', 'urban-large')),
      latitude REAL,
      longitude REAL,
      is_standalone BOOLEAN DEFAULT 0,
      delivery_group_id INTEGER,
      delivery_status TEXT DEFAULT 'planned' CHECK(delivery_status IN ('planned', 'in-transit', 'delivered', 'completed')),
      delivery_notes TEXT,
      route_order INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_group_id) REFERENCES delivery_groups(id) ON DELETE SET NULL
    )
  `);

  // Add is_standalone column to existing schools table if it doesn't exist
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN is_standalone BOOLEAN DEFAULT 0');
  } catch (err) {
    // Column already exists, ignore
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add is_standalone column to schools:', err.message);
    }
  }

  // Add kits_delivered column to existing schools table if it doesn't exist
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN kits_delivered BOOLEAN DEFAULT 0');
  } catch (err) {
    // Column already exists, ignore
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add kits_delivered column to schools:', err.message);
    }
  }

  // Add scheduling columns to existing schools table if they don't exist
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN scheduled_start_time TIME');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add scheduled_start_time column to schools:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN document_check_duration INTEGER DEFAULT 20');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add document_check_duration column to schools:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN distribution_duration INTEGER');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add distribution_duration column to schools:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN scheduled_end_time TIME');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add scheduled_end_time column to schools:', err.message);
    }
  }

  // Add calculated_distance_km and fuel_consumption to delivery_groups table if they don't exist
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN calculated_distance_km REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add calculated_distance_km column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN fuel_consumption REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add fuel_consumption column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN average_speed_kmh REAL DEFAULT 50');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add average_speed_kmh column to delivery_groups:', err.message);
    }
  }

  // Add latitude/longitude columns to existing structures table if they don't exist
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN latitude REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add latitude column to structures:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN longitude REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add longitude column to structures:', err.message);
    }
  }

  // Add in_same_building column to structures table if it doesn't exist
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN in_same_building BOOLEAN DEFAULT 0');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add in_same_building column to structures:', err.message);
    }
  }

  // Add scheduling columns to existing structures table if they don't exist
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN scheduled_start_time TIME');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add scheduled_start_time column to structures:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN document_check_duration INTEGER');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add document_check_duration column to structures:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN distribution_duration INTEGER');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add distribution_duration column to structures:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE structures ADD COLUMN scheduled_end_time TIME');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add scheduled_end_time column to structures:', err.message);
    }
  }

  // Add protocol_number column to schools table if it doesn't exist
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN protocol_number TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add protocol_number column to schools:', err.message);
    }
  }

  // Add new columns to delivery_groups if they don't exist
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN start_address TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add start_address column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN start_latitude REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add start_latitude column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN start_longitude REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add start_longitude column to delivery_groups:', err.message);
    }
  }

  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN fuel_type TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add fuel_type column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN fuel_cost_per_liter REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add fuel_cost_per_liter column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN total_km REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add total_km column to delivery_groups:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE delivery_groups ADD COLUMN two_way_km REAL');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add two_way_km column to delivery_groups:', err.message);
    }
  }

  // Add new columns to schools if they don't exist
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN delivery_status TEXT DEFAULT \'planned\'');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add delivery_status column to schools:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN delivery_notes TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add delivery_notes column to schools:', err.message);
    }
  }
  
  try {
    await dbRun('ALTER TABLE schools ADD COLUMN route_order INTEGER');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.warn('Could not add route_order column to schools:', err.message);
    }
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      kits_count INTEGER NOT NULL DEFAULT 0,
      latitude REAL,
      longitude REAL,
      in_same_building BOOLEAN DEFAULT 0,
      scheduled_start_time TIME,
      document_check_duration INTEGER,
      distribution_duration INTEGER,
      scheduled_end_time TIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  await dbRun('CREATE INDEX IF NOT EXISTS idx_contacts_group ON contacts(group_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_contact_calls_contact ON contact_calls(contact_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_schools_order ON schools(order_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_schools_delivery_group ON schools(delivery_group_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_structures_school ON structures(school_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_delivery_groups_order ON delivery_groups(order_id)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_centralizator_state ON centralizator_schools(state_region)');

  console.log('Database tables created successfully');

  // Backfill normalized columns for centralizator records
  try {
    const normalizeText = (value) =>
      (value ?? '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const centralizatorRows = await dbAll(
      `SELECT id, name, address, state_region, protocol_number FROM centralizator_schools`
    );

    for (const row of centralizatorRows) {
      await dbRun(
        `UPDATE centralizator_schools
         SET name_normalized = ?, address_normalized = ?, state_region_normalized = ?, protocol_number_normalized = ?
         WHERE id = ?`,
        [
          normalizeText(row.name),
          normalizeText(row.address),
          normalizeText(row.state_region),
          normalizeText(row.protocol_number),
          row.id
        ]
      );
    }
  } catch (err) {
    console.warn('Could not backfill centralizator normalized columns:', err.message);
  }
}

