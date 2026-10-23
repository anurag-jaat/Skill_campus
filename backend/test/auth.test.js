import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.DATABASE_DRIVER = 'memory';
const testCacheDir = fs.mkdtempSync(path.join(tmpdir(), 'skillbridge-auth-test-'));
process.env.LOGIN_CACHE_FILE = path.join(testCacheDir, 'last_logins.json');

const [{ createApp }, { db }] = await Promise.all([
  import('../src/app.js'),
  import('../src/db/index.js'),
]);

test('API supports OTP registration and login for a new email domain', async () => {
  const originalLog = console.log;
  let output = '';
  console.log = (...args) => { output += `${args.join(' ')}\n`; };
  const server = createApp().listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const email = `mock-${Date.now()}@lnct.ac.in`;

    const otpResponse = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    assert.equal(otpResponse.status, 200);
    const code = output.match(/verification code is: (\d{6})/)?.[1];
    assert.ok(code, 'console mail driver should print the test OTP');

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'mock-test-password',
        code,
        roll_number: 'MOCK-TEST',
      }),
    });
    if (!registerResponse.ok) {
      throw new Error(`Registration failed (${registerResponse.status}): ${await registerResponse.text()}`);
    }
    const { user, token } = await registerResponse.json();
    assert.ok(token);

    const college = await db.findOne('colleges', { id: user.college_id });
    assert.equal(college.domain, 'lnct.ac.in');

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'mock-test-password' }),
    });
    if (!loginResponse.ok) {
      throw new Error(`Login failed (${loginResponse.status}): ${await loginResponse.text()}`);
    }

    const profileResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(profileResponse.status, 200);
  } finally {
    console.log = originalLog;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(testCacheDir, { recursive: true, force: true });
  }
});
