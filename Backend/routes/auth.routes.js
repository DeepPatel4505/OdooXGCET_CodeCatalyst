import express from 'express'
import { login, logout, refresh, getMe, registerUser } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { loginSchema, refreshTokenSchema, registerSchema } from '../validations/auth.validations.js'

const router = express.Router()

router.post('/login', validate(loginSchema), login)
router.post('/register', validate(registerSchema), registerUser)
router.post('/logout', authenticate, logout)
router.post('/refresh', validate(refreshTokenSchema), refresh)
router.get('/me', authenticate, getMe)

export default router

