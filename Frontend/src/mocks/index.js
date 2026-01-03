/**
 * Mock API responses for development
 * Set VITE_USE_MOCK=true in .env to use these mocks
 */

// Mock delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock data - Test accounts for all roles
const mockUsers = {
  admin: {
    id: '1',
    email: 'admin@workzen.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    avatar: null,
    phone: '+1234567890',
    department: 'IT',
    position: 'Administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  hr: {
    id: '2',
    email: 'hr@workzen.com',
    firstName: 'Sarah',
    lastName: 'Williams',
    role: 'hr',
    avatar: null,
    phone: '+1234567891',
    department: 'Human Resources',
    position: 'HR Manager',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  manager: {
    id: '3',
    email: 'manager@workzen.com',
    firstName: 'Michael',
    lastName: 'Brown',
    role: 'manager',
    avatar: null,
    phone: '+1234567892',
    department: 'Engineering',
    position: 'Engineering Manager',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  employee: {
    id: '4',
    email: 'employee@workzen.com',
    firstName: 'Emily',
    lastName: 'Davis',
    role: 'employee',
    avatar: null,
    phone: '+1234567893',
    department: 'Engineering',
    position: 'Software Engineer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

// Default user (for backward compatibility)
const mockUser = mockUsers.admin

const mockEmployees = [
  {
    id: '1',
    employeeId: 'EMP001',
    email: 'employee1@workzen.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1234567891',
    department: 'Engineering',
    position: 'Software Engineer',
    status: 'active',
    hireDate: '2023-01-15',
    salary: 75000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    employeeId: 'EMP002',
    email: 'employee2@workzen.com',
    firstName: 'Bob',
    lastName: 'Johnson',
    phone: '+1234567892',
    department: 'Sales',
    position: 'Sales Manager',
    status: 'active',
    hireDate: '2023-02-20',
    salary: 85000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockAttendance = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Jane Smith',
    date: new Date().toISOString(),
    checkIn: new Date(new Date().setHours(9, 0)).toISOString(),
    checkOut: new Date(new Date().setHours(17, 0)).toISOString(),
    hoursWorked: 8,
    status: 'present',
    createdAt: new Date().toISOString(),
  },
]

const mockLeaves = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Jane Smith',
    type: 'vacation',
    startDate: '2024-01-15',
    endDate: '2024-01-20',
    days: 5,
    reason: 'Family vacation',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockPayruns = [
  {
    id: '1',
    name: 'January 2024 Payrun',
    payPeriodStart: '2024-01-01',
    payPeriodEnd: '2024-01-31',
    payDate: '2024-02-05',
    status: 'completed',
    totalEmployees: 2,
    totalAmount: 160000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockPayslips = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Jane Smith',
    payrunId: '1',
    payPeriodStart: '2024-01-01',
    payPeriodEnd: '2024-01-31',
    payDate: '2024-02-05',
    earnings: {
      baseSalary: 75000,
      overtime: 0,
      bonus: 5000,
      allowances: 2000,
    },
    deductions: {
      tax: 15000,
      insurance: 3000,
      other: 0,
    },
    grossPay: 82000,
    totalDeductions: 18000,
    netPay: 64000,
    createdAt: new Date().toISOString(),
  },
]

const mockSettings = {
  taxRate: 18.5,
  insuranceRate: 3.5,
  payPeriodDays: 30,
}

// Mock API functions
export const mockApi = {
  // Auth
  login: async (email, password) => {
    await delay(1000)
    
    // Test accounts - all use password: password123
    const testAccounts = {
      'admin@workzen.com': { user: mockUsers.admin, password: 'password123' },
      'hr@workzen.com': { user: mockUsers.hr, password: 'password123' },
      'manager@workzen.com': { user: mockUsers.manager, password: 'password123' },
      'employee@workzen.com': { user: mockUsers.employee, password: 'password123' },
    }
    
    const account = testAccounts[email]
    if (account && account.password === password) {
      return {
        accessToken: `mock-access-token-${account.user.role}`,
        refreshToken: `mock-refresh-token-${account.user.role}`,
        user: account.user,
      }
    }
    
    throw new Error('Invalid credentials')
  },

  logout: async () => {
    await delay(500)
    return { success: true }
  },

  getMe: async () => {
    await delay(500)
    // In a real app, this would get the user from the token
    // For mock, try to get user from localStorage token
    const token = localStorage.getItem('accessToken')
    if (token) {
      // Extract role from token (format: mock-access-token-{role})
      const roleMatch = token.match(/mock-access-token-(\w+)/)
      if (roleMatch) {
        const role = roleMatch[1]
        if (mockUsers[role]) {
          return mockUsers[role]
        }
      }
    }
    // Default to admin if no token or invalid token
    return mockUsers.admin
  },

  refreshToken: async (refreshToken) => {
    await delay(500)
    // Extract role from refresh token (format: mock-refresh-token-{role})
    const roleMatch = refreshToken?.match(/mock-refresh-token-(\w+)/)
    const role = roleMatch ? roleMatch[1] : 'admin'
    return { accessToken: `mock-access-token-${role}` }
  },

  // Dashboard
  getDashboardStats: async () => {
    await delay(500)
    return {
      totalEmployees: 2,
      presentToday: 1,
      pendingLeaves: 1,
      lastPayrunAmount: 160000,
      lastPayrunDate: '2024-02-05',
    }
  },

  // Employees
  getEmployees: async () => {
    await delay(500)
    return mockEmployees
  },

  createEmployee: async (data) => {
    await delay(1000)
    const newEmployee = {
      id: String(mockEmployees.length + 1),
      employeeId: `EMP${String(mockEmployees.length + 1).padStart(3, '0')}`,
      ...data,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockEmployees.push(newEmployee)
    return newEmployee
  },

  // Attendance
  getAttendance: async () => {
    await delay(500)
    return mockAttendance
  },

  getTodayAttendance: async () => {
    await delay(500)
    return mockAttendance[0] || null
  },

  checkIn: async () => {
    await delay(500)
    const today = new Date().toISOString().split('T')[0]
    const checkIn = new Date().toISOString()
    return {
      id: String(mockAttendance.length + 1),
      employeeId: '1',
      employeeName: 'Jane Smith',
      date: today,
      checkIn,
      status: 'present',
      createdAt: new Date().toISOString(),
    }
  },

  checkOut: async () => {
    await delay(500)
    return {
      ...mockAttendance[0],
      checkOut: new Date().toISOString(),
      hoursWorked: 8,
    }
  },

  // Leaves
  getLeaves: async () => {
    await delay(500)
    return mockLeaves
  },

  createLeave: async (data) => {
    await delay(1000)
    const newLeave = {
      id: String(mockLeaves.length + 1),
      employeeId: '1',
      employeeName: 'Jane Smith',
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockLeaves.push(newLeave)
    return newLeave
  },

  approveLeave: async (leaveId) => {
    await delay(500)
    const leave = mockLeaves.find((l) => l.id === leaveId)
    if (leave) {
      leave.status = 'approved'
      leave.approvedAt = new Date().toISOString()
    }
    return leave
  },

  rejectLeave: async (leaveId) => {
    await delay(500)
    const leave = mockLeaves.find((l) => l.id === leaveId)
    if (leave) {
      leave.status = 'rejected'
    }
    return leave
  },

  // Payroll
  getPayruns: async () => {
    await delay(500)
    return mockPayruns
  },

  createPayrun: async (data) => {
    await delay(1000)
    const newPayrun = {
      id: String(mockPayruns.length + 1),
      ...data,
      status: 'draft',
      totalEmployees: 0,
      totalAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockPayruns.push(newPayrun)
    return newPayrun
  },

  getPayrunPreview: async (payrunId) => {
    await delay(500)
    return {
      ...mockPayruns[0],
      payslips: mockPayslips,
    }
  },

  processPayrun: async (payrunId) => {
    await delay(2000)
    const payrun = mockPayruns.find((p) => p.id === payrunId)
    if (payrun) {
      payrun.status = 'completed'
      payrun.updatedAt = new Date().toISOString()
    }
    return payrun
  },

  // Payslips
  getPayslips: async () => {
    await delay(500)
    return mockPayslips
  },

  getPayslip: async (payslipId) => {
    await delay(500)
    return mockPayslips.find((p) => p.id === payslipId)
  },

  downloadPayslip: async (payslipId) => {
    await delay(1000)
    // Return a mock blob
    return new Blob(['Mock PDF content'], { type: 'application/pdf' })
  },

  // Settings
  getSettings: async () => {
    await delay(500)
    return mockSettings
  },

  updateSettings: async (data) => {
    await delay(500)
    Object.assign(mockSettings, data)
    return mockSettings
  },

  // Profile
  updateProfile: async (data) => {
    await delay(500)
    Object.assign(mockUser, data)
    return mockUser
  },
}

