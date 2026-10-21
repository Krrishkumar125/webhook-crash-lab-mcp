// A real crash-lab config: the in-process demo app in "broken" mode.
import { demoConfig } from 'webhook-crash-lab';

export default { ...demoConfig('broken'), name: 'fixture broken app' };
