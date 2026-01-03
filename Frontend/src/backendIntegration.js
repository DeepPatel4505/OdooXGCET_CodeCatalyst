
import axios from 'axios'
import { toast } from 'sonner'
import { mockApi } from './mocks'

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} role - User role (admin|hr|manager|employee)
 * @property {string|null} avatar - Avatar URL
 * @property {string|null} phone - Phone number
 * @property {string|null} department - Department name
 * @property {string|null} position - Job position
 * @property {string} createdAt - Creation date (ISO 8601)
 * @property {string} updatedAt - Update date (ISO 8601)
 */

/**
 * @typedef {Object} Employee
 * @property {string} id - Employee ID
 * @property {string} employeeId - Employee number
 * @property {string} email - Email address
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} avatar - Avatar URL
 * @property {string|null} phone - Phone number
 * @property {string} department - Department name
 * @property {string} position - Job position
 * @property {string} status - Employment status (active|inactive|terminated)
 * @property {string} hireDate - Hire date (ISO 8601)
 * @property {number} salary - Base salary
 * @property {string} createdAt - Creation date (ISO 8601)
 * @property {string} updatedAt - Update date (ISO 8601)
 */

/**
 * @typedef {Object} Attendance
 * @property {string} id - Attendance ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {string} date - Attendance date (ISO 8601)
 * @property {string|null} checkIn - Check-in time (ISO 8601)
 * @property {string|null} checkOut - Check-out time (ISO 8601)
 * @property {number|null} hoursWorked - Hours worked
 * @property {string} status - Status (present|absent|late|half-day)
 * @property {string|null} notes - Additional notes
 * @property {string} createdAt - Creation date (ISO 8601)
 */

/**
 * @typedef {Object} Leave
 * @property {string} id - Leave ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {string} type - Leave type (sick|vacation|unpaid) - Note: vacation is displayed as "Casual Leave" in UI
 * @property {string} startDate - Start date (ISO 8601)
 * @property {string} endDate - End date (ISO 8601)
 * @property {number} days - Number of days
 * @property {string} reason - Leave reason
 * @property {string} status - Status (pending|approved|rejected|cancelled)
 * @property {string|null} approvedBy - Approver ID
 * @property {string|null} approvedAt - Approval date (ISO 8601)
 * @property {string|null} rejectionReason - Rejection reason
 * @property {string} createdAt - Creation date (ISO 8601)
 * @property {string} updatedAt - Update date (ISO 8601)
 */

/**
 * @typedef {Object} Payrun
 * @property {string} id - Payrun ID
 * @property {string} name - Payrun name
 * @property {string} payPeriodStart - Pay period start date (ISO 8601)
 * @property {string} payPeriodEnd - Pay period end date (ISO 8601)
 * @property {string} payDate - Pay date (ISO 8601)
 * @property {string} status - Status (draft|processing|completed|failed)
 * @property {number} totalEmployees - Total employees in payrun
 * @property {number} totalAmount - Total amount
 * @property {string} createdAt - Creation date (ISO 8601)
 * @property {string} updatedAt - Update date (ISO 8601)
 */

/**
 * @typedef {Object} Payslip
 * @property {string} id - Payslip ID
 * @property {string} employeeId - Employee ID
 * @property {string} employeeName - Employee name
 * @property {string} payrunId - Payrun ID
 * @property {string} payPeriodStart - Pay period start date (ISO 8601)
 * @property {string} payPeriodEnd - Pay period end date (ISO 8601)
 * @property {string} payDate - Pay date (ISO 8601)
 * @property {Object} earnings - Earnings breakdown
 * @property {number} earnings.baseSalary - Base salary
 * @property {number} [earnings.overtime] - Overtime pay
 * @property {number} [earnings.bonus] - Bonus
 * @property {number} [earnings.allowances] - Allowances
 * @property {Object} deductions - Deductions breakdown
 * @property {number} [deductions.tax] - Tax deduction
 * @property {number} [deductions.insurance] - Insurance deduction
 * @property {number} [deductions.other] - Other deductions
 * @property {number} grossPay - Gross pay
 * @property {number} totalDeductions - Total deductions
 * @property {number} netPay - Net pay
 * @property {string} createdAt - Creation date (ISO 8601)
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} totalEmployees - Total employees
 * @property {number} presentToday - Employees present today
 * @property {number} pendingLeaves - Pending leave requests
 * @property {number} lastPayrunAmount - Last payrun amount
 * @property {string|null} lastPayrunDate - Last payrun date (ISO 8601)
 */

/**
 * @typedef {Object} PayrollSettings
 * @property {number} taxRate - Tax rate percentage
 * @property {number} insuranceRate - Insurance rate percentage
 * @property {number} payPeriodDays - Pay period days
 */

// ============================================================================
// Backend Integration Specification
// ============================================================================

export const backendIntegrationSpec = {
  meta: {
    version: '1.0.0',
    lastUpdated: '2024-01-15T00:00:00Z',
    author: 'WorkZen HRMS Team',
    frontendVersion: '1.0.0',
  },
  baseUrl: 'http://localhost:3000/api',
  authentication: {
    type: 'JWT Bearer Token',
    header: 'Authorization: Bearer {accessToken}',
    tokenRefresh: {
      endpoint: '/auth/refresh',
      method: 'POST',
    },
  },
  endpoints: {
    // ========================================================================
    // Authentication Endpoints
    // ========================================================================
    auth: {
      login: {
        method: 'POST',
        path: '/auth/login',
        description: 'Authenticate user and get access token',
        requiresAuth: false,
        request: {
          body: {
            email: { type: 'string', required: true, description: 'User email' },
            password: { type: 'string', required: true, description: 'User password' },
          },
        },
        response: {
          success: {
            status: 200,
            body: {
              accessToken: { type: 'string', description: 'JWT access token' },
              refreshToken: { type: 'string', description: 'JWT refresh token' },
              user: { type: 'User', description: 'User object' },
            },
          },
          error: {
            status: 401,
            body: {
              message: { type: 'string', description: 'Error message' },
              error: { type: 'string', description: 'Error type' },
            },
          },
        },
        usedIn: ['src/pages/Login.jsx', 'src/store/auth.js'],
        mockStatus: 'implemented',
      },
      logout: {
        method: 'POST',
        path: '/auth/logout',
        description: 'Logout user and invalidate tokens',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: {
              success: { type: 'boolean', description: 'Logout success' },
            },
          },
        },
        usedIn: ['src/store/auth.js'],
        mockStatus: 'implemented',
      },
      refresh: {
        method: 'POST',
        path: '/auth/refresh',
        description: 'Refresh access token using refresh token',
        requiresAuth: false,
        request: {
          body: {
            refreshToken: { type: 'string', required: true, description: 'Refresh token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: {
              accessToken: { type: 'string', description: 'New access token' },
            },
          },
          error: {
            status: 401,
            body: {
              message: { type: 'string', description: 'Error message' },
            },
          },
        },
        usedIn: ['src/lib/api.js'],
        mockStatus: 'implemented',
      },
      me: {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current authenticated user',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'User', description: 'User object' },
          },
        },
        usedIn: ['src/store/auth.js'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Dashboard Endpoints
    // ========================================================================
    dashboard: {
      stats: {
        method: 'GET',
        path: '/dashboard/stats',
        description: 'Get dashboard statistics',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'DashboardStats', description: 'Dashboard statistics' },
          },
        },
        usedIn: ['src/pages/Dashboard.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Employee Endpoints
    // ========================================================================
    employees: {
      list: {
        method: 'GET',
        path: '/employees',
        description: 'Get list of all employees',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          query: {
            search: { type: 'string', required: false, description: 'Search term' },
            department: { type: 'string', required: false, description: 'Filter by department' },
            status: { type: 'string', required: false, description: 'Filter by status' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Array<Employee>', description: 'List of employees' },
          },
        },
        usedIn: ['src/pages/Employees.jsx'],
        mockStatus: 'implemented',
      },
      create: {
        method: 'POST',
        path: '/employees',
        description: 'Create a new employee',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          body: {
            firstName: { type: 'string', required: true, description: 'First name' },
            lastName: { type: 'string', required: true, description: 'Last name' },
            email: { type: 'string', required: true, description: 'Email address' },
            phone: { type: 'string', required: false, description: 'Phone number' },
            department: { type: 'string', required: true, description: 'Department' },
            position: { type: 'string', required: true, description: 'Position' },
            salary: { type: 'number', required: true, description: 'Base salary' },
            hireDate: { type: 'string', required: true, description: 'Hire date (ISO 8601)' },
          },
        },
        response: {
          success: {
            status: 201,
            body: { type: 'Employee', description: 'Created employee' },
          },
        },
        usedIn: ['src/pages/Employees.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Attendance Endpoints
    // ========================================================================
    attendance: {
      list: {
        method: 'GET',
        path: '/attendance',
        description: 'Get attendance records',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          query: {
            startDate: { type: 'string', required: false, description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', required: false, description: 'End date (ISO 8601)' },
            employeeId: { type: 'string', required: false, description: 'Filter by employee' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Array<Attendance>', description: 'List of attendance records' },
          },
        },
        usedIn: ['src/pages/Attendance.jsx'],
        mockStatus: 'implemented',
      },
      today: {
        method: 'GET',
        path: '/attendance/today',
        description: "Get today's attendance for current user",
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Attendance', description: "Today's attendance record" },
          },
          notFound: {
            status: 404,
            body: {
              message: { type: 'string', description: 'No attendance record found for today' },
            },
          },
        },
        usedIn: ['src/pages/Attendance.jsx'],
        mockStatus: 'implemented',
      },
      checkIn: {
        method: 'POST',
        path: '/attendance/check-in',
        description: 'Mark check-in for today',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 201,
            body: { type: 'Attendance', description: 'Created attendance record' },
          },
        },
        usedIn: ['src/pages/Attendance.jsx'],
        mockStatus: 'implemented',
      },
      checkOut: {
        method: 'POST',
        path: '/attendance/check-out',
        description: 'Mark check-out for today',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Attendance', description: 'Updated attendance record' },
          },
        },
        usedIn: ['src/pages/Attendance.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Leave Endpoints
    // ========================================================================
    leaves: {
      list: {
        method: 'GET',
        path: '/leaves',
        description: 'Get leave requests (filtered by user role)',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          query: {
            status: { type: 'string', required: false, description: 'Filter by status' },
            employeeId: { type: 'string', required: false, description: 'Filter by employee' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Array<Leave>', description: 'List of leave requests' },
          },
        },
        usedIn: ['src/pages/Leaves.jsx'],
        mockStatus: 'implemented',
      },
      create: {
        method: 'POST',
        path: '/leaves',
        description: 'Create a new leave request',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          body: {
            type: { type: 'string', required: true, description: 'Leave type (sick|vacation|unpaid) - Note: vacation is displayed as "Casual Leave" in UI' },
            startDate: { type: 'string', required: true, description: 'Start date (ISO 8601)' },
            endDate: { type: 'string', required: true, description: 'End date (ISO 8601)' },
            days: { type: 'number', required: true, description: 'Number of days' },
            reason: { type: 'string', required: true, description: 'Leave reason' },
          },
        },
        response: {
          success: {
            status: 201,
            body: { type: 'Leave', description: 'Created leave request' },
          },
        },
        usedIn: ['src/pages/Leaves.jsx'],
        mockStatus: 'implemented',
      },
      approve: {
        method: 'PUT',
        path: '/leaves/{leaveId}/approve',
        description: 'Approve a leave request (admin/hr/manager only)',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr', 'manager'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            leaveId: { type: 'string', required: true, description: 'Leave ID' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Leave', description: 'Approved leave request' },
          },
        },
        usedIn: ['src/pages/Leaves.jsx'],
        mockStatus: 'implemented',
      },
      reject: {
        method: 'PUT',
        path: '/leaves/{leaveId}/reject',
        description: 'Reject a leave request (admin/hr/manager only)',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr', 'manager'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            leaveId: { type: 'string', required: true, description: 'Leave ID' },
          },
          body: {
            rejectionReason: { type: 'string', required: false, description: 'Rejection reason' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Leave', description: 'Rejected leave request' },
          },
        },
        usedIn: ['src/pages/Leaves.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Payroll Endpoints
    // ========================================================================
    payroll: {
      listPayruns: {
        method: 'GET',
        path: '/payroll/payruns',
        description: 'Get list of all payruns',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Array<Payrun>', description: 'List of payruns' },
          },
        },
        usedIn: ['src/pages/Payroll.jsx'],
        mockStatus: 'implemented',
      },
      createPayrun: {
        method: 'POST',
        path: '/payroll/payruns',
        description: 'Create a new payrun',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          body: {
            name: { type: 'string', required: true, description: 'Payrun name' },
            payPeriodStart: { type: 'string', required: true, description: 'Pay period start (ISO 8601)' },
            payPeriodEnd: { type: 'string', required: true, description: 'Pay period end (ISO 8601)' },
            payDate: { type: 'string', required: true, description: 'Pay date (ISO 8601)' },
          },
        },
        response: {
          success: {
            status: 201,
            body: { type: 'Payrun', description: 'Created payrun' },
          },
        },
        usedIn: ['src/pages/Payroll.jsx'],
        mockStatus: 'implemented',
      },
      previewPayrun: {
        method: 'GET',
        path: '/payroll/payruns/{payrunId}/preview',
        description: 'Preview payrun with computed payslips',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            payrunId: { type: 'string', required: true, description: 'Payrun ID' },
          },
        },
        response: {
          success: {
            status: 200,
            body: {
              payrun: { type: 'Payrun', description: 'Payrun object' },
              payslips: { type: 'Array<Payslip>', description: 'Preview payslips' },
            },
          },
        },
        usedIn: ['src/pages/Payroll.jsx'],
        mockStatus: 'implemented',
      },
      processPayrun: {
        method: 'POST',
        path: '/payroll/payruns/{payrunId}/process',
        description: 'Process a payrun (generate payslips)',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            payrunId: { type: 'string', required: true, description: 'Payrun ID' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Payrun', description: 'Processed payrun' },
          },
        },
        usedIn: ['src/pages/Payroll.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Payslip Endpoints
    // ========================================================================
    payslips: {
      list: {
        method: 'GET',
        path: '/payslips',
        description: 'Get list of payslips (filtered by user role)',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          query: {
            payrunId: { type: 'string', required: false, description: 'Filter by payrun' },
            employeeId: { type: 'string', required: false, description: 'Filter by employee' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Array<Payslip>', description: 'List of payslips' },
          },
        },
        usedIn: ['src/pages/Payslips.jsx'],
        mockStatus: 'implemented',
      },
      get: {
        method: 'GET',
        path: '/payslips/{payslipId}',
        description: 'Get a specific payslip',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            payslipId: { type: 'string', required: true, description: 'Payslip ID' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Payslip', description: 'Payslip object' },
          },
        },
        usedIn: ['src/pages/Payslips.jsx'],
        mockStatus: 'implemented',
      },
      download: {
        method: 'GET',
        path: '/payslips/{payslipId}/download',
        description: 'Download payslip as PDF',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          pathParams: {
            payslipId: { type: 'string', required: true, description: 'Payslip ID' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'Blob', description: 'PDF file (binary)' },
            headers: {
              'Content-Type': { type: 'string', description: 'application/pdf' },
              'Content-Disposition': { type: 'string', description: 'attachment; filename=payslip-{payslipId}.pdf' },
            },
          },
        },
        usedIn: ['src/pages/Payslips.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Settings Endpoints
    // ========================================================================
    settings: {
      get: {
        method: 'GET',
        path: '/settings',
        description: 'Get payroll settings (admin/hr only)',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'PayrollSettings', description: 'Payroll settings' },
          },
        },
        usedIn: ['src/pages/Settings.jsx'],
        mockStatus: 'implemented',
      },
      update: {
        method: 'PUT',
        path: '/settings',
        description: 'Update payroll settings (admin/hr only)',
        requiresAuth: true,
        requiredRoles: ['admin', 'hr'],
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          body: {
            taxRate: { type: 'number', required: false, description: 'Tax rate (0-100)' },
            insuranceRate: { type: 'number', required: false, description: 'Insurance rate (0-100)' },
            payPeriodDays: { type: 'number', required: false, description: 'Pay period days (1-31)' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'PayrollSettings', description: 'Updated settings' },
          },
        },
        usedIn: ['src/pages/Settings.jsx'],
        mockStatus: 'implemented',
      },
    },

    // ========================================================================
    // Profile Endpoints
    // ========================================================================
    profile: {
      update: {
        method: 'PUT',
        path: '/profile',
        description: 'Update user profile',
        requiresAuth: true,
        request: {
          headers: {
            Authorization: { type: 'string', required: true, description: 'Bearer token' },
          },
          body: {
            firstName: { type: 'string', required: true, description: 'First name' },
            lastName: { type: 'string', required: true, description: 'Last name' },
            email: { type: 'string', required: true, description: 'Email address' },
            phone: { type: 'string', required: false, description: 'Phone number' },
          },
        },
        response: {
          success: {
            status: 200,
            body: { type: 'User', description: 'Updated user' },
          },
        },
        usedIn: ['src/pages/Profile.jsx'],
        mockStatus: 'implemented',
      },
    },
  },
}

// ============================================================================
// Environment Configuration Helper
// ============================================================================

/**
 * Get environment configuration
 * @returns {Object} Environment configuration
 */
export function useEnvConfig() {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
    appName: import.meta.env.VITE_APP_NAME || 'WorkZen HRMS',
  }
}

// ============================================================================
// API Client Factory
// ============================================================================

/**
 * Create API client with JWT and mock support
 * @param {Object} options - Configuration options
 * @param {string} [options.baseUrl] - API base URL
 * @param {boolean} [options.useMock] - Use mock API
 * @returns {Object} Axios instance
 */
export function createApiClient(options = {}) {
  const config = useEnvConfig()
  const baseUrl = options.baseUrl || config.apiBaseUrl
  const useMock = options.useMock !== undefined ? options.useMock : config.useMock

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor - Add JWT token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - Handle errors and token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // Handle 401 Unauthorized - Token expired
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken) {
            const response = useMock
              ? await mockApi.refreshToken(refreshToken)
              : await axios.post(`${baseUrl}/auth/refresh`, { refreshToken })

            const { accessToken } = response.data || response
            localStorage.setItem('accessToken', accessToken)
            originalRequest.headers.Authorization = `Bearer ${accessToken}`

            return client(originalRequest)
          }
        } catch (refreshError) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }

      // Handle other errors
      if (error.response) {
        const message = error.response.data?.message || error.response.data?.error || 'An error occurred'
        toast.error(message)
      } else if (error.request && !useMock) {
        toast.error('Network error. Please check your connection.')
      }

      return Promise.reject(error)
    }
  )

  return client
}

// Export default API client instance
export default createApiClient()

