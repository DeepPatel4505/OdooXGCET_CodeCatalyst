import { z } from 'zod'

export const loginSchema = z.object({
  body: z.object({
    loginId: z.string().min(1, 'Login ID or Email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

export const registerSchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
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
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
})

