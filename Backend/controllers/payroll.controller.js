import { PrismaClient } from "@prisma/client";
import { calculatePayroll } from "../utils/payroll.utils.js";

const prisma = new PrismaClient();

export const getPayrollDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    const payrunWhere = user.companyId
      ? {
          payrolls: {
            some: {
              employee: {
                companyId: user.companyId,
              },
            },
          },
        }
      : {};

    const recentPayruns = await prisma.payrun.findMany({
      where: payrunWhere,
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        payPeriodStart: true,
        payPeriodEnd: true,
        payDate: true,
        status: true,
        totalEmployees: true,
        totalAmount: true,
      },
    });

    const warnings = [];

    // Check for employees without bank account
    const employeesWithoutBank = await prisma.employee.count({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
        OR: [
          { accountNumber: null },
          { accountNumber: "" },
          { bankName: null },
          { bankName: "" },
        ],
      },
    });

    if (employeesWithoutBank > 0) {
      warnings.push({
        type: "noBankAccount",
        count: employeesWithoutBank,
        message: `${employeesWithoutBank} employee(s) without bank account details`,
      });
    }

    // Check for employees without phone number
    const employeesWithoutPhone = await prisma.employee.count({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
        OR: [{ phone: null }, { phone: "" }],
      },
    });

    if (employeesWithoutPhone > 0) {
      warnings.push({
        type: "noPhone",
        count: employeesWithoutPhone,
        message: `${employeesWithoutPhone} employee(s) without phone number`,
      });
    }

    // Check for employees without PAN number
    const employeesWithoutPAN = await prisma.employee.count({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
        OR: [{ panNo: null }, { panNo: "" }],
      },
    });

    if (employeesWithoutPAN > 0) {
      warnings.push({
        type: "noPAN",
        count: employeesWithoutPAN,
        message: `${employeesWithoutPAN} employee(s) without PAN number`,
      });
    }

    // Check for employees without UAN number
    const employeesWithoutUAN = await prisma.employee.count({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
        OR: [{ uanNo: null }, { uanNo: "" }],
      },
    });

    if (employeesWithoutUAN > 0) {
      warnings.push({
        type: "noUAN",
        count: employeesWithoutUAN,
        message: `${employeesWithoutUAN} employee(s) without UAN number`,
      });
    }

    // Check for employees without address
    const employeesWithoutAddress = await prisma.employee.count({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
        OR: [{ address: null }, { address: "" }],
      },
    });

    if (employeesWithoutAddress > 0) {
      warnings.push({
        type: "noAddress",
        count: employeesWithoutAddress,
        message: `${employeesWithoutAddress} employee(s) without address`,
      });
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const payrunsForAnalytics = await prisma.payrun.findMany({
      where: {
        ...payrunWhere,
        payDate: {
          gte: twelveMonthsAgo,
        },
        status: "completed",
      },
      include: {
        payrolls: {
          include: {
            employee: {
              select: {
                id: true,
                companyId: true,
              },
            },
          },
        },
      },
      orderBy: {
        payDate: "asc",
      },
    });

    const monthlyCosts = {};
    const monthlyCounts = {};

    payrunsForAnalytics.forEach((payrun) => {
      const monthKey = `${payrun.payDate.getFullYear()}-${String(
        payrun.payDate.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthName = payrun.payDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = { month: monthName, cost: 0 };
        monthlyCounts[monthKey] = { month: monthName, count: 0 };
      }

      monthlyCosts[monthKey].cost += payrun.totalAmount || 0;
      monthlyCounts[monthKey].count += payrun.totalEmployees || 0;
    });

    const employeeCostAnnually = Object.values(monthlyCosts).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA - dateB;
    });

    const employeeCostMonthly = Object.values(monthlyCosts)
      .slice(-6)
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });

    const employeeCountAnnually = Object.values(monthlyCounts).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA - dateB;
    });

    const employeeCountMonthly = Object.values(monthlyCounts)
      .slice(-6)
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });

    res.json({
      status: "success",
      data: {
        warnings,
        recentPayruns: recentPayruns.map((payrun) => ({
          id: payrun.id,
          name: payrun.name,
          payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
          payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
          payDate: payrun.payDate.toISOString().split("T")[0],
          status: payrun.status,
          totalEmployees: payrun.totalEmployees,
          totalAmount: payrun.totalAmount,
        })),
        employeeCost: {
          annually: employeeCostAnnually,
          monthly: employeeCostMonthly,
        },
        employeeCount: {
          annually: employeeCountAnnually,
          monthly: employeeCountMonthly,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayruns = async (req, res, next) => {
  try {
    const user = req.user;
    const { year, month } = req.query;


    const companyFilter = user.companyId
      ? {
          payrolls: {
            some: {
              employee: {
                companyId: user.companyId,
              },
            },
          },
        }
      : {};

    const dateFilter = {};
    if (year && month) {
      const selectedYear = parseInt(year);
      const selectedMonth = parseInt(month) - 1;
      // Use UTC to ensure correct date range regardless of server timezone
      const startOfMonth = new Date(
        Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0)
      );
      const endOfMonth = new Date(
        Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)
      );

      dateFilter.payPeriodStart = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (year) {
      const selectedYear = parseInt(year);
      // Use UTC to ensure correct date range regardless of server timezone
      const startOfYear = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0, 0));
      const endOfYear = new Date(
        Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999)
      );

      dateFilter.payPeriodStart = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const where = {
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
    };

    const payruns = await prisma.payrun.findMany({
      where,
      orderBy: {
        createdAt: "desc",
        createdAt: "desc",
      },
    });

    // console.log(payruns);

    const formattedPayruns = payruns.map((payrun) => ({
      id: payrun.id,
      name: payrun.name,
      payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
      payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
      payDate: payrun.payDate.toISOString().split("T")[0],
      payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
      payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
      payDate: payrun.payDate.toISOString().split("T")[0],
      status: payrun.status,
      totalEmployees: payrun.totalEmployees,
      totalAmount: payrun.totalAmount,
      createdAt: payrun.createdAt.toISOString(),
      updatedAt: payrun.updatedAt.toISOString(),
    }));

    res.json({
      status: "success",
      data: formattedPayruns,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentMonthPayrun = async (req, res, next) => {
  try {
    const user = req.user;
    const { year, month } = req.query;

    const now = new Date();
    const selectedYear = year ? parseInt(year) : now.getFullYear();
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();

    // Use UTC to ensure correct date range regardless of server timezone
    const startOfMonth = new Date(
      Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0, 0)
    );
    const endOfMonth = new Date(
      Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)
    );

    const companyFilter = user.companyId
      ? {
          payrolls: {
            some: {
              employee: {
                companyId: user.companyId,
              },
            },
          },
        }
      : {};

    const payrun = await prisma.payrun.findFirst({
      where: {
        AND: [
          {
            payPeriodStart: {
              gte: startOfMonth,
            },
          },
          {
            payPeriodStart: {
              lte: endOfMonth,
            },
          },
          companyFilter,
        ],
      },
      include: {
        payrolls: {
          where: user.companyId
            ? {
                employee: {
                  companyId: user.companyId,
                },
              }
            : {},
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
            payslip: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!payrun) {
      return res.json({
        status: "success",
        data: null,
        message: "No payrun found for current month",
      });
    }

    const employeeIds =
      payrun.payrolls.length > 0
        ? payrun.payrolls.map((p) => p.employeeId)
        : [];
    const salaryStructures =
      employeeIds.length > 0
        ? await prisma.salaryStructure.findMany({
            where: {
              employeeId: { in: employeeIds },
              effectiveFrom: { lte: payrun.payPeriodStart },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: payrun.payPeriodStart } },
              ],
            },
            orderBy: {
              effectiveFrom: "desc",
            },
          })
        : [];

    const structureMap = new Map();
    salaryStructures.forEach((struct) => {
      if (!structureMap.has(struct.employeeId)) {
        structureMap.set(struct.employeeId, struct);
      }
    });

    const formattedPayrun = {
      id: payrun.id,
      name: payrun.name,
      payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
      payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
      payDate: payrun.payDate.toISOString().split("T")[0],
      status: payrun.status,
      totalEmployees: payrun.totalEmployees,
      totalAmount: payrun.totalAmount,
      createdAt: payrun.createdAt.toISOString(),
      updatedAt: payrun.updatedAt.toISOString(),
      payrolls: payrun.payrolls.map((payroll) => {
        const structure = structureMap.get(payroll.employeeId);
        const basicWage = structure?.basicSalary || 0;

        return {
          id: payroll.id,
          employeeId: payroll.employeeId,
          employee: {
            id: payroll.employee.id,
            employeeId: payroll.employee.employeeId,
            name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
            department: payroll.employee.department,
            position: payroll.employee.position,
          },
          status: payroll.status === "validated" ? "Done" : payroll.status,
          grossSalary: payroll.grossSalary,
          totalDeductions: payroll.totalDeductions,
          netSalary: payroll.netSalary,
          employerCost: payroll.grossSalary,
          basicWage,
          grossWage: payroll.grossSalary,
          netWage: payroll.netSalary,
          computedAt: payroll.computedAt?.toISOString(),
          validatedAt: payroll.validatedAt?.toISOString(),
          hasPayslip: !!payroll.payslip,
          payslipId: payroll.payslip?.id,
          payslipStatus: payroll.payslip?.status,
        };
      }),
    };

    res.json({
      status: "success",
      data: formattedPayrun,
    });
  } catch (error) {
    next(error);
  }
};

export const createPayrun = async (req, res, next) => {
  try {
    const { name, payPeriodStart, payPeriodEnd, payDate } = req.body;

    const payrun = await prisma.payrun.create({
      data: {
        name,
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
        payDate: new Date(payDate),
        status: "draft",
        totalEmployees: 0,
        totalAmount: 0,
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        id: payrun.id,
        name: payrun.name,
        payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
        payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
        payDate: payrun.payDate.toISOString().split("T")[0],
        status: payrun.status,
        totalEmployees: payrun.totalEmployees,
        totalAmount: payrun.totalAmount,
        createdAt: payrun.createdAt.toISOString(),
        updatedAt: payrun.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const previewPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params;
    const user = req.user;

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    });

    if (user.companyId && payrun) {
      const payrunHasCompanyEmployees = await prisma.payroll.findFirst({
        where: {
          payrunId: payrun.id,
          employee: {
            companyId: user.companyId,
          },
        },
      });
      if (!payrunHasCompanyEmployees) {
        return res.status(404).json({
          status: "error",
          message: "Payrun not found",
          error: "Not Found",
        });
      }
    }

    if (!payrun) {
      return res.status(404).json({
        status: "error",
        message: "Payrun not found",
        error: "Not Found",
      });
    }

    const employees = await prisma.employee.findMany({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const payrolls = [];
    let totalAmount = 0;
    const errors = [];

    for (const employee of employees) {
      try {
        const calculation = await calculatePayroll(employee, payrun);
        payrolls.push({
          id: `preview-${employee.id}`,
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          grossSalary: calculation.grossSalary,
          totalDeductions: calculation.totalDeductions,
          netSalary: calculation.netSalary,
        });
        totalAmount += calculation.netSalary;
      } catch (error) {
        errors.push({
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          error: error.message,
        });
      }
    }

    res.json({
      status: "success",
      data: {
        payrun: {
          id: payrun.id,
          name: payrun.name,
          payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
          payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
          payDate: payrun.payDate.toISOString().split("T")[0],
          status: payrun.status,
          totalEmployees: employees.length,
          totalAmount,
        },
        payrolls,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const processPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params;
    const user = req.user;

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    });

    if (user.companyId && payrun) {
      const existingPayrolls = await prisma.payroll.findMany({
        where: { payrunId },
      });
      if (existingPayrolls.length > 0) {
        const payrunHasCompanyEmployees = await prisma.payroll.findFirst({
          where: {
            payrunId: payrun.id,
            employee: {
              companyId: user.companyId,
            },
          },
        });
        if (!payrunHasCompanyEmployees) {
          return res.status(404).json({
            status: "error",
            message: "Payrun not found",
            error: "Not Found",
          });
        }
      }
    }

    if (!payrun) {
      return res.status(404).json({
        status: "error",
        message: "Payrun not found",
        error: "Not Found",
      });
    }

    if (payrun.status !== "draft") {
      return res.status(400).json({
        status: "error",
        message: "Payrun is not in draft status",
        error: "Validation Error",
      });
    }

    const existingPayrolls = await prisma.payroll.findMany({
      where: { payrunId },
    });

    if (existingPayrolls.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Payrolls already generated for this payrun",
        error: "Validation Error",
      });
    }

    await prisma.payrun.update({
      where: { id: payrunId },
      data: { status: "processing" },
    });

    const employees = await prisma.employee.findMany({
      where: {
        status: "active",
        ...(user.companyId ? { companyId: user.companyId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    let totalAmount = 0;
    const createdPayrolls = [];
    const errors = [];

    for (const employee of employees) {
      try {
        const calculation = await calculatePayroll(employee, payrun);

        const payroll = await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            payrunId: payrun.id,
            status: "computed",
            grossSalary: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            netSalary: calculation.netSalary,
            computedAt: new Date(),
          },
        });

        createdPayrolls.push(payroll);
        totalAmount += calculation.netSalary;
      } catch (error) {
        errors.push({
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          error: error.message,
        });
      }
    }

    const updated = await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: "draft",
        totalEmployees: createdPayrolls.length,
        totalAmount,
      },
    });

    res.json({
      status: "success",
      message: `Generated ${createdPayrolls.length} payroll records`,
      data: {
        id: updated.id,
        status: updated.status,
        totalEmployees: updated.totalEmployees,
        totalAmount: updated.totalAmount,
        payrollsCreated: createdPayrolls.length,
        errors: errors.length > 0 ? errors : undefined,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    try {
      await prisma.payrun.update({
        where: { id: req.params.payrunId },
        data: { status: "draft" },
      });
    } catch (revertError) {}
    next(error);
  }
};

export const getPayrollsByPayrun = async (req, res, next) => {
  try {
    const { payrunId } = req.params;
    const user = req.user;

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    });

    if (!payrun) {
      return res.status(404).json({
        status: "error",
        message: "Payrun not found",
        error: "Not Found",
      });
    }

    if (user.companyId) {
      const payrunHasCompanyEmployees = await prisma.payroll.findFirst({
        where: {
          payrunId: payrun.id,
          employee: {
            companyId: user.companyId,
          },
        },
      });
      if (!payrunHasCompanyEmployees) {
        return res.status(404).json({
          status: "error",
          message: "Payrun not found",
          error: "Not Found",
        });
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where: {
        payrunId,
        ...(user.companyId
          ? {
              employee: {
                companyId: user.companyId,
              },
            }
          : {}),
      },
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
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const employeeIds = payrolls.map((p) => p.employeeId);
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: {
        employeeId: { in: employeeIds },
        effectiveFrom: { lte: payrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: payrun.payPeriodStart } },
        ],
      },
    });

    salaryStructures.forEach((struct) => {
      if (!structureMap.has(struct.employeeId)) {
        structureMap.set(struct.employeeId, struct);
      }
    });

    // Calculate prorated basic salary for each payroll based on attendance
    const formattedPayrolls = await Promise.all(payrolls.map(async (payroll) => {
      const structure = structureMap.get(payroll.employeeId)
      const baseBasicSalary = structure?.basicSalary || 0

      // Get attendance data for the pay period
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: payroll.employeeId,
          date: {
            gte: payrun.payPeriodStart,
            lte: payrun.payPeriodEnd,
          },
        },
      })

      // Get paid leaves for the pay period
      const paidLeaves = await prisma.leave.findMany({
        where: {
          employeeId: payroll.employeeId,
          type: { in: ['sick', 'vacation', 'personal'] },
          status: 'approved',
          startDate: { lte: payrun.payPeriodEnd },
          endDate: { gte: payrun.payPeriodStart },
        },
      })

      // Calculate present days and paid leaves
      const daysPresent = attendances.filter((a) => a.status === 'present').length
      const totalPaidLeaves = paidLeaves.reduce((sum, leave) => {
        const overlapStart = new Date(Math.max(leave.startDate.getTime(), payrun.payPeriodStart.getTime()))
        const overlapEnd = new Date(Math.min(leave.endDate.getTime(), payrun.payPeriodEnd.getTime()))
        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1
        return sum + Math.max(0, overlapDays)
      }, 0)

      // Calculate attendance ratio
      const totalWorkingDays = 22
      const workingDays = daysPresent + totalPaidLeaves
      const attendanceRatio = workingDays > 0 && totalWorkingDays > 0
        ? workingDays / totalWorkingDays
        : 1.0

      // Calculate prorated basic salary
      const basicWage = Math.round((baseBasicSalary * attendanceRatio) * 100) / 100

      return {
        id: payroll.id,
        payPeriod: payrun.name,
        employee: {
          id: payroll.employee.id,
          employeeId: payroll.employee.employeeId,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          department: payroll.employee.department,
          position: payroll.employee.position,
        },
        employerCost: payroll.grossSalary,
        basicWage,
        grossWage: payroll.grossSalary,
        netWage: payroll.netSalary,
        status: payroll.status === "validated" ? "Done" : payroll.status,
        hasPayslip: !!payroll.payslip,
        payslipId: payroll.payslip?.id,
        payslipStatus: payroll.payslip?.status,
      }
    }))

    res.json({
      status: "success",
      data: {
        payrun: {
          id: payrun.id,
          name: payrun.name,
          payPeriodStart: payrun.payPeriodStart.toISOString().split("T")[0],
          payPeriodEnd: payrun.payPeriodEnd.toISOString().split("T")[0],
          payDate: payrun.payDate.toISOString().split("T")[0],
          status: payrun.status,
        },
        payrolls: formattedPayrolls,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollsByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    if (user.role === "employee") {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          status: "error",
          message: "Insufficient permissions",
          error: "Forbidden",
        });
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where: { employeeId },
      include: {
        payrun: {
          select: {
            id: true,
            name: true,
            payPeriodStart: true,
            payPeriodEnd: true,
            payDate: true,
            status: true,
          },
        },
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      status: "success",
      data: payrolls,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollById = async (req, res, next) => {
  try {
    const { payrollId } = req.params;
    const user = req.user;

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
            status: true,
          },
        },
        payslip: {
          select: {
            id: true,
            pdfUrl: true,
            status: true,
          },
        },
      },
    });

    if (!payroll) {
      return res.status(404).json({
        status: "error",
        message: "Payroll not found",
        error: "Not Found",
      });
    }

    if (user.role === "employee") {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });
      if (!employee || employee.id !== payroll.employeeId) {
        return res.status(403).json({
          status: "error",
          message: "Insufficient permissions",
          error: "Forbidden",
        });
      }
    }

    res.json({
      status: "success",
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params;
    const { grossSalary, totalDeductions, netSalary } = req.body;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });

    if (!payroll) {
      return res.status(404).json({
        status: "error",
        message: "Payroll not found",
        error: "Not Found",
      });
    }

    if (payroll.status === "validated") {
      return res.status(400).json({
        status: "error",
        message: "Cannot edit validated payroll",
        error: "Validation Error",
      });
    }

    const calculatedNet =
      netSalary !== undefined
        ? netSalary
        : (grossSalary || payroll.grossSalary) -
          (totalDeductions || payroll.totalDeductions);

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        grossSalary:
          grossSalary !== undefined ? grossSalary : payroll.grossSalary,
        totalDeductions:
          totalDeductions !== undefined
            ? totalDeductions
            : payroll.totalDeductions,
        netSalary: calculatedNet,
      },
    });

    res.json({
      status: "success",
      message: "Payroll updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const validatePayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        payrun: true,
      },
    });

    if (!payroll) {
      return res.status(404).json({
        status: "error",
        message: "Payroll not found",
        error: "Not Found",
      });
    }

    if (payroll.status !== "computed" && payroll.status !== "draft") {
      return res.status(400).json({
        status: "error",
        message: `Payroll is not in computed or draft status. Current status: ${payroll.status}`,
        error: "Validation Error",
      });
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: "validated",
        validatedAt: new Date(),
      },
    });

    const allPayrolls = await prisma.payroll.findMany({
      where: { payrunId: payroll.payrunId },
    });

    const allValidated = allPayrolls.every((p) => p.status === "validated");
    const totalAmount = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

    if (allValidated) {
      await prisma.payrun.update({
        where: { id: payroll.payrunId },
        data: {
          status: "completed",
          totalAmount,
        },
      });
    }

    res.json({
      status: "success",
      message: "Payroll validated successfully",
      data: {
        ...updated,
        payrunCompleted: allValidated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const validateAllPayrolls = async (req, res, next) => {
  try {
    const { payrunId } = req.params;

    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
    });

    if (!payrun) {
      return res.status(404).json({
        status: "error",
        message: "Payrun not found",
        error: "Not Found",
      });
    }

    const payrolls = await prisma.payroll.findMany({
      where: {
        payrunId,
        status: { in: ["draft", "computed"] },
      },
    });

    if (payrolls.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No payrolls to validate",
        error: "Validation Error",
      });
    }

    await prisma.payroll.updateMany({
      where: {
        payrunId,
        status: { in: ["draft", "computed"] },
      },
      data: {
        status: "validated",
        validatedAt: new Date(),
      },
    });

    const allPayrolls = await prisma.payroll.findMany({
      where: { payrunId },
    });

    const totalAmount = allPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

    await prisma.payrun.update({
      where: { id: payrunId },
      data: {
        status: "completed",
        totalAmount,
      },
    });

    res.json({
      status: "success",
      message: `Validated ${payrolls.length} payroll(s) successfully`,
      data: {
        validatedCount: payrolls.length,
        payrunStatus: "completed",
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
