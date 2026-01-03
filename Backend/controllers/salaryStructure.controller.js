import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const upsertSalaryStructure = async (req, res, next) => {
  try {
    const { employeeId } = req.params
    const {
      name,
      description,
      effectiveFrom,
      // General work info
      monthWage,
      yearlyWage,
      workingDaysPerWeek,
      breakTime,
      // Earnings
      basicSalary,
      basicSalaryPercent,
      houseRentAllowance,
      hraPercent,
      standardAllowance,
      standardAllowancePercent,
      performanceBonus,
      performanceBonusPercent,
      travelAllowance,
      ltaPercent,
      fixedAllowance,
      fixedAllowancePercent,
      // Deductions
      pfEmployee,
      pfEmployeePercent,
      pfEmployer,
      pfEmployerPercent,
      professionalTax,
      tds,
      otherDeductions,
    } = req.body

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
        error: 'Not Found',
      })
    }

    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    })

    const currentDate = new Date()
    const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : currentDate

    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFromDate },
      })
    }

    const basic = basicSalary || 0
    const hra = houseRentAllowance || 0
    const standard = standardAllowance || 0
    const performance = performanceBonus || 0
    const travel = travelAllowance || 0
    const fixed = fixedAllowance || 0

    const grossSalary = basic + hra + standard + performance + travel + fixed

    const pfEmp = pfEmployee || 0
    const pfEmpPercent = pfEmployeePercent
    const pfEmpr = pfEmployer || 0
    const pfEmprPercent = pfEmployerPercent
    const profTax = professionalTax || 0
    const tdsAmount = tds || 0
    const other = otherDeductions || 0

    const totalDeductions = pfEmp + profTax + tdsAmount + other
    const netSalary = grossSalary - totalDeductions

    const structure = await prisma.salaryStructure.create({
      data: {
        employeeId,
        name: name || (activeStructure ? 'Revised Structure' : 'Default Structure'),
        description: description || null,
        effectiveFrom: effectiveFromDate,
        effectiveTo: null,
        // General work info
        monthWage: monthWage !== undefined ? monthWage : null,
        yearlyWage: yearlyWage !== undefined ? yearlyWage : null,
        workingDaysPerWeek: workingDaysPerWeek !== undefined ? workingDaysPerWeek : null,
        breakTime: breakTime !== undefined ? breakTime : null,
        // Earnings
        basicSalary: basic,
        basicSalaryPercent: basicSalaryPercent !== undefined ? basicSalaryPercent : null,
        houseRentAllowance: hra,
        hraPercent: hraPercent !== undefined ? hraPercent : null,
        standardAllowance: standard,
        standardAllowancePercent: standardAllowancePercent !== undefined ? standardAllowancePercent : null,
        performanceBonus: performance,
        performanceBonusPercent: performanceBonusPercent !== undefined ? performanceBonusPercent : null,
        travelAllowance: travel,
        ltaPercent: ltaPercent !== undefined ? ltaPercent : null,
        fixedAllowance: fixed,
        fixedAllowancePercent: fixedAllowancePercent !== undefined ? fixedAllowancePercent : null,
        // Deductions
        pfEmployee: pfEmp,
        pfEmployeePercent: pfEmpPercent !== undefined ? pfEmpPercent : null,
        pfEmployer: pfEmpr,
        pfEmployerPercent: pfEmprPercent !== undefined ? pfEmprPercent : null,
        professionalTax: profTax,
        tds: tdsAmount,
        otherDeductions: other,
        // Calculated totals
        grossSalary,
        totalDeductions,
        netSalary,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Update employee base salary for quick reference
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        salary: grossSalary,
      },
    })

    res.status(200).json({
      status: 'success',
      message: activeStructure
        ? 'Salary structure updated successfully'
        : 'Salary structure created successfully',
      data: structure,
    })
  } catch (error) {
    next(error)
  }
}

export const getActiveSalaryStructure = async (req, res, next) => {
  try {
    const { employeeId } = req.params

    const structure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    })

    if (!structure) {
      return res.status(404).json({
        status: 'error',
        message: 'No active salary structure found for this employee',
        error: 'Not Found',
      })
    }

    res.json({
      status: 'success',
      data: structure,
    })
  } catch (error) {
    next(error)
  }
}

export const getSalaryHistory = async (req, res, next) => {
  try {
    const { employeeId } = req.params

    const structures = await prisma.salaryStructure.findMany({
      where: { employeeId },
      orderBy: {
        effectiveFrom: 'desc',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    res.json({
      status: 'success',
      data: structures,
    })
  } catch (error) {
    next(error)
  }
}
