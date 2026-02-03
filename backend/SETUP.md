# WhatsApp Setup Guide

This application uses [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) directly (not the whatsapp-node-api wrapper).

## Installation

The `whatsapp-web.js` library is already included in `package.json`. Just run:

```bash
npm install
```

## How It Works

1. **First Time Setup**: When you start the server, WhatsApp Web.js will generate a QR code
2. **Scan QR Code**: Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
3. **Scan the QR code** displayed in the Settings page of the app
4. **Authentication**: After scanning, the session is saved locally and you won't need to scan again

## Troubleshooting

### If QR code doesn't appear:
- Check the backend console logs for errors
- Make sure Puppeteer dependencies are installed (usually auto-installed with whatsapp-web.js)
- On Linux, you may need: `sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget`

### If connection fails:
- Make sure your phone has internet connection
- Try restarting the backend server
- Delete the `.wwebjs_auth` folder and re-authenticate

### Phone Number Format:
- The app automatically formats Romanian phone numbers
- Numbers should be in format: `40712345678` or `+40712345678`
- Numbers starting with `0` are automatically converted (e.g., `0712345678` → `+40712345678`)

## Session Storage

The WhatsApp session is stored in `backend/.wwebjs_auth/` directory. This allows the app to stay connected without re-scanning the QR code every time.

## Important Notes

- **WhatsApp does not officially support bots or unofficial clients**
- There's a risk of being blocked by WhatsApp
- Use responsibly and avoid sending spam messages
- The library uses WhatsApp Web, so it requires an active internet connection

