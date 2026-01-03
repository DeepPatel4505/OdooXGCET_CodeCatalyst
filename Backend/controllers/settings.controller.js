import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.payrollSettings.findFirst()

    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: {},
      })
    }

    res.json({
      status: 'success',
      data: {
        taxRate: settings.taxRate,
        insuranceRate: settings.insuranceRate,
        payPeriodDays: settings.payPeriodDays,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const updateSettings = async (req, res, next) => {
  try {
    const { taxRate, insuranceRate, payPeriodDays } = req.body

    let settings = await prisma.payrollSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: {
          id: 'default',
          taxRate: taxRate || 18.5,
          insuranceRate: insuranceRate || 3.5,
          payPeriodDays: payPeriodDays || 30,
        },
      })
    } else {
      settings = await prisma.payrollSettings.update({
        where: { id: 'default' },
        data: {
          ...(taxRate !== undefined && { taxRate }),
          ...(insuranceRate !== undefined && { insuranceRate }),
          ...(payPeriodDays !== undefined && { payPeriodDays }),
        },
      })
    }

    res.json({
      status: 'success',
      data: {
        taxRate: settings.taxRate,
        insuranceRate: settings.insuranceRate,
        payPeriodDays: settings.payPeriodDays,
      },
    })
  } catch (error) {
    next(error)
  }
}

