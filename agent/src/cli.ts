import { agent } from './core/agent.js';
import { printTerminalReport } from './reporter/terminal.js';
import { saveMarkdownReport } from './reporter/markdown.js';
import { triggerRemediation } from './tools/remediate.tool.js';

async function main() {
  const args = process.argv.slice(2);
  const incidentId = `INC-${Date.now().toString().slice(-4)}`;
  const autoRemediate = args.includes('--remediate');
  const forceHeuristics = args.includes('--heuristics') || args.includes('--mock');

  console.log(`🤖 AI-SRE Autonomous CLI Agent starting...`);

  const report = await agent.investigate({
    incidentId,
    alertMessage:
      'Automated Alert: Target service reported anomalous 500 error codes and degraded throughput.',
    forceHeuristics,
  });

  printTerminalReport(report);
  const savedPath = saveMarkdownReport(report);
  console.log(`📄 Markdown report written to: ${savedPath}`);

  if (autoRemediate && report.remediation.canAutoRemediate) {
    console.log(
      `\n⚙️ Initiating Automated Remediation (${report.remediation.recommendedRemediationType})...`
    );
    const remResult = await triggerRemediation(report.remediation.recommendedRemediationType);
    console.log(
      `[Remediation Result] ${remResult.success ? '✅ SUCCESS' : '❌ FAILED'}: ${remResult.message}`
    );
  }
}

main().catch((err) => {
  console.error('Fatal agent error:', err);
  process.exit(1);
});
