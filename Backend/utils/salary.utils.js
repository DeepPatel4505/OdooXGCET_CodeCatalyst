import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getActiveSalaryStructure = async (employeeId, asOfDate = new Date()) => {
  return await prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: asOfDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: asOfDate } },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  })
}

export const getSalaryData = async (employeeId, employeeSalary = 0) => {
  const salaryStructure = await getActiveSalaryStructure(employeeId)
  
  if (salaryStructure) {
    return {
      monthWage: salaryStructure.monthWage || salaryStructure.grossSalary || employeeSalary || 0,
      yearlyWage: salaryStructure.yearlyWage || (salaryStructure.monthWage || salaryStructure.grossSalary || employeeSalary || 0) * 12,
      workingDaysPerWeek: salaryStructure.workingDaysPerWeek,
      breakTime: salaryStructure.breakTime,
      basicSalary: salaryStructure.basicSalary || 0,
      basicSalaryPercent: salaryStructure.basicSalaryPercent,
      houseRentAllowance: salaryStructure.houseRentAllowance || 0,
      hraPercent: salaryStructure.hraPercent,
      standardAllowance: salaryStructure.standardAllowance || 0,
      standardAllowancePercent: salaryStructure.standardAllowancePercent,
      performanceBonus: salaryStructure.performanceBonus || 0,
      performanceBonusPercent: salaryStructure.performanceBonusPercent,
      travelAllowance: salaryStructure.travelAllowance || 0,
      ltaPercent: salaryStructure.ltaPercent,
      fixedAllowance: salaryStructure.fixedAllowance || 0,
      fixedAllowancePercent: salaryStructure.fixedAllowancePercent,
      grossSalary: salaryStructure.grossSalary || 0,
      pfEmployee: salaryStructure.pfEmployee || 0,
      pfEmployeePercent: salaryStructure.pfEmployeePercent,
      pfEmployer: salaryStructure.pfEmployer || 0,
      pfEmployerPercent: salaryStructure.pfEmployerPercent,
      professionalTax: salaryStructure.professionalTax || 0,
      tds: salaryStructure.tds || 0,
      otherDeductions: salaryStructure.otherDeductions || 0,
      totalDeductions: salaryStructure.totalDeductions || 0,
      netSalary: salaryStructure.netSalary || 0,
    }
  }
  
  const monthWage = employeeSalary || 0
  const basicSalary = monthWage * 0.5
  const hra = basicSalary * 0.5
  const standardAllowance = monthWage * 0.1667
  const performanceBonus = basicSalary * 0.0833
  const travelAllowance = basicSalary * 0.0833
  const fixedAllowance = monthWage * 0.1167
  const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + travelAllowance + fixedAllowance
  const pfEmployee = basicSalary * 0.12
  const pfEmployer = basicSalary * 0.12
  const professionalTax = 200
  const totalDeductions = pfEmployee + professionalTax
  const netSalary = grossSalary - totalDeductions
  
  return {
    monthWage,
    yearlyWage: monthWage * 12,
    workingDaysPerWeek: null,
    breakTime: null,
    basicSalary,
    basicSalaryPercent: 50.0,
    houseRentAllowance: hra,
    hraPercent: 50.0,
    standardAllowance,
    standardAllowancePercent: 16.67,
    performanceBonus,
    performanceBonusPercent: 8.33,
    travelAllowance,
    ltaPercent: 8.33,
    fixedAllowance,
    fixedAllowancePercent: 11.67,
    grossSalary,
    pfEmployee,
    pfEmployeePercent: 12.0,
    pfEmployer,
    pfEmployerPercent: 12.0,
    professionalTax,
    tds: 0,
    otherDeductions: 0,
    totalDeductions,
    netSalary,
  }
}

