import { useState, useEffect } from 'react';
import { api } from '../lib/api';

/**
 * Modal component allowing prospective students to request access for unlisted colleges.
 * @author = kruthinraj
 * @date = 2026-10-17
 */

export default function RequestCollegeModal({ isOpen, onClose, initialEmail = '' }) {
  const [collegeName, setCollegeName] = useState('');
  const [collegeDomain, setCollegeDomain] = useState('');
  const [exampleEmail, setExampleEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Auto-extract domain when initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setExampleEmail(initialEmail);
      const parts = initialEmail.split('@');
      if (parts.length === 2 && parts[1]) {
        setCollegeDomain(parts[1].toLowerCase().trim());
      }
    }
  }, [initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanDom = collegeDomain.trim().toLowerCase().replace(/^@+/, '');
      const res = await api.colleges.requestAccess({
        college_name: collegeName.trim(),
        college_domain: cleanDom,
        example_email: exampleEmail.trim(),
        notes: notes.trim(),
      });

      setSuccessInfo(res);
    } catch (err) {
      setError(err.message || 'Failed to submit college request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessInfo(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-cw-surface rounded-2xl border border-cw-border shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-cw-text-3 hover:text-cw-text-1 hover:bg-cw-bg-alt transition-colors"
        >
          ✕
        </button>

        {successInfo ? (
          /* SUCCESS STATE */
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎉
            </div>
            <div>
              <h3 className="text-xl font-bold text-cw-text-1">
                {successInfo.alreadyApproved ? 'College Already Approved!' : 'Request Received!'}
              </h3>
              <p className="text-sm text-cw-text-2 mt-2 leading-relaxed">
                {successInfo.message}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-cw-bg-alt border border-cw-border text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-cw-text-3 font-medium">College Name:</span>
                <span className="font-semibold text-cw-text-1">{collegeName || successInfo.college?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cw-text-3 font-medium">Domain:</span>
                <span className="font-mono font-semibold text-cw-text-1">@{collegeDomain || successInfo.college?.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cw-text-3 font-medium">Notification Email:</span>
                <span className="font-semibold text-cw-text-1">{exampleEmail}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="btn-primary w-full py-2.5 text-sm font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cw-accent/10 border border-cw-accent/20 flex items-center justify-center text-xl flex-shrink-0">
                🎓
              </div>
              <div>
                <h3 className="text-lg font-bold text-cw-text-1">Request College Access</h3>
                <p className="text-xs text-cw-text-3">
                  Submit your university details. We will email you once approved!
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="label text-xs font-semibold text-cw-text-1">
                College / University Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vellore Institute of Technology, SRM University"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="field text-sm"
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-cw-text-1">
                College Email Domain <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-cw-text-3 text-sm font-semibold select-none">@</span>
                <input
                  type="text"
                  required
                  placeholder="vit.ac.in or srmist.edu.in"
                  value={collegeDomain.replace(/^@+/, '')}
                  onChange={(e) => setCollegeDomain(e.target.value.toLowerCase().trim())}
                  className="field text-sm pl-7 font-mono"
                />
              </div>
              <p className="text-[11px] text-cw-text-3 mt-1">
                The domain part of your student email (everything after '@').
              </p>
            </div>

            <div>
              <label className="label text-xs font-semibold text-cw-text-1">
                Your Contact / College Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="student@vit.ac.in or your-email@gmail.com"
                value={exampleEmail}
                onChange={(e) => setExampleEmail(e.target.value)}
                className="field text-sm"
              />
              <p className="text-[11px] text-cw-text-3 mt-1">
                We will send an automated confirmation to this address once approved.
              </p>
            </div>

            <div>
              <label className="label text-xs font-semibold text-cw-text-1">
                Optional Notes / Student Community Info
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Approximately 5,000 engineering students are looking to join..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="field text-sm"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost text-xs py-2 px-4 text-cw-text-2 hover:text-cw-text-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                {loading ? 'Submitting request…' : 'Submit College Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
