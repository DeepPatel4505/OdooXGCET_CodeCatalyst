import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword } from '../utils/password.utils.js'

const prisma = new PrismaClient()

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user

    const userWithEmployee = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        phone: true,
        department: true,
        position: true,
        employeeId: true,
        companyId: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: true,
            position: true,
            status: true,
            hireDate: true,
            salary: true,
            dateOfBirth: true,
            address: true,
            nationality: true,
            personalEmail: true,
            gender: true,
            maritalStatus: true,
            accountNumber: true,
            bankName: true,
            ifscCode: true,
            panNo: true,
            uanNo: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            logo: true,
          },
        },
        about: true,
        whatILoveAboutMyJob: true,
        interestsAndHobbies: true,
        skills: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({
      status: 'success',
      data: userWithEmployee,
    })
  } catch (error) {
    next(error)
  }
}

export const updateProfile = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      avatar,
      about,
      whatILoveAboutMyJob,
      interestsAndHobbies,
      skills,
      certifications,
      employeeData 
    } = req.body
    const user = req.user

    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use',
          error: 'Validation Error',
        })
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(about !== undefined && { about }),
        ...(whatILoveAboutMyJob !== undefined && { whatILoveAboutMyJob }),
        ...(interestsAndHobbies !== undefined && { interestsAndHobbies }),
        ...(skills !== undefined && { skills }),
        ...(certifications !== undefined && { certifications }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        phone: true,
        department: true,
        position: true,
        employeeId: true,
        about: true,
        whatILoveAboutMyJob: true,
        interestsAndHobbies: true,
        skills: true,
        certifications: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (employeeData && user.employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })

      if (employee) {
        const updateData = {}
        
        if (employeeData.dateOfBirth !== undefined) {
          if (employeeData.dateOfBirth && employeeData.dateOfBirth.trim()) {
            const dob = new Date(employeeData.dateOfBirth)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            // Validate DOB is not in future
            if (dob > today) {
              return res.status(400).json({
                status: 'error',
                message: 'Date of birth cannot be in the future',
                error: 'Validation Error',
              })
            }
            
            // Validate minimum age of 18
            const age = today.getFullYear() - dob.getFullYear()
            const monthDiff = today.getMonth() - dob.getMonth()
            const dayDiff = today.getDate() - dob.getDate()
            const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
            
            if (actualAge < 18) {
              return res.status(400).json({
                status: 'error',
                message: 'Employee must be at least 18 years old',
                error: 'Validation Error',
              })
            }
            
            updateData.dateOfBirth = dob
          } else {
            updateData.dateOfBirth = null
          }
        }
        
        const optionalFields = ['address', 'nationality', 'personalEmail', 'gender', 'maritalStatus', 'accountNumber', 'bankName', 'ifscCode', 'panNo', 'uanNo']
        optionalFields.forEach(field => {
          if (employeeData[field] !== undefined) {
            if (employeeData[field] && String(employeeData[field]).trim()) {
              updateData[field] = employeeData[field]
            } else {
              updateData[field] = null
            }
          }
        })
        
        await prisma.employee.update({
          where: { id: employee.id },
          data: updateData,
        })
      }
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body
    const user = req.user

    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
    })

    const isValid = await comparePassword(oldPassword, userWithPassword.password)
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect',
        error: 'Validation Error',
      })
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    res.json({
      status: 'success',
      data: {
        message: 'Password changed successfully',
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getSalaryInfo = async (req, res, next) => {
  try {
    const user = req.user

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee record not found',
        error: 'Not Found',
      })
    }
    
    const { getSalaryData } = await import('../utils/salary.utils.js')
    const salaryData = await getSalaryData(employee.id, employee.salary)

    res.json({
      status: 'success',
      data: salaryData,
    })
  } catch (error) {
    next(error)
  }
}

