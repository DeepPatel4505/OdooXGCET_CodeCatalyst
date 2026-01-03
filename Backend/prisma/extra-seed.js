import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import {
    generateEmployeeId,
    generateCompanyCode,
} from "../utils/employee.utils.js";

const prisma = new PrismaClient();

async function createSalaryStructure(employeeId, totalSalary, effectiveFrom) {
    const basic = totalSalary * 0.45;
    const hra = totalSalary * 0.2;
    const standardAllowance = totalSalary * 0.1;
    const performanceBonus = totalSalary * 0.05;
    const travelAllowance = totalSalary * 0.03;
    const fixedAllowance = totalSalary * 0.07;

    const pfEmployee = basic * 0.12;
    const pfEmployer = basic * 0.12;
    const professionalTax = 200;
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
            name: "Base Structure",
            description: "Auto-generated structure for test employees",
            effectiveFrom,
            monthWage: totalSalary,
            yearlyWage: totalSalary * 12,
            basicSalary: basic,
            basicSalaryPercent: 45,
            houseRentAllowance: hra,
            hraPercent: 20,
            standardAllowance,
            standardAllowancePercent: 10,
            performanceBonus,
            performanceBonusPercent: 5,
            travelAllowance,
            ltaPercent: 3,
            fixedAllowance,
            fixedAllowancePercent: 7,
            pfEmployee,
            pfEmployeePercent: 12,
            pfEmployer,
            pfEmployerPercent: 12,
            professionalTax,
            tds,
            grossSalary,
            totalDeductions,
            netSalary,
        },
    });
}

async function main() {
    console.log("🌱 Seeding extra test data...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Get existing company or create
    const companyName = "WorkZen";
    const companyCode = await generateCompanyCode(companyName);
    const company = await prisma.company.upsert({
        where: { name: companyName },
        update: {},
        create: { name: companyName, code: companyCode },
    });

    console.log(`✅ Using company: ${companyName}`);

    // Helper: create user + employee
    async function createUserAndEmployee(
        role,
        firstName,
        lastName,
        email,
        hireDate,
        department,
        position,
        salary
    ) {
        const employeeId = await generateEmployeeId(
            companyCode,
            firstName,
            lastName,
            hireDate,
            company.id
        );

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role,
                department,
                position,
                employeeId,
                companyId: company.id,
            },
        });

        const employee = await prisma.employee.create({
            data: {
                employeeId,
                userId: user.id,
                email,
                firstName,
                lastName,
                department,
                position,
                status: "active",
                hireDate,
                salary,
                companyId: company.id,
                accountNumber: `ACC${Math.floor(Math.random() * 1000000)}`,
                bankName: "ICICI Bank",
                ifscCode: "ICIC0000456",
                panNo: `PAN${Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase()}${Math.floor(Math.random() * 10)}`,
                uanNo: `${Math.floor(Math.random() * 10000000000)}`,
                address: "Sector 21, Gurgaon",
                nationality: "Indian",
                gender: "Male",
                maritalStatus: "Single",
            },
        });

        await createSalaryStructure(employee.id, salary, hireDate);

        return { user, employee };
    }

    // Create multiple new employees
    const today = new Date();
    const employees = [
        await createUserAndEmployee(
            "employee",
            "Amit",
            "Patel",
            "amit@workzen.com",
            new Date("2024-12-01"),
            "Engineering",
            "Backend Developer",
            90000
        ),
        await createUserAndEmployee(
            "employee",
            "Priya",
            "Sharma",
            "priya@workzen.com",
            new Date("2025-01-15"),
            "Marketing",
            "Content Strategist",
            65000
        ),
        await createUserAndEmployee(
            "employee",
            "Ravi",
            "Kumar",
            "ravi@workzen.com",
            new Date("2025-02-10"),
            "Finance",
            "Accountant",
            70000
        ),
        await createUserAndEmployee(
            "employee",
            "Sneha",
            "Rao",
            "sneha@workzen.com",
            new Date("2024-11-20"),
            "Sales",
            "Sales Executive",
            72000
        ),
        await createUserAndEmployee(
            "employee",
            "Vikram",
            "Nair",
            "vikram@workzen.com",
            new Date("2024-10-10"),
            "HR",
            "Recruitment Specialist",
            68000
        ),
        await createUserAndEmployee(
            "employee",
            "Kiran",
            "Mehta",
            "kiran@workzen.com",
            new Date("2025-03-01"),
            "Support",
            "Customer Success Lead",
            60000
        ),
        await createUserAndEmployee(
            "employee",
            "Alok",
            "Bansal",
            "alok@workzen.com",
            new Date("2025-04-01"),
            "IT",
            "System Admin",
            80000
        ),
        await createUserAndEmployee(
            "employee",
            "Meera",
            "Das",
            "meera@workzen.com",
            new Date("2024-09-15"),
            "Design",
            "UI/UX Designer",
            85000
        ),
    ];

    console.log(`✅ Created ${employees.length} new employees`);

    // Create last month’s payrun
    const lastMonthStart = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const payDate = new Date(today.getFullYear(), today.getMonth(), 5);
    const payrunName = `Payrun ${lastMonthStart.toLocaleString("default", {
        month: "long",
    })} ${lastMonthStart.getFullYear()}`;

    const payrun = await prisma.payrun.create({
        data: {
            name: payrunName,
            payPeriodStart: lastMonthStart,
            payPeriodEnd: lastMonthEnd,
            payDate,
            status: "completed",
        },
    });

    // Generate payrolls + payslips
    let totalAmount = 0;
    for (const { employee } of employees) {
        const structure = await prisma.salaryStructure.findFirst({
            where: { employeeId: employee.id },
            orderBy: { effectiveFrom: "desc" },
        });

        const payroll = await prisma.payroll.create({
            data: {
                employeeId: employee.id,
                payrunId: payrun.id,
                status: "validated",
                grossSalary: structure?.grossSalary ?? 0,
                totalDeductions: structure?.totalDeductions ?? 0,
                netSalary: structure?.netSalary ?? 0,
                computedAt: new Date(lastMonthEnd),
                validatedAt: new Date(lastMonthEnd),
            },
        });

        await prisma.payslip.create({
            data: {
                payrollId: payroll.id,
                employeeId: employee.id,
                userId: employee.userId,
                status: "validated",
                pdfUrl: null,
            },
        });

        totalAmount += structure?.netSalary ?? 0;
    }

    await prisma.payrun.update({
        where: { id: payrun.id },
        data: { totalEmployees: employees.length, totalAmount },
    });

    console.log(
        `✅ Created payrun "${payrun.name}" with ${employees.length} payrolls and payslips`
    );

    // Create leave records for last month
    for (const { employee } of employees.slice(0, 4)) {
        await prisma.leave.create({
            data: {
                employeeId: employee.id,
                userId: employee.userId,
                type: "vacation",
                startDate: new Date(
                    lastMonthStart.getFullYear(),
                    lastMonthStart.getMonth(),
                    12
                ),
                endDate: new Date(
                    lastMonthStart.getFullYear(),
                    lastMonthStart.getMonth(),
                    14
                ),
                days: 3,
                reason: "Family Trip",
                status: "approved",
            },
        });
    }

    console.log(`✅ Created sample leaves for 4 employees`);

    console.log("\n🎉 Extra seed completed!");
    console.log(
        `💡 Added last-month data and payrun for ${employees.length} new employees.`
    );
}

main()
    .catch((e) => {
        console.error("❌ Error during extra seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
