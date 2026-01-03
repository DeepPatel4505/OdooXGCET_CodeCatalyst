import express from 'express'
import {
  getPayslips,
  getPayslip,
  getPayslipByPayrollId,
  downloadPayslip,
  generatePayslipsForPayrun,
} from '../controllers/payslip.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', authenticate, getPayslips)
router.get('/payroll/:payrollId', authenticate, getPayslipByPayrollId)
router.get('/:payslipId', authenticate, getPayslip)
router.get('/:payslipId/download', authenticate, downloadPayslip)
router.post('/payrun/:payrunId/generate', authenticate, authorize('admin', 'hr'), generatePayslipsForPayrun)

export default router

