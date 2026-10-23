import { useState } from 'react';
import { api } from '../lib/api';
import { triggerAppRefresh } from '../hooks/useLiveRefresh';

/**
 * React component for TaskProgress.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

const OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-cw-bg text-cw-text-1 border border-cw-border' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-cw-accent/20 text-cw-accent-light border border-cw-accent/30' },
  { value: 'review', label: 'Ready for Review', color: 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/50' },
];

export default function TaskProgress({ listingId, currentStatus, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (status) => {
    if (status === currentStatus) return;
    setLoading(true);
    setError('');
    try {
      const { listing } = await api.listings.setWorkerStatus(listingId, status);
      if (onUpdate) onUpdate(listing);
      triggerAppRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-cw-text-1 mb-3">Task Progress</h3>
      
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.value || (!currentStatus && opt.value === 'todo');
          return (
            <button
              key={opt.value}
              onClick={() => handleUpdate(opt.value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive 
                  ? opt.color + ' ring-2 ring-offset-1 ring-cw-border ring-offset-cw-surface'
                  : 'bg-cw-surface border border-cw-border text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
