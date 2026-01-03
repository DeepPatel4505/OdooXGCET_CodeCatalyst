import { PrismaClient } from '@prisma/client'
import { generatePayslipPDF } from '../utils/payslip.utils.js'

const prisma = new PrismaClient()

// Helper function to calculate salary computation based on attendance
const calculateSalaryComputation = (salaryStructure, daysPresent, totalPaidLeaves, totalWorkingDays = 22) => {
  // Total working days = present days + paid leaves
  const workingDays = daysPresent + totalPaidLeaves

  // Calculate attendance ratio = workingDays / totalWorkingDays
  // If attendance data is missing, fallback to 100%
  const attendanceRatio = workingDays > 0 && totalWorkingDays > 0
    ? workingDays / totalWorkingDays
    : 1.0

  // Get base basic salary from structure
  const baseBasicSalary = salaryStructure.basicSalary || 0

  // Calculate pro-rated basic salary
  const proratedBasic = Math.round((baseBasicSalary * attendanceRatio) * 100) / 100

  // Calculate HRA as percentage of prorated basic
  let hraPercent = salaryStructure.hraPercent
  if (!hraPercent && baseBasicSalary > 0 && salaryStructure.houseRentAllowance > 0) {
    hraPercent = (salaryStructure.houseRentAllowance / baseBasicSalary) * 100
  }
  hraPercent = hraPercent || 0
  const roundedHraPercent = Math.round(hraPercent * 100) / 100
  const hra = Math.round((proratedBasic * roundedHraPercent / 100) * 100) / 100

  // Calculate Standard Allowance as percentage of prorated basic
  const standardAllowancePercent = salaryStructure.standardAllowancePercent || 0
  const roundedStandardPercent = Math.round(standardAllowancePercent * 100) / 100
  const standardAllowance = roundedStandardPercent > 0
    ? Math.round((proratedBasic * roundedStandardPercent / 100) * 100) / 100
    : Math.round(((salaryStructure.standardAllowance || 0) * attendanceRatio) * 100) / 100

  // Calculate LTA as percentage of prorated basic
  const ltaPercent = salaryStructure.ltaPercent || 0
  const roundedLtaPercent = Math.round(ltaPercent * 100) / 100
  const lta = Math.round((proratedBasic * roundedLtaPercent / 100) * 100) / 100

  // Calculate Performance Bonus: Use percentage if available, otherwise use fixed amount with attendance ratio
  let bonusPercent = salaryStructure.performanceBonusPercent || 0
  if (!bonusPercent && baseBasicSalary > 0 && salaryStructure.performanceBonus > 0) {
    bonusPercent = (salaryStructure.performanceBonus / baseBasicSalary) * 100
  }
  bonusPercent = bonusPercent || 0
  const roundedBonusPercent = Math.round(bonusPercent * 100) / 100
  const bonus = roundedBonusPercent > 0
    ? Math.round((proratedBasic * roundedBonusPercent / 100) * 100) / 100
    : Math.round(((salaryStructure.performanceBonus || 0) * attendanceRatio) * 100) / 100

  // Fixed Allowance: Use percentage if available, otherwise use fixed amount with attendance ratio
  let fixedAllowancePercent = salaryStructure.fixedAllowancePercent || 0
  if (!fixedAllowancePercent && baseBasicSalary > 0 && salaryStructure.fixedAllowance > 0) {
    fixedAllowancePercent = (salaryStructure.fixedAllowance / baseBasicSalary) * 100
  }
  fixedAllowancePercent = fixedAllowancePercent || 0
  const roundedFixedAllowancePercent = Math.round(fixedAllowancePercent * 100) / 100
  const fixedAllowance = roundedFixedAllowancePercent > 0
    ? Math.round((proratedBasic * roundedFixedAllowancePercent / 100) * 100) / 100
    : Math.round(((salaryStructure.fixedAllowance || 0) * attendanceRatio) * 100) / 100

  // Calculate gross salary
  const grossTotal = Math.round((proratedBasic + hra + standardAllowance + lta + bonus + fixedAllowance) * 100) / 100

  // Calculate deductions based on prorated basic salary
  // PF Employee: Use percentage if available, otherwise use fixed amount with attendance ratio
  let pfEmployeePercent = salaryStructure.pfEmployeePercent || 0
  if (!pfEmployeePercent && baseBasicSalary > 0 && salaryStructure.pfEmployee > 0) {
    pfEmployeePercent = (salaryStructure.pfEmployee / baseBasicSalary) * 100
  }
  pfEmployeePercent = pfEmployeePercent || 0
  const roundedPfEmployeePercent = Math.round(pfEmployeePercent * 100) / 100
  const pfEmployee = roundedPfEmployeePercent > 0
    ? Math.round((proratedBasic * roundedPfEmployeePercent / 100) * 100) / 100
    : Math.round(((salaryStructure.pfEmployee || 0) * attendanceRatio) * 100) / 100

  // Professional Tax: Fixed amount (not affected by attendance)
  const professionalTax = 200

  // Other Deductions: Percentage of prorated basic if percentage exists, otherwise apply attendance ratio
  const otherDeductionsPercent = salaryStructure.otherDeductionsPercent || 0
  const roundedOtherDeductionsPercent = Math.round(otherDeductionsPercent * 100) / 100
  const otherDeductions = roundedOtherDeductionsPercent > 0
    ? Math.round((proratedBasic * roundedOtherDeductionsPercent / 100) * 100) / 100
    : Math.round(((salaryStructure.otherDeductions || 0) * attendanceRatio) * 100) / 100

  const deductionsTotal = Math.round((pfEmployee + professionalTax + otherDeductions) * 100) / 100
  const netAmount = Math.round((grossTotal - deductionsTotal) * 100) / 100

  // Calculate rates for display (percentage of prorated basic, rounded to 2 decimal places)
  const hraRate = roundedHraPercent
  const standardAllowanceRate = roundedStandardPercent > 0 
    ? roundedStandardPercent 
    : (proratedBasic > 0 ? Math.round((standardAllowance / proratedBasic * 100) * 100) / 100 : 0)
  const pfEmployeeRate = roundedPfEmployeePercent
  const performanceBonusRate = roundedBonusPercent
  const travelAllowanceRate = roundedLtaPercent
  const fixedAllowanceRate = roundedFixedAllowancePercent > 0
    ? roundedFixedAllowancePercent
    : (proratedBasic > 0 ? Math.round((fixedAllowance / proratedBasic * 100) * 100) / 100 : 0)
  
  // Calculate base salary percentage for display (percentage of total base salary)
  const baseSalaryPercent = baseBasicSalary > 0 ? Math.round((proratedBasic / baseBasicSalary * 100) * 100) / 100 : 100

  // Calculate deduction rates
  const professionalTaxRate = proratedBasic > 0 ? Math.round((professionalTax / proratedBasic * 100) * 100) / 100 : 0
  const otherDeductionsRate = roundedOtherDeductionsPercent > 0 ? roundedOtherDeductionsPercent : (proratedBasic > 0 ? Math.round((otherDeductions / proratedBasic * 100) * 100) / 100 : 0)

  // Always include all salary components, even if they are 0
  const grossEarnings = [
    {
      ruleName: 'Basic Salary',
      rate: baseSalaryPercent,
      amount: proratedBasic,
    },
    {
      ruleName: 'House Rent Allowance',
      rate: hraRate,
      amount: hra,
    },
    {
      ruleName: 'Standard Allowance',
      rate: standardAllowanceRate,
      amount: standardAllowance,
    },
    {
      ruleName: 'Performance Bonus',
      rate: performanceBonusRate,
      amount: bonus,
    },
    {
      ruleName: 'Leave Travel Allowance',
      rate: travelAllowanceRate,
      amount: lta,
    },
    {
      ruleName: 'Fixed Allowance',
      rate: fixedAllowanceRate,
      amount: fixedAllowance,
    },
  ]

  // Always include all deductions, even if they are 0
  const deductions = [
    {
      ruleName: 'PF Employee',
      rate: pfEmployeeRate,
      amount: -pfEmployee,
    },
    {
      ruleName: 'Professional Tax',
      rate: professionalTaxRate,
      amount: -professionalTax,
    },
    {
      ruleName: 'Other Deductions',
      rate: otherDeductionsRate,
      amount: -otherDeductions,
    },
  ]

  return {
    grossEarnings,
    deductions,
    grossTotal,
    deductionsTotal,
    netAmount,
    computedBaseSalary: proratedBasic,
    attendanceRatio,
    workingDays,
    daysPresent,
    totalPaidLeaves,
    totalWorkingDays,
  }
}

export const getPayslips = async (req, res, next) => {
  try {
    const { payrunId, employeeId } = req.query
    const user = req.user

    const where = {}

    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (employee) {
        where.employeeId = employee.id
      } else {
        return res.json({
          status: 'success',
          data: [],
        })
      }
    } else if (employeeId) {
      where.employeeId = employeeId
    }

    if (payrunId) {
      const payrolls = await prisma.payroll.findMany({
        where: { payrunId },
        select: { id: true },
      })
      where.payrollId = {
        in: payrolls.map((p) => p.id),
      }
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: {
              select: {
                id: true,
                name: true,
                payPeriodStart: true,
                payPeriodEnd: true,
                payDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formattedPayslips = payslips.map((payslip) => ({
      id: payslip.id,
      employeeId: payslip.employeeId,
      employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
      payrollId: payslip.payrollId,
      payrun: payslip.payroll.payrun
        ? {
            id: payslip.payroll.payrun.id,
            name: payslip.payroll.payrun.name,
            payPeriodStart: payslip.payroll.payrun.payPeriodStart.toISOString().split('T')[0],
            payPeriodEnd: payslip.payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
            payDate: payslip.payroll.payrun.payDate.toISOString().split('T')[0],
          }
        : null,
      grossSalary: payslip.payroll.grossSalary,
      totalDeductions: payslip.payroll.totalDeductions,
      netSalary: payslip.payroll.netSalary,
      pdfUrl: payslip.pdfUrl,
      status: payslip.status,
      createdAt: payslip.createdAt.toISOString(),
    }))

    res.json({
      status: 'success',
      data: formattedPayslips,
    })
  } catch (error) {
    next(error)
  }
}

export const getPayslip = async (req, res, next) => {
  try {
    const { payslipId } = req.params
    const user = req.user

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: {
              select: {
                id: true,
                name: true,
                payPeriodStart: true,
                payPeriodEnd: true,
                payDate: true,
              },
            },
          },
        },
      },
    })

    if (!payslip) {
      return res.status(404).json({
        status: 'error',
        message: 'Payslip not found',
        error: 'Not Found',
      })
    }

    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payslip.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    const payrun = payslip.payroll.payrun
    let workedDays = []
    let totalWorkedDays = 0
    let totalPaidLeaves = 0

    if (payrun) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: payslip.employeeId,
          date: {
            gte: payrun.payPeriodStart,
            lte: payrun.payPeriodEnd,
          },
        },
        orderBy: {
          date: 'asc',
        },
      })

      const paidLeaves = await prisma.leave.findMany({
        where: {
          employeeId: payslip.employeeId,
          type: { in: ['sick', 'vacation', 'personal'] },
          status: 'approved',
          startDate: { lte: payrun.payPeriodEnd },
          endDate: { gte: payrun.payPeriodStart },
        },
      })

      const presentDays = attendances.filter((a) => a.status === 'present').length
      totalWorkedDays = presentDays
      totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
        const overlapStart = new Date(Math.max(leave.startDate.getTime(), payrun.payPeriodStart.getTime()))
        const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payrun.payPeriodEnd.getTime()))
        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, overlapDays)
      }, 0)

      workedDays = [
        {
          type: 'Attendance',
          days: totalWorkedDays,
          description: 'Working days in period',
          amount: 0,
        },
        {
          type: 'Paid Time Off',
          days: totalPaidLeaves,
          description: 'Paid leaves in period',
          amount: 0,
        },
      ]
    }

    let salaryStructure = null
    let salaryComputation = null

    if (payrun) {
      salaryStructure = await prisma.salaryStructure.findFirst({
        where: {
          employeeId: payslip.employeeId,
          effectiveFrom: { lte: payrun.payPeriodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: payrun.payPeriodStart } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      if (salaryStructure) {
        const totalWorkingDays = 22
        const baseBasicSalary = salaryStructure.basicSalary || 0
        const dailyRate = baseBasicSalary / totalWorkingDays

        workedDays[0].amount = Math.round((dailyRate * totalWorkedDays) * 100) / 100
        workedDays[1].amount = Math.round((dailyRate * totalPaidLeaves) * 100) / 100

        // Calculate salary computation based on attendance
        salaryComputation = calculateSalaryComputation(
          salaryStructure,
          totalWorkedDays,
          totalPaidLeaves,
          totalWorkingDays
        )
      }
    }

    res.json({
      status: 'success',
      data: {
        id: payslip.id,
        employeeId: payslip.employeeId,
        employee: {
          id: payslip.employee.id,
          employeeId: payslip.employee.employeeId,
          name: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
          department: payslip.employee.department,
          position: payslip.employee.position,
        },
        payrollId: payslip.payrollId,
        payrun: payrun
          ? {
              id: payrun.id,
              name: payrun.name,
              payPeriodStart: payrun.payPeriodStart.toISOString().split('T')[0],
              payPeriodEnd: payrun.payPeriodEnd.toISOString().split('T')[0],
              payDate: payrun.payDate.toISOString().split('T')[0],
            }
          : null,
        salaryStructure: salaryStructure
          ? {
              id: salaryStructure.id,
              name: salaryStructure.name,
            }
          : null,
        period: payrun
          ? {
              start: payrun.payPeriodStart.toISOString().split('T')[0],
              end: payrun.payPeriodEnd.toISOString().split('T')[0],
            }
          : null,
        workedDays: {
          items: workedDays,
          totalDays: totalWorkedDays + totalPaidLeaves,
          totalAmount: workedDays.reduce((sum, item) => sum + item.amount, 0),
          daysPresent: totalWorkedDays,
          paidLeaves: totalPaidLeaves,
          totalWorkingDays: salaryComputation?.totalWorkingDays || 22,
          attendanceRatio: salaryComputation?.attendanceRatio || 1.0,
          attendancePercent: salaryComputation ? Math.round(salaryComputation.attendanceRatio * 100 * 100) / 100 : 100,
        },
        salaryComputation,
        grossSalary: salaryComputation?.grossTotal || payslip.payroll.grossSalary,
        totalDeductions: salaryComputation?.deductionsTotal || payslip.payroll.totalDeductions,
        netSalary: salaryComputation?.netAmount || payslip.payroll.netSalary,
        pdfUrl: payslip.pdfUrl,
        status: payslip.status,
        payroll: {
          id: payslip.payroll.id,
          status: payslip.payroll.status,
        },
        createdAt: payslip.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getPayslipByPayrollId = async (req, res, next) => {
  try {
    const { payrollId } = req.params
    const user = req.user

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        payrun: {
          select: {
            id: true,
            name: true,
            payPeriodStart: true,
            payPeriodEnd: true,
            payDate: true,
          },
        },
        payslip: true,
      },
    })

    if (!payroll) {
      return res.status(404).json({
        status: 'error',
        message: 'Payroll not found',
        error: 'Not Found',
      })
    }

    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payroll.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    if (payroll.payslip) {
      req.params.payslipId = payroll.payslip.id
      return getPayslip(req, res, next)
    }

    let workedDays = []
    let totalWorkedDays = 0
    let totalPaidLeaves = 0

    if (payroll.payrun) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: payroll.employeeId,
          date: {
            gte: payroll.payrun.payPeriodStart,
            lte: payroll.payrun.payPeriodEnd,
          },
        },
      })

      const paidLeaves = await prisma.leave.findMany({
        where: {
          employeeId: payroll.employeeId,
          type: { in: ['sick', 'vacation', 'personal'] },
          status: 'approved',
          startDate: { lte: payroll.payrun.payPeriodEnd },
          endDate: { gte: payroll.payrun.payPeriodStart },
        },
      })

      totalWorkedDays = attendances.filter((a) => a.status === 'present').length
      totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
        const overlapStart = new Date(Math.max(leave.startDate.getTime(), payroll.payrun.payPeriodStart.getTime()))
        const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payroll.payrun.payPeriodEnd.getTime()))
        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, overlapDays)
      }, 0)

      workedDays = [
        {
          type: 'Attendance',
          days: totalWorkedDays,
          description: 'Working days in period',
          amount: 0,
        },
        {
          type: 'Paid Time Off',
          days: totalPaidLeaves,
          description: 'Paid leaves in period',
          amount: 0,
        },
      ]
    }

    let salaryStructure = null
    let salaryComputation = null

    if (payroll.payrun) {
      salaryStructure = await prisma.salaryStructure.findFirst({
        where: {
          employeeId: payroll.employeeId,
          effectiveFrom: { lte: payroll.payrun.payPeriodStart },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: payroll.payrun.payPeriodStart } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      })

      if (salaryStructure) {
        const totalWorkingDays = 22
        const baseBasicSalary = salaryStructure.basicSalary || 0
        const dailyRate = baseBasicSalary / totalWorkingDays

        workedDays[0].amount = Math.round((dailyRate * totalWorkedDays) * 100) / 100
        workedDays[1].amount = Math.round((dailyRate * totalPaidLeaves) * 100) / 100

        // Calculate salary computation based on attendance
        salaryComputation = calculateSalaryComputation(
          salaryStructure,
          totalWorkedDays,
          totalPaidLeaves,
          totalWorkingDays
        )
      }
    }

    res.json({
      status: 'success',
      data: {
        id: null,
        payrollId: payroll.id,
        employee: {
          id: payroll.employee.id,
          employeeId: payroll.employee.employeeId,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          department: payroll.employee.department,
          position: payroll.employee.position,
        },
        payrun: payroll.payrun
          ? {
              id: payroll.payrun.id,
              name: payroll.payrun.name,
              payPeriodStart: payroll.payrun.payPeriodStart.toISOString().split('T')[0],
              payPeriodEnd: payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
              payDate: payroll.payrun.payDate.toISOString().split('T')[0],
            }
          : null,
        salaryStructure: salaryStructure
          ? {
              id: salaryStructure.id,
              name: salaryStructure.name,
            }
          : null,
        period: payroll.payrun
          ? {
              start: payroll.payrun.payPeriodStart.toISOString().split('T')[0],
              end: payroll.payrun.payPeriodEnd.toISOString().split('T')[0],
            }
          : null,
        workedDays: {
          items: workedDays,
          totalDays: totalWorkedDays + totalPaidLeaves,
          totalAmount: workedDays.reduce((sum, item) => sum + item.amount, 0),
          daysPresent: totalWorkedDays,
          paidLeaves: totalPaidLeaves,
          totalWorkingDays: salaryComputation?.totalWorkingDays || 22,
          attendanceRatio: salaryComputation?.attendanceRatio || 1.0,
          attendancePercent: salaryComputation ? Math.round(salaryComputation.attendanceRatio * 100 * 100) / 100 : 100,
        },
        salaryComputation,
        grossSalary: salaryComputation?.grossTotal || payroll.grossSalary,
        totalDeductions: salaryComputation?.deductionsTotal || payroll.totalDeductions,
        netSalary: salaryComputation?.netAmount || payroll.netSalary,
        status: payroll.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const generatePayslipsForPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    })

    if (!payrun) {
      return res.status(404).json({
        status: 'error',
        message: 'Payrun not found',
        error: 'Not Found',
      })
    }

    if (payrun.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Payrun must be completed before generating payslips',
        error: 'Validation Error',
      })
    }

    const validatedPayrolls = await prisma.payroll.findMany({
      where: {
        payrunId,
        status: 'validated',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (validatedPayrolls.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No validated payrolls found for this payrun',
        error: 'Validation Error',
      })
    }

    const existingPayslips = await prisma.payslip.findMany({
      where: {
        payrollId: {
          in: validatedPayrolls.map((p) => p.id),
        },
      },
      select: { payrollId: true },
    })

    const existingPayrollIds = new Set(existingPayslips.map((p) => p.payrollId))
    const payrollsToProcess = validatedPayrolls.filter(
      (p) => !existingPayrollIds.has(p.id)
    )

    const createdPayslips = []

    for (const payroll of payrollsToProcess) {
      const payslip = await prisma.payslip.create({
        data: {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          userId: payroll.employee.user.id,
          status: 'validated',
        },
      })

      createdPayslips.push(payslip)
    }

    res.json({
      status: 'success',
      message: `Generated ${createdPayslips.length} payslips`,
      data: {
        payslipsCreated: createdPayslips.length,
        totalValidated: validatedPayrolls.length,
        alreadyExisted: existingPayslips.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const downloadPayslip = async (req, res, next) => {
  try {
    const { payslipId } = req.params
    const user = req.user

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        payroll: {
          include: {
            payrun: true,
          },
        },
      },
    })

    if (!payslip) {
      return res.status(404).json({
        status: 'error',
        message: 'Payslip not found',
        error: 'Not Found',
      })
    }

    if (user.role === 'employee') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      })
      if (!employee || employee.id !== payslip.employeeId) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
          error: 'Forbidden',
        })
      }
    }

    
    try {
      const pdfBuffer = await generatePayslipPDF(payslip, payslip.employee, payslip.payroll)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslipId}.pdf`)
      res.send(pdfBuffer)
    } catch (pdfError) {
      res.json({
        status: 'success',
        message: 'PDF generation not available, returning payslip data',
        data: {
          id: payslip.id,
          employee: payslip.employee,
          payroll: payslip.payroll,
          pdfUrl: payslip.pdfUrl,
        },
      })
    }
  } catch (error) {
    next(error)
  }
}

