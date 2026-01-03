import express from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { updateSettingsSchema } from '../validations/settings.validations.js'

const router = express.Router()

router.get('/', authenticate, authorize('admin', 'hr'), getSettings)
router.put('/', authenticate, authorize('admin', 'hr'), validate(updateSettingsSchema), updateSettings)

export default router

