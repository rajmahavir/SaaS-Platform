# TaskManager SaaS Platform

A comprehensive, enterprise-grade task management SaaS platform built with modern technologies and best practices. Features a full-stack TypeScript implementation with Next.js frontend, Express backend, PostgreSQL database, Redis caching, real-time WebSocket updates, and complete CI/CD pipeline.

## 🚀 Features

### Core Functionality
- **User Management**: Complete authentication system with JWT, password reset, and session management
- **Task Management**: Full CRUD operations with advanced filtering, searching, and sorting
- **Project Organization**: Multi-project support with role-based access control
- **Real-time Updates**: WebSocket integration for live task updates
- **File Attachments**: Support for task attachments with cloud storage
- **Comments & Collaboration**: Rich commenting system with mentions
- **Labels & Tags**: Flexible categorization system
- **Notifications**: Real-time and email notifications

### Technical Features
- **RESTful API**: Complete REST API with OpenAPI/Swagger documentation
- **GraphQL API**: Alternative GraphQL endpoint for flexible queries
- **Authentication**: JWT-based auth with refresh tokens and API keys
- **Caching**: Redis-based caching for improved performance
- **Rate Limiting**: Comprehensive rate limiting to prevent abuse
- **Security**: Helmet, CORS, input validation, SQL injection prevention
- **Logging**: Structured logging with Winston and daily rotation
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Testing**: 80%+ test coverage with unit, integration, and E2E tests
- **CI/CD**: Automated testing, building, and deployment pipeline
- **Docker**: Complete containerization with Docker Compose
- **Database Migrations**: Prisma-based schema management

## 📋 Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 🏗️ Architecture

### System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Next.js   │────▶│   Express    │────▶│  PostgreSQL   │
│  Frontend   │     │   Backend    │     │   Database    │
└─────────────┘     └──────────────┘     └───────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
            ┌───────▼──────┐  ┌──────▼────────┐
            │    Redis     │  │   WebSocket   │
            │    Cache     │  │    Server     │
            └──────────────┘  └───────────────┘
```

### Component Breakdown

#### Backend (Node.js/Express/TypeScript)
- **API Layer**: RESTful and GraphQL endpoints
- **Service Layer**: Business logic and data processing
- **Data Layer**: Prisma ORM with PostgreSQL
- **Cache Layer**: Redis for performance optimization
- **WebSocket Layer**: Real-time communication
- **Queue System**: Bull for background jobs

#### Frontend (Next.js/React/TypeScript)
- **Pages**: Next.js routing and SSR/SSG
- **Components**: Reusable React components
- **State Management**: Context API / Redux
- **API Client**: Axios with interceptors
- **Real-time**: Socket.io client

#### Infrastructure
- **Database**: PostgreSQL 15 with connection pooling
- **Cache**: Redis 7 for session and data caching
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston with daily file rotation
- **Container**: Docker and Docker Compose

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15
- **ORM**: Prisma 5.x
- **Cache**: Redis 7
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator, Joi, Zod
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest
- **Logging**: Winston
- **Monitoring**: Prometheus, prom-client

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript 5.x
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Context API / Zustand
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **WebSocket**: Socket.io-client
- **Testing**: Jest, React Testing Library, Playwright

### DevOps
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Orchestration**: Kubernetes (optional)
- **Monitoring**: Prometheus, Grafana
- **Cloud**: AWS/GCP/Azure compatible

## ✅ Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v15.0 or higher
- **Redis**: v7.0 or higher
- **Docker**: v24.0 or higher (optional)
- **Docker Compose**: v2.0 or higher (optional)

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Test01
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database (optional)
npm run seed
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

## ⚙️ Configuration

### Backend Environment Variables

```env
# Application
NODE_ENV=development
PORT=5000
API_VERSION=v1
APP_NAME=TaskManager SaaS
APP_URL=http://localhost:3000
API_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://taskmanager:taskmanager@localhost:5432/taskmanager

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

See `.env.example` for complete configuration options.

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5001
NEXT_PUBLIC_APP_NAME=TaskManager
```

## 🚀 Running the Application

### Development Mode

#### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

#### Manual Setup

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Production Mode

```bash
# Build backend
cd backend
npm run build
npm start

# Build frontend
cd frontend
npm run build
npm start
```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

## 📚 API Documentation

### REST API

Access Swagger documentation at:
- Development: `http://localhost:5000/api/v1/docs`
- Production: `https://your-domain.com/api/v1/docs`

### GraphQL API

Access GraphQL Playground at:
- Development: `http://localhost:5000/graphql`

### Key Endpoints

```
Authentication:
POST   /api/v1/auth/register       - Register new user
POST   /api/v1/auth/login          - Login user
POST   /api/v1/auth/refresh        - Refresh access token
POST   /api/v1/auth/logout         - Logout user
GET    /api/v1/auth/me             - Get current user

Tasks:
POST   /api/v1/tasks               - Create task
GET    /api/v1/tasks               - Get all tasks
GET    /api/v1/tasks/:id           - Get task by ID
PATCH  /api/v1/tasks/:id           - Update task
DELETE /api/v1/tasks/:id           - Delete task

Projects:
POST   /api/v1/projects            - Create project
GET    /api/v1/projects            - Get all projects
GET    /api/v1/projects/:id        - Get project by ID
PATCH  /api/v1/projects/:id        - Update project
DELETE /api/v1/projects/:id        - Delete project
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/taskmanager-backend
```

### Cloud Deployment

See deployment documentation in `docs/deployment/` for specific cloud platforms:
- AWS (ECS, EKS, Elastic Beanstalk)
- GCP (Cloud Run, GKE)
- Azure (Container Instances, AKS)

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus at `http://localhost:9090`

Available metrics:
- HTTP request duration
- Request rate
- Error rate
- Database query performance
- Cache hit/miss ratio
- Active WebSocket connections
- System resources (CPU, memory)

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (default: admin/admin)

Pre-configured dashboards:
- Application Overview
- API Performance
- Database Metrics
- Cache Performance
- System Resources
- Error Tracking

### Logging

Logs are stored in:
- Development: Console output
- Production: `logs/application-{date}.log`

Log levels: error, warn, info, http, debug

## 🔒 Security

### Implemented Security Measures

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Password**: Bcrypt hashing with configurable rounds
- **Input Validation**: express-validator, Joi schemas
- **SQL Injection**: Prisma ORM parameterized queries
- **XSS Protection**: Helmet middleware
- **CSRF Protection**: CSRF tokens for state-changing operations
- **Rate Limiting**: Per-endpoint rate limits
- **CORS**: Configurable origin whitelist
- **Security Headers**: Helmet for security headers
- **Dependency Scanning**: Automated npm audit
- **Container Scanning**: Trivy vulnerability scanner

### Security Best Practices

1. Change default secrets in production
2. Use environment variables for sensitive data
3. Enable HTTPS in production
4. Implement proper CORS policies
5. Regular dependency updates
6. Monitor security advisories
7. Implement proper logging and monitoring
8. Regular security audits

## 📖 Additional Documentation

- [Architecture Documentation](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [Security Guide](docs/security/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **rajmahavir** - *Initial work*

## 🙏 Acknowledgments

- Built with best practices from enterprise applications
- Inspired by modern SaaS architectures
- Community contributions and feedback

## 📞 Support

For support, email support@taskmanager.com or open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**
