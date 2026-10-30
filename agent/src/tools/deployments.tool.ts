import { config } from '../config.js';

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

export interface DeploymentHistoryResult {
  statusCode: number;
  service?: string;
  current_version?: string;
  total?: number;
  deployments?: DeploymentRecord[];
  error?: string;
}

export async function getDeploymentHistory(): Promise<DeploymentHistoryResult> {
  const url = `${config.targetServiceUrl}/api/deployments`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return { statusCode: res.status, error: `Deployments endpoint returned HTTP ${res.status}` };
    }
    const json = (await res.json()) as any;
    return {
      statusCode: res.status,
      service: json.service,
      current_version: json.current_version,
      total: json.total,
      deployments: json.deployments,
    };
  } catch (err: any) {
    return {
      statusCode: 0,
      error: `Failed to fetch deployment history from ${url}: ${err.message}`,
    };
  }
}

export const getDeploymentHistoryDeclaration = {
  type: 'function',
  name: 'get_deployment_history',
  description:
    'Fetches the release and deployment history for the microservice. Crucial for correlating the onset of errors with recent software deployments and commit changes.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};
