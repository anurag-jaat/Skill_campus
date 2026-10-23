import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeToggle from '../components/ModeToggle';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';

/**
 * React page component for CreateListing view.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const emptyForm = {
  title: '',
  description: '',
  tags: '',
  budget: '',
  deadline: '',
  skill_offered: '',
  skill_wanted: '',
  people_required: '1',
};

export default function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('freelance');
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      mode,
      title: form.title.trim(),
      description: form.description.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      image_url: imageBase64,
    };

    if (mode === 'freelance') {
      return {
        ...base,
        budget: Number(form.budget),
        // The API expects a full ISO date-time; the input gives a plain date.
        deadline: new Date(form.deadline).toISOString(),
      };
    }

    if (mode === 'exchange') {
      return {
        ...base,
        skill_offered: form.skill_offered.trim(),
        skill_wanted: form.skill_wanted.trim(),
      };
    }
    
    if (mode === 'team') {
      return {
        ...base,
        people_required: Number(form.people_required),
        deadline: new Date(form.deadline).toISOString(),
      };
    }
    return base;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { listing } = await api.listings.create(buildPayload());
      navigate(`/listings/${listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Post a listing</h1>
      <p className="mt-2 text-sm text-cw-text-2">
        Choose whether you are paying for work or swapping a skill.
      </p>

      <div className="mt-4">
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="label">
            Title
          </label>
          <input
            id="title"
            required
            minLength={5}
            value={form.title}
            onChange={update('title')}
            placeholder={
              mode === 'freelance'
                ? 'Design a poster for our tech fest'
                : mode === 'team' ? 'Looking for 3 people for hackathon' : 'I can teach Python, I want to learn Figma'
            }
            className="field"
          />
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            required
            minLength={10}
            rows={4}
            value={form.description}
            onChange={update('description')}
            className="field"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="label">
            Image <span className="font-normal text-cw-text-3">(optional, max 200 KB)</span>
          </label>
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-cw-border">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-48 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full
                           bg-black/50 text-white text-sm hover:bg-black/70 transition"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed
                         border-cw-border py-6 text-sm text-cw-text-2 transition
                         hover:border-cw-text-3 hover:text-cw-text-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Click to add a photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {mode === 'freelance' ? (
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
                value={form.deadline}
                onChange={update('deadline')}
                className="field"
              />
            </div>
          </div>
        ) : mode === 'exchange' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="skill_offered" className="label">
                Skill you can teach
              </label>
              <input
                id="skill_offered"
                required
                value={form.skill_offered}
                onChange={update('skill_offered')}
                placeholder="Python"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="skill_wanted" className="label">
                Skill you want to learn
              </label>
              <input
                id="skill_wanted"
                required
                value={form.skill_wanted}
                onChange={update('skill_wanted')}
                placeholder="Figma"
                className="field"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="people_required" className="label">
                Number of people required
              </label>
              <input
                id="people_required"
                type="number"
                min="1"
                max="100"
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
                value={form.deadline}
                onChange={update('deadline')}
                className="field"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="tags" className="label">
            Tags <span className="font-normal text-cw-text-3">(comma separated)</span>
          </label>
          <input
            id="tags"
            value={form.tags}
            onChange={update('tags')}
            placeholder="design, urgent"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Posting…' : 'Post listing'}
        </button>
      </form>
    </div>
  );
}
