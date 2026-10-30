import dotenv from 'dotenv';
dotenv.config();

export interface AgentConfig {
  port: number;
  targetServiceUrl: string;
  adminApiKey: string;
  geminiApiKey: string | null;
  modelName: string;
  maxInvestigationTurns: number;
}

export const config: AgentConfig = {
  port: parseInt(process.env.AGENT_PORT || '4242', 10),
  targetServiceUrl: process.env.TARGET_SERVICE_URL || 'http://localhost:8000',
  adminApiKey: process.env.ADMIN_API_KEY || 'sre-demo-secret-key-2026',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null,
  modelName: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  maxInvestigationTurns: parseInt(process.env.MAX_INVESTIGATION_TURNS || '8', 10),
};
