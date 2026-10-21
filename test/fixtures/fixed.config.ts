import { demoConfig, type CrashLabConfig } from 'webhook-crash-lab';

const config: CrashLabConfig = { ...demoConfig('fixed'), name: 'typed fixture' };
export default config;
