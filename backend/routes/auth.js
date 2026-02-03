import express from 'express';
import { dbRun, dbGet } from '../services/database.js';
import crypto from 'crypto';

const router = express.Router();

// Simple password-based authentication
// For production, you should use proper password hashing (bcrypt) and JWT tokens

// POST /api/auth/login - Login with password
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get the stored password hash from database
    const settings = await dbGet('SELECT * FROM app_settings WHERE key = ?', ['admin_password']);
    
    // If no password is set, set the default password (first time setup)
    if (!settings) {
      // Default password: "admin" (you should change this!)
      const defaultPassword = 'admin';
      const hash = crypto.createHash('sha256').update(defaultPassword).digest('hex');
      await dbRun('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['admin_password', hash]);
      
      // Check if provided password matches default
      const providedHash = crypto.createHash('sha256').update(password).digest('hex');
      if (providedHash === hash) {
        // Create a simple session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        res.cookie('session_token', sessionToken, { 
          httpOnly: true, 
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.json({ success: true, message: 'Login successful' });
      }
    } else {
      // Check password
      const providedHash = crypto.createHash('sha256').update(password).digest('hex');
      if (providedHash === settings.value) {
        // Create a simple session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        res.cookie('session_token', sessionToken, { 
          httpOnly: true, 
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.json({ success: true, message: 'Login successful' });
      }
    }
    
    res.status(401).json({ error: 'Invalid password' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
  res.clearCookie('session_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/check - Check if user is authenticated
router.get('/check', async (req, res) => {
  try {
    const sessionToken = req.cookies?.session_token;
    
    if (!sessionToken) {
      return res.json({ authenticated: false });
    }
    
    // In a real app, you'd validate the session token against a database
    // For simplicity, we'll just check if the cookie exists
    // You can enhance this by storing sessions in the database
    res.json({ authenticated: true });
  } catch (error) {
    console.error('Error checking auth:', error);
    res.json({ authenticated: false });
  }
});

// POST /api/auth/change-password - Change password (requires authentication)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }
    
    // Get current password
    const settings = await dbGet('SELECT * FROM app_settings WHERE key = ?', ['admin_password']);
    
    if (!settings) {
      return res.status(400).json({ error: 'No password set. Please login first.' });
    }
    
    // Verify current password
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    if (currentHash !== settings.value) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await dbRun('UPDATE app_settings SET value = ? WHERE key = ?', [newHash, 'admin_password']);
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify authentication
export function verifyToken(req, res, next) {
  const sessionToken = req.cookies?.session_token;
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // In a real app, you'd validate the session token against a database
  // For simplicity, we'll just check if the cookie exists
  // You can enhance this by storing sessions in the database
  next();
}

export default router;

