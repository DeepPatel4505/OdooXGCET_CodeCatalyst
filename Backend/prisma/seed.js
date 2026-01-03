import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";

const prisma = new PrismaClient();

async function createDefaultSalaryStructure(
  employeeId,
  totalSalary,
  effectiveFrom = new Date()
) {
  // Simple preset split for demo
  const basic = totalSalary * 0.5;
  const hra = totalSalary * 0.25;
  const standardAllowance = totalSalary * 0.1;
  const pfEmployee = basic * 0.12;
  const pfEmployer = basic * 0.12;
  const professionalTax = 200;
  const performanceBonus = totalSalary * 0.05;
  const travelAllowance = totalSalary * 0.02;
  const fixedAllowance = totalSalary * 0.03;
  const tds = totalSalary * 0.01;

  const grossSalary =
    basic +
    hra +
    standardAllowance +
    performanceBonus +
    travelAllowance +
    fixedAllowance;
  const totalDeductions = pfEmployee + professionalTax + tds;
  const netSalary = grossSalary - totalDeductions;

  return prisma.salaryStructure.create({
    data: {
      employeeId,
      name: "Default Salary Structure",
      effectiveFrom,
      // General work info
      monthWage: totalSalary,
      yearlyWage: totalSalary * 12,
      workingDaysPerWeek: 5,
      breakTime: 1.0,
      // Earnings
      basicSalary: basic,
      basicSalaryPercent: 50.0,
      houseRentAllowance: hra,
      hraPercent: 50.0, // 50% of basic salary
      standardAllowance,
      standardAllowancePercent: 10.0,
      performanceBonus,
      performanceBonusPercent: 10.0, // 10% of basic salary
      travelAllowance,
      ltaPercent: 5.0, // 5% of basic salary
      fixedAllowance,
      fixedAllowancePercent: 3.0,
      // Deductions
      pfEmployee,
      pfEmployeePercent: 12.0,
      pfEmployer,
      pfEmployerPercent: 12.0,
      professionalTax,
      tds,
      otherDeductions: 0,
      // Final amounts
      grossSalary,
      totalDeductions,
      netSalary,
    },
  });
}

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create Company
  const companyName = "WorkZen";
  const companyCode = await generateCompanyCode(companyName);
  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: {},
    create: {
      name: companyName,
      code: companyCode,
    },
  });

  console.log(`✅ Created company: ${companyName} (${companyCode})`);

  // Common creator helper
  async function createUserAndEmployee(
    role,
    firstName,
    lastName,
    email,
    hireDate,
    department,
    position,
    totalSalary,
    additionalData = {}
  ) {
    const employeeId = await generateEmployeeId(
      companyCode,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    // Create user
    const user = await prisma.user.upsert({
      where: { email },
      update: { companyId: company.id },
      create: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phone: additionalData.phone || "+1234567890",
        department,
        position,
        employeeId,
        companyId: company.id,
        // Resume fields
        about:
          additionalData.about ||
          `Experienced ${position} with a passion for excellence.`,
        whatILoveAboutMyJob:
          additionalData.whatILoveAboutMyJob ||
          `I love the collaborative environment and opportunities for growth.`,
        interestsAndHobbies:
          additionalData.interestsAndHobbies || "Reading, Technology, Sports",
        skills: additionalData.skills || [
          "Communication",
          "Problem Solving",
          "Team Leadership",
        ],
        certifications: additionalData.certifications || [],
      },
    });

    // Check if employee already exists by userId
    let employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      // Check if employee exists by employeeId
      employee = await prisma.employee.findUnique({
        where: { employeeId },
      });
    }

    // Create or update employee
    if (employee) {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          employeeId,
          userId: user.id,
          email,
          firstName,
          lastName,
          phone: additionalData.phone || "+1234567890",
          department,
          position,
          status: additionalData.status || "active",
          hireDate,
          salary: totalSalary,
          companyId: company.id,
          // Bank details
          accountNumber:
            additionalData.accountNumber ||
            `ACC${Math.floor(Math.random() * 1000000)}`,
          bankName: additionalData.bankName || "HDFC Bank",
          ifscCode: additionalData.ifscCode || "HDFC0001234",
          panNo:
            additionalData.panNo ||
            `PAN${Math.random()
              .toString(36)
              .substring(2, 7)
              .toUpperCase()}${Math.floor(Math.random() * 10)}`,
          uanNo:
            additionalData.uanNo ||
            `${Math.floor(Math.random() * 10000000000)}`,
          // Personal info
          dateOfBirth: additionalData.dateOfBirth || new Date(1990, 0, 1),
          address: additionalData.address || "123 Main Street, City, State",
          nationality: additionalData.nationality || "Indian",
          personalEmail: additionalData.personalEmail || `personal.${email}`,
          gender: additionalData.gender || "Male",
          maritalStatus: additionalData.maritalStatus || "Single",
        },
      });
    } else {
      employee = await prisma.employee.create({
        data: {
          employeeId,
          userId: user.id,
          email,
          firstName,
          lastName,
          phone: additionalData.phone || "+1234567890",
          department,
          position,
          status: additionalData.status || "active",
          hireDate,
          salary: totalSalary,
          companyId: company.id,
          // Bank details
          accountNumber:
            additionalData.accountNumber ||
            `ACC${Math.floor(Math.random() * 1000000)}`,
          bankName: additionalData.bankName || "HDFC Bank",
          ifscCode: additionalData.ifscCode || "HDFC0001234",
          panNo:
            additionalData.panNo ||
            `PAN${Math.random()
              .toString(36)
              .substring(2, 7)
              .toUpperCase()}${Math.floor(Math.random() * 10)}`,
          uanNo:
            additionalData.uanNo ||
            `${Math.floor(Math.random() * 10000000000)}`,
          // Personal info
          dateOfBirth: additionalData.dateOfBirth || new Date(1990, 0, 1),
          address: additionalData.address || "123 Main Street, City, State",
          nationality: additionalData.nationality || "Indian",
          personalEmail: additionalData.personalEmail || `personal.${email}`,
          gender: additionalData.gender || "Male",
          maritalStatus: additionalData.maritalStatus || "Single",
        },
      });
    }

    // Create default salary structure
    await createDefaultSalaryStructure(employee.id, totalSalary, hireDate);

    return { user, employee };
  }

  // Function to create new salary structure (closing old one)
  async function createNewSalaryStructure(
    employeeId,
    totalSalary,
    structureName,
    effectiveFrom
  ) {
    // Find and close current active structure
    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    });

    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFrom },
      });
    }

    // Calculate salary components
    const basic = totalSalary * 0.5;
    const hra = totalSalary * 0.25;
    const standardAllowance = totalSalary * 0.1;
    const pfEmployee = basic * 0.12;
    const pfEmployer = basic * 0.12;
    const professionalTax = 200;
    const performanceBonus = totalSalary * 0.05;
    const travelAllowance = totalSalary * 0.02;
    const fixedAllowance = totalSalary * 0.03;
    const tds = totalSalary * 0.01;
    const otherDeductions = 0;

    const grossSalary =
      basic +
      hra +
      standardAllowance +
      performanceBonus +
      travelAllowance +
      fixedAllowance;
    const totalDeductions =
      pfEmployee + professionalTax + tds + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    return prisma.salaryStructure.create({
      data: {
        employeeId,
        name: structureName,
        description: `Active salary structure for testing payroll`,
        effectiveFrom,
        effectiveTo: null, // Active structure
        // General work info
        monthWage: totalSalary,
        yearlyWage: totalSalary * 12,
        workingDaysPerWeek: 5,
        breakTime: 1.0,
        // Earnings
        basicSalary: basic,
        basicSalaryPercent: 50.0,
        houseRentAllowance: hra,
        hraPercent: 50.0, // 50% of basic salary
        standardAllowance,
        standardAllowancePercent: 10.0,
        performanceBonus,
        performanceBonusPercent: 10.0, // 10% of basic salary
        travelAllowance,
        ltaPercent: 5.0, // 5% of basic salary
        fixedAllowance,
        fixedAllowancePercent: 3.0,
        // Deductions
        pfEmployee,
        pfEmployeePercent: 12.0,
        pfEmployer,
        pfEmployerPercent: 12.0,
        professionalTax,
        tds,
        otherDeductions,
        // Final amounts
        grossSalary,
        totalDeductions,
        netSalary,
      },
    });
  }

  // Create Users and Employees
  console.log("👥 Creating users and employees...");
  const admin = await createUserAndEmployee(
    "admin",
    "John",
    "Doe",
    "admin@workzen.com",
    new Date("2023-01-01"),
    "IT",
    "Administrator",
    100000
  );

  const hr = await createUserAndEmployee(
    "hr",
    "Sarah",
    "Williams",
    "hr@workzen.com",
    new Date("2023-02-01"),
    "Human Resources",
    "HR Manager",
    90000
  );

  const payroll = await createUserAndEmployee(
    "payroll",
    "Jessica",
    "Miller",
    "payroll@workzen.com",
    new Date("2023-03-15"),
    "Finance",
    "Payroll Officer",
    82000
  );

  const employee1 = await createUserAndEmployee(
    "employee",
    "Emily",
    "Davis",
    "employee@workzen.com",
    new Date("2023-04-01"),
    "Engineering",
    "Software Engineer",
    75000
  );

  // Add more employees for better test coverage
  const employee2 = await createUserAndEmployee(
    "employee",
    "David",
    "Wilson",
    "david@workzen.com",
    new Date("2023-05-01"),
    "Engineering",
    "Senior Software Engineer",
    95000
  );

  const employee3 = await createUserAndEmployee(
    "employee",
    "Lisa",
    "Anderson",
    "lisa@workzen.com",
    new Date("2023-06-01"),
    "Marketing",
    "Marketing Manager",
    80000
  );

  const employee4 = await createUserAndEmployee(
    "employee",
    "Robert",
    "Taylor",
    "robert@workzen.com",
    new Date("2023-07-01"),
    "Sales",
    "Sales Executive",
    70000
  );

  const employee5 = await createUserAndEmployee(
    "employee",
    "Jennifer",
    "Martinez",
    "jennifer@workzen.com",
    new Date("2023-08-01"),
    "Finance",
    "Financial Analyst",
    78000,
    { status: "inactive" } // Test inactive employee
  );

  const allEmployees = [
    admin,
    hr,
    payroll,
    employee1,
    employee2,
    employee3,
    employee4,
    employee5,
  ];
  const activeEmployees = [
    admin,
    hr,
    payroll,
    employee1,
    employee2,
    employee3,
    employee4,
  ];
  console.log(`✅ Created ${allEmployees.length} employees`);

  // Create salary structure history for some employees
  console.log("💰 Creating salary structure history...");
  const today = new Date();

  // Create historical salary structures for employee1 (promotion scenario)
  const promotionDate = new Date(today);
  promotionDate.setMonth(promotionDate.getMonth() - 2);
  await createNewSalaryStructure(
    employee1.employee.id,
    80000,
    "Promotion Structure",
    promotionDate
  );

  // Create historical salary structures for employee2 (raise scenario)
  const raiseDate = new Date(today);
  raiseDate.setMonth(raiseDate.getMonth() - 1);
  await createNewSalaryStructure(
    employee2.employee.id,
    100000,
    "Annual Raise Structure",
    raiseDate
  );

  // Create updated structures for all active employees
  const updateDate = new Date(today);
  updateDate.setDate(updateDate.getDate() - 30);
  for (const emp of activeEmployees) {
    const currentSalary = emp.employee.salary;
    await createNewSalaryStructure(
      emp.employee.id,
      currentSalary,
      `Updated Structure - ${emp.employee.firstName}`,
      updateDate
    );
  }
  console.log("✅ Created salary structure history");

  // Payroll Settings
  await prisma.payrollSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      taxRate: 18.5,
      insuranceRate: 3.5,
      payPeriodDays: 30,
    },
  });

  // Create attendance entries for multiple months
  console.log("📅 Creating attendance entries...");
  const attendanceVariations = [
    { status: "present", checkInHour: 9, checkOutHour: 17, hours: 8 },
    { status: "present", checkInHour: 9, checkOutHour: 18, hours: 9 },
    { status: "late", checkInHour: 10, checkOutHour: 18, hours: 8 },
    { status: "absent", checkInHour: null, checkOutHour: null, hours: 0 },
    { status: "half_day", checkInHour: 9, checkOutHour: 13, hours: 4 },
  ];

  // Create attendance for current month and previous month
  for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
    const targetMonth = new Date(
      today.getFullYear(),
      today.getMonth() - monthOffset,
      1
    );
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() - monthOffset + 1,
      0
    );

    for (let dayOffset = 0; dayOffset < 20; dayOffset++) {
      const attendanceDate = new Date(targetMonth);
      attendanceDate.setDate(attendanceDate.getDate() + dayOffset);
      attendanceDate.setHours(0, 0, 0, 0);

      // Skip if beyond month end or weekends
      if (attendanceDate > monthEnd) break;
      const dayOfWeek = attendanceDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (const emp of activeEmployees) {
        const variation =
          attendanceVariations[dayOffset % attendanceVariations.length];
        const status = variation.status;

        let checkIn = null;
        let checkOut = null;
        let hoursWorked = variation.hours;

        if (status !== "absent") {
          checkIn = new Date(attendanceDate);
          checkIn.setHours(variation.checkInHour, 0, 0, 0);
          checkOut = new Date(attendanceDate);
          checkOut.setHours(variation.checkOutHour, 0, 0, 0);
        }

        await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.employee.id,
              date: attendanceDate,
            },
          },
          update: {
            checkIn,
            checkOut,
            hoursWorked,
            status,
          },
          create: {
            employeeId: emp.employee.id,
            userId: emp.user.id,
            date: attendanceDate,
            checkIn,
            checkOut,
            hoursWorked,
            status,
          },
        });
      }
    }
  }
  console.log("✅ Created attendance entries");

  // Create leaves for testing
  console.log("🏖️  Creating leave records...");
  const leaveDate1 = new Date(today);
  leaveDate1.setDate(leaveDate1.getDate() - 3);
  const leaveDate2 = new Date(leaveDate1);
  leaveDate2.setDate(leaveDate2.getDate() + 1);

  // Approved vacation leave for employee1
  const existingLeave1 = await prisma.leave.findFirst({
    where: {
      employeeId: employee1.employee.id,
      startDate: leaveDate1,
    },
  });
  if (!existingLeave1) {
    await prisma.leave.create({
      data: {
        employeeId: employee1.employee.id,
        userId: employee1.user.id,
        type: "vacation",
        startDate: leaveDate1,
        endDate: leaveDate2,
        days: 2,
        reason: "Personal leave",
        status: "approved",
        approvedById: admin.user.id,
        approvedAt: new Date(),
      },
    });
  }

  // Pending leave for employee2
  const futureLeaveStart = new Date(today);
  futureLeaveStart.setDate(futureLeaveStart.getDate() + 7);
  const futureLeaveEnd = new Date(futureLeaveStart);
  futureLeaveEnd.setDate(futureLeaveEnd.getDate() + 2);
  const existingLeave3 = await prisma.leave.findFirst({
    where: {
      employeeId: employee2.employee.id,
      startDate: futureLeaveStart,
    },
  });
  if (!existingLeave3) {
    await prisma.leave.create({
      data: {
        employeeId: employee2.employee.id,
        userId: employee2.user.id,
        type: "vacation",
        startDate: futureLeaveStart,
        endDate: futureLeaveEnd,
        days: 3,
        reason: "Family trip",
        status: "pending",
      },
    });
  }

  // Rejected leave for employee3
  const rejectedLeaveStart = new Date(today);
  rejectedLeaveStart.setDate(rejectedLeaveStart.getDate() - 10);
  const existingLeave4 = await prisma.leave.findFirst({
    where: {
      employeeId: employee3.employee.id,
      startDate: rejectedLeaveStart,
    },
  });
  if (!existingLeave4) {
    await prisma.leave.create({
      data: {
        employeeId: employee3.employee.id,
        userId: employee3.user.id,
        type: "personal",
        startDate: rejectedLeaveStart,
        endDate: rejectedLeaveStart,
        days: 1,
        reason: "Personal work",
        status: "rejected",
        rejectionReason: "Insufficient leave balance",
        approvedById: hr.user.id,
        approvedAt: new Date(),
      },
    });
  }
  console.log("✅ Created leave records");

  // Create payruns for different months
  console.log("📊 Creating payruns...");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Previous month payrun (completed with payslips)
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const prevMonthPayDate = new Date(today.getFullYear(), today.getMonth(), 5);
  const prevMonthPayrunName = `Payrun ${
    monthNames[prevMonth.getMonth()]
  } ${prevMonth.getFullYear()}`;

  let prevMonthPayrun = await prisma.payrun.findFirst({
    where: {
      payPeriodStart: prevMonth,
      payPeriodEnd: prevMonthEnd,
    },
  });

  if (!prevMonthPayrun) {
    prevMonthPayrun = await prisma.payrun.create({
      data: {
        name: prevMonthPayrunName,
        payPeriodStart: prevMonth,
        payPeriodEnd: prevMonthEnd,
        payDate: prevMonthPayDate,
        status: "completed",
        totalEmployees: activeEmployees.length,
        totalAmount: 0, // Will be calculated
      },
    });
  }

  // Current month payrun (draft status)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );
  const payDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
  const currentPayrunName = `Payrun ${
    monthNames[today.getMonth()]
  } ${today.getFullYear()}`;

  let currentPayrun = await prisma.payrun.findFirst({
    where: {
      payPeriodStart: currentMonthStart,
      payPeriodEnd: currentMonthEnd,
    },
  });

  if (!currentPayrun) {
    currentPayrun = await prisma.payrun.create({
      data: {
        name: currentPayrunName,
        payPeriodStart: currentMonthStart,
        payPeriodEnd: currentMonthEnd,
        payDate: payDate,
        status: "draft",
        totalEmployees: 0,
        totalAmount: 0,
      },
    });
  } else {
    // Reset to draft for testing
    currentPayrun = await prisma.payrun.update({
      where: { id: currentPayrun.id },
      data: { status: "draft", totalEmployees: 0, totalAmount: 0 },
    });
  }

  console.log(
    `✅ Created payruns: ${prevMonthPayrun.name} (${prevMonthPayrun.status}), ${currentPayrun.name} (${currentPayrun.status})`
  );

  // Create payrolls for previous month (completed payrun)
  console.log("💼 Creating payrolls for previous month...");
  let prevMonthTotalAmount = 0;
  const prevMonthPayrolls = [];

  for (const emp of activeEmployees) {
    // Get active salary structure for previous month
    const salaryStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId: emp.employee.id,
        effectiveFrom: { lte: prevMonthPayrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: prevMonthPayrun.payPeriodStart } },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (salaryStructure) {
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_payrunId: {
            employeeId: emp.employee.id,
            payrunId: prevMonthPayrun.id,
          },
        },
        update: {},
        create: {
          employeeId: emp.employee.id,
          payrunId: prevMonthPayrun.id,
          status: "validated",
          grossSalary: salaryStructure.grossSalary,
          totalDeductions: salaryStructure.totalDeductions,
          netSalary: salaryStructure.netSalary,
          computedAt: new Date(prevMonthPayrun.payPeriodEnd),
          validatedAt: new Date(prevMonthPayrun.payPeriodEnd),
        },
      });
      prevMonthPayrolls.push(payroll);
      prevMonthTotalAmount += payroll.netSalary;
    }
  }

  // Update previous month payrun total
  await prisma.payrun.update({
    where: { id: prevMonthPayrun.id },
    data: { totalAmount: prevMonthTotalAmount },
  });

  console.log(
    `✅ Created ${prevMonthPayrolls.length} validated payrolls for previous month`
  );

  // Create payslips for previous month validated payrolls
  console.log("📄 Creating payslips for previous month...");
  for (const payroll of prevMonthPayrolls) {
    const existingPayslip = await prisma.payslip.findUnique({
      where: { payrollId: payroll.id },
    });
    if (!existingPayslip) {
      const emp = await prisma.employee.findUnique({
        where: { id: payroll.employeeId },
      });
      await prisma.payslip.create({
        data: {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          userId: emp?.userId || null,
          status: "validated",
          pdfUrl: null, // Would be generated in production
        },
      });
    }
  }
  console.log(
    `✅ Created ${prevMonthPayrolls.length} payslips for previous month`
  );

  // Create payrolls for current month (draft status - for testing processing)
  console.log("💼 Creating draft payrolls for current month...");
  const currentMonthPayrolls = [];

  for (const emp of activeEmployees) {
    // Get active salary structure for current month
    const salaryStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId: emp.employee.id,
        effectiveFrom: { lte: currentPayrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: currentPayrun.payPeriodStart } },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (salaryStructure) {
      // Create draft payroll with default values from salary structure
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_payrunId: {
            employeeId: emp.employee.id,
            payrunId: currentPayrun.id,
          },
        },
        update: {
          // Update with salary structure values if payroll already exists
          grossSalary: salaryStructure.grossSalary,
          totalDeductions: salaryStructure.totalDeductions,
          netSalary: salaryStructure.netSalary,
        },
        create: {
          employeeId: emp.employee.id,
          payrunId: currentPayrun.id,
          status: "draft",
          grossSalary: salaryStructure.grossSalary,
          totalDeductions: salaryStructure.totalDeductions,
          netSalary: salaryStructure.netSalary,
        },
      });
      currentMonthPayrolls.push(payroll);
    }
  }

  // Update current month payrun with total amount
  if (currentMonthPayrolls.length > 0) {
    const currentMonthTotalAmount = currentMonthPayrolls.reduce(
      (sum, p) => sum + (p.netSalary || 0),
      0
    );
    await prisma.payrun.update({
      where: { id: currentPayrun.id },
      data: {
        totalEmployees: currentMonthPayrolls.length,
        totalAmount: currentMonthTotalAmount,
      },
    });
  }

  console.log(
    `✅ Created ${currentMonthPayrolls.length} draft payrolls for current month with default salary structure values`
  );

  // Create a test payrun with computed payrolls (for testing validation)
  console.log("💼 Creating test payrun with computed payrolls...");
  const testMonthStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const testMonthEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  const testPayDate = new Date(today.getFullYear(), today.getMonth() - 1, 5);
  const testPayrunName = `Payrun ${
    monthNames[testMonthStart.getMonth()]
  } ${testMonthStart.getFullYear()}`;

  let testPayrun = await prisma.payrun.findFirst({
    where: {
      payPeriodStart: testMonthStart,
      payPeriodEnd: testMonthEnd,
    },
  });

  if (!testPayrun) {
    testPayrun = await prisma.payrun.create({
      data: {
        name: testPayrunName,
        payPeriodStart: testMonthStart,
        payPeriodEnd: testMonthEnd,
        payDate: testPayDate,
        status: "processing",
        totalEmployees: 0,
        totalAmount: 0,
      },
    });
  }

  // Create computed payrolls for test payrun
  const testPayrolls = [];
  for (const emp of activeEmployees.slice(0, 3)) {
    // Only first 3 employees
    const salaryStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId: emp.employee.id,
        effectiveFrom: { lte: testPayrun.payPeriodStart },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: testPayrun.payPeriodStart } },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (salaryStructure) {
      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_payrunId: {
            employeeId: emp.employee.id,
            payrunId: testPayrun.id,
          },
        },
        update: {},
        create: {
          employeeId: emp.employee.id,
          payrunId: testPayrun.id,
          status: "computed",
          grossSalary: salaryStructure.grossSalary,
          totalDeductions: salaryStructure.totalDeductions,
          netSalary: salaryStructure.netSalary,
          computedAt: new Date(),
        },
      });
      testPayrolls.push(payroll);
    }
  }
  console.log(
    `✅ Created ${testPayrolls.length} computed payrolls for test payrun`
  );

  console.log("\n✅ Database seeded successfully!");
  console.log("\n📋 Test Accounts:");
  console.log(
    `  Admin:        admin@workzen.com / password123 (ID: ${admin.employee.employeeId})`
  );
  console.log(
    `  HR:           hr@workzen.com / password123 (ID: ${hr.employee.employeeId})`
  );
  console.log(
    `  Payroll:      payroll@workzen.com / password123 (ID: ${payroll.employee.employeeId})`
  );
  console.log(
    `  Employee:     employee@workzen.com / password123 (ID: ${employee1.employee.employeeId})`
  );
  console.log(
    `  Employee:     david@workzen.com / password123 (ID: ${employee2.employee.employeeId})`
  );
  console.log(
    `  Employee:     lisa@workzen.com / password123 (ID: ${employee3.employee.employeeId})`
  );
  console.log(
    `  Employee:     robert@workzen.com / password123 (ID: ${employee4.employee.employeeId})`
  );
  console.log(
    `  Employee:     jennifer@workzen.com / password123 (ID: ${employee5.employee.employeeId}) - INACTIVE`
  );

  console.log("\n📊 Seed Summary:");
  console.log(
    `  ✅ Created ${allEmployees.length} employees (${activeEmployees.length} active, 1 inactive)`
  );
  console.log(
    `  ✅ Created salary structures with history for testing effective dates`
  );
  console.log(`  ✅ Created attendance entries for current and previous month`);
  console.log(`  ✅ Created leave records (approved, pending, rejected)`);
  console.log(`  ✅ Created 3 payruns:`);
  console.log(
    `     - Previous month: ${prevMonthPayrun.name} (${prevMonthPayrun.status}) with ${prevMonthPayrolls.length} validated payrolls and payslips`
  );
  console.log(
    `     - Current month: ${currentPayrun.name} (${currentPayrun.status}) with ${currentMonthPayrolls.length} draft payrolls`
  );
  console.log(
    `     - Test month: ${testPayrun.name} (${testPayrun.status}) with ${testPayrolls.length} computed payrolls`
  );
  console.log("\n💡 Test Scenarios Available:");
  console.log("  📝 Process current month payrun (draft → computed)");
  console.log("  ✅ Validate computed payrolls (computed → validated)");
  console.log("  📄 Generate payslips for validated payrolls");
  console.log("  📊 View completed payrun with payslips");
  console.log("  🔄 Test salary structure history and effective dates");
  console.log("  👤 Test inactive employee exclusion from payroll");
  console.log("  📅 Test attendance and leave calculations");
  console.log("\n💡 You can login with either email or employee ID!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
