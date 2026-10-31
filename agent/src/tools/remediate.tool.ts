import { config } from '../config.js';
import { fetchTarget, requestErrorMessage } from './http.js';

export const supportedAutomaticRemediationActions = ['RESET_STATE'] as const;
export type SupportedAutomaticRemediationAction =
  (typeof supportedAutomaticRemediationActions)[number];

export interface RemediationResult {
  action: string;
  success: boolean;
  message: string;
  incidentState?: any;
}

export async function triggerRemediation(
  action: string = 'RESET_STATE'
): Promise<RemediationResult> {
  if (
    !supportedAutomaticRemediationActions.includes(action as SupportedAutomaticRemediationAction)
  ) {
    return {
      action,
      success: false,
      message: `The demo target only supports automatic ${supportedAutomaticRemediationActions.join(', ')}. ${action} must be performed by an operator.`,
    };
  }

  const url = `${config.targetServiceUrl}/admin/reset`;
  try {
    const res = await fetchTarget(url, {
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
      message: `Failed to invoke remediation on ${url}: ${requestErrorMessage(err)}`,
    };
  }
}
