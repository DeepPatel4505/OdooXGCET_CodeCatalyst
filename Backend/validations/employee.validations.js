import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required").regex(/^[a-zA-Z\s'-]+$/, "First name must contain only letters, spaces, hyphens, and apostrophes"),
    lastName: z.string().min(1, "Last name is required").regex(/^[a-zA-Z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, and apostrophes"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" || !val ? undefined : val))
      .refine(
        (val) => {
          if (!val || val === '') return true; // Allow empty
          // Remove all non-digit characters except +
          const cleaned = val.replace(/[^\d+]/g, '');
          // Check if it matches phone number pattern: optional +, then 10-15 digits
          return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
        },
        {
          message: 'Phone number must be in valid format (10-15 digits, optional + prefix)'
        }
      ),
    department: z.string().min(1, "Department is required"),
    position: z.string().min(1, "Position is required"),
    salary: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error("Salary must be a valid number");
        return num;
      })
      .pipe(z.number().min(0, "Salary must be positive")),
    hireDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    role: z.enum(["admin", "hr", "payroll", "employee"]).optional(),
    // Company name is automatically inherited from the admin/hr creating the employee
  }),
});

export const getEmployeesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    department: z.string().optional(),
    status: z.enum(["active", "inactive", "terminated"]).optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required").regex(/^[a-zA-Z\s'-]+$/, "First name must contain only letters, spaces, hyphens, and apostrophes").optional(),
    lastName: z.string().min(1, "Last name is required").regex(/^[a-zA-Z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, and apostrophes").optional(),
    email: z.string().email("Invalid email address").optional(),
    phone: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" || !val ? undefined : val))
      .refine(
        (val) => {
          if (!val || val === '') return true; // Allow empty
          // Remove all non-digit characters except +
          const cleaned = val.replace(/[^\d+]/g, '');
          // Check if it matches phone number pattern: optional +, then 10-15 digits
          return /^[\+]?[1-9][0-9]{9,14}$/.test(cleaned);
        },
        {
          message: 'Phone number must be in valid format (10-15 digits, optional + prefix)'
        }
      ),
    department: z.string().min(1, "Department is required").optional(),
    position: z.string().min(1, "Position is required").optional(),
    status: z.enum(["active", "inactive", "terminated"]).optional(),
    hireDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .optional(),
  }),
});
