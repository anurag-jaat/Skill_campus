import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Implementation file for mailer.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = env.mail.smtp;
  if (!host || !user || !pass) {
    throw new Error(
      'MAIL_DRIVER=smtp but SMTP_HOST / SMTP_USER / SMTP_PASS are not set. ' +
        'Fill them in .env, or switch back to MAIL_DRIVER=console.'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
};

/** Prints the email to stdout instead of sending it. Development only. */
const printToConsole = ({ to, subject, text }) => {
  const line = '='.repeat(64);
  console.log(`\n${line}`);
  console.log('  MAIL (console driver - nothing was actually sent)');
  console.log(line);
  console.log(`  To      : ${to}`);
  console.log(`  Subject : ${subject}`);
  console.log(line);
  console.log(text.split('\n').map((row) => `  ${row}`).join('\n'));
  console.log(`${line}\n`);
};

/**
 * Sends an email through whichever driver MAIL_DRIVER selects.
 * Switching from console to real Gmail SMTP is an .env change, not a code change.
 */
export async function sendMail({ to, subject, text, html }) {
  if (env.mail.driver === 'console') {
    printToConsole({ to, subject, text });
    return { driver: 'console', delivered: false };
  }

  await getTransporter().sendMail({ from: env.mail.from, to, subject, text, html });
  return { driver: 'smtp', delivered: true };
}
