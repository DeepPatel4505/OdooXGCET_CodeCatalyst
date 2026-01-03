# WorkZen HRMS - Backend API

A complete REST API backend for WorkZen HRMS built with Node.js, Express, PostgreSQL, and Prisma ORM.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 👥 Employee management with role-based access control
- ⏰ Attendance tracking (check-in/check-out)
- 📅 Leave management with approval workflow
- 💰 Payroll processing and payslip generation
- 📊 Dashboard statistics
- 📄 PDF payslip generation
- ✅ Input validation with Zod
- 🛡️ Security with Helmet and CORS

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Prisma ORM** - Database toolkit
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Schema validation
- **PDFKit** - PDF generation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Installation

1. Clone the repository and navigate to the Backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the Backend directory:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/workzen_hrms?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

5. Create PostgreSQL database:
```bash
createdb workzen_hrms
```

6. Generate Prisma Client:
```bash
npm run db:generate
```

7. Push database schema:
```bash
npm run db:push
```

8. Seed the database:
```bash
npm run db:seed
```

## Running the Server

### Development Mode
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Mode
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Employees
- `GET /api/employees` - Get list of employees
- `POST /api/employees` - Create new employee (admin/hr only)
- `POST /api/employees/import` - Import employees from CSV/Excel (admin/hr only)
- `GET /api/employees/export` - Export employees to CSV (admin/hr only)

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/today` - Get today's attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:leaveId/approve` - Approve leave (admin/hr/manager only)
- `PUT /api/leaves/:leaveId/reject` - Reject leave (admin/hr/manager only)

### Payroll
- `GET /api/payroll/payruns` - Get payruns (admin/hr only)
- `POST /api/payroll/payruns` - Create payrun (admin/hr only)
- `GET /api/payroll/payruns/:payrunId/preview` - Preview payrun (admin/hr only)
- `POST /api/payroll/payruns/:payrunId/process` - Process payrun (admin/hr only)

### Payslips
- `GET /api/payslips` - Get payslips
- `GET /api/payslips/:payslipId` - Get single payslip
- `GET /api/payslips/:payslipId/download` - Download payslip PDF

### Settings
- `GET /api/settings` - Get payroll settings (admin/hr only)
- `PUT /api/settings` - Update payroll settings (admin/hr only)

### Profile
- `PUT /api/profile` - Update user profile
- `PUT /api/profile/password` - Change password

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- **User** - User accounts with roles
- **Employee** - Employee records
- **Attendance** - Attendance tracking
- **Leave** - Leave requests
- **Payrun** - Payroll runs
- **Payslip** - Individual payslips
- **PayrollSettings** - Payroll configuration
- **RefreshToken** - Refresh token storage

## Role-Based Access Control

- **admin** - Full access to all endpoints
- **hr** - Access to HR management, payroll, settings
- **manager** - Access to team management, leave approval
- **employee** - Basic employee access (own data)

## Test Accounts

After seeding, you can use these test accounts:

- **Admin**: `admin@workzen.com` / `password123`
- **HR**: `hr@workzen.com` / `password123`
- **Manager**: `manager@workzen.com` / `password123`
- **Employee**: `employee@workzen.com` / `password123`

## API Response Format

All API responses follow this format:

### Success Response
```json
{
  "status": "success",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error message",
  "error": "Error type"
}
```

## Authentication

The API uses JWT Bearer tokens. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use the refresh token endpoint to get a new access token.

## Validation

All request bodies and query parameters are validated using Zod schemas. Invalid requests return a 400 status with validation errors.

## Error Handling

The API uses consistent error handling:
- 400 - Bad Request (validation errors)
- 401 - Unauthorized (authentication required)
- 403 - Forbidden (insufficient permissions)
- 404 - Not Found (resource not found)
- 500 - Internal Server Error

## Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

## Development

### Project Structure

```
Backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.js            # Database seed file
├── controllers/           # Route controllers
├── routes/                # Express routes
├── middleware/            # Express middleware
├── validations/           # Zod validation schemas
├── utils/                 # Utility functions
├── server.js              # Express app entry point
└── package.json
```

### Adding New Endpoints

1. Create validation schema in `validations/`
2. Create controller in `controllers/`
3. Create route in `routes/`
4. Register route in `server.js`

## Integration with Frontend

The backend is designed to work seamlessly with the frontend. The API contract is defined in:

- `Frontend/src/backendIntegration.js` - Machine-readable spec
- `Frontend/src/backend-integration.json` - JSON contract
- `Frontend/src/integration-tracker.md` - Status tracker

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Helmet for security headers
- CORS configured for frontend origin
- Input validation on all endpoints
- Role-based access control

## License

This project is part of the WorkZen HRMS application.

