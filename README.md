# RoboDoc - WhatsApp Bulk Sender

**RoboDoc** is a web application for World Vision Romania that enables bulk WhatsApp messaging from Excel files. Upload Excel files with contact information, map columns, apply rules/filters, and send personalized WhatsApp messages to contacts.

## Features

- 📤 **Excel File Upload** - Upload and parse Excel files (.xlsx, .xls)
- 🗺️ **Column Mapping** - Map Excel columns to contact fields (Name, Phone, Group, Business)
- 📋 **Contact Groups** - Organize contacts into groups
- 🔍 **Rules & Filters** - Apply rules to filter contacts (e.g., only import contacts with protocol dates)
- 💬 **Message Templates** - Create message templates with placeholders ({Name}, {GivenName}, {Business}, {Group})
- 📱 **WhatsApp Integration** - Send messages via WhatsApp Web API
- 📊 **Message History** - Track sent messages with status and retry failed messages
- 💾 **Saved Mappings** - Save and reuse column mappings

## Tech Stack

### Backend
- Node.js + Express
- SQLite database
- WhatsApp Web.js for WhatsApp integration
- Excel parsing with xlsx library

### Frontend
- Vue 3 with TypeScript
- Vite for build tooling
- Tailwind CSS v4 for styling
- Pinia for state management
- Vue Router for navigation

## Quick Start

**For detailed step-by-step instructions, see [QUICKSTART.md](QUICKSTART.md)**

### Quick Setup (5 minutes)

1. **Install all dependencies:**
```bash
npm run install:all
```

2. **Start both servers:**
```bash
npm run dev
```
This starts both backend (port 3001) and frontend (port 5173) servers.

3. **Open browser:** Go to `http://localhost:5173`

4. **Connect WhatsApp:** Go to Settings page → Scan QR code with your phone

That's it! You're ready to use RoboDoc.

### Alternative: Start Servers Separately

If you prefer to run servers in separate terminals:

**Terminal 1:**
```bash
npm run start:backend
```

**Terminal 2:**
```bash
npm run start:frontend
```

### First Time Setup

1. **Connect WhatsApp:**
   - Go to the Settings page
   - Scan the QR code with your WhatsApp mobile app
   - Wait for the connection status to show "Connected"

2. **Upload an Excel file:**
   - Go to the Upload page
   - Upload an Excel file with contact information
   - Select the sheet and map columns
   - Optionally add rules to filter contacts
   - Create or select a group
   - Import contacts

3. **Send messages:**
   - Go to the Messages page
   - Compose your message template
   - Select contacts or a group
   - Send messages

## Project Structure

```
robo-doc/
├── backend/          # Node.js Express API server
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic services
│   ├── database/     # SQLite database files
│   └── uploads/      # Temporary file uploads
├── frontend/         # Vue 3 frontend application
│   ├── src/
│   │   ├── components/  # Vue components
│   │   ├── views/       # Page views
│   │   ├── stores/      # Pinia stores
│   │   └── types/       # TypeScript types
│   └── public/       # Static assets
└── README.md
```

## API Endpoints

See `backend/README.md` for detailed API documentation.

## Database

The application uses SQLite for data persistence. The database file is automatically created at `backend/database/robo-doc.db` on first run.

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

## Building for Production

### Backend
The backend can be run directly with Node.js:
```bash
cd backend
npm start
```

### Frontend
Build the frontend for production:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`. You can serve them with any static file server or configure the backend to serve them.

## PWA Support

The frontend is configured as a Progressive Web App (PWA) and can be installed on devices for offline use.

## License

MIT License - World Vision Romania

## Support

For issues or questions, please contact the development team.

