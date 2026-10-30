import { Router, Request, Response } from 'express';
import { systemState } from '../state.js';

export const deploymentsRouter = Router();

export interface DeploymentRecord {
  id: string;
  version: string;
  commitHash: string;
  deployedAt: string;
  deployedBy: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  summary: string;
  changelog: string[];
}

const BASE_DEPLOYMENTS: DeploymentRecord[] = [
  {
    id: 'dep-9821',
    version: 'v2.4.1',
    commitHash: 'a14f82b',
    deployedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    deployedBy: 'ci-runner@company.internal',
    status: 'SUCCESS',
    summary: 'Reliability improvements for order event streaming',
    changelog: [
      'fix: optimize event queue batching',
      'chore: update node runtime dependencies',
      'perf: index query on customer_orders table',
    ],
  },
  {
    id: 'dep-9750',
    version: 'v2.4.0',
    commitHash: 'c73e01d',
    deployedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    deployedBy: 'deploy-bot@company.internal',
    status: 'SUCCESS',
    summary: 'Major release: Multi-currency checkout and tax normalization',
    changelog: [
      'feat: support EUR and GBP currency conversions',
      'refactor: extract tax rules to separate micro-module',
      'docs: update API documentation for orders schema',
    ],
  },
];

deploymentsRouter.get('/', (req: Request, res: Response) => {
  const incident = systemState.getIncident();
  const deployments = [...BASE_DEPLOYMENTS];

  if (incident.activeIncident === 'bad_deployment') {
    const badVersion = (incident.details.badVersion as string) || 'v2.4.2-buggy';
    const commitHash = (incident.details.commitHash as string) || 'f92a3c1';
    const badDeploymentTime =
      incident.startedAt || new Date(Date.now() - 3 * 60 * 1000).toISOString();

    deployments.unshift({
      id: 'dep-9904',
      version: badVersion,
      commitHash,
      deployedAt: badDeploymentTime,
      deployedBy: 'dev-user@company.internal',
      status: 'SUCCESS',
      summary: 'feat(billing): rapid discount pricing hotfix',
      changelog: [
        'feat: implement dynamic discount formula in discount_calculator.ts',
        'refactor: simplify checkout total aggregation',
      ],
    });
  }

  res.status(200).json({
    service: 'order-service',
    current_version: deployments[0].version,
    total: deployments.length,
    deployments,
  });
});
