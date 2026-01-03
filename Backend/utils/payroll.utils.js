import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getActiveSalaryStructure = async (employeeId, date) => {
  const targetDate = date || new Date()

  const structure = await prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      AND: [
        {
          effectiveFrom: {
            lte: targetDate,
          },
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: targetDate } },
          ],
        },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  })

  return structure
}

export const calculatePayroll = async (employee, payrun) => {
  const salaryStructure = await getActiveSalaryStructure(
    employee.id,
    payrun.payPeriodStart
  )

  if (!salaryStructure) {
    throw new Error(
      `No active salary structure found for employee ${employee.employeeId}`
    )
  }

  // Get attendance data for the pay period
  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: employee.id,
      date: {
        gte: payrun.payPeriodStart,
        lte: payrun.payPeriodEnd,
      },
    },
  })

  // Get paid leaves for the pay period
  const paidLeaves = await prisma.leave.findMany({
    where: {
      employeeId: employee.id,
      type: { in: ['sick', 'vacation', 'personal'] },
      status: 'approved',
      startDate: { lte: payrun.payPeriodEnd },
      endDate: { gte: payrun.payPeriodStart },
    },
  })

  // Calculate present days (actual attendance)
  const daysPresent = attendances.filter((a) => a.status === 'present').length

  // Calculate paid leave days (overlap with pay period)
  const totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
    const overlapStart = new Date(Math.max(leave.startDate.getTime(), payrun.payPeriodStart.getTime()))
    const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payrun.payPeriodEnd.getTime()))
    const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
    return sum + Math.max(0, overlapDays)
  }, 0)

  // Total working days = present days + paid leaves
  const workingDays = daysPresent + totalPaidLeaves

  // Standard working days per month (22 days)
  const totalWorkingDays = 22

  // Calculate attendance ratio = (daysPresent + paidLeaves) / totalWorkingDays
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
  const grossSalary = Math.round((proratedBasic + hra + standardAllowance + lta + bonus + fixedAllowance) * 100) / 100

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

  const totalDeductions = Math.round((pfEmployee + professionalTax + otherDeductions) * 100) / 100

  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100

  return {
    grossSalary,
    totalDeductions,
    netSalary,
    salaryStructure,
    computedBaseSalary: proratedBasic,
    attendanceRatio,
    workingDays,
    daysPresent,
    totalPaidLeaves,
    totalWorkingDays,
    // Return calculated components for reference
    calculatedComponents: {
      baseSalary: proratedBasic,
      houseRentAllowance: hra,
      standardAllowance,
      performanceBonus: bonus,
      travelAllowance: lta,
      fixedAllowance,
      pfEmployee,
      professionalTax,
      otherDeductions,
    },
  }
}

