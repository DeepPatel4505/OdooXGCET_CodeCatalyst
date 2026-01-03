import express from 'express'
import { getAttendance, getTodayAttendance, checkIn, checkOut, adminCheckIn, adminCheckOut, triggerAutoCheckout } from '../controllers/attendance.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { getAttendanceSchema } from '../validations/attendance.validations.js'

const router = express.Router()

router.get('/', authenticate, validate(getAttendanceSchema), getAttendance)
router.get('/today', authenticate, getTodayAttendance)
router.post('/check-in', authenticate, checkIn)
router.post('/check-out', authenticate, checkOut)
router.post('/admin/check-in', authenticate, adminCheckIn)
router.post('/admin/check-out', authenticate, adminCheckOut)
router.post('/admin/auto-checkout', authenticate, authorize('admin', 'hr'), triggerAutoCheckout)

export default router

