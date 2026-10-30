import { config } from '../config.js';

export interface RemediationResult {
  action: string;
  success: boolean;
  message: string;
  incidentState?: any;
}

export async function triggerRemediation(
  action: string = 'RESET_STATE'
): Promise<RemediationResult> {
  const url = `${config.targetServiceUrl}/admin/reset`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': config.adminApiKey,
      },
      body: JSON.stringify({ action, initiatedBy: 'ai-sre-agent' }),
    });

    const json = (await res.json()) as any;
    return {
      action,
      success: res.ok,
      message:
        json.message ||
        (res.ok ? 'System successfully restored to nominal baseline.' : 'Remediation failed'),
      incidentState: json.incident,
    };
  } catch (err: any) {
    return {
      action,
      success: false,
      message: `Failed to invoke remediation on ${url}: ${err.message}`,
    };
  }
}

export const triggerRemediationDeclaration = {
  type: 'function',
  name: 'trigger_remediation',
  description:
    'Executes an automated remediation action on the target service (e.g. resetting fault state, clearing pool connections, restoring normal traffic).',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['RESET_STATE', 'RESTART_SERVICE', 'ROLLBACK_DEPLOYMENT'],
        description: 'The remediation action to execute. Defaults to RESET_STATE.',
      },
    },
    required: [],
  },
};
