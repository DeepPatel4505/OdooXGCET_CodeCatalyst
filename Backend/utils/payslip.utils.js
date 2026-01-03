import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to calculate salary computation (same as in payslip controller)
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

  return {
    proratedBasic,
    hra,
    standardAllowance,
    lta,
    bonus,
    fixedAllowance,
    grossTotal,
    pfEmployee,
    professionalTax,
    otherDeductions,
    deductionsTotal,
    netAmount,
    workingDays,
    attendanceRatio,
    daysPresent,
    totalPaidLeaves,
    totalWorkingDays,
  }
}

export const generatePayslipPDF = async (payslip, employee, payroll) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).text('WorkZen HRMS', { align: 'center' })
      doc.fontSize(14).text('Payslip', { align: 'center' })
      doc.moveDown()

      doc.fontSize(12)
      doc.text(`Employee: ${employee.firstName} ${employee.lastName}`)
      doc.text(`Employee ID: ${employee.employeeId}`)
      doc.text(`Department: ${employee.department || 'N/A'}`)
      doc.text(`Position: ${employee.position || 'N/A'}`)
      doc.moveDown()

      // Get payrun data
      const payrun = payroll?.payrun
      if (payrun) {
        const payPeriodStart = payrun.payPeriodStart instanceof Date 
          ? payrun.payPeriodStart.toISOString().split('T')[0]
          : payrun.payPeriodStart
        const payPeriodEnd = payrun.payPeriodEnd instanceof Date
          ? payrun.payPeriodEnd.toISOString().split('T')[0]
          : payrun.payPeriodEnd
        const payDate = payrun.payDate instanceof Date
          ? payrun.payDate.toISOString().split('T')[0]
          : payrun.payDate
        
        doc.text(`Pay Period: ${payPeriodStart} - ${payPeriodEnd}`)
        doc.text(`Pay Date: ${payDate}`)
        doc.moveDown()

        // Get attendance and leaves
        const attendances = await prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: {
              gte: payrun.payPeriodStart,
              lte: payrun.payPeriodEnd,
            },
          },
        })

        const paidLeaves = await prisma.leave.findMany({
          where: {
            employeeId: employee.id,
            type: { in: ['sick', 'vacation', 'personal'] },
            status: 'approved',
            startDate: { lte: payrun.payPeriodEnd },
            endDate: { gte: payrun.payPeriodStart },
          },
        })

        const daysPresent = attendances.filter((a) => a.status === 'present').length
        const totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
          const overlapStart = new Date(Math.max(leave.startDate.getTime(), payrun.payPeriodStart.getTime()))
          const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payrun.payPeriodEnd.getTime()))
          const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
          return sum + Math.max(0, overlapDays)
        }, 0)

        const totalWorkingDays = 22
        const workingDays = daysPresent + totalPaidLeaves
        const attendanceRatio = workingDays / totalWorkingDays
        const attendancePercent = Math.round(attendanceRatio * 100 * 100) / 100

        doc.text(`Attendance: ${workingDays} / ${totalWorkingDays} days (${attendancePercent}%)`)
        doc.moveDown()

        // Get salary structure
        const salaryStructure = await prisma.salaryStructure.findFirst({
          where: {
            employeeId: employee.id,
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
          const computation = calculateSalaryComputation(
            salaryStructure,
            daysPresent,
            totalPaidLeaves,
            totalWorkingDays
          )

          doc.fontSize(14).text('Earnings', { underline: true })
          doc.fontSize(12)
          doc.text(`Basic Salary: Rs${computation.proratedBasic.toFixed(2)}`)
          if (computation.hra > 0) {
            doc.text(`House Rent Allowance: Rs ${computation.hra.toFixed(2)}`)
          }
          if (computation.standardAllowance > 0) {
            doc.text(`Standard Allowance: Rs ${computation.standardAllowance.toFixed(2)}`)
          }
          if (computation.bonus > 0) {
            doc.text(`Performance Bonus: Rs ${computation.bonus.toFixed(2)}`)
          }
          if (computation.lta > 0) {
            doc.text(`Travel Allowance: Rs ${computation.lta.toFixed(2)}`)
          }
          if (computation.fixedAllowance > 0) {
            doc.text(`Fixed Allowance: Rs ${computation.fixedAllowance.toFixed(2)}`)
          }
          doc.text(`Gross Salary: Rs ${computation.grossTotal.toFixed(2)}`, { bold: true })
          doc.moveDown()

          doc.fontSize(14).text('Deductions', { underline: true })
          doc.fontSize(12)
          if (computation.pfEmployee > 0) {
            doc.text(`PF Employee: Rs ${computation.pfEmployee.toFixed(2)}`)
          }
          if (computation.professionalTax > 0) {
            doc.text(`Professional Tax: Rs ${computation.professionalTax.toFixed(2)}`)
          }
          if (computation.otherDeductions > 0) {
            doc.text(`Other Deductions: Rs ${computation.otherDeductions.toFixed(2)}`)
          }
          doc.text(`Total Deductions: Rs ${computation.deductionsTotal.toFixed(2)}`, { bold: true })
          doc.moveDown()

          doc.fontSize(16).text(`Net Salary: Rs ${computation.netAmount.toFixed(2)}`, { bold: true, align: 'right' })
        } else {
          // Fallback to payroll data if salary structure not found
          doc.fontSize(14).text('Earnings', { underline: true })
          doc.fontSize(12)
          doc.text(`Gross Salary: Rs ${(payroll?.grossSalary || 0).toFixed(2)}`)
          doc.moveDown()

          doc.fontSize(14).text('Deductions', { underline: true })
          doc.fontSize(12)
          doc.text(`Total Deductions: Rs ${(payroll?.totalDeductions || 0).toFixed(2)}`)
          doc.moveDown()

          doc.fontSize(16).text(`Net Salary: Rs ${(payroll?.netSalary || 0).toFixed(2)}`, { bold: true, align: 'right' })
        }
      } else {
        // Fallback if no payrun data
        doc.fontSize(14).text('Earnings', { underline: true })
        doc.fontSize(12)
        doc.text(`Gross Salary: Rs ${(payroll?.grossSalary || 0).toFixed(2)}`)
        doc.moveDown()

        doc.fontSize(14).text('Deductions', { underline: true })
        doc.fontSize(12)
        doc.text(`Total Deductions: Rs ${(payroll?.totalDeductions || 0).toFixed(2)}`)
        doc.moveDown()

        doc.fontSize(16).text(`Net Salary: Rs ${(payroll?.netSalary || 0).toFixed(2)}`, { bold: true, align: 'right' })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

