# Fix: "API keys with referer restrictions cannot be used with this API"

## Problem

You're getting this error because your Google Maps API key has **HTTP referrer restrictions**, which only work for browser-based requests. Since we're making server-side API calls from your backend, these restrictions block the requests.

## Solution: Change API Key Restrictions

You have two options:

### Option 1: Remove Application Restrictions (Easiest for Development)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under "Application restrictions":
   - Select **"None"** (for development/testing)
4. Keep "API restrictions" set to only "Directions API"
5. Click "Save"

**Note**: This is less secure but works immediately. For production, use Option 2.

### Option 2: Use IP Restrictions (Recommended for Production)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under "Application restrictions":
   - Select **"IP addresses (web servers, cron jobs, etc.)"**
   - Add your server's IP address:
     - For localhost development: You can temporarily use `0.0.0.0/0` (allows all IPs - not secure but works for testing)
     - For production: Add your actual server's IP address
4. Keep "API restrictions" set to only "Directions API"
5. Click "Save"

### Option 3: Create Two Separate API Keys (Best Practice)

1. **Key 1 - For Frontend (Browser)**: 
   - Use HTTP referrer restrictions
   - For Maps JavaScript API (if you use it)
   
2. **Key 2 - For Backend (Server)**:
   - Use IP restrictions or None
   - For Directions API (routing)
   - Add this one to `backend/.env` as `GOOGLE_MAPS_API_KEY`

## After Making Changes

1. Wait 1-2 minutes for changes to propagate
2. Restart your backend server
3. Try routing again

## Current Status

Right now, the system will fall back to OSRM routing (which works but may prefer shorter routes over highways). Once you fix the API key restrictions, Google Maps routing will work and prefer main roads/highways.

