# RoboDoc Frontend

Vue 3 frontend application for RoboDoc - WhatsApp Bulk Sender for World Vision Romania.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

3. Build for production:
```bash
npm run build
```

## Tech Stack

- **Vue 3** with TypeScript
- **Vite** for build tooling
- **Vue Router** for navigation
- **Pinia** for state management
- **Tailwind CSS v4** for styling
- **Axios** for API calls

## Project Structure

```
src/
├── components/     # Reusable Vue components
├── views/         # Page views
├── stores/        # Pinia stores
├── router/        # Vue Router configuration
├── types/         # TypeScript type definitions
└── main.ts        # Application entry point
```

## Development

The frontend is configured to proxy API requests to the backend server running on `http://localhost:3001`.

## PWA Support

The app is configured as a Progressive Web App (PWA) and can be installed on devices.

