import express from 'express'
import { getLeaves, createLeave, approveLeave, rejectLeave } from '../controllers/leave.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createLeaveSchema, getLeavesSchema, rejectLeaveSchema } from '../validations/leave.validations.js'
import { documentUpload, handleDocumentUploadError } from '../middleware/documentUpload.middleware.js'

const router = express.Router()

router.get('/', authenticate, validate(getLeavesSchema), getLeaves)
router.post('/', authenticate, documentUpload.single('document'), handleDocumentUploadError, validate(createLeaveSchema), createLeave)
router.put('/:leaveId/approve', authenticate, authorize('admin', 'hr', 'payroll'), approveLeave)
router.put('/:leaveId/reject', authenticate, authorize('admin', 'hr', 'payroll'), validate(rejectLeaveSchema), rejectLeave)

export default router

