import express from 'express'
import { getProfile, updateProfile, changePassword, getSalaryInfo } from '../controllers/profile.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { updateProfileSchema, changePasswordSchema } from '../validations/profile.validations.js'

const router = express.Router()

router.get('/', authenticate, getProfile)
router.put('/', authenticate, validate(updateProfileSchema), updateProfile)
router.put('/password', authenticate, validate(changePasswordSchema), changePassword)
router.get('/salary', authenticate, getSalaryInfo)

export default router

