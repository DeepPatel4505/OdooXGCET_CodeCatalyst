import express from 'express'
import { getStats, getPublicStats } from '../controllers/dashboard.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/stats', authenticate, getStats)
router.get('/public-stats', getPublicStats)

export default router

