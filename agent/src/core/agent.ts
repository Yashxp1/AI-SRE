import { GoogleGenAI, Interactions } from '@google/genai';
import { config } from '../config.js';
import { SRE_SYSTEM_PROMPT } from './prompts.js';
import { SRE_TOOL_DECLARATIONS, executeTool } from '../tools/index.js';
import { IncidentReport, IncidentReportSchema } from '../schemas/report.js';
import { runHeuristicInvestigation } from './heuristics.js';

export interface InvestigationOptions {
  incidentId?: string;
  alertMessage?: string;
  forceHeuristics?: boolean;
}

export class SREAgent {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
  }

  public async investigate(options: InvestigationOptions = {}): Promise<IncidentReport> {
    const incidentId = options.incidentId || `INC-${Date.now().toString().slice(-4)}`;
    const alertMessage =
      options.alertMessage ||
      'CRITICAL ALERT: Target microservice reporting elevated 500 error rates or degradation. Begin investigation.';

    console.log(`\n=============================================================`);
    console.log(`🔍 AI-SRE AGENT: Commencing autonomous investigation for ${incidentId}`);
    console.log(`Alert: "${alertMessage}"`);
    console.log(`Target: ${config.targetServiceUrl}`);
    console.log(
      `Mode: ${this.ai && !options.forceHeuristics ? `LLM ReAct Loop (${config.modelName})` : 'Telemetry-Driven Diagnostic Engine'}`
    );
    console.log(`=============================================================\n`);

    if (!this.ai || options.forceHeuristics) {
      if (!this.ai) {
        console.log(`ℹ️ [Notice] GEMINI_API_KEY not configured. Running diagnostic engine.`);
      }
      return await runHeuristicInvestigation(incidentId);
    }

    try {
      return await this.runLLMInvestigation(incidentId, alertMessage);
    } catch (err: any) {
      console.warn(
        `⚠️ LLM investigation encountered an error (${err.message}). Falling back to diagnostic engine.`
      );
      return await runHeuristicInvestigation(incidentId);
    }
  }

  private async runLLMInvestigation(
    incidentId: string,
    alertMessage: string
  ): Promise<IncidentReport> {
    const history: Interactions.Step[] = [
      {
        type: 'user_input',
        content: [
          {
            type: 'text',
            text: `${SRE_SYSTEM_PROMPT}\n\nINCIDENT TRIGGER:\nIncident ID: ${incidentId}\nAlert: ${alertMessage}\nTarget Service URL: ${config.targetServiceUrl}\n\nPlease begin your investigation by executing diagnostic tools.`,
          },
        ],
      },
    ];

    let turn = 0;
    while (turn < config.maxInvestigationTurns) {
      turn++;
      console.log(
        `🔄 [Turn ${turn}/${config.maxInvestigationTurns}] Querying ${config.modelName}...`
      );

      const response = await this.ai!.interactions.create({
        model: config.modelName,
        input: history,
        tools: SRE_TOOL_DECLARATIONS as any,
      });

      if (!response.steps || response.steps.length === 0) {
        break;
      }

      // Add model's steps to history
      history.push(...response.steps);

      // Check for function calls
      const functionCallSteps = response.steps.filter((s) => s.type === 'function_call');

      if (functionCallSteps.length === 0) {
        // No more tool calls; the model has generated its final output
        const textOutput = response.output_text || '';
        const parsedReport = this.extractReportFromText(textOutput, incidentId);
        if (parsedReport) {
          console.log(`✅ Model completed investigation with structured diagnosis.`);
          return parsedReport;
        }
        break;
      }

      // Execute each function call
      for (const call of functionCallSteps) {
        const toolName = call.name!;
        const toolArgs = (call.arguments as Record<string, any>) || {};
        console.log(`🛠️ [Tool Call] -> ${toolName}(${JSON.stringify(toolArgs)})`);

        try {
          const result = await executeTool(toolName, toolArgs);
          console.log(`📥 [Observation] <- Received result from ${toolName}`);

          history.push({
            type: 'function_result',
            name: toolName,
            call_id: call.id!,
            result: JSON.stringify(result),
          });
        } catch (err: any) {
          console.error(`❌ [Tool Error] ${toolName} failed: ${err.message}`);
          history.push({
            type: 'function_result',
            name: toolName,
            call_id: call.id!,
            result: JSON.stringify({ error: err.message }),
          });
        }
      }
    }

    // If loop finishes without returning, fallback to heuristic synthesis with collected evidence
    console.log(`ℹ️ Synthesizing comprehensive RCA report...`);
    return await runHeuristicInvestigation(incidentId);
  }

  private extractReportFromText(text: string, incidentId: string): IncidentReport | null {
    try {
      // Find JSON block in markdown or raw text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const rawJson = JSON.parse(jsonMatch[0]);
      if (!rawJson.incidentId) rawJson.incidentId = incidentId;
      if (!rawJson.detectedAt) rawJson.detectedAt = new Date().toISOString();

      const validation = IncidentReportSchema.safeParse(rawJson);
      if (validation.success) {
        return validation.data;
      } else {
        console.warn('JSON output did not strictly match schema:', validation.error.message);
        return null;
      }
    } catch {
      return null;
    }
  }
}

export const agent = new SREAgent();
