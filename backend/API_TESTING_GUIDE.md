# EvalPoint Backend API Testing Guide

This guide provides examples for testing the authentication API endpoints using curl, Postman, or other API testing tools.

## Base URL
```
http://localhost:5000/api
```

## Authentication Endpoints

### 1. Health Check
Test if the server is running:

```bash
curl -X GET http://localhost:5000/api/health
```

### 2. API Information
Get API information and available endpoints:

```bash
curl -X GET http://localhost:5000/api/info
```

### 3. User Registration
Register a new student user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "student",
    "grade": "8",
    "parentalConsent": true,
    "accessibilityPreferences": {
      "screenReader": false,
      "highContrast": true,
      "fontSize": "large",
      "reduceMotion": false
    }
  }'
```

Register a teacher:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "TeacherPass123!",
    "firstName": "John",
    "lastName": "Smith",
    "role": "teacher"
  }'
```

### 4. User Login
Login with registered credentials:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!"
  }'
```

**Save the token from the response for authenticated requests!**

### 5. Get User Profile
Get current user profile (requires authentication):

```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 6. Update Profile
Update user profile information:

```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "firstName": "Jane Updated",
    "accessibilityPreferences": {
      "screenReader": true,
      "fontSize": "extra-large"
    }
  }'
```

### 7. Change Password
Change user password:

```bash
curl -X PUT http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass123!",
    "confirmPassword": "NewSecurePass123!"
  }'
```

### 8. Verify Token
Check if token is still valid:

```bash
curl -X GET http://localhost:5000/api/auth/verify-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 9. Logout
Logout user:

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## Testing with Postman

1. Create a new Postman collection called "EvalPoint Auth API"
2. Add the base URL as a collection variable: `{{baseUrl}} = http://localhost:5000/api`
3. Create requests for each endpoint above
4. For authenticated requests, add `Authorization` header with value `Bearer {{token}}`
5. Use a collection variable `{{token}}` and update it after successful login

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Educational Platform Features Tested

- **Role-based Registration**: Different user types (student, teacher, admin, parent)
- **Grade-level Support**: K-12, college, and adult education
- **COPPA Compliance**: Parental consent for students in grades K-7
- **Accessibility Support**: Screen reader, high contrast, font size preferences
- **Security**: Password hashing, JWT tokens, rate limiting
- **Validation**: Comprehensive input validation with educational context

## Testing Scenarios

1. **Valid Registration**: Test successful user registration with all required fields
2. **Invalid Registration**: Test validation errors for missing/invalid fields
3. **Duplicate Email**: Test registration with existing email
4. **Parental Consent**: Test young student registration without parental consent
5. **Login Success**: Test successful login with valid credentials
6. **Login Failure**: Test login with invalid credentials
7. **Token Validation**: Test protected routes with valid/invalid tokens
8. **Rate Limiting**: Test rate limiting by making multiple rapid requests
9. **Profile Updates**: Test updating user profile information
10. **Password Change**: Test password change functionality

## Rate Limiting Information

- **General Auth Routes**: 100 requests per 15 minutes
- **Login Attempts**: 5 attempts per 15 minutes
- **Registration**: 3 registrations per hour per IP

When rate limited, you'll receive a 429 status code with retry information.