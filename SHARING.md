# Sharing RoboDoc with Colleagues

## Option 1: Local Network Sharing (Easiest)

### On Your Computer (Server):

1. **Find your local IP address:**
   - Windows: Open Command Prompt and run `ipconfig`
   - Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Configure firewall:**
   - Allow incoming connections on port 3001 (or your configured port)
   - Windows: Windows Defender Firewall → Allow an app → Node.js

### On Colleague's Computer:

1. **Open browser and go to:**
   ```
   http://YOUR_IP_ADDRESS:3001
   ```
   Example: `http://192.168.1.100:3001`

2. **Login with the password:**
   - Default password: `admin`
   - Change it in Settings after first login

## Option 2: Deploy to a Server

### Using a VPS (DigitalOcean, AWS, etc.):

1. **Upload your project to the server**
2. **Install Node.js and dependencies:**
   ```bash
   npm run install:all
   ```
3. **Build the frontend:**
   ```bash
   npm run build
   ```
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Use a process manager (PM2) for production:**
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name robo-doc
   pm2 save
   pm2 startup
   ```

### Using ngrok (for testing):

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start your server:**
   ```bash
   npm start
   ```

3. **Create a tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Share the ngrok URL** (e.g., `https://abc123.ngrok.io`) with your colleagues

## Security Notes

- **Change the default password** immediately after first login
- The password is stored as a SHA256 hash in the database
- For production, consider:
  - Using HTTPS (SSL certificate)
  - Implementing proper session management
  - Adding rate limiting
  - Using environment variables for sensitive data

## Authentication

- Default password: `admin`
- Change password in Settings → Change Password
- Password is stored securely (SHA256 hash)
- Session lasts 7 days (can be adjusted in `backend/routes/auth.js`)

## Troubleshooting

### Can't access from other computers:
- Check firewall settings
- Ensure both computers are on the same network
- Verify the IP address is correct
- Check if the server is running

### Login not working:
- Clear browser cookies
- Check if the database has the password set
- Verify the server is running correctly

