import express from 'express'
import { getEmployees, createEmployee, importEmployees, exportEmployees, getEmployeeSalary, updateEmployeeSalary, updateEmployee } from '../controllers/employee.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createEmployeeSchema, getEmployeesSchema, updateEmployeeSchema } from '../validations/employee.validations.js'
import { upload, handleMulterError } from '../middleware/upload.middleware.js'

const router = express.Router()

router.get('/', authenticate, validate(getEmployeesSchema), getEmployees)
router.post('/', authenticate, authorize('admin', 'hr'), validate(createEmployeeSchema), createEmployee)
router.put('/:employeeId', authenticate, authorize('admin', 'hr'), validate(updateEmployeeSchema), updateEmployee)
router.post('/import', authenticate, authorize('admin', 'hr'), upload.single('file'), handleMulterError, importEmployees)
router.get('/export', authenticate, authorize('admin', 'hr'), exportEmployees)
router.get('/:employeeId/salary', authenticate, authorize('admin', 'hr'), getEmployeeSalary)
router.put('/:employeeId/salary', authenticate, authorize('admin', 'hr'), updateEmployeeSalary)

export default router

