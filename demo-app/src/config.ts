import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  environment: string;
  serviceName: string;
  serviceVersion: string;
  adminApiKey: string;
  allowLocalAdmin: boolean;
  cgroupMemoryLimitMb: number;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8000', 10),
  environment: process.env.NODE_ENV || 'demo',
  serviceName: process.env.SERVICE_NAME || 'order-service',
  serviceVersion: process.env.SERVICE_VERSION || 'v2.4.1',
  adminApiKey: process.env.ADMIN_API_KEY || 'sre-demo-secret-key-2026',
  allowLocalAdmin: (process.env.ALLOW_LOCAL_ADMIN || 'true').toLowerCase() === 'true',
  cgroupMemoryLimitMb: parseFloat(process.env.CGROUP_MEMORY_LIMIT_MB || '512.0'),
};
