import { z } from 'zod'

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : val),
      z.string().optional().refine(
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
      )
    ),
    avatar: z.string().optional(),
    about: z.string().optional(),
    whatILoveAboutMyJob: z.string().optional(),
    interestsAndHobbies: z.string().optional(),
    skills: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    employeeData: z.object({
      dateOfBirth: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional().refine(
          (val) => {
            if (!val || val === null || val === '') return true; // Allow empty/null
            const dob = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Check if DOB is in the future
            if (dob > today) {
              return false;
            }
            
            // Check if age is at least 18 years
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const dayDiff = today.getDate() - dob.getDate();
            
            const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
            
            return actualAge >= 18;
          },
          {
            message: 'Date of birth must not be in the future and employee must be at least 18 years old'
          }
        )
      ),
      address: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      nationality: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      personalEmail: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().email('Invalid email address').nullable().optional().or(z.literal(''))
      ),
      gender: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      maritalStatus: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      accountNumber: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      bankName: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      ifscCode: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      panNo: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
      uanNo: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : val),
        z.string().nullable().optional()
      ),
    }).optional(),
  }),
})

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),
})

