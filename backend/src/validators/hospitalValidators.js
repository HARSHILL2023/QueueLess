const { z } = require('zod');

const createHospitalSchema = z.object({
  name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  code: z.string().min(2).max(10),
  description: z.string().optional().default(''),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().optional().default(''),
    country: z.string().optional().default('India'),
  }),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  website: z.string().optional().default(''),
  settings: z.object({
    openTime: z.string().optional().default('08:00'),
    closeTime: z.string().optional().default('20:00'),
    maxTokensPerDay: z.number().positive().optional().default(200),
    avgConsultationMinutes: z.number().positive().optional().default(15),
    allowOnlineBooking: z.boolean().optional().default(true),
  }).optional(),
});

const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2).max(10),
  description: z.string().optional().default(''),
  floor: z.string().optional().default('Ground Floor'),
  roomNumber: z.string().optional().default('101'),
  avgWaitMinutes: z.number().positive().optional().default(15),
  maxTokensPerDay: z.number().positive().optional().default(100),
});

module.exports = {
  createHospitalSchema,
  createDepartmentSchema,
};
