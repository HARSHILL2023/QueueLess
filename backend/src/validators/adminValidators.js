const { z } = require('zod');

const hospitalStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().max(300).optional().default(''),
});

const rejectHospitalSchema = z.object({
  reason: z.string().trim().min(3, 'A rejection reason is required').max(300),
});

const userStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().max(300).optional().default(''),
});

module.exports = {
  hospitalStatusSchema,
  rejectHospitalSchema,
  userStatusSchema,
};
