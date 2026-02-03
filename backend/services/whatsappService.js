import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import fs from 'fs';
import { getWhatsAppSessionPaths } from '../../whatsapp-session-paths.js';

const backendClientKey = process.env.WHATSAPP_CLIENT_KEY ?? 'backend';
const { sessionDir: AUTH_DIR, cacheDir: CACHE_DIR } = getWhatsAppSessionPaths(backendClientKey, 'backend');

console.log('[whatsapp] AUTH_DIR', AUTH_DIR);
console.log('[whatsapp] CACHE_DIR', CACHE_DIR);

let client = null;
let connectionStatus = 'disconnected';
let qrCodeData = null;
let qrCodeImage = null;
let stateInterval = null;
let initializing = false;
let reconnectTimeout = null;

const CONNECTED_STATES = new Set(['CONNECTED']);
const CONNECTING_STATES = new Set(['OPENING', 'PAIRING', 'TIMEOUT', 'UNPAIRED', 'UNPAIRED_IDLE', 'CONFLICT']);
const RECONNECT_DELAY_MS = 5000;
const INITIALIZE_TIMEOUT_MS = Number(process.env.WHATSAPP_INIT_TIMEOUT ?? 60000);

function setConnectionStatus(status) {
  if (connectionStatus === status) {
    return;
  }

  console.log('[whatsapp] status ->', connectionStatus, '=>', status);
  connectionStatus = status;

  if (status === 'connected' || status === 'authenticated') {
    clearQr();
    clearReconnectTimeout();
  }
}

function clearReconnectTimeout() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function scheduleReconnect(force = false) {
  if (initializing) {
    return;
  }

  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createClient(force).catch(err => {
      console.error('[whatsapp] Reconnect attempt failed:', err);
    });
  }, RECONNECT_DELAY_MS);

  console.log('[whatsapp] reconnect scheduled in', RECONNECT_DELAY_MS, 'ms', 'force =', force);
}

function updateStatusFromState(state) {
  if (!state) return;

  console.log('[whatsapp] updateStatusFromState:', state);

  if (CONNECTED_STATES.has(state)) {
    setConnectionStatus('connected');
  } else if (CONNECTING_STATES.has(state)) {
    setConnectionStatus('connecting');
  } else {
    setConnectionStatus('disconnected');
  }
}

function cleanupIntervals() {
  if (stateInterval) {
    clearInterval(stateInterval);
    stateInterval = null;
  }
}

function clearQr() {
  qrCodeData = null;
  qrCodeImage = null;
}

function safeRemove(target) {
  if (fs.existsSync(target)) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log('[whatsapp] Removed', target);
    } catch (err) {
      console.warn('[whatsapp] Could not remove', target, err.message);
    }
  }
}

async function createClient(force = false) {
  if (initializing) {
    return client;
  }

  console.log('[whatsapp] createClient called', { force, hasClient: Boolean(client), status: connectionStatus });

  if (client && !force) {
    return client;
  }

  initializing = true;
  clearReconnectTimeout();

  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.warn('[whatsapp] Error destroying client', err.message);
    }
    client = null;
  }

  cleanupIntervals();

  if (force) {
    safeRemove(AUTH_DIR);
    safeRemove(CACHE_DIR);
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  setConnectionStatus('connecting');
  clearQr();

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: AUTH_DIR
    }),
    webVersionCache: {
      type: 'none'
    },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async qr => {
    console.log('[whatsapp] QR received');
    setConnectionStatus('connecting');
    qrCodeData = qr;
    try {
      qrCodeImage = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('[whatsapp] Failed to generate QR image', err.message);
      qrCodeImage = null;
    }
  });

  client.on('change_state', state => {
    console.log('[whatsapp] change_state:', state);
    updateStatusFromState(state);
  });

  client.on('connection_state', state => {
    console.log('[whatsapp] connection_state:', state);
    updateStatusFromState(state);
  });

  client.on('authenticated', () => {
    console.log('[whatsapp] authenticated');
    setConnectionStatus('authenticated');
  });

  client.on('ready', () => {
    console.log('[whatsapp] ready');
    setConnectionStatus('connected');
  });

  client.on('remote_session_saved', () => {
    console.log('[whatsapp] remote_session_saved');
    setConnectionStatus('authenticated');
  });

  client.on('loading_screen', (percent, message) => {
    console.log('[whatsapp] loading_screen', percent, message);
  });

  client.on('message', msg => {
    console.log('[whatsapp] message received during init?', msg.id?._serialized);
  });

  client.on('error', err => {
    console.error('[whatsapp] client error', err);
  });

  client.on('auth_failure', msg => {
    console.error('[whatsapp] auth_failure', msg);
    setConnectionStatus('disconnected');
    cleanupIntervals();
    scheduleReconnect(true);
  });

  client.on('disconnected', reason => {
    console.warn('[whatsapp] disconnected', reason);
    setConnectionStatus('disconnected');
    cleanupIntervals();
    if (reason !== 'NAVIGATION') {
      scheduleReconnect(true);
    }
  });

  let initTimeoutId;

  try {
    await Promise.race([
      client.initialize(),
      new Promise((_, reject) => {
        initTimeoutId = setTimeout(() => {
          reject(new Error(`initialize timeout after ${INITIALIZE_TIMEOUT_MS}ms`));
        }, INITIALIZE_TIMEOUT_MS);
      })
    ]);
    console.log('[whatsapp] initialize ok');
  } catch (err) {
    console.error('[whatsapp] initialize error', err.message);
    setConnectionStatus('disconnected');
    if (err.message && err.message.includes('LocalWebCache')) {
      console.warn('[whatsapp] Clearing cache due to LocalWebCache issue and retrying');
      safeRemove(CACHE_DIR);
      try {
        await client.destroy();
      } catch (_) {}
      client = null;
      initializing = false;
      return createClient(true);
    }

    try {
      await client.destroy();
    } catch (destroyErr) {
      console.warn('[whatsapp] destroy after init error failed', destroyErr.message);
    }
    client = null;
    initializing = false;
    scheduleReconnect(true);
    return null;
  }

  if (initTimeoutId) {
    clearTimeout(initTimeoutId);
  }

  try {
    const state = await client.getState();
    console.log('[whatsapp] initial getState()', state);
    updateStatusFromState(state);
  } catch (err) {
    console.warn('[whatsapp] initial getState() error', err.message);
  }

  stateInterval = setInterval(async () => {
    if (!client) return;
    try {
      if (typeof client.getState === 'function') {
        const state = await client.getState();
        console.log('[whatsapp] getState()', state);
        updateStatusFromState(state);
      }
    } catch (err) {
      console.warn('[whatsapp] getState error', err.message);
    }
  }, 5000);

  initializing = false;
  return client;
}

export async function initializeWhatsApp(force = false) {
  return createClient(force);
}

export function getClient() {
  return client;
}

export function getConnectionStatus() {
  return connectionStatus;
}

export function getQRCode() {
  console.log('[whatsapp] getQRCode', Boolean(qrCodeData), Boolean(qrCodeImage));
  return {
    qr: qrCodeData,
    image: qrCodeImage
  };
}

export async function sendMessage(phoneNumber, message) {
  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  // Check both cached status and actual client state
  if (connectionStatus !== 'connected' && connectionStatus !== 'authenticated') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  // Verify actual client state before sending
  try {
    const actualState = await client.getState();
    if (!CONNECTED_STATES.has(actualState)) {
      setConnectionStatus('disconnected');
      throw new Error(`WhatsApp client is not in a connected state. Current state: ${actualState}`);
    }
  } catch (stateError) {
    console.error('[whatsapp] Error checking client state:', stateError);
    // If we can't check state, the client might be disconnected
    setConnectionStatus('disconnected');
    throw new Error(`Cannot verify WhatsApp connection state: ${stateError.message}`);
  }

  let cleaned = phoneNumber.replace(/[^\d]/g, '');
  if (cleaned.length !== 11 || !cleaned.startsWith('40')) {
    throw new Error(`Invalid phone number format: ${phoneNumber}. Expected 11 digits starting with 40.`);
  }

  try {
    const chatId = `${cleaned}@c.us`;
    const result = await client.sendMessage(chatId, message);
    return {
      success: true,
      messageId: result.id._serialized,
      timestamp: result.timestamp
    };
  } catch (error) {
    console.error('[whatsapp] sendMessage error', error);
    
    // Handle specific "detached Frame" error - indicates session lost
    if (error.message && error.message.includes('detached Frame')) {
      console.warn('[whatsapp] Detached Frame error detected - session may be lost');
      setConnectionStatus('disconnected');
      
      // Attempt to reconnect in the background
      scheduleReconnect(true);
      
      throw new Error('WhatsApp session lost. Please wait for reconnection or restart the WhatsApp service. The connection will be restored automatically.');
    }
    
    // Handle other connection-related errors
    if (error.message && (
      error.message.includes('Session closed') ||
      error.message.includes('Target closed') ||
      error.message.includes('Protocol error') ||
      error.message.includes('Navigation timeout')
    )) {
      console.warn('[whatsapp] Connection error detected:', error.message);
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error(`WhatsApp connection lost: ${error.message}. Attempting to reconnect...`);
    }
    
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

export function isConnected() {
  return connectionStatus === 'connected' || connectionStatus === 'authenticated';
}

// Get all WhatsApp groups
export async function getWhatsAppGroups() {
  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  // Check both cached status and actual client state
  if (connectionStatus !== 'connected' && connectionStatus !== 'authenticated') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  // Verify actual client state before calling getChats()
  try {
    const actualState = await client.getState();
    if (!CONNECTED_STATES.has(actualState)) {
      setConnectionStatus('disconnected');
      throw new Error(`WhatsApp client is not in a connected state. Current state: ${actualState}`);
    }
  } catch (stateError) {
    console.error('[whatsapp] Error checking client state in getWhatsAppGroups:', stateError);
    setConnectionStatus('disconnected');
    throw new Error(`Cannot verify WhatsApp connection state: ${stateError.message}`);
  }

  try {
    const chats = await client.getChats();
    // Filter only groups (groups have isGroup property)
    const groups = chats.filter(chat => chat.isGroup);
    
    return groups.map(group => ({
      id: group.id._serialized,
      name: group.name,
      participantCount: group.participants?.length || 0
    }));
  } catch (error) {
    console.error('[whatsapp] getWhatsAppGroups error', error);

    // Handle specific "detached Frame" / connection errors
    if (error.message && error.message.includes('detached Frame')) {
      console.warn('[whatsapp] Detached Frame error detected in getWhatsAppGroups - session may be lost');
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error('WhatsApp session lost while fetching groups. Please wait for reconnection or restart the WhatsApp service.');
    }

    if (error.message && (
      error.message.includes('Session closed') ||
      error.message.includes('Target closed') ||
      error.message.includes('Protocol error') ||
      error.message.includes('Navigation timeout')
    )) {
      console.warn('[whatsapp] Connection error detected in getWhatsAppGroups:', error.message);
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error(`WhatsApp connection lost while fetching groups: ${error.message}. Attempting to reconnect...`);
    }

    throw new Error(`Failed to get WhatsApp groups: ${error.message}`);
  }
}

// Create a new WhatsApp group
export async function createWhatsAppGroup(groupName, participantPhones) {
  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  // Check both cached status and actual client state
  if (connectionStatus !== 'connected' && connectionStatus !== 'authenticated') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  // Verify actual client state before creating group
  try {
    const actualState = await client.getState();
    if (!CONNECTED_STATES.has(actualState)) {
      setConnectionStatus('disconnected');
      throw new Error(`WhatsApp client is not in a connected state. Current state: ${actualState}`);
    }
  } catch (stateError) {
    console.error('[whatsapp] Error checking client state in createWhatsAppGroup:', stateError);
    setConnectionStatus('disconnected');
    throw new Error(`Cannot verify WhatsApp connection state: ${stateError.message}`);
  }

  if (!groupName || !groupName.trim()) {
    throw new Error('Group name is required');
  }

  if (!participantPhones || participantPhones.length === 0) {
    throw new Error('At least one participant is required');
  }

  try {
    // Format phone numbers for WhatsApp
    const participantIds = participantPhones.map(phone => {
      let cleaned = phone.replace(/[^\d]/g, '');
      if (cleaned.length !== 11 || !cleaned.startsWith('40')) {
        throw new Error(`Invalid phone number format: ${phone}. Expected 11 digits starting with 40.`);
      }
      return `${cleaned}@c.us`;
    });

    // Create the group
    const group = await client.createGroup(groupName, participantIds);
    
    return {
      success: true,
      groupId: group.id._serialized,
      groupName: group.name,
      participantCount: group.participants?.length || 0
    };
  } catch (error) {
    console.error('[whatsapp] createWhatsAppGroup error', error);

    if (error.message && error.message.includes('detached Frame')) {
      console.warn('[whatsapp] Detached Frame error detected in createWhatsAppGroup - session may be lost');
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error('WhatsApp session lost while creating group. Please wait for reconnection or restart the WhatsApp service.');
    }

    if (error.message && (
      error.message.includes('Session closed') ||
      error.message.includes('Target closed') ||
      error.message.includes('Protocol error') ||
      error.message.includes('Navigation timeout')
    )) {
      console.warn('[whatsapp] Connection error detected in createWhatsAppGroup:', error.message);
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error(`WhatsApp connection lost while creating group: ${error.message}. Attempting to reconnect...`);
    }

    throw new Error(`Failed to create WhatsApp group: ${error.message}`);
  }
}

// Add participants to an existing WhatsApp group
export async function addParticipantsToWhatsAppGroup(groupId, participantPhones) {
  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  // Check both cached status and actual client state
  if (connectionStatus !== 'connected' && connectionStatus !== 'authenticated') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  // Verify actual client state before modifying group
  try {
    const actualState = await client.getState();
    if (!CONNECTED_STATES.has(actualState)) {
      setConnectionStatus('disconnected');
      throw new Error(`WhatsApp client is not in a connected state. Current state: ${actualState}`);
    }
  } catch (stateError) {
    console.error('[whatsapp] Error checking client state in addParticipantsToWhatsAppGroup:', stateError);
    setConnectionStatus('disconnected');
    throw new Error(`Cannot verify WhatsApp connection state: ${stateError.message}`);
  }

  if (!groupId) {
    throw new Error('Group ID is required');
  }

  if (!participantPhones || participantPhones.length === 0) {
    throw new Error('At least one participant is required');
  }

  try {
    // Get the group chat
    const group = await client.getChatById(groupId);
    
    if (!group || !group.isGroup) {
      throw new Error('Group not found or is not a valid group');
    }

    // Format phone numbers for WhatsApp
    const participantIds = participantPhones.map(phone => {
      let cleaned = phone.replace(/[^\d]/g, '');
      if (cleaned.length !== 11 || !cleaned.startsWith('40')) {
        throw new Error(`Invalid phone number format: ${phone}. Expected 11 digits starting with 40.`);
      }
      return `${cleaned}@c.us`;
    });

    // Add participants to the group
    await group.addParticipants(participantIds);
    
    // Refresh group info
    await group.fetchGroupMetadata();
    
    return {
      success: true,
      groupId: group.id._serialized,
      groupName: group.name,
      addedCount: participantIds.length,
      totalParticipants: group.participants?.length || 0
    };
  } catch (error) {
    console.error('[whatsapp] addParticipantsToWhatsAppGroup error', error);

    if (error.message && error.message.includes('detached Frame')) {
      console.warn('[whatsapp] Detached Frame error detected in addParticipantsToWhatsAppGroup - session may be lost');
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error('WhatsApp session lost while updating group participants. Please wait for reconnection or restart the WhatsApp service.');
    }

    if (error.message && (
      error.message.includes('Session closed') ||
      error.message.includes('Target closed') ||
      error.message.includes('Protocol error') ||
      error.message.includes('Navigation timeout')
    )) {
      console.warn('[whatsapp] Connection error detected in addParticipantsToWhatsAppGroup:', error.message);
      setConnectionStatus('disconnected');
      scheduleReconnect(true);
      throw new Error(`WhatsApp connection lost while updating group participants: ${error.message}. Attempting to reconnect...`);
    }

    throw new Error(`Failed to add participants to WhatsApp group: ${error.message}`);
  }
}

// Validate if a contact has a valid WhatsApp account and exists in phone's contacts
export async function validateContactWhatsApp(phoneNumber) {
  if (!client) {
    throw new Error('WhatsApp client not initialized');
  }

  if (connectionStatus !== 'connected') {
    throw new Error(`WhatsApp not connected. Status: ${connectionStatus}`);
  }

  let cleaned = phoneNumber.replace(/[^\d]/g, '');
  if (cleaned.length !== 11 || !cleaned.startsWith('40')) {
    throw new Error(`Invalid phone number format: ${phoneNumber}. Expected 11 digits starting with 40.`);
  }

  const chatId = `${cleaned}@c.us`;
  let whatsappValid = false;
  let whatsappInContacts = false;
  let error = null;

  try {
    // Method 1: Try to get the chat - if successful, the number is registered
    try {
      const chat = await client.getChatById(chatId);
      if (chat) {
        whatsappValid = true;
        // If we can get the chat, it likely exists in contacts or is a known contact
        whatsappInContacts = true;
      }
    } catch (chatError) {
      // Chat doesn't exist, try other methods
      
      // Method 2: Try to get number ID (check if registered)
      let numberId = null;
      try {
        numberId = await client.getNumberId(chatId);
        if (numberId) {
          whatsappValid = true;
        }
      } catch (numberError) {
        // Number not registered
        whatsappValid = false;
      }

      // Method 3: Check if contact exists in phone's WhatsApp contacts
      try {
        const contacts = await client.getContacts();
        const foundContact = contacts.find(contact => {
          const contactId = contact.id?._serialized || contact.id || '';
          return contactId === chatId || contactId.includes(cleaned) || (numberId && contactId === numberId);
        });
        if (foundContact) {
          whatsappInContacts = true;
        }
      } catch (contactsError) {
        // Could not fetch contacts, but this is not critical
        console.warn('[whatsapp] Could not fetch contacts for validation:', contactsError.message);
      }
    }
  } catch (err) {
    error = err.message;
    console.error('[whatsapp] validateContactWhatsApp error', err);
  }

  return {
    whatsappValid,
    whatsappInContacts,
    error
  };
}

