# EvalPoint

A specialized educational learning platform development project focused on building scalable, accessible STEM education tools that serve both neurotypical and neurodivergent learners.

## Quick Start

### Prerequisites
- Node.js 16+
- Docker and Docker Compose
- Git

### Local Development Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd evalpoint
   cp .env.example .env
   ```

2. **Start the development environment**
   ```bash
   # Start all services (MongoDB, Backend, Redis, Admin tools)
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **View running services**
   - **Backend API**: http://localhost:5002
   - **MongoDB Admin**: http://localhost:8081 (admin/admin123)
   - **Health Check**: http://localhost:5002/api/health

### Testing Authentication System

The EvalPoint backend includes a complete authentication system designed for educational use with role-based access and compliance features. Here's how to test it:

**Required Fields for Registration:**
- `email`, `password`, `firstName`, `lastName` (always required)
- `role`: "student", "teacher", "admin", or "parent" (defaults to "student")
- `grade`: Required for students (K, 1-12, college, adult)
- `parentalConsent`: Required `true` for students in grades K-7

**1. Register a new user (Student example):**
```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "grade": "8",
    "parentalConsent": false
  }'
```

**1b. Register a teacher:**
```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "teacher"
  }'
```

**2. Login with the user:**
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**3. Use the JWT token from login response:**
```bash
# Save the token from login response
TOKEN="your_jwt_token_here"

# Get user profile (protected route)
curl -X GET http://localhost:5002/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Verify token is valid
curl -X GET http://localhost:5002/api/auth/verify-token \
  -H "Authorization: Bearer $TOKEN"
```

**4. Update user profile:**
```bash
curl -X PUT http://localhost:5002/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**5. Change password:**
```bash
curl -X PUT http://localhost:5002/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

**6. Logout:**
```bash
curl -X POST http://localhost:5002/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Responses:**
- **Register/Login**: Returns user data and JWT token
- **Profile**: Returns user information
- **Verify Token**: Returns token validation status
- **Protected routes**: Return 401 without valid token

### Available Commands

**Docker Development:**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View backend logs (with hot reload)
docker-compose -f docker-compose.dev.yml logs -f backend

# Restart specific service after code changes (if needed)
docker-compose -f docker-compose.dev.yml restart backend

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Production environment
docker-compose up -d
docker-compose down
```

**Running Tests:**
```bash
# Run tests in Docker container
docker-compose -f docker-compose.dev.yml exec backend npm test

# Run tests in watch mode
docker-compose -f docker-compose.dev.yml exec backend npm run test:watch
```

### Project Structure

```
evalpoint/
├── backend/           # Node.js/Express API server
│   ├── src/          # Source code
│   ├── package.json  # Dependencies
│   └── README.md     # Backend-specific docs
├── docker/           # Docker configurations
├── data/             # Database and file storage
├── logs/             # Application logs
└── docker-compose.*.yml  # Container orchestration
```

### Development Workflow

1. **Make changes** to backend code in `backend/src/`
2. **Hot reload** automatically restarts the Docker container
3. **Test your changes** at http://localhost:5002
4. **View logs** with `docker-compose -f docker-compose.dev.yml logs -f backend`
5. **Debug** using the exposed debug port 9229

### Database Management

- **MongoDB** runs on port 27018 (dev) / 27017 (prod)
- **Admin interface** at http://localhost:8081
- **Test database** on port 27019
- **Data persisted** in `./data/mongodb-dev/`

### Troubleshooting

**Services won't start:**
```bash
docker-compose -f docker-compose.dev.yml down
docker system prune -f
docker-compose -f docker-compose.dev.yml up -d
```

**Backend connection issues:**
```bash
# Check backend logs
docker-compose -f docker-compose.dev.yml logs backend

# Restart backend only
docker-compose -f docker-compose.dev.yml restart backend
```

**Database issues:**
```bash
# Check MongoDB logs
docker-compose -f docker-compose.dev.yml logs mongodb

# Reset development database
docker-compose -f docker-compose.dev.yml down
rm -rf ./data/mongodb-dev
docker-compose -f docker-compose.dev.yml up mongodb -d
```

## Project Goals

- Create inclusive educational technology platforms for STEM critical thinking development
- Build scalable, secure, and globally accessible learning systems
- Ensure equitable access to learning opportunities regardless of location or socioeconomic status
- Support both students and educators with comprehensive learning analytics and adaptive experiences

## Team Structure

### Engineering Team
- **Software Architect**: System design, technology selection, architectural patterns for educational platforms
- **Backend Engineer**: Scalable learning systems, Node.js/Python, databases, API design, microservices
- **Frontend Engineer**: Accessible educational interfaces, TypeScript/React/Next.js, interactive learning experiences
- **Infrastructure Engineer**: Cloud architecture, DevOps, security, global deployment for educational platforms
- **Machine Learning Engineer**: Educational AI, adaptive learning systems, knowledge tracing, ethical AI
- **Quality Engineer**: Accessibility testing, learning outcome validation, compliance verification
- **Documentation Specialist**: Educational content creation, teacher resources, accessibility documentation

### Planning Team
- **Product Manager**: Educational strategy, learning research, accessibility analysis, product roadmaps
- **Jira Task Specialist**: Agile project management, educational stakeholder coordination, accessibility-inclusive planning

### Subject Matter Experts
- **Learning Science Expert**: Cognitive psychology, educational research, evidence-based STEM pedagogy
- **Special Education Specialist**: Neurodivergent learning differences, inclusive education, assistive technology integration