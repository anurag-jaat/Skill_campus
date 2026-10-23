import { useRef, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';

/**
 * React component for EditListingModal.
 * @author = kruthinraj
 * @date = 2026-09-17
 */

export default function EditListingModal({ listing, onClose, onUpdated }) {
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    title: listing.title || '',
    description: listing.description || '',
    tags: (listing.tags || []).join(', '),
    budget: listing.budget || '',
    deadline: listing.deadline ? new Date(listing.deadline).toISOString().split('T')[0] : '',
    skill_offered: listing.skill_offered || '',
    skill_wanted: listing.skill_wanted || '',
    people_required: listing.people_required || 1,
  });

  const [imagePreview, setImagePreview] = useState(listing.image_url || '');
  const [imageBase64, setImageBase64] = useState(listing.image_url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    try {
      const compressedDataUrl = await compressImage(file);
      setImagePreview(compressedDataUrl);
      setImageBase64(compressedDataUrl);
    } catch (err) {
      setError(err.message || 'Failed to process image');
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setImageBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildPayload = () => {
    const base = {
      title: form.title.trim(),
      description: form.description.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      image_url: imageBase64,
    };

    if (listing.mode === 'freelance') {
      return {
        ...base,
        budget: Number(form.budget),
        deadline: new Date(form.deadline).toISOString(),
      };
    }

    if (listing.mode === 'team') {
      return {
        ...base,
        people_required: Number(form.people_required),
        deadline: new Date(form.deadline).toISOString(),
      };
    }

    if (listing.mode === 'exchange') {
      return {
        ...base,
        skill_offered: form.skill_offered.trim(),
        skill_wanted: form.skill_wanted.trim(),
      };
    }
    
    return base;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = buildPayload();
      await api.listings.update(listing.id, payload);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-cw-surface border border-cw-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col relative">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-cw-surface/90 backdrop-blur border-b border-cw-border p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">Edit Listing</h2>
          <button type="button" onClick={onClose} className="p-2 text-cw-text-2 hover:text-cw-text-1 hover:bg-cw-bg-alt rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          
          <div>
            <label htmlFor="title" className="label text-cw-text-3">
              Title <span className="font-normal">(Cannot be changed to prevent scams)</span>
            </label>
            <input
              id="title"
              value={form.title}
              disabled
              className="field opacity-60 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="description" className="label text-cw-text-3">
              Description <span className="font-normal">(Cannot be changed to prevent scams)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              disabled
              className="field opacity-60 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="tags" className="label">
              Tags <span className="font-normal text-cw-text-3">(comma separated)</span>
            </label>
            <input
              id="tags"
              value={form.tags}
              onChange={update('tags')}
              placeholder="Design, Figma, Logo"
              className="field"
            />
          </div>

          {/* Mode specific fields */}
          {listing.mode === 'freelance' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="budget" className="label">
                  Budget (₹)
                </label>
                <input
                  id="budget"
                  type="number"
                  min={1}
                  required
                  value={form.budget}
                  onChange={update('budget')}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="deadline" className="label">
                  Deadline
                </label>
                <input
                  id="deadline"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.deadline}
                  onChange={update('deadline')}
                  className="field"
                />
              </div>
            </div>
          )}

          {listing.mode === 'team' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="people_required" className="label">
                  Number of people needed
                </label>
                <input
                  id="people_required"
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={form.people_required}
                  onChange={update('people_required')}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="deadline" className="label">
                  Deadline
                </label>
                <input
                  id="deadline"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.deadline}
                  onChange={update('deadline')}
                  className="field"
                />
              </div>
            </div>
          )}

          {listing.mode === 'exchange' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="skill_offered" className="label">
                  Skill you offer
                </label>
                <input
                  id="skill_offered"
                  required
                  value={form.skill_offered}
                  onChange={update('skill_offered')}
                  placeholder="e.g. Python"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="skill_wanted" className="label">
                  Skill you want
                </label>
                <input
                  id="skill_wanted"
                  required
                  value={form.skill_wanted}
                  onChange={update('skill_wanted')}
                  placeholder="e.g. React"
                  className="field"
                />
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="label">Cover Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative mt-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 rounded-lg border border-cw-border object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-100 p-1 text-red-600 shadow hover:bg-red-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-cw-border p-6 text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-sm font-medium">Click to upload an image</span>
              </button>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-cw-border">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
