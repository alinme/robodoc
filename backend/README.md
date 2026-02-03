# RoboDoc Backend

Backend API server for RoboDoc - WhatsApp Bulk Sender for World Vision Romania.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Upload
- `POST /api/upload` - Upload Excel file
- `GET /api/upload/mappings` - Get saved column mappings
- `POST /api/upload/mappings` - Save column mapping
- `DELETE /api/upload/mappings/:id` - Delete mapping

### Contacts
- `GET /api/contacts` - Get all contacts (with filters)
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts/import` - Import contacts from Excel
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get single group
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Messages
- `POST /api/messages/send` - Send messages to contacts
- `GET /api/messages/history` - Get message history
- `POST /api/messages/retry/:id` - Retry failed message

### Rules
- `GET /api/rules` - Get all rules
- `GET /api/rules/:id` - Get single rule
- `POST /api/rules` - Create rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

### WhatsApp
- `GET /api/whatsapp/status` - Get connection status
- `GET /api/whatsapp/qr` - Get QR code for authentication

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Database

SQLite database is automatically created at `database/robo-doc.db` on first run.

