import { z } from 'zod'

export const updateSettingsSchema = z.object({
  body: z.object({
    taxRate: z.number().min(0).max(100).optional(),
    insuranceRate: z.number().min(0).max(100).optional(),
    payPeriodDays: z.number().int().min(1).max(31).optional(),
  }),
})

