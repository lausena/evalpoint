# EvalPoint Educational Platform Backend

A professionally structured Node.js/Express backend for an educational platform with comprehensive authentication, educational role management, and accessibility features.

## Features

### Core Authentication
- **User Registration & Login** with email/password
- **JWT Token Management** with secure token generation
- **Password Security** using bcrypt with salt rounds
- **Role-Based Access Control** (student, teacher, admin, parent)

### Educational Platform Specific
- **Grade-Level Support** (K-12, college, adult education)
- **COPPA Compliance Ready** with parental consent tracking
- **Accessibility Features** (screen reader, high contrast, font size preferences)
- **Educational Role Management** with appropriate permissions

### Security & Performance
- **Rate Limiting** to prevent abuse
- **Input Validation** with comprehensive schemas
- **Error Handling** with educational-specific error codes
- **CORS Configuration** for educational tool integration
- **Security Headers** with Helmet.js

## Project Structure

```
backend/
├── src/
│   ├── controllers/          # Business logic
│   │   └── authController.js
│   ├── middleware/           # Custom middleware
│   │   ├── auth.js          # Authentication middleware
│   │   ├── validation.js    # Input validation
│   │   └── errorHandler.js  # Error handling
│   ├── models/              # Database models
│   │   └── User.js
│   ├── routes/              # API routes
│   │   ├── index.js
│   │   └── auth.js
│   ├── config/              # Configuration
│   │   └── database.js
│   └── server.js            # Express app setup
├── .env                     # Environment variables
├── .env.example            # Environment template
├── package.json            # Dependencies & scripts
├── API_TESTING_GUIDE.md    # API testing examples
└── README.md               # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation Steps

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB:**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or configure MONGODB_URI in .env for Atlas
   ```

5. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/evalpoint
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
SUPPORT_EMAIL=support@evalpoint.com
```

## API Endpoints

### Health & Info
- `GET /` - Root endpoint
- `GET /api/health` - Health check
- `GET /api/info` - API information

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)
- `GET /api/auth/verify-token` - Verify token validity (protected)
- `POST /api/auth/logout` - Logout user (protected)

## User Roles & Features

### Student Users
- Grade-level assignment (K-12, college, adult)
- Parental consent tracking for K-7 students
- Accessibility preferences
- Learning progress tracking ready

### Teacher Users
- Classroom management ready
- Student oversight capabilities
- Educational content access

### Admin Users
- Platform management capabilities
- User administration
- System monitoring access

### Parent Users
- Child account oversight for COPPA compliance
- Progress monitoring capabilities
- Communication features ready

## Educational Compliance Features

### COPPA Compliance
- Parental consent required for students in grades K-7
- Minimal data collection for young learners
- Secure data handling practices

### FERPA Ready
- Educational record privacy considerations
- Audit trail preparation
- Appropriate data access controls

### Accessibility Support
- Screen reader compatibility flags
- High contrast preferences
- Font size customization
- Motion reduction preferences

## Testing

### Using the API Testing Guide
See `API_TESTING_GUIDE.md` for detailed testing examples using curl and Postman.

### Quick Test
1. Start the server: `npm run dev`
2. Test health endpoint: `curl http://localhost:5000/api/health`
3. Register a user using examples in API_TESTING_GUIDE.md
4. Login and test protected endpoints

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "student",
    "grade": "8"
  }'
```

## Security Features

### Password Security
- bcrypt hashing with 12 salt rounds
- Password complexity requirements
- Secure password comparison

### JWT Tokens
- Secure token generation
- Configurable expiration
- Proper token validation
- Bearer token format

### Rate Limiting
- 100 requests per 15 minutes (general)
- 5 login attempts per 15 minutes
- 3 registrations per hour per IP

### Input Validation
- Comprehensive Joi schemas
- Educational context validation
- Sanitization and type checking

## Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (Jest configured)
- `npm run test:watch` - Run tests in watch mode

### Code Style
- Modern ES6+ JavaScript
- Async/await for asynchronous operations
- Comprehensive error handling
- Educational domain-specific naming

### Database Design
- MongoDB with Mongoose ODM
- Educational-specific user schema
- Proper indexing for performance
- Accessibility preference storage

## Future Enhancements

The backend is designed to support additional educational features:

- Email verification system
- Password reset functionality
- Learning analytics integration
- Real-time collaboration features
- Assessment and grading systems
- Parent-teacher communication
- Educational content management

## Support

For questions or issues:
- Check the API_TESTING_GUIDE.md for usage examples
- Review error codes in responses
- Check server logs for detailed error information
- Contact: support@evalpoint.com

## License

MIT License - see LICENSE file for details.