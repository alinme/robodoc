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

## Deploy on Vercel

1. Import the repo in [Vercel](https://vercel.com) and connect your Git provider.
2. Set **Root Directory** to `frontend` (this repo is a monorepo; only the frontend is deployed).
3. Vercel will use the existing `vercel.json` (build: `pnpm run build`, output: `dist`, SPA rewrites).
4. Deploy. The frontend will be served as a static site.

**Note:** The backend (WhatsApp Web.js, Node server) cannot run on Vercel’s serverless model. Host it elsewhere (e.g. Railway, Render, or a VPS) and point the frontend to that API (e.g. via proxy or `VITE_API_URL` if you add env-based API base URL support).

