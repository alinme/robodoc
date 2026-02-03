# Quick Start Guide - RoboDoc

Follow these steps to get RoboDoc up and running.

## Prerequisites

- Node.js v18 or higher installed
- npm (comes with Node.js)
- A WhatsApp account on your phone

## Step 1: Install All Dependencies

From the root directory, install all dependencies:

```bash
npm run install:all
```

This will install:
- Root dependencies (concurrently for running both servers)
- Backend dependencies (Express, whatsapp-web.js, SQLite, etc.)
- Frontend dependencies (Vue, Vite, Tailwind, etc.)

**Note:** The first install might take a few minutes as it downloads Puppeteer (used by whatsapp-web.js).

**Alternative:** Install separately if needed:
```bash
npm run install:backend   # Backend only
npm run install:frontend  # Frontend only
```

## Step 2: Start the Application

You have two options:

### Option A: Start Both Servers Together (Recommended)

From the root directory:

```bash
npm run dev
```

This starts both backend and frontend servers simultaneously. You'll see output from both in the same terminal.

### Option B: Start Servers Separately

**Terminal 1 - Backend:**
```bash
npm run start:backend
```

You should see:
```
Database initialized successfully
Connected to SQLite database
Database tables created successfully
RoboDoc Backend server running on port 3001
Health check: http://localhost:3001/api/health
```

**Terminal 2 - Frontend:**
```bash
npm run start:frontend
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 3: Open the Application

Open your web browser and go to:
```
http://localhost:5173
```

You should see the RoboDoc application with navigation: Upload, Contacts, Messages, Settings.

## Step 4: Connect WhatsApp

1. Click on **"Settings"** in the navigation
2. You should see a QR code appear (if not, check the backend terminal for errors)
3. Open WhatsApp on your phone
4. Go to: **Settings → Linked Devices → Link a Device**
5. Scan the QR code displayed in the browser
6. Wait for the status to change to "Connected" (green indicator)

**Note:** The first connection might take 30-60 seconds. After the first scan, you won't need to scan again - the session is saved.

## Step 5: Test the Application

### Test 1: Upload an Excel File

1. Go to the **"Upload"** page
2. Prepare a test Excel file with columns like:
   - Name (e.g., "John Doe")
   - Phone (e.g., "40712345678" or "0712345678")
   - Business (optional, e.g., "School Name")
   - Group (optional, e.g., "Bucharest")
3. Click or drag the Excel file to upload
4. Select the sheet (if multiple sheets exist)
5. Map the columns:
   - Select which column is "Name"
   - Select which column is "Phone"
   - Optionally map "Group" and "Business"
6. Create or select a group name
7. Click "Import Contacts"

### Test 2: View Contacts

1. Go to the **"Contacts"** page
2. You should see the imported contacts
3. Try the search and filter features

### Test 3: Send a Test Message

1. Go to the **"Messages"** page
2. Write a test message template, for example:
   ```
   Hello {GivenName}, this is a test message from RoboDoc.
   ```
3. Select a contact or group
4. Click "Send Messages"
5. Check your WhatsApp to see if the message was sent

## Troubleshooting

### Backend won't start

**Error: "Cannot find module"**
- Make sure you ran `npm install` in the backend directory
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Error: "Port 3001 already in use"**
- Another process is using port 3001
- Change the port in `backend/server.js` or stop the other process

**Error: "Puppeteer" or "Chromium" related**
- On Linux, install required dependencies:
  ```bash
  sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
  ```

### Frontend won't start

**Error: "Cannot find module"**
- Make sure you ran `npm install` in the frontend directory
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Error: "Port 5173 already in use"**
- Another process is using port 5173
- Vite will automatically try the next available port

### QR Code doesn't appear

1. Check the backend terminal for errors
2. Make sure the backend server is running
3. Check browser console (F12) for errors
4. Try refreshing the Settings page

### WhatsApp connection fails

1. Make sure your phone has internet connection
2. Make sure WhatsApp is open on your phone
3. Try deleting `backend/.wwebjs_auth` folder and restarting the backend
4. Check backend terminal for error messages

### Messages not sending

1. Make sure WhatsApp status shows "Connected" (green)
2. Check phone number format - should be Romanian format (e.g., 40712345678)
3. Check backend terminal for error messages
4. Verify the contact exists in WhatsApp

## Available Scripts

From the root directory, you can use these commands:

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install all dependencies (root, backend, frontend) |
| `npm run install:backend` | Install backend dependencies only |
| `npm run install:frontend` | Install frontend dependencies only |
| `npm run dev` or `npm run dev:all` | Start both backend and frontend servers |
| `npm start` or `npm run start:backend` | Start backend server only |
| `npm run start:frontend` | Start frontend server only |
| `npm run dev:backend` | Start backend in development mode (with auto-reload) |
| `npm run dev:frontend` | Start frontend in development mode (with HMR) |
| `npm run build` | Build frontend for production |
| `npm run clean` | Remove all node_modules and cache files |

## Development Mode

For development with auto-reload on both servers:

```bash
npm run dev
```

This uses `concurrently` to run both servers. The frontend has hot module replacement (HMR) enabled, and the backend uses nodemon for auto-reload.

## Next Steps

- Upload your Excel files with contact information
- Create message templates with placeholders
- Organize contacts into groups
- Send bulk messages to your contacts

## Need Help?

- Check `backend/SETUP.md` for WhatsApp-specific setup
- Check `backend/README.md` for API documentation
- Check `frontend/README.md` for frontend details
- Check the main `README.md` for project overview

