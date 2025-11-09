# Architecture Documentation

## System Overview

TaskManager SaaS is built using a modern microservices-inspired architecture with clear separation of concerns. The system follows industry best practices for scalability, security, and maintainability.

## Architecture Principles

### 1. SOLID Principles
- **Single Responsibility**: Each module has one clear purpose
- **Open/Closed**: Extensible without modifying existing code
- **Liskov Substitution**: Interfaces are properly abstracted
- **Interface Segregation**: Minimal, focused interfaces
- **Dependency Inversion**: Depends on abstractions, not concretions

### 2. Clean Architecture
- **Layers**: Presentation → Application → Domain → Infrastructure
- **Dependency Rule**: Inner layers know nothing about outer layers
- **Domain-Centric**: Business logic is isolated and testable

### 3. Twelve-Factor App
- Configuration via environment variables
- Stateless processes
- Port binding for services
- Graceful shutdown handling
- Development/production parity

## System Components

### Frontend Layer
```
┌─────────────────────────────────────┐
│      Next.js Application            │
├─────────────────────────────────────┤
│  Pages & Routing                    │
│  ├─ Dashboard                       │
│  ├─ Tasks                           │
│  ├─ Projects                        │
│  └─ Authentication                  │
├─────────────────────────────────────┤
│  Components                         │
│  ├─ Common (Button, Input, Modal)  │
│  ├─ Task Components                 │
│  └─ Project Components              │
├─────────────────────────────────────┤
│  State Management                   │
│  ├─ Context API                     │
│  └─ Local State                     │
├─────────────────────────────────────┤
│  Services                           │
│  ├─ API Client (Axios)              │
│  ├─ WebSocket Client                │
│  └─ Authentication Service          │
└─────────────────────────────────────┘
```

### Backend Layer
```
┌─────────────────────────────────────┐
│      Express Application            │
├─────────────────────────────────────┤
│  Middleware Layer                   │
│  ├─ Authentication                  │
│  ├─ Authorization                   │
│  ├─ Rate Limiting                   │
│  ├─ Request Validation              │
│  └─ Error Handling                  │
├─────────────────────────────────────┤
│  API Layer                          │
│  ├─ REST Controllers                │
│  ├─ GraphQL Resolvers               │
│  └─ WebSocket Handlers              │
├─────────────────────────────────────┤
│  Business Logic Layer               │
│  ├─ Auth Service                    │
│  ├─ Task Service                    │
│  ├─ Project Service                 │
│  └─ Notification Service            │
├─────────────────────────────────────┤
│  Data Access Layer                  │
│  ├─ Prisma ORM                      │
│  ├─ Database Repositories           │
│  └─ Cache Layer (Redis)             │
└─────────────────────────────────────┘
```

## Data Flow

### Request Flow (REST API)

```
User Request
    │
    ▼
┌─────────────┐
│   Nginx     │ (Load Balancer)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Middleware │
│   Stack     │
│  - Helmet   │
│  - CORS     │
│  - Rate Limit│
│  - Auth     │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Controller  │ (Request validation)
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Service    │ (Business logic)
└─────┬───────┘
      │
      ├──────────┐
      ▼          ▼
┌──────────┐  ┌─────────┐
│PostgreSQL│  │  Redis  │
└──────────┘  └─────────┘
      │
      ▼
   Response
```

### Real-time Data Flow (WebSocket)

```
Client connects
    │
    ▼
┌─────────────┐
│ Socket.io   │
│  Server     │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Room      │
│ Management  │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Event     │
│  Handlers   │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Broadcast  │
│  to Clients │
└─────────────┘
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────┐     ┌──────────────┐     ┌────────┐
│  User   │────<│ProjectMember │>────│Project │
└────┬────┘     └──────────────┘     └───┬────┘
     │                                     │
     │creates                              │contains
     │                                     │
     ▼                                     ▼
┌─────────┐                           ┌────────┐
│  Task   │───────has──────────────>  │ Label  │
└────┬────┘                           └────────┘
     │
     │has
     ▼
┌──────────┐
│ Comment  │
└──────────┘
     │has
     ▼
┌─────────────┐
│ Attachment  │
└─────────────┘
```

### Key Tables

**Users**
- Authentication and profile information
- Role-based access control
- Activity tracking

**Projects**
- Project metadata
- Team collaboration
- Access control

**Tasks**
- Task details and status
- Hierarchical structure (subtasks)
- Assignment and tracking

**Comments**
- Discussion threads
- User mentions
- Attachments

## Security Architecture

### Authentication Flow

```
1. User Login
   └─> Validate credentials
       └─> Generate JWT access token (15m)
           └─> Generate refresh token (7d)
               └─> Store refresh token in DB
                   └─> Return tokens to client

2. API Request
   └─> Extract Bearer token
       └─> Verify JWT signature
           └─> Check expiration
               └─> Validate user status
                   └─> Attach user to request

3. Token Refresh
   └─> Verify refresh token
       └─> Check DB for validity
           └─> Generate new token pair
               └─> Revoke old refresh token
```

### Authorization Layers

1. **Authentication**: JWT verification
2. **Role-Based Access**: USER, ADMIN, SUPER_ADMIN
3. **Resource Ownership**: User can only modify own resources
4. **Project Membership**: Access based on project role

### Security Measures

- Bcrypt password hashing (12 rounds)
- JWT with short expiration
- Refresh token rotation
- Rate limiting per endpoint
- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS protection (Helmet)
- CORS configuration
- Security headers
- Audit logging

## Caching Strategy

### Cache Layers

1. **Application Cache** (Redis)
   - Session data
   - User profiles
   - Frequently accessed data
   - TTL: 5-15 minutes

2. **Database Query Cache**
   - Read-heavy endpoints
   - Aggregated data
   - TTL: 1-5 minutes

3. **CDN Cache**
   - Static assets
   - Public resources
   - TTL: 1 day - 1 week

### Cache Invalidation

- **Time-based**: Automatic TTL expiration
- **Event-based**: Invalidate on updates/deletes
- **Pattern-based**: Clear related cache keys
- **Manual**: Admin cache flush

## Scalability Considerations

### Horizontal Scaling

- **Stateless Services**: All state in DB/Redis
- **Load Balancing**: Nginx/ALB distribution
- **Session Sharing**: Redis for session store
- **Database**: Read replicas for queries

### Vertical Scaling

- **Database**: Connection pooling (2-10 connections)
- **Redis**: In-memory optimization
- **Node.js**: Cluster mode for CPU utilization

### Performance Optimizations

1. **Database**
   - Indexed queries
   - Connection pooling
   - Query optimization
   - Prepared statements

2. **Application**
   - Response compression
   - Lazy loading
   - Pagination
   - Batch operations

3. **Network**
   - CDN for static assets
   - Response caching
   - Gzip compression

## Monitoring & Observability

### Metrics Collection

```
Application → Prometheus → Grafana
    ↓
   Logs
    ↓
 Winston → File/Console
```

### Key Metrics

- **Request Metrics**: Rate, duration, errors
- **Database Metrics**: Query time, connection pool
- **Cache Metrics**: Hit/miss ratio, evictions
- **Business Metrics**: Active users, tasks created

### Logging Levels

- **ERROR**: Critical failures
- **WARN**: Recoverable issues
- **INFO**: Important events
- **HTTP**: Request logs
- **DEBUG**: Detailed information

## Deployment Architecture

### Development
```
Docker Compose
├─ Backend (hot reload)
├─ Frontend (hot reload)
├─ PostgreSQL
├─ Redis
├─ Prometheus
└─ Grafana
```

### Production
```
Kubernetes Cluster
├─ Backend Pods (3+ replicas)
├─ Frontend Pods (3+ replicas)
├─ PostgreSQL (managed service)
├─ Redis (managed service)
├─ Ingress Controller
└─ Monitoring Stack
```

## Disaster Recovery

### Backup Strategy

- **Database**: Daily automated backups
- **Files**: S3/Cloud Storage with versioning
- **Configuration**: Infrastructure as Code (IaC)

### Recovery Procedures

1. Database restore from backup
2. Application redeployment
3. Cache warming
4. Health check verification

## Future Enhancements

- Microservices decomposition
- Message queue (RabbitMQ/Kafka)
- Event sourcing
- CQRS pattern
- Multi-region deployment
- Advanced analytics
- Machine learning integration
