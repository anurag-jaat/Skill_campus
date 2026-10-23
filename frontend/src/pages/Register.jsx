import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import Logo from '../components/Logo';
import RequestCollegeModal from '../components/RequestCollegeModal';

/**
 * React page component for Register view.
 * @author = kruthinraj
 * @date = 2026-08-28
 */

// removed COLLEGE_DOMAIN

export default function Register() {
  const { requestOtp, register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deliveredByEmail, setDeliveredByEmail] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    
    if (!rollNumber.trim()) {
      setError('Roll number is required.');
      return;
    }

    setBusy(true);
    try {
      const result = await requestOtp(email);
      setDeliveredByEmail(result.deliveredByEmail);
      setCooldown(60);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await register(email, password, code.trim(), rollNumber.trim());
      navigate('/profile/setup', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="mx-auto max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Logo size="md" />
          <div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-xs text-cw-text-2 mt-0.5">
              Code sent to <strong>{email}</strong>
            </p>
          </div>
        </div>

        {deliveredByEmail === false && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Development mode: the email was not actually sent. Look for the code in the
            terminal running the backend.
          </p>
        )}

        <form onSubmit={handleVerify} className="card mt-6 space-y-4">
          <div>
            <label htmlFor="code" className="label">
              6-digit code
            </label>
            <input
              id="code"
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

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Verify and create account'}
          </button>

          <button
            type="button"
            onClick={() => { setStep('form'); setError(''); }}
            className="btn-ghost w-full"
          >
            ← Go back to edit email
          </button>
          
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={busy || cooldown > 0}
            className="text-sm font-medium text-cw-accent hover:underline w-full text-center"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Logo size="md" />
        <div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-xs text-cw-text-2 mt-0.5">
            Only verified college email addresses can register
          </p>
        </div>
      </div>

      <form onSubmit={handleSendOtp} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="reg-email" className="label">College email</label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="yourname@yourcollege.edu"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="reg-roll" className="label">Roll Number</label>
          <input
            id="reg-roll"
            type="text"
            required
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. 21X01A0501"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="label">Password</label>
          <PasswordInput
            id="reg-password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="reg-confirm" className="label">Confirm password</label>
          <PasswordInput
            id="reg-confirm"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 border border-red-200 dark:border-red-900/50 space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            {(error.includes('not yet supported') || error.includes('college domain')) && (
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cw-accent hover:underline bg-cw-accent/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                🎓 Request access for your college →
              </button>
            )}
          </div>
        )}

        <button type="submit" disabled={busy || cooldown > 0} className="btn-primary w-full">
          {busy ? 'Sending code…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send verification code'}
        </button>

        <div className="pt-2 text-center border-t border-cw-border">
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="text-xs font-medium text-cw-accent hover:underline inline-flex items-center gap-1.5 py-1 px-2 rounded hover:bg-cw-accent/5 transition-colors"
          >
            <span className="text-cw-text-3">Can&apos;t find your college?</span>
            <span className="font-semibold text-cw-accent">Request your campus to be added →</span>
          </button>
        </div>

        <p className="text-[11px] text-cw-text-3 text-center">
          By registering, you agree to our{' '}
          <Link to="/privacy" className="underline hover:text-cw-text-1">
            Privacy Policy
          </Link>.
        </p>

        <div className="flex items-center justify-between text-sm text-cw-text-3">
          <Link to="/forgot-password" className="font-medium text-freelance hover:underline">
            Forgot password?
          </Link>
          <p>
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-freelance hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>

      <RequestCollegeModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialEmail={email}
      />
    </div>
  );
}
