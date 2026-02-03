# How to Get Google Maps API Key for Routing

## Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account (or create one if needed)

## Step 2: Create a New Project (or Select Existing)

1. Click the project dropdown at the top
2. Click "New Project"
3. Enter a project name (e.g., "RoboDoc Delivery Planning")
4. Click "Create"

## Step 3: Enable Required APIs

1. Go to "APIs & Services" > "Library" (or visit: https://console.cloud.google.com/apis/library)
2. Search for and enable these APIs:
   - **Directions API** (required for routing)
   - **Maps JavaScript API** (optional, if you want to use Google Maps instead of Leaflet)
   - **Geocoding API** (optional, for address lookups)

## Step 4: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key (it will look like: `AIzaSy...`)

## Step 5: Restrict Your API Key (IMPORTANT for Security)

**CRITICAL: For server-side API calls (like routing), you need to configure restrictions differently!**

1. Click on your newly created API key to edit it
2. Under "API restrictions":
   - Select "Restrict key"
   - Check only: **Directions API** (and Maps JavaScript API if enabled)
3. Under "Application restrictions":
   - **IMPORTANT**: Choose **"IP addresses (web servers, cron jobs, etc.)"** for server-side use
   - Add your server's IP address (or use `0.0.0.0/0` for development/testing - NOT recommended for production)
   - **OR** select **"None"** for development (less secure, but works for testing)
   - **DO NOT** use "HTTP referrers" - this only works for browser-based requests, not server-side API calls
4. Click "Save"

**Note**: If you need both browser and server-side access, create TWO separate API keys:
- One with HTTP referrer restrictions for frontend Maps JavaScript API
- One with IP restrictions (or None) for backend Directions API

## Step 6: Add API Key to Your Application

**IMPORTANT**: Since we're using server-side API calls (backend proxy), add the key to the **backend** `.env` file:

1. Create a `.env` file in the `backend` folder (if it doesn't exist):
```
GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

2. Restart your backend server for the changes to take effect

**Note**: The frontend `.env` file is no longer needed since we're using a backend proxy to avoid CORS issues.

## Pricing Information

- **Free Tier**: $200 credit per month (covers ~28,000 route requests)
- **After Free Tier**: $5 per 1,000 requests
- For delivery planning, you'll likely stay within the free tier

## Important Notes

- Keep your API key secret - never commit it to public repositories
- Monitor usage in Google Cloud Console
- Set up billing alerts to avoid unexpected charges
- The free $200 credit resets monthly

