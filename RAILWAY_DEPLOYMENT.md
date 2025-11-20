# Railway.com Deployment Guide

This guide explains how to deploy the SaaS Platform to Railway.com.

## Prerequisites

1. A Railway.com account (sign up at https://railway.app)
2. Railway CLI installed (optional, for local deployment)

## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

## Manual Deployment Steps

### 1. Create a New Project

1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose the `SaaS-Platform` repository

### 2. Add Required Services

#### PostgreSQL Database
1. Click "+ New" in your project
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision and configure the database
4. The `DATABASE_URL` will be automatically set

#### Redis
1. Click "+ New" in your project
2. Select "Database" → "Redis"
3. Railway will automatically provision and configure Redis
4. Note the Redis connection details for environment variables

### 3. Configure Environment Variables

Add the following environment variables in Railway:

#### Required Variables
```
NODE_ENV=production
PORT=${{PORT}}
API_VERSION=v1
APP_NAME=TaskManager SaaS

# Database (automatically set by Railway PostgreSQL)
DATABASE_URL=${{DATABASE_URL}}
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis (get from Railway Redis service)
REDIS_HOST=${{REDIS.RAILWAY_PRIVATE_DOMAIN}}
REDIS_PORT=6379
REDIS_PASSWORD=${{REDIS.REDIS_PASSWORD}}
REDIS_DB=0
REDIS_TLS_ENABLED=false

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=<generate-a-secure-secret-key>
JWT_REFRESH_SECRET=<generate-a-secure-refresh-key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookie Configuration
COOKIE_SECRET=<generate-a-secure-cookie-secret>

# CORS Configuration
CORS_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}
CORS_CREDENTIALS=true

# Session Secret
SESSION_SECRET=<generate-a-secure-session-secret>

# Encryption Key
ENCRYPTION_KEY=<generate-a-secure-encryption-key>

# Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8

# Feature Flags
FEATURE_GRAPHQL_ENABLED=true
FEATURE_WEBSOCKET_ENABLED=true
FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_TWO_FACTOR_AUTH=true

# Logging
LOG_LEVEL=info

# Timezone
TZ=UTC
```

#### Optional Variables (for email functionality)
```
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASSWORD=<your-smtp-password>
EMAIL_FROM=TaskManager <noreply@yourdomain.com>
```

#### Optional Variables (for AWS S3 file storage)
```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=<your-s3-bucket-name>
```

### 4. Deploy

1. After configuring environment variables, Railway will automatically deploy
2. Monitor the deployment logs in the Railway dashboard
3. Once deployed, you'll receive a public URL

### 5. Database Migration

The database migrations will run automatically on deployment via the `npm run migrate` command in the start script. The migrations are defined in `backend/prisma/migrations/`.

## Project Structure

```
SaaS-Platform/
├── backend/                 # Node.js/Express backend
│   ├── src/                # Source code
│   ├── prisma/             # Database schema and migrations
│   ├── tests/              # Test files
│   └── package.json        # Dependencies and scripts
├── services/
│   └── pdf-tool-go/        # Go-based PDF service
├── railway.json            # Railway configuration
├── railway-simple.json     # Simplified Railway config (backup)
├── nixpacks.toml           # Nixpacks build configuration
├── Procfile                # Process configuration
└── RAILWAY_DEPLOYMENT.md   # This file
```

## Configuration Files

- **railway.json**: Main Railway configuration with explicit build commands
- **railway-simple.json**: Simplified configuration (use if having build issues)
- **nixpacks.toml**: Build and deployment configuration for Nixpacks
- **Procfile**: Process startup command (fallback)

## Troubleshooting

### Nixpacks Build Errors

If you encounter nixpacks errors like "undefined variable 'npm'":

**Option 1: Use the Simple Configuration**
1. Delete `nixpacks.toml` from your repository
2. Rename `railway-simple.json` to `railway.json`
3. Let Railway auto-detect and build your Node.js application

**Option 2: Use Root-level package.json**
Create a `package.json` in the root directory:
```json
{
  "name": "saas-platform",
  "version": "1.0.0",
  "scripts": {
    "build": "cd backend && npm ci && npm run prisma:generate && npm run build",
    "start": "cd backend && npm run migrate && npm start"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Then update `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Database Connection Issues
- Ensure the PostgreSQL service is running
- Verify `DATABASE_URL` is correctly set
- Check that migrations have run successfully
- Look for migration errors in deployment logs

### Redis Connection Issues
- Ensure the Redis service is running
- Use `${{REDIS.RAILWAY_PRIVATE_DOMAIN}}` for REDIS_HOST
- Set `REDIS_TLS_ENABLED=false` for Railway's internal Redis
- Verify Redis connection environment variables

### Build Failures
- Check the build logs in Railway dashboard
- Ensure all dependencies are listed in `backend/package.json`
- Verify Node.js version compatibility (requires Node 18+)
- Try deleting `nixpacks.toml` and letting Railway auto-detect

### Application Crashes
- Check application logs in Railway dashboard
- Ensure all required environment variables are set
- Verify database migrations completed successfully
- Check if DATABASE_URL is properly formatted
- Ensure PostgreSQL service is running and accessible

### Port Issues
- Railway automatically sets the `PORT` environment variable
- The app should listen on `process.env.PORT` or port 5000 as fallback
- Don't hardcode the port number in production

### Migration Failures
If migrations fail on startup:
1. Check the migration logs in Railway
2. You can run migrations manually:
   - Go to Railway project → Service → Settings
   - Add a one-off command: `cd backend && npm run migrate`
   - Or use Railway CLI: `railway run npm run migrate`

## Generating Secure Keys

Use the following commands to generate secure keys:

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

Generate these for:
- JWT_SECRET
- JWT_REFRESH_SECRET
- COOKIE_SECRET
- SESSION_SECRET
- ENCRYPTION_KEY

## Railway Environment Variables Reference

Railway provides several built-in variables:
- `${{PORT}}` - The port your service should listen on
- `${{RAILWAY_PUBLIC_DOMAIN}}` - Your service's public URL
- `${{DATABASE_URL}}` - PostgreSQL connection string (auto-set)
- `${{REDIS.RAILWAY_PRIVATE_DOMAIN}}` - Redis host (from Redis service)
- `${{REDIS.REDIS_PASSWORD}}` - Redis password (from Redis service)

## Monitoring

- Use Railway's built-in metrics and logs
- The application exposes Prometheus metrics on port 9090 (if `METRICS_ENABLED=true`)
- Check deployment logs for startup issues
- Monitor memory and CPU usage in Railway dashboard

## Scaling

Railway automatically scales based on your plan. To handle more traffic:
1. Upgrade your Railway plan
2. Increase database connection pool settings
3. Consider adding more Redis instances for caching
4. Enable horizontal scaling if on Pro plan

## Custom Domain

To add a custom domain:
1. Go to your service in Railway
2. Click Settings → Networking
3. Add your custom domain
4. Update DNS records as instructed
5. Update CORS_ORIGIN environment variable to include your custom domain

## Alternative: Dockerfile Deployment

If you prefer using Docker instead of Nixpacks:
1. In Railway project settings, select "Dockerfile" as builder
2. Railway will use `backend/Dockerfile` for deployment
3. Update railway.json if needed

## Support

For Railway-specific issues, consult:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

For application-specific issues, check the main README.md file.

## Testing Locally with Railway CLI

Install Railway CLI:
```bash
npm install -g @railway/cli
```

Login and link project:
```bash
railway login
railway link
```

Run migrations:
```bash
railway run npm run migrate
```

Start local development with Railway environment:
```bash
railway run npm run dev
```

## Quick Start Checklist

- [ ] Create Railway project from GitHub
- [ ] Add PostgreSQL database service
- [ ] Add Redis service
- [ ] Set all required environment variables
- [ ] Generate secure keys for JWT, sessions, etc.
- [ ] Deploy and monitor logs
- [ ] Verify database migrations completed
- [ ] Test the API endpoint
- [ ] Configure custom domain (optional)

## Common Commands

```bash
# View logs
railway logs

# Run command in Railway environment
railway run <command>

# Open Railway dashboard
railway open

# Deploy manually
railway up

# Add service
railway add

# Check status
railway status
```
