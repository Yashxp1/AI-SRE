import { z } from 'zod';

export const RootCauseCategoryEnum = z.enum([
  'CODE_BUG',
  'DB_CONNECTION_EXHAUSTION',
  'DOWNSTREAM_LATENCY',
  'INFRASTRUCTURE_UNAVAILABLE',
  'BAD_DEPLOYMENT',
  'MEMORY_PRESSURE_OOM',
  'RATE_LIMITING',
  'UNKNOWN',
]);

export type RootCauseCategory = z.infer<typeof RootCauseCategoryEnum>;

export const IncidentReportSchema = z.object({
  incidentId: z.string().describe('Unique incident identifier (e.g. INC-2026-001)'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  detectedAt: z.string().describe('ISO timestamp of incident detection'),
  failingService: z.string().describe('Name of the degraded or failing service'),
  affectedEndpoints: z
    .array(z.string())
    .describe('List of endpoints actively throwing errors or high latency'),
  healthyEndpoints: z
    .array(z.string())
    .describe('Control group endpoints that remain healthy (200 OK)'),
  rootCauseCategory: RootCauseCategoryEnum,
  summary: z.string().describe('One to two sentence executive summary of the root cause'),
  detailedDiagnosis: z
    .string()
    .describe('Comprehensive engineering explanation of why the failure occurred'),
  evidence: z.object({
    healthProbe: z.string().describe('Findings from /health check probe'),
    metrics: z
      .string()
      .describe('Supporting metrics evidence (error rate, p95 latency, memory % etc.)'),
    logs: z.string().describe('Specific error messages or stack traces extracted from /api/logs'),
    deployments: z
      .string()
      .describe('Correlation with recent deployment releases or commit hashes'),
  }),
  timeline: z
    .array(
      z.object({
        step: z.string(),
        observation: z.string(),
      })
    )
    .describe('Key sequence of diagnostic findings during investigation'),
  remediation: z.object({
    immediateAction: z
      .string()
      .describe('Action SRE should immediately execute to mitigate the outage'),
    longTermFix: z.string().describe('Preventative engineering fix for the underlying defect'),
    canAutoRemediate: z
      .boolean()
      .describe('Whether this incident can be automatically mitigated via remediation tools'),
    recommendedRemediationType: z.enum([
      'ROLLBACK_DEPLOYMENT',
      'RESTART_DB_POOL',
      'SCALE_CONTAINER_MEMORY',
      'RESET_STATE',
      'THROTTLE_OR_INCREASE_QUOTA',
      'ISOLATE_DOWNSTREAM_DEPENDENCY',
      'MANUAL_PATCH',
    ]),
  }),
  confidenceScore: z.number().min(0).max(100).describe('Confidence score percentage (0-100)'),
});

export type IncidentReport = z.infer<typeof IncidentReportSchema>;
