import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';

/**
 * React component for ReportModal.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

const REASONS = [
  { value: 'harassment', label: 'Harassment or Abuse' },
  { value: 'scam', label: 'Scam or Fraud' },
  { value: 'non_delivery', label: 'Non-delivery of Service' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ reportedUser, listingId, onClose }) {
  const [reason, setReason] = useState('harassment');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const compressedDataUrl = await compressImage(file);
      setProofUrl(compressedDataUrl);
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.reports.create({
        reported_user_id: reportedUser.id,
        listing_id: listingId,
        reason,
        description,
        proof_url: proofUrl,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cw-bg/80 p-4 animate-fade-in">
      <div className="bg-cw-surface border border-cw-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-cw-border flex justify-between items-center bg-cw-bg-alt">
          <h3 className="font-bold text-cw-text-1 text-lg">Report Issue</h3>
          <button onClick={onClose} className="text-cw-text-3 hover:text-cw-text-1">
            &times;
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h4 className="font-semibold text-lg text-cw-text-1">Report Submitted</h4>
            <p className="text-sm text-cw-text-2 mt-2">
              Thank you for keeping SkillBridge safe. Our team will review this shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            
            <p className="text-sm text-cw-text-2">
              Reporting: <span className="font-semibold text-cw-text-1">{reportedUser.full_name}</span>
            </p>

            <div>
              <label className="label">Reason for reporting</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field bg-cw-bg-alt"
                required
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                minLength={10}
                placeholder="Provide details about the issue. Paste messages here or attach a screenshot below."
                className="field"
              />
            </div>

            <div>
              <label className="label">Screenshot (Optional Proof)</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-ghost text-xs py-1.5"
                >
                  {uploading ? 'Processing...' : 'Upload Image'}
                </button>
                {proofUrl && <span className="text-xs font-medium text-emerald-600">Image attached ✓</span>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
