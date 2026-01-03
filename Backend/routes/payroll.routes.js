import express from 'express'
import {
  getPayrollDashboard,
  getPayruns,
  getCurrentMonthPayrun,
  createPayrun,
  previewPayrun,
  processPayrun,
  getPayrollsByPayrun,
  getPayrollsByEmployee,
  getPayrollById,
  updatePayroll,
  validatePayroll,
  validateAllPayrolls,
} from '../controllers/payroll.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createPayrunSchema } from '../validations/payroll.validations.js'

const router = express.Router()

// Dashboard Route
router.get('/dashboard', authenticate, authorize('admin', 'hr', 'payroll'), getPayrollDashboard)

// Payrun Routes
router.get('/payruns', authenticate, authorize('admin', 'hr', 'payroll'), getPayruns)
router.get('/payruns/current-month', authenticate, authorize('admin', 'hr', 'payroll'), getCurrentMonthPayrun)
router.post('/payruns', authenticate, authorize('admin', 'hr', 'payroll'), validate(createPayrunSchema), createPayrun)
router.get('/payruns/:payrunId/preview', authenticate, authorize('admin', 'hr', 'payroll'), previewPayrun)
router.post('/payruns/:payrunId/process', authenticate, authorize('admin', 'hr', 'payroll'), processPayrun)
router.get('/payruns/:payrunId/payrolls', authenticate, authorize('admin', 'hr', 'payroll'), getPayrollsByPayrun)

// Payroll Routes
router.get('/employee/:employeeId', authenticate, authorize('admin', 'hr', 'payroll', 'employee'), getPayrollsByEmployee)
router.get('/:payrollId', authenticate, authorize('admin', 'hr', 'payroll', 'employee'), getPayrollById)
router.put('/:payrollId', authenticate, authorize('admin', 'hr', 'payroll'), updatePayroll)
router.put('/:payrollId/validate', authenticate, authorize('admin', 'hr', 'payroll'), validatePayroll)
router.put('/payruns/:payrunId/validate-all', authenticate, authorize('admin', 'hr', 'payroll'), validateAllPayrolls)

export default router

