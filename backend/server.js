import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeDatabase } from './services/database.js';
import { initializeWhatsApp } from './services/whatsappService.js';

// Import routes
import uploadRoutes from './routes/upload.js';
import contactsRoutes from './routes/contacts.js';
import groupsRoutes from './routes/groups.js';
import messagesRoutes from './routes/messages.js';
import rulesRoutes from './routes/rules.js';
import whatsappRoutes from './routes/whatsapp.js';
import templatesRoutes from './routes/templates.js';
import dashboardRoutes from './routes/dashboard.js';
import authRoutes from './routes/auth.js';
import protocolRoutes from './routes/protocol.js';
import callsRoutes from './routes/calls.js';
import ordersRoutes from './routes/orders.js';
import emailRoutes from './routes/email.js';
import settingsRoutes from './routes/settings.js';
import attachmentsRoutes from './routes/attachments.js';
import storageRoutes from './routes/storage.js';
import centralizatorRoutes from './routes/centralizator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Cookie parser for session management
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// Create necessary directories
import fs from 'fs';
const uploadsDir = path.join(__dirname, 'uploads');
const databaseDir = path.join(__dirname, 'database');
const publicDir = path.join(__dirname, 'public');
const attachmentsDir = path.join(__dirname, 'attachments');
const storageDir = path.join(__dirname, 'storage');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Initialize database
initializeDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch((err) => {
  console.error('Database initialization error:', err);
  process.exit(1);
});

// Initialize WhatsApp service (don't await - let it initialize in background)
initializeWhatsApp().catch(err => {
  console.error('Error initializing WhatsApp on startup:', err);
});

// API Routes (must be before static file serving)
app.use('/api/upload', uploadRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/protocol', protocolRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/centralizator', centralizatorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RoboDoc API is running' });
});

// Serve static files from public directory (Vue app)
app.use(express.static(publicDir));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Please run "npm run build" first.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`RoboDoc server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Public directory: ${publicDir}`);
});

