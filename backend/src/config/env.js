import 'dotenv/config';

/**
 * Implementation file for env.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const toBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toList = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: toList(process.env.CORS_ORIGIN, 'http://localhost:5173'),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseDriver: process.env.DATABASE_DRIVER || (
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'memory'
  ),

  college: {
    domain: (process.env.ALLOWED_EMAIL_DOMAIN || 'apollouniversity.edu.in').trim().toLowerCase(),
    name: process.env.COLLEGE_NAME || 'Apollo University',
  },

  otp: {
    length: 6,
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES || 10),
    maxAttempts: 5,
  },

  mail: {
    driver: (process.env.MAIL_DRIVER || 'console').toLowerCase(),
    from: process.env.MAIL_FROM || 'SkillBridge <no-reply@skillbridge.local>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORT || 587),
      secure: toBool(process.env.SMTP_SECURE, false),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
};

export const isDev = env.nodeEnv !== 'production';
export const isSupabaseConfigured = Boolean(env.supabase.url && env.supabase.serviceKey);
export const isFirestoreConfigured = env.databaseDriver === 'firestore';

/**
 * Fail loudly in production if the placeholders were never replaced.
 * In development we only warn, so the project runs straight after `npm install`.
 */
export function assertConfig() {
  const problems = [];

  if (env.jwtSecret === 'dev-only-insecure-secret-change-me') {
    problems.push('JWT_SECRET is unset and is using the insecure development default.');
  }
  if (env.databaseDriver === 'memory') {
    problems.push('DATABASE_DRIVER=memory - data will be lost when the server restarts.');
  } else if (env.databaseDriver === 'supabase' && !isSupabaseConfigured) {
    problems.push('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required for DATABASE_DRIVER=supabase.');
  } else if (!['memory', 'supabase', 'firestore'].includes(env.databaseDriver)) {
    problems.push(`Unsupported DATABASE_DRIVER: ${env.databaseDriver}.`);
  }
  if (env.mail.driver === 'console') {
    problems.push('MAIL_DRIVER=console - OTPs are printed to this terminal instead of emailed.');
  }

  if (!problems.length) return;

  if (isDev) {
    console.warn('\n[config] Development notes:');
    problems.forEach((p) => console.warn(`  - ${p}`));
    console.warn('');
  } else {
    console.error('\n[config] Refusing to start in production:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
}
