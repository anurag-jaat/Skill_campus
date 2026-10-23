import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isProfileIncomplete } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import ImageModal from '../components/ImageModal';
import Logo from '../components/Logo';
import RequestCollegeModal from '../components/RequestCollegeModal';
import { cleanErrorMessage } from '../lib/api';

/**
 * React page component for Login view.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

// removed COLLEGE_DOMAIN

export default function Login() {
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorObj, setErrorObj] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorObj(null);
    setBusy(true);

    try {
      const { isNewUser } = await loginWithPassword(email, password);
      navigate(isNewUser ? '/profile/setup' : '/', { replace: true });
    } catch (err) {
      setErrorObj(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Logo size="md" />
        <div>
          <h1 className="text-2xl font-bold">Sign in to SkillBridge</h1>
          <p className="text-xs text-cw-text-2 mt-0.5">
            Verified campus peer freelancing &amp; skill exchange
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            College email
          </label>
          <input
            id="email"
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
          <label htmlFor="password" className="label">
            Password
          </label>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>

        {errorObj && (
          <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/50 space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{cleanErrorMessage(errorObj.message)}</p>
            {(errorObj.message?.includes('not yet supported') || errorObj.message?.includes('college domain')) && (
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cw-accent hover:underline bg-cw-accent/10 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                🎓 Request access for your college →
              </button>
            )}
            {errorObj.details?.image_url && (
              <div className="mt-3">
                <p className="text-xs text-red-600 mb-1 font-semibold uppercase tracking-wider">Proof / Attachment</p>
                <img 
                  src={errorObj.details.image_url} 
                  alt="Block Reason" 
                  className="max-h-32 rounded border border-red-200 object-cover cursor-zoom-in"
                  onClick={() => setFullscreenImage(errorObj.details.image_url)}
                />
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="pt-2 text-center border-t border-cw-border">
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="text-xs font-medium text-cw-accent hover:underline inline-flex items-center gap-1.5 py-1 px-2 rounded hover:bg-cw-accent/5 transition-colors"
          >
            <span className="text-cw-text-3">Student from another university?</span>
            <span className="font-semibold text-cw-accent">Request College Access →</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-freelance hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="font-medium text-freelance hover:underline">
            New here? Register
          </Link>
        </div>
      </form>

      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}

      <RequestCollegeModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialEmail={email}
      />
    </div>
  );
}
