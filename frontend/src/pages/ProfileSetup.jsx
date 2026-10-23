import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

/**
 * React page component for ProfileSetup view.
 * @author = kruthinraj
 * @date = 2026-08-28
 */

const toList = (text) =>
  text.split(',').map((item) => item.trim()).filter(Boolean);

export default function ProfileSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    bio: '',
    skills_offered: '',
    skills_wanted: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { user: updated } = await api.users.updateMe({
        full_name: form.full_name.trim(),
        bio: form.bio.trim(),
        skills_offered: toList(form.skills_offered),
        skills_wanted: toList(form.skills_wanted),
      });
      setUser(updated);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in">
      <div className="text-center">
        <span className="text-4xl">👋</span>
        <h1 className="mt-3 text-2xl font-bold">Welcome to SkillBridge!</h1>
        <p className="mt-2 text-sm text-cw-text-2">
          Let's set up your profile so other students know who you are.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="setup-name" className="label">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="setup-name"
            required
            minLength={2}
            value={form.full_name}
            onChange={update('full_name')}
            placeholder="Your full name"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="setup-bio" className="label">About you</label>
          <textarea
            id="setup-bio"
            rows={3}
            value={form.bio}
            onChange={update('bio')}
            placeholder="Tell other students about yourself…"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="setup-offer" className="label">
            Skills you can teach <span className="font-normal text-cw-text-3">(comma separated)</span>
          </label>
          <input
            id="setup-offer"
            value={form.skills_offered}
            onChange={update('skills_offered')}
            placeholder="Python, Photoshop, Public speaking"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="setup-want" className="label">
            Skills you want to learn <span className="font-normal text-cw-text-3">(comma separated)</span>
          </label>
          <input
            id="setup-want"
            value={form.skills_wanted}
            onChange={update('skills_wanted')}
            placeholder="Figma, Video editing, Machine learning"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Complete setup'}
        </button>
      </form>
    </div>
  );
}
