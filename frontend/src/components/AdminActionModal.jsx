import { useState, useRef } from 'react';
import { compressImage } from '../utils/imageCompressor';

/**
 * React component for AdminActionModal.
 * @author = kruthinraj
 * @date = 2026-09-03
 */

export default function AdminActionModal({ isOpen, onClose, onConfirm, user, actionType }) {
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);

  if (!isOpen || !user) return null;

  let title = '';
  let buttonText = '';
  let buttonClass = '';

  switch (actionType) {
    case 'warn':
      title = `Warn ${user.full_name || user.email}`;
      buttonText = 'Send Warning';
      buttonClass = 'bg-amber-500 hover:bg-amber-600';
      break;
    case 'block':
      title = `Block ${user.full_name || user.email}`;
      buttonText = 'Block User';
      buttonClass = 'bg-red-600 hover:bg-red-700';
      break;
    case 'unblock':
      title = `Unblock ${user.full_name || user.email}`;
      buttonText = 'Unblock User';
      buttonClass = 'bg-emerald-600 hover:bg-emerald-700';
      break;
    default:
      break;
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      alert(err.message || 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(user.id, { message, image_url: imageUrl });
      setMessage('');
      setImageUrl('');
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-cw-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-slide-up relative">
        <div className="flex justify-between items-center p-6 border-b border-cw-border">
          <h2 className="text-xl font-bold text-cw-text-1">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-cw-text-3 hover:bg-cw-bg hover:text-cw-text-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {actionType === 'block' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500 font-medium">
                This user will immediately lose access to the platform. 
                They will see this message when they try to log in.
              </p>
            </div>
          )}

          {actionType === 'warn' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-500 font-medium">
                This will increment their warning count. The user will receive this message as a notification.
              </p>
            </div>
          )}

          <div>
            <label className="label">
              Reason / Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain why this action is being taken..."
              className="field resize-none"
            />
          </div>

          <div>
            <label className="label">
              Proof (Screenshot) <span className="text-cw-text-3 font-normal text-xs">(optional)</span>
            </label>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-ghost text-xs py-1.5 px-3 rounded-lg border border-cw-border"
              >
                {uploading ? 'Processing...' : 'Upload Image'}
              </button>
              {imageUrl && <span className="text-xs font-medium text-emerald-600">Image attached ✓</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-cw-text-2 hover:bg-cw-bg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting || !message.trim()}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-colors disabled:opacity-50 ${buttonClass}`}
            >
              {submitting ? 'Processing...' : buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
