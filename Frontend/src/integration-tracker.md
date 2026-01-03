# Dayflow HRMS - Backend Integration Tracker

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Status:** All endpoints mocked and ready for backend implementation

---

## 📊 Integration Status Overview

| Category | Total | ✅ Implemented | ⚠️ Mocked | ❌ Missing |
|----------|-------|---------------|-----------|-----------|
| **Authentication** | 4 | 4 | 0 | 0 |
| **Dashboard** | 1 | 1 | 0 | 0 |
| **Employees** | 2 | 2 | 0 | 0 |
| **Attendance** | 4 | 4 | 0 | 0 |
| **Leaves** | 4 | 4 | 0 | 0 |
| **Payroll** | 4 | 4 | 0 | 0 |
| **Payslips** | 3 | 3 | 0 | 0 |
| **Settings** | 2 | 2 | 0 | 0 |
| **Profile** | 1 | 1 | 0 | 0 |
| **TOTAL** | **25** | **25** | **0** | **0** |

---

## ✅ Implemented Endpoints

**All 25 endpoints are now fully implemented in the backend!**

The backend is built with:
- Node.js + Express.js
- PostgreSQL + Prisma ORM
- JWT authentication
- Zod validation
- PDF generation for payslips

See `Backend/README.md` for setup instructions.

---

## ✅ Implemented Endpoints (Backend Ready)

### Authentication Endpoints

#### 1. POST `/auth/login`
- **Status:** Implemented ✅
- **Description:** Authenticate user and get access token
- **Used In:** `src/pages/Login.jsx`, `src/store/auth.js`
- **Request:**
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response (200):**
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "admin|hr|manager|employee",
      "avatar": "string|null",
      "phone": "string|null",
      "department": "string|null",
      "position": "string|null",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  }
  ```
- **Error (401):**
  ```json
  {
    "message": "Invalid credentials",
    "error": "Unauthorized"
  }
  ```

#### 2. POST `/auth/logout`
- **Status:** Implemented ✅
- **Description:** Logout user and invalidate tokens
- **Used In:** `src/store/auth.js`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "success": true
  }
  ```

#### 3. POST `/auth/refresh`
- **Status:** Implemented ✅
- **Description:** Refresh access token using refresh token
- **Used In:** `src/lib/api.js` (interceptor)
- **Request:**
  ```json
  {
    "refreshToken": "string (required)"
  }
  ```
- **Response (200):**
  ```json
  {
    "accessToken": "string"
  }
  ```

#### 4. GET `/auth/me`
- **Status:** Implemented ✅
- **Description:** Get current authenticated user
- **Used In:** `src/store/auth.js`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "avatar": "string|null",
    "phone": "string|null",
    "department": "string|null",
    "position": "string|null",
    "createdAt": "string",
    "updatedAt": "string"
  }
  ```

---

### Dashboard Endpoints

#### 5. GET `/dashboard/stats`
- **Status:** Implemented ✅
- **Description:** Get dashboard statistics
- **Used In:** `src/pages/Dashboard.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "totalEmployees": 2,
    "presentToday": 1,
    "pendingLeaves": 1,
    "lastPayrunAmount": 160000,
    "lastPayrunDate": "2024-02-05T00:00:00Z"
  }
  ```

---

### Employee Endpoints

#### 6. GET `/employees`
- **Status:** Implemented ✅
- **Description:** Get list of all employees
- **Used In:** `src/pages/Employees.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Query Parameters:**
  - `search` (optional): Search term
  - `department` (optional): Filter by department
  - `status` (optional): Filter by status
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "employeeId": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string|null",
      "phone": "string|null",
      "department": "string",
      "position": "string",
      "status": "active|inactive|terminated",
      "hireDate": "string (ISO 8601)",
      "salary": 75000,
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
  ```

#### 7. POST `/employees`
- **Status:** Implemented ✅
- **Description:** Create a new employee
- **Used In:** `src/pages/Employees.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:**
  ```json
  {
    "firstName": "string (required)",
    "lastName": "string (required)",
    "email": "string (required, valid email)",
    "phone": "string (optional)",
    "department": "string (required)",
    "position": "string (required)",
    "salary": 75000,
    "hireDate": "string (required, ISO 8601)"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "employeeId": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "department": "string",
    "position": "string",
    "status": "active",
    "hireDate": "string",
    "salary": 75000,
    "createdAt": "string",
    "updatedAt": "string"
  }
  ```

---

### Attendance Endpoints

#### 8. GET `/attendance`
- **Status:** Implemented ✅
- **Description:** Get attendance records
- **Used In:** `src/pages/Attendance.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Query Parameters:**
  - `startDate` (optional): Start date (ISO 8601)
  - `endDate` (optional): End date (ISO 8601)
  - `employeeId` (optional): Filter by employee
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "employeeId": "string",
      "employeeName": "string",
      "date": "string (ISO 8601)",
      "checkIn": "string (ISO 8601)|null",
      "checkOut": "string (ISO 8601)|null",
      "hoursWorked": 8,
      "status": "present|absent|late|half-day",
      "notes": "string|null",
      "createdAt": "string"
    }
  ]
  ```

#### 9. GET `/attendance/today`
- **Status:** Implemented ✅
- **Description:** Get today's attendance for current user
- **Used In:** `src/pages/Attendance.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "id": "string",
    "employeeId": "string",
    "employeeName": "string",
    "date": "string (ISO 8601)",
    "checkIn": "string (ISO 8601)|null",
    "checkOut": "string (ISO 8601)|null",
    "hoursWorked": 8,
    "status": "present",
    "createdAt": "string"
  }
  ```
- **Response (404):** If no attendance record found for today

#### 10. POST `/attendance/check-in`
- **Status:** Implemented ✅
- **Description:** Mark check-in for today
- **Used In:** `src/pages/Attendance.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (201):**
  ```json
  {
    "id": "string",
    "employeeId": "string",
    "employeeName": "string",
    "date": "string (ISO 8601)",
    "checkIn": "string (ISO 8601)",
    "status": "present",
    "createdAt": "string"
  }
  ```

#### 11. POST `/attendance/check-out`
- **Status:** Implemented ✅
- **Description:** Mark check-out for today
- **Used In:** `src/pages/Attendance.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "id": "string",
    "employeeId": "string",
    "employeeName": "string",
    "date": "string (ISO 8601)",
    "checkIn": "string (ISO 8601)",
    "checkOut": "string (ISO 8601)",
    "hoursWorked": 8,
    "status": "present",
    "createdAt": "string"
  }
  ```

---

### Leave Endpoints

#### 12. GET `/leaves`
- **Status:** Implemented ✅
- **Description:** Get leave requests (filtered by user role)
- **Used In:** `src/pages/Leaves.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Query Parameters:**
  - `status` (optional): Filter by status (pending|approved|rejected)
  - `employeeId` (optional): Filter by employee
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "employeeId": "string",
      "employeeName": "string",
      "type": "sick|vacation|personal|unpaid",
      "startDate": "string (ISO 8601)",
      "endDate": "string (ISO 8601)",
      "days": 5,
      "reason": "string",
      "status": "pending|approved|rejected|cancelled",
      "approvedBy": "string|null",
      "approvedAt": "string (ISO 8601)|null",
      "rejectionReason": "string|null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
  ```

#### 13. POST `/leaves`
- **Status:** Implemented ✅
- **Description:** Create a new leave request
- **Used In:** `src/pages/Leaves.jsx`
- **Request:**
  ```json
  {
    "type": "sick|vacation|personal|unpaid",
    "startDate": "string (required, ISO 8601)",
    "endDate": "string (required, ISO 8601)",
    "days": 5,
    "reason": "string (required)"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "employeeId": "string",
    "employeeName": "string",
    "type": "string",
    "startDate": "string",
    "endDate": "string",
    "days": 5,
    "reason": "string",
    "status": "pending",
    "createdAt": "string",
    "updatedAt": "string"
  }
  ```

#### 14. PUT `/leaves/{leaveId}/approve`
- **Status:** Implemented ✅
- **Description:** Approve a leave request (admin/hr/manager only)
- **Used In:** `src/pages/Leaves.jsx`
- **Required Roles:** `admin`, `hr`, `manager`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Path Parameters:**
  - `leaveId` (required): Leave ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "status": "approved",
    "approvedBy": "string",
    "approvedAt": "string (ISO 8601)",
    "updatedAt": "string"
  }
  ```

#### 15. PUT `/leaves/{leaveId}/reject`
- **Status:** Implemented ✅
- **Description:** Reject a leave request (admin/hr/manager only)
- **Used In:** `src/pages/Leaves.jsx`
- **Required Roles:** `admin`, `hr`, `manager`
- **Request:**
  ```json
  {
    "rejectionReason": "string (optional)"
  }
  ```
- **Path Parameters:**
  - `leaveId` (required): Leave ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "status": "rejected",
    "rejectionReason": "string|null",
    "updatedAt": "string"
  }
  ```

---

### Payroll Endpoints

#### 16. GET `/payroll/payruns`
- **Status:** Implemented ✅
- **Description:** Get list of all payruns
- **Used In:** `src/pages/Payroll.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "name": "string",
      "payPeriodStart": "string (ISO 8601)",
      "payPeriodEnd": "string (ISO 8601)",
      "payDate": "string (ISO 8601)",
      "status": "draft|processing|completed|failed",
      "totalEmployees": 2,
      "totalAmount": 160000,
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
  ```

#### 17. POST `/payroll/payruns`
- **Status:** Implemented ✅
- **Description:** Create a new payrun
- **Used In:** `src/pages/Payroll.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:**
  ```json
  {
    "name": "string (required)",
    "payPeriodStart": "string (required, ISO 8601)",
    "payPeriodEnd": "string (required, ISO 8601)",
    "payDate": "string (required, ISO 8601)"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "name": "string",
    "payPeriodStart": "string",
    "payPeriodEnd": "string",
    "payDate": "string",
    "status": "draft",
    "totalEmployees": 0,
    "totalAmount": 0,
    "createdAt": "string",
    "updatedAt": "string"
  }
  ```

#### 18. GET `/payroll/payruns/{payrunId}/preview`
- **Status:** Implemented ✅
- **Description:** Preview payrun with computed payslips
- **Used In:** `src/pages/Payroll.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Path Parameters:**
  - `payrunId` (required): Payrun ID
- **Response (200):**
  ```json
  {
    "payrun": {
      "id": "string",
      "name": "string",
      "payPeriodStart": "string",
      "payPeriodEnd": "string",
      "payDate": "string",
      "status": "string",
      "totalEmployees": 2,
      "totalAmount": 160000
    },
    "payslips": [
      {
        "id": "string",
        "employeeId": "string",
        "employeeName": "string",
        "grossPay": 82000,
        "totalDeductions": 18000,
        "netPay": 64000
      }
    ]
  }
  ```

#### 19. POST `/payroll/payruns/{payrunId}/process`
- **Status:** Implemented ✅
- **Description:** Process a payrun (generate payslips)
- **Used In:** `src/pages/Payroll.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Path Parameters:**
  - `payrunId` (required): Payrun ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "status": "completed",
    "totalEmployees": 2,
    "totalAmount": 160000,
    "updatedAt": "string"
  }
  ```

---

### Payslip Endpoints

#### 20. GET `/payslips`
- **Status:** Implemented ✅
- **Description:** Get list of payslips (filtered by user role)
- **Used In:** `src/pages/Payslips.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Query Parameters:**
  - `payrunId` (optional): Filter by payrun
  - `employeeId` (optional): Filter by employee
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "employeeId": "string",
      "employeeName": "string",
      "payrunId": "string",
      "payPeriodStart": "string (ISO 8601)",
      "payPeriodEnd": "string (ISO 8601)",
      "payDate": "string (ISO 8601)",
      "earnings": {
        "baseSalary": 75000,
        "overtime": 0,
        "bonus": 5000,
        "allowances": 2000
      },
      "deductions": {
        "tax": 15000,
        "insurance": 3000,
        "other": 0
      },
      "grossPay": 82000,
      "totalDeductions": 18000,
      "netPay": 64000,
      "createdAt": "string"
    }
  ]
  ```

#### 21. GET `/payslips/{payslipId}`
- **Status:** Implemented ✅
- **Description:** Get a specific payslip
- **Used In:** `src/pages/Payslips.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Path Parameters:**
  - `payslipId` (required): Payslip ID
- **Response (200):** Same as GET `/payslips` single item

#### 22. GET `/payslips/{payslipId}/download`
- **Status:** Implemented ✅
- **Description:** Download payslip as PDF
- **Used In:** `src/pages/Payslips.jsx`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Path Parameters:**
  - `payslipId` (required): Payslip ID
- **Response (200):**
  - **Content-Type:** `application/pdf`
  - **Content-Disposition:** `attachment; filename=payslip-{payslipId}.pdf`
  - **Body:** PDF file (binary)

---

### Settings Endpoints

#### 23. GET `/settings`
- **Status:** Implemented ✅
- **Description:** Get payroll settings (admin/hr only)
- **Used In:** `src/pages/Settings.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:** Requires `Authorization: Bearer {token}` header
- **Response (200):**
  ```json
  {
    "taxRate": 18.5,
    "insuranceRate": 3.5,
    "payPeriodDays": 30
  }
  ```

#### 24. PUT `/settings`
- **Status:** Implemented ✅
- **Description:** Update payroll settings (admin/hr only)
- **Used In:** `src/pages/Settings.jsx`
- **Required Roles:** `admin`, `hr`
- **Request:**
  ```json
  {
    "taxRate": 18.5,
    "insuranceRate": 3.5,
    "payPeriodDays": 30
  }
  ```
- **Response (200):**
  ```json
  {
    "taxRate": 18.5,
    "insuranceRate": 3.5,
    "payPeriodDays": 30
  }
  ```

---

### Profile Endpoints

#### 25. PUT `/profile`
- **Status:** Implemented ✅
- **Description:** Update user profile
- **Used In:** `src/pages/Profile.jsx`
- **Request:**
  ```json
  {
    "firstName": "string (required)",
    "lastName": "string (required)",
    "email": "string (required, valid email)",
    "phone": "string (optional)"
  }
  ```
- **Response (200):**
  ```json
  {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string|null",
    "updatedAt": "string"
  }
  ```

---

## ❌ Missing Endpoints

*No missing endpoints. All 25 endpoints are fully implemented in the backend.*

---

## 🔐 Authentication & Authorization

### Authentication Method
- **Type:** JWT Bearer Token
- **Header:** `Authorization: Bearer {accessToken}`
- **Token Storage:** localStorage (`accessToken`, `refreshToken`)

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **admin** | Full access to all endpoints |
| **hr** | Access to HR management, payroll, settings |
| **manager** | Access to team management, leave approval |
| **employee** | Basic employee access (own data) |

### Protected Endpoints by Role

- **Admin/HR Only:**
  - `POST /employees` - Create employee
  - `GET /payroll/payruns` - List payruns
  - `POST /payroll/payruns` - Create payrun
  - `GET /payroll/payruns/{id}/preview` - Preview payrun
  - `POST /payroll/payruns/{id}/process` - Process payrun
  - `GET /settings` - Get settings
  - `PUT /settings` - Update settings

- **Admin/HR/Manager Only:**
  - `PUT /leaves/{id}/approve` - Approve leave
  - `PUT /leaves/{id}/reject` - Reject leave

---

## 📝 Backend TODO List

### High Priority
1. ✅ **Authentication System**
   - [ ] Implement JWT token generation and validation
   - [ ] Implement refresh token mechanism
   - [ ] Implement password hashing (bcrypt)
   - [ ] Implement role-based access control middleware

2. ✅ **User Management**
   - [ ] Implement user CRUD operations
   - [ ] Implement employee creation with auto-generated employeeId
   - [ ] Implement user profile update

3. ✅ **Attendance System**
   - [ ] Implement check-in/check-out logic
   - [ ] Implement hours calculation
   - [ ] Implement attendance history with filters
   - [ ] Implement late detection logic

4. ✅ **Leave Management**
   - [ ] Implement leave request creation
   - [ ] Implement leave approval/rejection workflow
   - [ ] Implement leave balance calculation
   - [ ] Implement leave history

### Medium Priority
5. ✅ **Payroll System**
   - [ ] Implement payrun creation
   - [ ] Implement payslip calculation (earnings, deductions)
   - [ ] Implement payrun processing
   - [ ] Implement payroll settings management

6. ✅ **Dashboard**
   - [ ] Implement dashboard statistics aggregation
   - [ ] Implement real-time metrics

### Low Priority
7. ✅ **Payslip Generation**
   - [ ] Implement PDF generation for payslips
   - [ ] Implement payslip download endpoint

8. ✅ **Additional Features**
   - [ ] Implement email notifications
   - [ ] Implement file uploads (avatars, documents)
   - [ ] Implement audit logging

---

## 🔄 Changelog

### Version 1.0.0 (2024-01-15)
- Initial integration specification
- All 25 endpoints defined and mocked
- Complete type definitions
- Role-based access control specification

### Version 1.1.0 (2024-01-15)
- ✅ Backend implementation completed
- ✅ All 25 endpoints fully implemented
- ✅ PostgreSQL + Prisma ORM integration
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control
- ✅ Zod validation on all endpoints
- ✅ PDF payslip generation
- ✅ Database seed file with test data

---

## 📚 Additional Notes

### API Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** To be configured

### Error Responses
All endpoints should return consistent error responses:

```json
{
  "message": "Error message",
  "error": "Error type",
  "statusCode": 400
}
```

### Date Formats
- All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2024-01-15T10:30:00Z`

### Pagination
- List endpoints should support pagination (if needed):
  - Query parameters: `page`, `limit`
  - Response should include: `data`, `total`, `page`, `limit`

### Validation
- All required fields should be validated
- Email addresses should be validated
- Dates should be validated
- Numbers should be validated (min/max ranges)

---

## 🤝 Integration Instructions

### For Backend Developers

1. **Review the Specification**
   - Read `src/backend-integration.json` for machine-readable spec
   - Read this file (`integration-tracker.md`) for human-readable details

2. **Implement Endpoints**
   - Follow the exact request/response formats specified
   - Implement proper authentication and authorization
   - Return consistent error responses

3. **Test with Frontend**
   - Set `VITE_USE_MOCK=false` in frontend `.env`
   - Test all endpoints with the frontend application
   - Verify role-based access control

4. **Update Status**
   - Mark endpoints as implemented in this tracker
   - Update version number when making changes

### For Frontend Developers

1. **Use Mock Mode**
   - Set `VITE_USE_MOCK=true` in `.env` for development
   - All API calls will use mock responses

2. **Switch to Backend**
   - Set `VITE_USE_MOCK=false` when backend is ready
   - Update `VITE_API_BASE_URL` to point to backend

3. **Report Issues**
   - If backend response doesn't match spec, report it
   - Update this tracker if new endpoints are needed

---

## 📞 Contact

For questions or issues regarding backend integration:
- **Frontend Team:** Dayflow HRMS Frontend Team
- **Backend Team:** Dayflow HRMS Backend Team
- **Documentation:** See `src/backend-integration.json` for complete API contract

