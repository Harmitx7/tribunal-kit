const { z } = require('zod');

const FindingSchema = z
  .object({
    id: z.string().min(1, 'Finding must have a stable identifier (id)'),
    category: z.string().min(1, 'Finding must have a category'),
    type: z.string().optional(),
    severity: z.enum([
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW',
      'INFO',
      'Critical',
      'Important',
      'Minor',
    ]),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .or(z.enum(['High', 'Medium', 'Low'])),
    status: z.enum(['DETECTED', 'VERIFIED', 'UNVERIFIED', 'FIXED', 'REGRESSION-PROTECTED']),
    title: z.string().min(1, 'Finding must have a title or description'),
    location: z
      .object({
        file: z.string().optional(),
        line: z.number().optional(),
      })
      .strict()
      .optional(),
    evidence: z
      .array(
        z
          .object({
            type: z.string(),
            description: z.string(),
            location: z.string().optional(),
          })
          .strict(),
      )
      .min(1, 'Finding must contain concrete evidence'),
    impact: z.string().optional(),
    remediation: z.string().optional(),
    validation: z
      .object({
        required: z.boolean().default(true),
      })
      .passthrough()
      .optional(),
    verification: z
      .object({
        test_executed: z.boolean().optional(),
        test_output: z.string().optional(),
        command: z.string().optional(),
        exit_code: z.number().optional(),
        static_proof: z.boolean().optional(),
        tool: z.string().optional(),
        tool_output: z.string().optional(),
      })
      .passthrough()
      .optional(),
    related_findings: z.array(z.string()).optional().default([]),
  })
  .strict();

const FindingsReportSchema = z.object({
  findings: z.array(FindingSchema),
});

function validateFinding(finding) {
  const result = FindingSchema.safeParse(finding);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  return { valid: true, data: result.data };
}

function validateFindingsReport(report) {
  const result = FindingsReportSchema.safeParse(report);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  return { valid: true, data: result.data };
}

module.exports = {
  FindingSchema,
  FindingsReportSchema,
  validateFinding,
  validateFindingsReport,
};
