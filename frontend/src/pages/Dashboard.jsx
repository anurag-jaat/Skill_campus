import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

/**
 * React page component for Dashboard view.
 * Displays My Posts, Tasks to Do, Bids Placed, Payment Pending, and Completed work.
 * Auto-refreshes seamlessly in real-time.
 * 
 * @author = kruthinraj
 * @date = 2026-10-16
 */

const TABS = [
  { key: 'all_involved', label: 'All Involved', icon: '🤝' },
  { key: 'posted', label: 'My Posts', icon: '📝' },
  { key: 'active_work', label: 'Tasks to Do', icon: '🛠️' },
  { key: 'payment_pending', label: 'Payment Pending', icon: '💳' },
  { key: 'bids', label: 'My Bids', icon: '🎯' },
  { key: 'completed', label: 'Completed', icon: '✓' },
];

const STATUS_COLORS = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20',
  in_progress: 'bg-cw-accent/15 text-cw-accent font-semibold border border-cw-accent/30',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-500/20',
  withdrawn: 'bg-cw-bg-alt text-cw-text-3 border border-cw-border',
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function Dashboard() {
  const [tab, setTab] = useState('all_involved');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await api.dashboard.get();
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time synchronization when switching tabs or when actions occur
  useLiveRefresh(load, { intervalMs: 8000 });

  if (loading && !data) return <p className="text-sm text-cw-text-3">Loading dashboard…</p>;
  if (error && !data) return <p className="text-sm text-red-700">{error}</p>;

  const posted = data?.posted ?? [];
  const activeWork = data?.active_work ?? [];
  const bidHistory = data?.bid_history ?? [];
  const paymentPending = data?.payment_pending ?? [];
  const allInvolved = data?.all_involved ?? [];
  const completed = data?.completed ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-cw-text-1">My Dashboard</h1>
          <p className="mt-0.5 text-xs text-cw-text-3">
            Track your posts, tasks to do, bids, and pending campus settlements in real time.
          </p>
        </div>
        <Link
          to="/new"
          className="btn-primary self-start sm:self-auto py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <span>+</span>
          <span>Create New Post</span>
        </Link>
      </div>

      {/* Quick Overview Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'My Posts', count: posted.length, key: 'posted', color: 'text-cw-text-1', icon: '📝' },
          { label: 'Tasks to Do', count: activeWork.length, key: 'active_work', color: 'text-blue-600', icon: '🛠️' },
          {
            label: 'Payment Pending',
            count: paymentPending.length,
            key: 'payment_pending',
            color: paymentPending.length > 0 ? 'text-amber-600 font-extrabold' : 'text-cw-text-2',
            icon: '💳',
          },
          { label: 'Bids Placed', count: bidHistory.length, key: 'bids', color: 'text-exchange', icon: '🎯' },
          { label: 'Completed', count: completed.length, key: 'completed', color: 'text-emerald-600', icon: '✓' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={`card p-3 text-center transition-all cursor-pointer ${
              tab === s.key ? 'border-cw-accent ring-1 ring-cw-accent shadow-sm' : 'hover:border-cw-border/80'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs text-cw-text-3 mb-1">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Tabs Bar */}
      <div className="tab-bar overflow-x-auto flex gap-1 border-b border-cw-border pb-1">
        {TABS.map((t) => {
          let count = 0;
          if (t.key === 'all_involved') count = allInvolved.length;
          if (t.key === 'posted') count = posted.length;
          if (t.key === 'active_work') count = activeWork.length;
          if (t.key === 'payment_pending') count = paymentPending.length;
          if (t.key === 'bids') count = bidHistory.length;
          if (t.key === 'completed') count = completed.length;

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-cw-accent text-white shadow-sm'
                  : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  tab === t.key
                    ? 'bg-white/20 text-white'
                    : 'bg-cw-bg-alt text-cw-text-3 border border-cw-border'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* TAB 1: ALL INVOLVED */}
        {tab === 'all_involved' && (
          <div className="space-y-3">
            {allInvolved.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">🤝</span>
                <p className="text-sm font-semibold text-cw-text-1">No active tasks right now.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  You are not currently involved in any in-progress tasks or exchanges.
                </p>
                <Link to="/browse" className="btn-primary mt-4 inline-block text-xs py-2 px-4">
                  Browse Open Listings →
                </Link>
              </div>
            ) : (
              allInvolved.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="card block p-4 transition hover:border-cw-accent hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                            listing.mode === 'freelance'
                              ? 'bg-freelance'
                              : listing.mode === 'team'
                              ? 'bg-indigo-500'
                              : 'bg-exchange'
                          }`}
                        >
                          {listing.mode === 'freelance'
                            ? 'Freelance'
                            : listing.mode === 'team'
                            ? 'Team Finder'
                            : 'Exchange'}
                        </span>
                        <h3 className="font-bold text-sm text-cw-text-1 truncate">{listing.title}</h3>
                      </div>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{listing.description}</p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex-shrink-0 ${
                        STATUS_COLORS[listing.status] || 'bg-cw-bg-alt text-cw-text-3'
                      }`}
                    >
                      {listing.status === 'in_progress' ? 'In Progress' : listing.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-cw-border/50 flex items-center justify-between text-xs">
                    <span className="font-bold text-cw-text-1">
                      {listing.budget ? `₹${listing.budget}` : 'Skill Swap'}
                    </span>
                    <span className="text-cw-accent font-semibold flex items-center gap-1 hover:underline">
                      <span>Open Workspace</span>
                      <span>→</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MY POSTS */}
        {tab === 'posted' && (
          <div className="space-y-3">
            {posted.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">📝</span>
                <p className="text-sm font-semibold text-cw-text-1">You haven't posted any tasks yet.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  Create a freelance listing, team finder, or skill exchange task.
                </p>
                <Link to="/new" className="btn-primary mt-4 inline-block text-xs py-2 px-4">
                  Create First Post →
                </Link>
              </div>
            ) : (
              posted.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="card block p-4 transition hover:border-cw-accent hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                            listing.mode === 'freelance'
                              ? 'bg-freelance'
                              : listing.mode === 'team'
                              ? 'bg-indigo-500'
                              : 'bg-exchange'
                          }`}
                        >
                          {listing.mode}
                        </span>
                        <h3 className="font-bold text-sm text-cw-text-1 truncate">{listing.title}</h3>
                      </div>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{listing.description}</p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex-shrink-0 capitalize ${
                        STATUS_COLORS[listing.status] || 'bg-cw-bg-alt text-cw-text-3'
                      }`}
                    >
                      {listing.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-cw-border/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-cw-text-3">
                      <span>Posted {formatDate(listing.created_at)}</span>
                      {listing.mode === 'freelance' && (
                        <span>
                          {listing.bids_count ?? 0} {listing.bids_count === 1 ? 'bid' : 'bids'}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-cw-text-1">
                      {listing.budget ? `₹${listing.budget}` : 'Skill Swap'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 3: TASKS TO DO (ACTIVE WORK ASSIGNED TO ME) */}
        {tab === 'active_work' && (
          <div className="space-y-3">
            {activeWork.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">🛠️</span>
                <p className="text-sm font-semibold text-cw-text-1">No tasks assigned to you right now.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  Place bids on freelance tasks or apply to teams to get assigned work!
                </p>
                <Link to="/browse" className="btn-primary mt-4 inline-block text-xs py-2 px-4">
                  Browse Open Tasks →
                </Link>
              </div>
            ) : (
              activeWork.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="card block p-4 transition hover:border-cw-accent hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-freelance px-2 py-0.5 text-[10px] font-bold text-white">
                          To-Do Work
                        </span>
                        <h3 className="font-bold text-sm text-cw-text-1 truncate">{listing.title}</h3>
                      </div>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{listing.description}</p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex-shrink-0 capitalize border border-cw-border ${
                        listing.worker_status === 'review'
                          ? 'bg-indigo-900/30 text-indigo-300'
                          : listing.worker_status === 'in_progress'
                          ? 'bg-cw-accent/20 text-cw-accent-light'
                          : 'bg-cw-surface text-cw-text-2'
                      }`}
                    >
                      {listing.worker_status ? listing.worker_status.replace('_', ' ') : 'To Do'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-cw-border/50 flex items-center justify-between text-xs">
                    <span className="font-bold text-freelance">
                      {listing.budget ? `₹${listing.budget}` : 'Skill Swap'}
                    </span>
                    {listing.deadline && (
                      <span className="text-cw-text-3">Due: {formatDate(listing.deadline)}</span>
                    )}
                    <span className="text-cw-accent font-semibold hover:underline">
                      Go to Workspace →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 4: PAYMENT PENDING */}
        {tab === 'payment_pending' && (
          <div className="space-y-3">
            {paymentPending.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">💳</span>
                <p className="text-sm font-semibold text-cw-text-1">No pending payments.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  All your active tasks are either fully settled or in bidding stage.
                </p>
              </div>
            ) : (
              paymentPending.map((item) => (
                <Link
                  key={item.id}
                  to={`/listings/${item.id}`}
                  className="card block p-4 transition border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                          {item.role_in_task === 'owner' ? 'Payment Due (Pay Freelancer)' : 'Awaiting Payment from Poster'}
                        </span>
                        <h3 className="font-bold text-sm text-cw-text-1 truncate">{item.title}</h3>
                      </div>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{item.description}</p>
                    </div>

                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex-shrink-0">
                      ₹{item.amount || item.budget}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs">
                    <span className="text-cw-text-3 text-[11px]">
                      {item.role_in_task === 'owner'
                        ? 'Tap to settle via UPI or Cash'
                        : 'Confirm receipt when received'}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                      <span>Open Settlement Card</span>
                      <span>→</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 5: MY BIDS */}
        {tab === 'bids' && (
          <div className="space-y-3">
            {bidHistory.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">🎯</span>
                <p className="text-sm font-semibold text-cw-text-1">You haven't placed any bids yet.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  Browse freelance projects and place bids with your proposed rates.
                </p>
                <Link to="/browse" className="btn-primary mt-4 inline-block text-xs py-2 px-4">
                  Browse Tasks →
                </Link>
              </div>
            ) : (
              bidHistory.map((bid) => (
                <Link
                  key={bid.id}
                  to={bid.listing ? `/listings/${bid.listing.id}` : '#'}
                  className="card block p-4 transition hover:border-cw-accent hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-bold text-sm text-cw-text-1 truncate">
                        {bid.listing?.title || 'Deleted task'}
                      </h3>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{bid.message}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-extrabold text-freelance">₹{bid.amount}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          STATUS_COLORS[bid.status] || 'bg-cw-bg-alt text-cw-text-3'
                        }`}
                      >
                        {bid.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-cw-border/50 flex items-center justify-between text-xs text-cw-text-3">
                    <span>Bid placed {formatDate(bid.created_at)}</span>
                    <span className="text-cw-accent font-semibold hover:underline">
                      View Task Details →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 6: COMPLETED */}
        {tab === 'completed' && (
          <div className="space-y-3">
            {completed.length === 0 ? (
              <div className="card text-center py-8">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-semibold text-cw-text-1">No completed tasks yet.</p>
                <p className="text-xs text-cw-text-3 mt-1">
                  Once tasks are settled and marked done, they will be archived here.
                </p>
              </div>
            ) : (
              completed.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  className="card block p-4 transition hover:border-cw-accent hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                          ✓ Settled &amp; Done
                        </span>
                        <h3 className="font-bold text-sm text-cw-text-1 truncate">{listing.title}</h3>
                      </div>
                      <p className="text-xs text-cw-text-2 line-clamp-1">{listing.description}</p>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {listing.budget ? `₹${listing.budget}` : 'Skill Swap'}
                    </span>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-xs text-cw-accent hover:underline font-semibold">
                      View Task &amp; Reviews →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
