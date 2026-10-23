import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import ImageModal from '../components/ImageModal';

/**
 * React page component for Notifications view.
 * Features high-contrast crisp white typography and real-time live sync.
 * 
 * @author = kruthinraj
 * @date = 2026-10-16
 */

const TYPE_CONFIG = {
  new_bid: { icon: '💰', color: 'bg-freelance', label: 'New Bid' },
  bid_accepted: { icon: '✅', color: 'bg-emerald-500', label: 'Bid Accepted' },
  bid_rejected: { icon: '❌', color: 'bg-red-500', label: 'Bid Rejected' },
  exchange_proposal: { icon: '🔄', color: 'bg-exchange', label: 'Swap Proposal' },
  listing_completed: { icon: '🎉', color: 'bg-amber-500', label: 'Completed' },
  team_application: { icon: '👥', color: 'bg-indigo-500', label: 'Team Application' },
  admin_warning: { icon: '⚠️', color: 'bg-amber-500', label: 'Warning' },
  admin_unblock: { icon: '🔓', color: 'bg-emerald-500', label: 'Unblocked' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await api.notifications.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unread_count);
      
      if (result.unread_count > 0) {
        api.notifications.markRead().catch(() => {});
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + Real-time live polling (just like chat)
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        load();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && notifications.length === 0) {
    return <p className="text-sm text-white font-medium">Loading notifications…</p>;
  }
  if (error && notifications.length === 0) {
    return <p className="text-sm text-red-500 font-semibold">{error}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white dark:text-white">Notifications</h1>
          <p className="mt-1 text-xs text-slate-300 dark:text-slate-300">
            Real-time updates on bids, team applications, and task settlements.
          </p>
        </div>
      </div>

      {notifications.length === 0 && (
        <div className="card text-center py-12 border-cw-border/80">
          <p className="text-3xl">🔔</p>
          <p className="mt-3 text-sm font-bold text-white dark:text-white">No notifications yet.</p>
          <p className="mt-1 text-xs text-slate-300 dark:text-slate-300">
            You'll see instant updates here when students bid on your listings or accept your work.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => {
          const config = TYPE_CONFIG[n.type] || { icon: '📌', color: 'bg-cw-accent', label: n.type };
          return (
            <div
              key={n.id}
              className="card p-4 border border-cw-border/80 bg-cw-surface hover:border-cw-accent/50 transition-all shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl ${config.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm text-base`}
                >
                  <span>{config.icon}</span>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 space-y-1">
                      {/* High-contrast crisp pure white notification text */}
                      <p className="text-sm font-bold text-white dark:text-white leading-relaxed select-text">
                        {n.message}
                      </p>

                      {n.image_url && (
                        <div className="mt-2 mb-1">
                          <img
                            src={n.image_url}
                            alt="Attachment"
                            className="max-h-36 rounded-xl border border-cw-border object-cover cursor-zoom-in"
                            onClick={() => setFullscreenImage(n.image_url)}
                          />
                        </div>
                      )}

                      <p className="text-xs font-medium text-slate-300 dark:text-slate-300">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {n.listing_id && (
                      <Link
                        to={`/listings/${n.listing_id}`}
                        className="btn-primary flex-shrink-0 py-1.5 px-3 text-xs font-bold text-white flex items-center gap-1 shadow-sm"
                      >
                        <span>View Task</span>
                        <span>→</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
    </div>
  );
}
