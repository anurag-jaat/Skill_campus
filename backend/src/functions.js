import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createApp } from './app.js';
import { assertConfig, env } from './config/env.js';

const jwtSecret = defineSecret('JWT_SECRET');
const smtpUser = defineSecret('SMTP_USER');
const smtpPass = defineSecret('SMTP_PASS');

const app = createApp();
let configChecked = false;

export const skillbridgeApi = onRequest(
  {
    region: process.env.FUNCTION_REGION || 'us-central1',
    maxInstances: 10,
    secrets: [jwtSecret, smtpUser, smtpPass],
  },
  (req, res) => {
    env.jwtSecret = jwtSecret.value();
    env.mail.smtp.user = smtpUser.value();
    env.mail.smtp.pass = smtpPass.value();

    if (!configChecked) {
      assertConfig();
      configChecked = true;
    }

    return app(req, res);
  }
);
