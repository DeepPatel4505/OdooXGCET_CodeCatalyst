import express from 'express'
import {
  upsertSalaryStructure,
  getActiveSalaryStructure,
  getSalaryHistory,
} from '../controllers/salaryStructure.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/:employeeId', authenticate, authorize('admin', 'hr'), upsertSalaryStructure)
router.get('/:employeeId/active', authenticate, authorize('admin', 'hr', 'employee'), getActiveSalaryStructure)
router.get('/:employeeId/history', authenticate, authorize('admin', 'hr', 'employee'), getSalaryHistory)

export default router
