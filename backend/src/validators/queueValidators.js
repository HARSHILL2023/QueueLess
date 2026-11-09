const { z } = require('zod');

const bookTokenSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  notes: z.string().max(250).optional().default(''),
});

const callNextSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
});

const cancelTokenSchema = z.object({
  reason: z.string().max(200).optional().default('Cancelled by patient'),
});

module.exports = {
  bookTokenSchema,
  callNextSchema,
  cancelTokenSchema,
};
