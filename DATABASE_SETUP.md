# Database Setup Guide

## Switching from Neon Database

This project uses PostgreSQL. You can use any PostgreSQL provider. Below are the recommended free alternatives:

## Recommended: Supabase (Best Free Option)

### Why Supabase?
- 500MB database storage on free tier
- Unlimited API requests
- PostgreSQL-based (100% compatible)
- Excellent dashboard and tools
- Auto-generated REST APIs (bonus feature)

### Setup Instructions:

1. **Create Account**
   - Go to https://supabase.com
   - Sign up for free account

2. **Create New Project**
   - Click "New Project"
   - Enter project name
   - Set database password (save this!)
   - Choose region closest to you

3. **Get Connection String**
   - Go to Project Settings > Database
   - Under "Connection String", select "URI"
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password

4. **Update Environment Variable**
   - Create `.env` file in project root if it doesn't exist
   - Add this line:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

5. **Run the Application**
   ```bash
   npm start
   ```
   - The database tables will be created automatically on first run

## Alternative Free Database Options

### 1. Railway
- **Free Tier**: $5 credit/month
- **Setup**: https://railway.app
- Get PostgreSQL connection string and add to `.env`

### 2. Render
- **Free Tier**: 512MB RAM, expires after 90 days of inactivity
- **Setup**: https://render.com
- Create PostgreSQL database and get connection string

### 3. Aiven
- **Free Tier**: Available on startup plan
- **Setup**: https://aiven.io
- Good performance, reliable

### 4. CockroachDB
- **Free Tier**: 5GB storage
- **Setup**: https://cockroachlabs.com
- PostgreSQL compatible

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=your_postgresql_connection_string_here

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# ImgBB (for image uploads - Free & Unlimited)
IMGBB_API_KEY=your_imgbb_api_key
```

## Database Tables

The application automatically creates these tables on startup:

### queries
- Stores all customer queries
- Includes image support via Cloudinary
- Status tracking (pending/in_progress/completed/rejected)

### user_sessions
- Stores user conversation sessions
- Tracks user state in chatbot flow

## Troubleshooting

### Connection Issues
- Ensure DATABASE_URL is correctly formatted
- Check if your IP is whitelisted (some providers require this)
- Verify database password is correct

### SSL Issues
If you get SSL errors, the app is configured to use:
```javascript
ssl: { rejectUnauthorized: false }
```

This is already configured in `config/database.js`

### Migration Issues
The app includes automatic migration for image columns. If you see migration warnings, they can be safely ignored if columns already exist.

## Testing Connection

After setup, run:
```bash
npm start
```

You should see:
```
🔄 Connecting to database...
✅ Successfully connected to database
✅ Database tables initialized successfully
```

## Support

If you encounter issues:
1. Check `.env` file exists and has correct DATABASE_URL
2. Verify database provider is running
3. Check application logs for specific errors
