import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

/**
 * React page component for ForgotPassword view.
 * @author = kruthinraj
 * @date = 2026-08-28
 */

// removed COLLEGE_DOMAIN

export default function ForgotPassword() {
  const { requestOtp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deliveredByEmail, setDeliveredByEmail] = useState(true);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const result = await requestOtp(email);
      setDeliveredByEmail(result.deliveredByEmail);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email, code.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'reset') {
    return (
      <div className="mx-auto max-w-md animate-fade-in">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-cw-text-2">
          Enter the code sent to <strong>{email}</strong> and choose a new password.
        </p>

        {deliveredByEmail === false && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Development mode: check the backend terminal for the code.
          </p>
        )}

        <form onSubmit={handleReset} className="card mt-6 space-y-4">
          <div>
            <label htmlFor="reset-code" className="label">6-digit code</label>
            <input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="field text-center text-2xl tracking-[0.5em]"
            />
          </div>

          <div>
            <label htmlFor="reset-pw" className="label">New password</label>
            <PasswordInput
              id="reset-pw"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="reset-confirm" className="label">Confirm new password</label>
            <PasswordInput
              id="reset-confirm"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
            {busy ? 'Resetting…' : 'Reset password and sign in'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setPassword(''); setConfirm(''); setError(''); }}
            className="btn-ghost w-full"
          >
            ← Go back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-2 text-sm text-cw-text-2">
        Enter your college email and we'll send a verification code to reset it.
      </p>

      <form onSubmit={handleSendOtp} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="forgot-email" className="label">College email</label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@yourcollege.edu"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Sending code…' : 'Send reset code'}
        </button>

        <p className="text-center text-sm text-cw-text-3">
          <Link to="/login" className="font-medium text-freelance hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
