import { PrismaClient } from "@prisma/client";
import {
  generateEmployeeId,
  generateCompanyCode,
} from "../utils/employee.utils.js";
import { hashPassword } from "../utils/password.utils.js";
import {
  generateRandomPassword,
  generatePasswordResetToken,
  sendAccountCreationEmail,
} from "../utils/email.utils.js";
import csv from "csv-parser";
import { Readable } from "stream";
import * as XLSX from "xlsx";
import path from "path";

const prisma = new PrismaClient();

export const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status } = req.query;
    const user = req.user;

    const where = {};

    // Role-based filtering
    if (user.companyId) {
      where.companyId = user.companyId;
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: true,
            phone: true,
            department: true,
            position: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      email: emp.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      avatar: emp.avatar || emp.user?.avatar,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      status: emp.status,
      hireDate: emp.hireDate.toISOString(),
      salary: emp.salary,
      userId: emp.userId,
      user: emp.user
        ? {
            id: emp.user.id,
            email: emp.user.email,
            avatar: emp.user.avatar,
          }
        : null,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    }));

    res.json({
      status: "success",
      data: formattedEmployees,
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      salary,
      hireDate,
      role,
    } = req.body;

    const currentUser = req.user; // Admin/HR

    if (!currentUser.companyId) {
      return res.status(400).json({
        status: "error",
        message:
          "User must be associated with a company to create employees. Please contact your administrator.",
        error: "Validation Error",
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: currentUser.companyId },
    });

    if (!company) {
      return res.status(400).json({
        status: "error",
        message: "Company not found",
        error: "Validation Error",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        companyId: company.id,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists in this company",
        error: "Validation Error",
      });
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          companyId: company.id,
        },
      });

      if (existingPhone) {
        return res.status(400).json({
          status: "error",
          message: "User with this phone number already exists in this company",
          error: "Validation Error",
        });
      }
    }

    // Validate salary - cannot be negative
    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      return res.status(400).json({
        status: "error",
        message: "Salary must be a valid positive number (cannot be negative)",
        error: "Validation Error",
      });
    }

    const companyCode = company.code;

    const employeeId = await generateEmployeeId(
      companyCode,
      firstName,
      lastName,
      hireDate,
      company.id
    );

    const randomPassword = generateRandomPassword(12);
    const hashedPassword = await hashPassword(randomPassword);

    // Validate role (default to 'employee' if not provided or invalid)
    const validRoles = ["admin", "hr", "payroll", "employee"];
    const employeeRole =
      role && validRoles.includes(role.toLowerCase())
        ? role.toLowerCase()
        : "employee";

    // Generate password reset token for initial password change
    const resetToken = generatePasswordResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Use transaction to ensure atomicity - all operations succeed or all fail
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: employeeRole,
          phone,
          department,
          position,
          employeeId,
          companyId: company.id,
        },
      });

      // Create password reset token
      await tx.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          email: user.email,
          expiresAt,
        },
      });

      // Create employee
      const employee = await tx.employee.create({
        data: {
          employeeId,
          userId: user.id,
          email,
          firstName,
          lastName,
          phone,
          department,
          position,
          status: "active",
          hireDate: new Date(hireDate),
          salary: parsedSalary,
          companyId: company.id,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              avatar: true,
              phone: true,
              department: true,
              position: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return { user, employee };
    });

    const { user, employee } = result;

    try {
      await sendAccountCreationEmail(
        email,
        employeeId,
        randomPassword,
        firstName,
        resetToken
      );
    } catch (emailError) {
      console.error("Failed to send account creation email:", emailError);
    }

    const formattedEmployee = {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatar: employee.avatar,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      hireDate: employee.hireDate.toISOString(),
      salary: employee.salary,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    };

    res.status(201).json({
      status: "success",
      data: formattedEmployee,
      message:
        "Employee created successfully. Credentials have been sent to their email.",
    });
  } catch (error) {
    next(error);
  }
};

export const importEmployees = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
        error: "Validation Error",
      });
    }

    const currentUser = req.user;

    if (!currentUser.companyId) {
      return res.status(400).json({
        status: "error",
        message: "User must be associated with a company to import employees",
        error: "Validation Error",
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: currentUser.companyId },
    });

    if (!company) {
      return res.status(400).json({
        status: "error",
        message: "Company not found",
        error: "Validation Error",
      });
    }

    const companyCode = company.code;
    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    // Detect file type
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const isExcel = [".xlsx", ".xls"].includes(fileExtension);
    const isCSV = fileExtension === ".csv";

    if (!isExcel && !isCSV) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid file format. Only CSV and Excel files (.csv, .xlsx, .xls) are supported.",
        error: "Validation Error",
      });
    }

    let csvData = [];

    try {
      if (isExcel) {
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          return res.status(400).json({
            status: "error",
            message: "Excel file is empty or has no sheets",
            error: "Validation Error",
          });
        }

        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        // Use raw: true to get actual values (including date serial numbers)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Use first row as headers
          defval: "", // Default value for empty cells
          raw: true, // Keep raw values (numbers, dates) for proper date handling
        });

        if (jsonData.length < 2) {
          return res.status(400).json({
            status: "error",
            message:
              "Excel file must have at least a header row and one data row",
            error: "Validation Error",
          });
        }

        // Get headers (first row)
        const headers = jsonData[0].map((h) =>
          String(h).trim().toLowerCase().replace(/\s+/g, "")
        );

        // Normalize header names (handle common variations)
        const headerMap = {
          firstname: "firstName",
          first_name: "firstName",
          fname: "firstName",
          lastname: "lastName",
          last_name: "lastName",
          lname: "lastName",
          email: "email",
          emailaddress: "email",
          "e-mail": "email",
          phone: "phone",
          phonenumber: "phone",
          phone_number: "phone",
          mobile: "phone",
          department: "department",
          dept: "department",
          position: "position",
          jobtitle: "position",
          job_title: "position",
          title: "position",
          hiredate: "hireDate",
          hire_date: "hireDate",
          dateofhire: "hireDate",
          date_of_hire: "hireDate",
          startdate: "hireDate",
          start_date: "hireDate",
          salary: "salary",
          sal: "salary",
          role: "role",
          userrole: "role",
          user_role: "role",
        };

        // Map headers to normalized names
        const normalizedHeaders = headers.map((h) => headerMap[h] || h);

        // Check for required headers
        const requiredHeaders = [
          "firstName",
          "lastName",
          "email",
          "department",
          "position",
          "hireDate",
          "salary",
        ];
        const missingHeaders = requiredHeaders.filter(
          (h) => !normalizedHeaders.includes(h)
        );

        if (missingHeaders.length > 0) {
          return res.status(400).json({
            status: "error",
            message: `Missing required columns in Excel file: ${missingHeaders.join(
              ", "
            )}. Please ensure your Excel file has the following columns: firstName, lastName, email, department, position, hireDate, salary`,
            error: "Validation Error",
            details: {
              found: normalizedHeaders,
              required: requiredHeaders,
              missing: missingHeaders,
            },
          });
        }

        // Convert rows to objects
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowObj = {};

          normalizedHeaders.forEach((header, index) => {
            const value = row[index];

            // Handle Excel date serial numbers (for hireDate)
            if (
              header === "hireDate" &&
              value !== undefined &&
              value !== null
            ) {
              // Check if it's an Excel serial date (number between 1 and ~50000)
              if (typeof value === "number" && value > 0 && value < 100000) {
                // Excel serial date: days since 1900-01-01
                // JavaScript Date uses milliseconds since 1970-01-01
                // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
                // So we need to adjust: Excel date 1 = 1900-01-01
                const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (Excel's epoch)
                const date = new Date(
                  excelEpoch.getTime() + (value - 1) * 24 * 60 * 60 * 1000
                );
                rowObj[header] = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
              } else if (value instanceof Date) {
                // Already a Date object
                rowObj[header] = value.toISOString().split("T")[0];
              } else {
                // Try to parse as string
                rowObj[header] =
                  value !== undefined && value !== null
                    ? String(value).trim()
                    : "";
              }
            } else {
              // For other fields, convert to string and trim
              rowObj[header] =
                value !== undefined && value !== null
                  ? String(value).trim()
                  : "";
            }
          });

          // Only add non-empty rows
          if (rowObj.firstName || rowObj.lastName || rowObj.email) {
            csvData.push(rowObj);
          }
        }
      } else {
        // Parse CSV file
        const stream = Readable.from(req.file.buffer.toString("utf-8"));

        await new Promise((resolve, reject) => {
          stream
            .pipe(csv())
            .on("data", (row) => {
              // Normalize keys to lowercase and remove spaces
              const normalizedRow = {};
              const headerMap = {
                firstname: "firstName",
                first_name: "firstName",
                fname: "firstName",
                lastname: "lastName",
                last_name: "lastName",
                lname: "lastName",
                email: "email",
                emailaddress: "email",
                "e-mail": "email",
                phone: "phone",
                phonenumber: "phone",
                phone_number: "phone",
                mobile: "phone",
                department: "department",
                dept: "department",
                position: "position",
                jobtitle: "position",
                job_title: "position",
                title: "position",
                hiredate: "hireDate",
                hire_date: "hireDate",
                dateofhire: "hireDate",
                date_of_hire: "hireDate",
                startdate: "hireDate",
                start_date: "hireDate",
                salary: "salary",
                sal: "salary",
                role: "role",
                userrole: "role",
                user_role: "role",
              };

              Object.keys(row).forEach((key) => {
                const normalizedKey = key
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, "");
                const mappedKey = headerMap[normalizedKey] || normalizedKey;
                normalizedRow[mappedKey] = row[key]
                  ? String(row[key]).trim()
                  : "";
              });

              // Only add non-empty rows
              if (
                normalizedRow.firstName ||
                normalizedRow.lastName ||
                normalizedRow.email
              ) {
                csvData.push(normalizedRow);
              }
            })
            .on("end", resolve)
            .on("error", (err) => {
              reject(new Error(`CSV parsing error: ${err.message}`));
            });
        });
      }

      if (csvData.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "File is empty or has no valid data rows",
          error: "Validation Error",
        });
      }
    } catch (parseError) {
      return res.status(400).json({
        status: "error",
        message: `Failed to parse file: ${parseError.message}. Please ensure the file format is correct.`,
        error: "Validation Error",
      });
    }

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields - check if field exists and has a value
        const requiredFields = [
          "firstName",
          "lastName",
          "email",
          "department",
          "position",
          "hireDate",
          "salary",
        ];
        const missingFields = requiredFields.filter((field) => {
          const value = row[field];
          return !value || (typeof value === "string" && value.trim() === "");
        });

        if (missingFields.length > 0) {
          errors.push({
            row: rowNumber,
            email:
              (row.email && typeof row.email === "string"
                ? row.email.trim()
                : "N/A") || "N/A",
            error: `Missing required fields: ${missingFields.join(", ")}`,
          });
          errorCount++;
          continue;
        }

        // Extract and trim values
        const firstName = row.firstName ? String(row.firstName).trim() : "";
        const lastName = row.lastName ? String(row.lastName).trim() : "";
        const email = row.email ? String(row.email).trim() : "";
        const phone = row.phone ? String(row.phone).trim() : "";
        const department = row.department ? String(row.department).trim() : "";
        const position = row.position ? String(row.position).trim() : "";
        const salary = row.salary ? String(row.salary).trim() : "";
        const hireDate = row.hireDate ? String(row.hireDate).trim() : "";
        const role = row.role ? String(row.role).trim() : "";

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errors.push({
            row: rowNumber,
            email: email,
            error: "Invalid email format",
          });
          errorCount++;
          continue;
        }

        // Check if email already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            companyId: company.id,
          },
        });

        if (existingUser) {
          errors.push({
            row: rowNumber,
            email: email,
            error: "Email already exists in this company",
          });
          errorCount++;
          continue;
        }

        // Check if phone already exists (if provided)
        if (phone) {
          const existingPhone = await prisma.user.findFirst({
            where: {
              phone: phone,
              companyId: company.id,
            },
          });

          if (existingPhone) {
            errors.push({
              row: rowNumber,
              email: email,
              error: "Phone number already exists in this company",
            });
            errorCount++;
            continue;
          }
        }

        // Generate employee ID
        const employeeId = await generateEmployeeId(
          companyCode,
          firstName,
          lastName,
          new Date(hireDate),
          company.id
        );

        // Generate random password
        const randomPassword = generateRandomPassword(12);
        const hashedPassword = await hashPassword(randomPassword);

        // Validate role
        const validRoles = ["admin", "hr", "payroll", "employee"];
        const employeeRole =
          role && validRoles.includes(role.toLowerCase())
            ? role.toLowerCase()
            : "employee";

        // Generate password reset token
        const resetToken = generatePasswordResetToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Parse hire date - handle various formats including Excel serial dates
        let parsedHireDate;
        const hireDateStr =
          typeof hireDate === "string"
            ? hireDate.trim()
            : String(hireDate).trim();

        // Check if it's a number (Excel serial date)
        if (typeof hireDate === "number" && hireDate > 0 && hireDate < 100000) {
          // Excel serial date: days since 1900-01-01
          // Excel epoch is 1899-12-30 (Excel incorrectly treats 1900 as leap year)
          const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
          parsedHireDate = new Date(
            excelEpoch.getTime() + (hireDate - 1) * 24 * 60 * 60 * 1000
          );
        }
        // Check if it's a string that looks like a number (Excel serial date as string)
        else if (/^\d+(\.\d+)?$/.test(hireDateStr)) {
          const numValue = parseFloat(hireDateStr);
          if (numValue > 0 && numValue < 100000) {
            // Excel serial date as string
            const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
            parsedHireDate = new Date(
              excelEpoch.getTime() + (numValue - 1) * 24 * 60 * 60 * 1000
            );
          } else {
            parsedHireDate = new Date(hireDateStr);
          }
        }
        // Check for YYYY-MM-DD format
        else if (/^\d{4}-\d{2}-\d{2}$/.test(hireDateStr)) {
          parsedHireDate = new Date(hireDateStr + "T00:00:00");
        }
        // Check for DD-MM-YYYY or MM-DD-YYYY format (e.g., 15-01-2025 or 01-15-2025)
        else if (/^\d{2}-\d{2}-\d{4}$/.test(hireDateStr)) {
          const parts = hireDateStr.split("-");
          const first = parseInt(parts[0]);
          const second = parseInt(parts[1]);
          const year = parseInt(parts[2]);

          // If first part > 12, it's definitely DD-MM-YYYY
          if (first > 12) {
            parsedHireDate = new Date(year, second - 1, first);
          }
          // If second part > 12, it's definitely MM-DD-YYYY
          else if (second > 12) {
            parsedHireDate = new Date(year, first - 1, second);
          }
          // Ambiguous - try DD-MM-YYYY first (more common internationally)
          else {
            parsedHireDate = new Date(year, second - 1, first);
          }
        }
        // Check for DD/MM/YYYY or MM/DD/YYYY format (e.g., 15/01/2025 or 01/15/2025)
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(hireDateStr)) {
          const parts = hireDateStr.split("/");
          const first = parseInt(parts[0]);
          const second = parseInt(parts[1]);
          const year = parseInt(parts[2]);

          // If first part > 12, it's definitely DD/MM/YYYY
          if (first > 12) {
            parsedHireDate = new Date(year, second - 1, first);
          }
          // If second part > 12, it's definitely MM/DD/YYYY
          else if (second > 12) {
            parsedHireDate = new Date(year, first - 1, second);
          }
          // Ambiguous - try DD/MM/YYYY first (more common internationally)
          else {
            parsedHireDate = new Date(year, second - 1, first);
          }
        }
        // Check for YYYY/MM/DD format
        else if (/^\d{4}\/\d{2}\/\d{2}$/.test(hireDateStr)) {
          const [year, month, day] = hireDateStr.split("/");
          parsedHireDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
        }
        // Try parsing as date string (various formats - fallback)
        else {
          parsedHireDate = new Date(hireDateStr);
        }

        // Check if date is valid
        if (isNaN(parsedHireDate.getTime())) {
          errors.push({
            row: rowNumber,
            email: email,
            error: `Invalid hire date format: "${hireDate}". Please use format YYYY-MM-DD (e.g., 2024-01-15) or ensure the date column in Excel is formatted as a date.`,
          });
          errorCount++;
          continue;
        }

        // Validate date is reasonable (not too far in past or future)
        const minDate = new Date(1900, 0, 1);
        const maxDate = new Date(2100, 0, 1);
        if (parsedHireDate < minDate || parsedHireDate > maxDate) {
          errors.push({
            row: rowNumber,
            email: email,
            error: `Hire date is out of valid range: "${hireDate}". Please use a date between 1900 and 2100`,
          });
          errorCount++;
          continue;
        }

        // Parse salary
        const parsedSalary = parseFloat(salary);
        if (isNaN(parsedSalary) || parsedSalary <= 0) {
          errors.push({
            row: rowNumber,
            email: email,
            error: "Invalid salary amount",
          });
          errorCount++;
          continue;
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            role: employeeRole,
            phone: phone || null,
            department: department,
            position: position,
            employeeId,
            companyId: company.id,
          },
        });

        // Create password reset token
        await prisma.passwordResetToken.create({
          data: {
            token: resetToken,
            userId: user.id,
            email: user.email,
            expiresAt,
          },
        });

        // Create employee
        const employee = await prisma.employee.create({
          data: {
            employeeId,
            userId: user.id,
            email: email.toLowerCase(),
            firstName: firstName,
            lastName: lastName,
            phone: phone || null,
            department: department,
            position: position,
            status: "active",
            hireDate: parsedHireDate,
            salary: parsedSalary,
            companyId: company.id,
          },
        });

        // Send account creation email (non-blocking)
        try {
          await sendAccountCreationEmail(
            email.toLowerCase(),
            employeeId,
            randomPassword,
            firstName,
            resetToken
          );
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          // Continue even if email fails
        }

        results.push({
          row: rowNumber,
          email: email,
          employeeId,
          status: "success",
        });
        successCount++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          email: row.email || "N/A",
          error: error.message || "Unknown error occurred",
        });
        errorCount++;
      }
    }

    res.json({
      status: "success",
      data: {
        count: successCount,
        total: csvData.length,
        success: successCount,
        errorCount: errorCount,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `Successfully imported ${successCount} employee(s). ${
        errorCount > 0 ? `${errorCount} error(s) occurred.` : ""
      }`,
    });
  } catch (error) {
    next(error);
  }
};

export const exportEmployees = async (req, res, next) => {
  try {
    const user = req.user;

    const where = {};
    if (user.companyId) {
      where.companyId = user.companyId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Department",
      "Position",
      "Status",
      "Hire Date",
      "Salary",
    ];
    const rows = employees.map((emp) => [
      emp.employeeId,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.phone || "",
      emp.department,
      emp.position,
      emp.status,
      emp.hireDate.toISOString().split("T")[0],
      emp.salary,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=employees-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeSalary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        salary: true,
        firstName: true,
        lastName: true,
        email: true,
        companyId: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
        error: "Not Found",
      });
    }

    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: "error",
        message:
          "You can only view salary information for employees in your company",
        error: "Forbidden",
      });
    }

    // Get salary data from active salary structure
    const { getSalaryData } = await import("../utils/salary.utils.js");
    const salaryData = await getSalaryData(employee.id, employee.salary);

    res.json({
      status: "success",
      data: salaryData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeSalary = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const {
      monthWage,
      yearlyWage,
      workingDaysPerWeek,
      breakTime,
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
      pfEmployee,
      pfEmployeePercent,
      pfEmployer,
      pfEmployerPercent,
      professionalTax,
      effectiveFrom,
    } = req.body;
    const user = req.user;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        salary: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
        error: "Not Found",
      });
    }

    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: "error",
        message:
          "You can only update salary information for employees in your company",
        error: "Forbidden",
      });
    }

    const grossSalary =
      (basicSalary || 0) +
      (houseRentAllowance || 0) +
      (standardAllowance || 0) +
      (performanceBonus || 0) +
      (travelAllowance || 0) +
      (fixedAllowance || 0);

    const totalDeductions = (pfEmployee || 0) + (professionalTax || 0);
    const netSalary = grossSalary - totalDeductions;

    const activeStructure = await prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        effectiveTo: null,
      },
    });

    const currentDate = new Date();
    const effectiveFromDate = effectiveFrom
      ? new Date(effectiveFrom)
      : currentDate;

    if (activeStructure) {
      await prisma.salaryStructure.update({
        where: { id: activeStructure.id },
        data: { effectiveTo: effectiveFromDate },
      });
    }

    const salaryStructure = await prisma.salaryStructure.create({
      data: {
        employeeId,
        name: activeStructure ? "Revised Structure" : "Default Structure",
        description: null,
        effectiveFrom: effectiveFromDate,
        effectiveTo: null,
        monthWage: monthWage !== undefined ? monthWage : null,
        yearlyWage: yearlyWage !== undefined ? yearlyWage : null,
        workingDaysPerWeek:
          workingDaysPerWeek !== undefined ? workingDaysPerWeek : null,
        breakTime: breakTime !== undefined ? breakTime : null,
        basicSalary: basicSalary || 0,
        basicSalaryPercent:
          basicSalaryPercent !== undefined ? basicSalaryPercent : null,
        houseRentAllowance: houseRentAllowance || 0,
        hraPercent: hraPercent !== undefined ? hraPercent : null,
        standardAllowance: standardAllowance || 0,
        standardAllowancePercent:
          standardAllowancePercent !== undefined
            ? standardAllowancePercent
            : null,
        performanceBonus: performanceBonus || 0,
        performanceBonusPercent:
          performanceBonusPercent !== undefined
            ? performanceBonusPercent
            : null,
        travelAllowance: travelAllowance || 0,
        ltaPercent: ltaPercent !== undefined ? ltaPercent : null,
        fixedAllowance: fixedAllowance || 0,
        fixedAllowancePercent:
          fixedAllowancePercent !== undefined ? fixedAllowancePercent : null,
        pfEmployee: pfEmployee || 0,
        pfEmployeePercent:
          pfEmployeePercent !== undefined ? pfEmployeePercent : null,
        pfEmployer: pfEmployer || 0,
        pfEmployerPercent:
          pfEmployerPercent !== undefined ? pfEmployerPercent : null,
        professionalTax: professionalTax || 0,
        tds: 0,
        otherDeductions: 0,
        grossSalary,
        totalDeductions,
        netSalary,
      },
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        salary: grossSalary,
      },
    });

    res.json({
      status: "success",
      message: activeStructure
        ? "Salary structure updated successfully"
        : "Salary structure created successfully",
      data: {
        monthWage: salaryStructure.monthWage,
        yearlyWage: salaryStructure.yearlyWage,
        workingDaysPerWeek: salaryStructure.workingDaysPerWeek,
        breakTime: salaryStructure.breakTime,
        basicSalary: salaryStructure.basicSalary,
        basicSalaryPercent: salaryStructure.basicSalaryPercent,
        houseRentAllowance: salaryStructure.houseRentAllowance,
        hraPercent: salaryStructure.hraPercent,
        standardAllowance: salaryStructure.standardAllowance,
        standardAllowancePercent: salaryStructure.standardAllowancePercent,
        performanceBonus: salaryStructure.performanceBonus,
        performanceBonusPercent: salaryStructure.performanceBonusPercent,
        travelAllowance: salaryStructure.travelAllowance,
        ltaPercent: salaryStructure.ltaPercent,
        fixedAllowance: salaryStructure.fixedAllowance,
        fixedAllowancePercent: salaryStructure.fixedAllowancePercent,
        grossSalary: salaryStructure.grossSalary,
        pfEmployee: salaryStructure.pfEmployee,
        pfEmployeePercent: salaryStructure.pfEmployeePercent,
        pfEmployer: salaryStructure.pfEmployer,
        pfEmployerPercent: salaryStructure.pfEmployerPercent,
        professionalTax: salaryStructure.professionalTax,
        netSalary: salaryStructure.netSalary,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      status,
      hireDate,
    } = req.body;
    const user = req.user;

    // Find the employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
        error: "Not Found",
      });
    }

    // Check if user has permission (admin or hr)
    if (!["admin", "hr"].includes(user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to update employee details",
        error: "Forbidden",
      });
    }

    // Check company access
    if (user.companyId && employee.companyId !== user.companyId) {
      return res.status(403).json({
        status: "error",
        message: "You can only update employees in your company",
        error: "Forbidden",
      });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== employee.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== employee.userId) {
        return res.status(400).json({
          status: "error",
          message: "Email already in use",
          error: "Validation Error",
        });
      }
    }

    // Prepare update data
    const employeeUpdateData = {};
    const userUpdateData = {};

    if (firstName !== undefined) {
      employeeUpdateData.firstName = firstName;
      userUpdateData.firstName = firstName;
    }
    if (lastName !== undefined) {
      employeeUpdateData.lastName = lastName;
      userUpdateData.lastName = lastName;
    }
    if (email !== undefined) {
      employeeUpdateData.email = email;
      userUpdateData.email = email;
    }
    if (phone !== undefined) {
      employeeUpdateData.phone = phone || null;
      userUpdateData.phone = phone || null;
    }
    if (department !== undefined) {
      employeeUpdateData.department = department;
      userUpdateData.department = department;
    }
    if (position !== undefined) {
      employeeUpdateData.position = position;
      userUpdateData.position = position;
    }
    if (status !== undefined) {
      employeeUpdateData.status = status;
    }
    if (hireDate !== undefined) {
      employeeUpdateData.hireDate = new Date(hireDate);
    }

    // Update employee and user records
    const [updatedEmployee, updatedUser] = await prisma.$transaction([
      prisma.employee.update({
        where: { id: employeeId },
        data: employeeUpdateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              avatar: true,
              phone: true,
              department: true,
              position: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      Object.keys(userUpdateData).length > 0
        ? prisma.user.update({
            where: { id: employee.userId },
            data: userUpdateData,
          })
        : Promise.resolve(employee.user),
    ]);

    const formattedEmployee = {
      id: updatedEmployee.id,
      employeeId: updatedEmployee.employeeId,
      email: updatedEmployee.email,
      firstName: updatedEmployee.firstName,
      lastName: updatedEmployee.lastName,
      avatar: updatedEmployee.avatar || updatedUser?.avatar,
      phone: updatedEmployee.phone,
      department: updatedEmployee.department,
      position: updatedEmployee.position,
      status: updatedEmployee.status,
      hireDate: updatedEmployee.hireDate.toISOString(),
      salary: updatedEmployee.salary,
      userId: updatedEmployee.userId,
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
          }
        : null,
      createdAt: updatedEmployee.createdAt.toISOString(),
      updatedAt: updatedEmployee.updatedAt.toISOString(),
    };

    res.json({
      status: "success",
      data: formattedEmployee,
      message: "Employee details updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
