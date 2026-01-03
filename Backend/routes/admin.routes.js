import express from 'express'
import { getUsers, sendCredentials, updateUserPassword } from '../controllers/admin.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/users', authenticate, authorize('admin'), getUsers)
router.post('/users/:userId/send-credentials', authenticate, authorize('admin'), sendCredentials)
router.put('/users/:userId/password', authenticate, authorize('admin'), updateUserPassword)

export default router

