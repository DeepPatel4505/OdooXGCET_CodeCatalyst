import { PrismaClient } from '@prisma/client'
import { sendAccountCreationEmail } from '../utils/email.utils.js'
import { generatePasswordResetToken } from '../utils/email.utils.js'
import { hashPassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()


export const getUsers = async (req, res, next) => {
  try {
    const user = req.user
    
    const where = {}
    if (user.companyId) {
      where.companyId = user.companyId
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        role: true,
        companyId: true,
        avatar: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      status: 'success',
      data: users,
    })
  } catch (error) {
    next(error)
  }
}


export const sendCredentials = async (req, res, next) => {
  try {
    const { userId } = req.params
    const admin = req.user

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        error: 'Not Found',
      })
    }

    if (admin.companyId && user.companyId !== admin.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only send credentials to users in your company',
        error: 'Forbidden',
      })
    }

    const resetToken = generatePasswordResetToken()

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) 

    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    })

    // employeeId IS the login ID - they are the same value stored in the database
    // The login ID format: CompanyCode + First2LettersOfFirstName + First2LettersOfLastName + Year + SerialNumber
    // Example: OIJODO20220001
    // For employees, employeeId is always present. For non-employee users (if any), fallback to email
    const loginId = user.employeeId || user.email
    
    try {
      await sendAccountCreationEmail(
        user.email,
        loginId,
        'Your password has been reset. Please use the link below to set a new password.',
        user.firstName,
        resetToken
      )
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
    }

    res.json({
      status: 'success',
      data: {
        message: 'Login credentials sent successfully via email',
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { password } = req.body

    if (!password || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        error: 'Validation Error',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        error: 'Not Found',
      })
    }

    const admin = req.user
    if (admin.companyId && user.companyId !== admin.companyId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update passwords for users in your company',
        error: 'Forbidden',
      })
    }

    const hashedPassword = await hashPassword(password)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })

    res.json({
      status: 'success',
      data: {
        message: 'Password updated successfully',
      },
    })
  } catch (error) {
    next(error)
  }
}

