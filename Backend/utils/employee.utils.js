import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const generateCompanyCode = async (companyName) => {
  if (!companyName || companyName.length < 2) {
    throw new Error("Company name must be at least 2 characters long");
  }

  let baseCode = companyName.substring(0, 2).toUpperCase();
  let code = baseCode;
  let counter = 1;

  let existingCompany = await prisma.company.findUnique({
    where: { code },
  });

  while (existingCompany && existingCompany.name !== companyName) {
    code = `${baseCode}${counter}`;
    existingCompany = await prisma.company.findUnique({
      where: { code },
    });
    counter++;

    if (counter > 999) {
      throw new Error("Unable to generate unique company code");
    }
  }

  return code;
};


export const generateEmployeeId = async (
  companyCode,
  firstName,
  lastName,
  hireDate,
  companyId
) => {
  if (!companyCode || companyCode.length < 2) {
    throw new Error("Company code must be at least 2 characters");
  }
  if (!firstName || firstName.length < 2) {
    throw new Error("First name must be at least 2 characters long");
  }
  if (!lastName || lastName.length < 2) {
    throw new Error("Last name must be at least 2 characters long");
  }

  const firstNameCode = firstName.substring(0, 2).toUpperCase();
  const lastNameCode = lastName.substring(0, 2).toUpperCase();

  const year = new Date(hireDate).getFullYear();
  const yearStr = String(year);

  const employeesInYear = await prisma.employee.findMany({
    where: {
      companyId: companyId,
      hireDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    select: {
      employeeId: true,
    },
  });

  let serialNumber = 1;
  if (employeesInYear.length > 0) {
    const serialNumbers = employeesInYear
      .map((emp) => {
        const id = emp.employeeId;
        // Check if the ID contains the year
        if (id.includes(yearStr)) {
          const serialStr = id.slice(-4);
          const serial = parseInt(serialStr, 10);
          return isNaN(serial) ? 0 : serial;
        }
        return 0;
      })
      .filter((num) => num > 0);

    if (serialNumbers.length > 0) {
      serialNumber = Math.max(...serialNumbers) + 1;
    }
  }

  const prefix = `${companyCode}${firstNameCode}${lastNameCode}${yearStr}`;
  const serialStr = String(serialNumber).padStart(4, "0");
  let employeeId = `${prefix}${serialStr}`;

  // Ensure uniqueness (in case of any edge cases)
  let attempts = 0;
  while (await prisma.employee.findUnique({ where: { employeeId } })) {
    serialNumber++;
    const serialStr = String(serialNumber).padStart(4, "0");
    employeeId = `${prefix}${serialStr}`;
    attempts++;
    if (attempts > 1000) {
      throw new Error(
        "Unable to generate unique employee ID after 1000 attempts"
      );
    }
  }

  return employeeId;
};
