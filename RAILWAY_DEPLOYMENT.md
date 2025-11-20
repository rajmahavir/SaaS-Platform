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
REDIS_HOST=${{REDIS_HOST}}
REDIS_PORT=${{REDIS_PORT}}
REDIS_PASSWORD=${{REDIS_PASSWORD}}
REDIS_DB=0
REDIS_TLS_ENABLED=true

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=<generate-a-secure-secret-key>
JWT_REFRESH_SECRET=<generate-a-secure-refresh-key>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookie Configuration
COOKIE_SECRET=<generate-a-secure-cookie-secret>

# CORS Configuration
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}}
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
├── nixpacks.toml           # Nixpacks build configuration
├── Procfile                # Process configuration
└── RAILWAY_DEPLOYMENT.md   # This file
```

## Configuration Files

- **railway.json**: Main Railway configuration
- **nixpacks.toml**: Build and deployment configuration for Nixpacks
- **Procfile**: Process startup command

## Troubleshooting

### Database Connection Issues
- Ensure the PostgreSQL service is running
- Verify `DATABASE_URL` is correctly set
- Check that migrations have run successfully

### Redis Connection Issues
- Ensure the Redis service is running
- Verify Redis connection environment variables
- Check if `REDIS_TLS_ENABLED` is set to `true` for Railway's Redis

### Build Failures
- Check the build logs in Railway dashboard
- Ensure all dependencies are listed in `package.json`
- Verify Node.js version compatibility (requires Node 18+)

### Application Crashes
- Check application logs in Railway dashboard
- Ensure all required environment variables are set
- Verify database migrations completed successfully

## Generating Secure Keys

Use the following commands to generate secure keys:

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

## Monitoring

- Use Railway's built-in metrics and logs
- The application exposes Prometheus metrics on port 9090 (if `METRICS_ENABLED=true`)

## Scaling

Railway automatically scales based on your plan. To handle more traffic:
1. Upgrade your Railway plan
2. Increase database connection pool settings
3. Consider adding more Redis instances for caching

## Support

For Railway-specific issues, consult:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

For application-specific issues, check the main README.md file.
