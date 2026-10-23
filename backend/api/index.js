import { createApp } from '../src/app.js';
import { assertConfig } from '../src/config/env.js';

assertConfig();
const app = createApp();

export default app;
