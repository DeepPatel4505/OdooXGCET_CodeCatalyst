import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import {
  getSalaryStatementReport,
  downloadSalaryStatementReport,
} from '../controllers/report.controller.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Get salary statement report
router.get('/salary-statement', getSalaryStatementReport)

// Download salary statement report as PDF
router.get('/salary-statement/download', downloadSalaryStatementReport)

export default router

