import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';

/**
 * React page component for unified typo-tolerant search view (Users and Posts).
 * @author = kruthinraj
 * @date = 2026-09-03
 */

export default function SearchUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(queryParam);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'users' | 'posts'
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep inputVal in sync with query parameter
  useEffect(() => {
    setInputVal(queryParam);
  }, [queryParam]);

  useEffect(() => {
    let cancelled = false;

    if (!queryParam.trim()) {
      setUsers([]);
      setListings([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.search.all(queryParam.trim());
        if (!cancelled) {
          setUsers(res.users || []);
          setListings(res.listings || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch search results.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [queryParam]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ q: inputVal.trim() });
    }
  };

  const totalResults = users.length + listings.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      {/* Header & In-page Search Bar */}
      <div className="card border-cw-accent/20 bg-gradient-to-r from-cw-surface to-cw-bg-alt/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-cw-text-1">Search SkillBridge</h1>
            <p className="text-xs text-cw-text-2 mt-0.5">
              Find students, tutors, freelance tasks, and skill swaps across campus.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-cw-accent/10 px-3 py-1 text-xs font-semibold text-cw-accent border border-cw-accent/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Typo-tolerant search active
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-cw-text-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="field pl-11 pr-24 py-2.5 w-full text-base"
            placeholder="Search by student name, skill (e.g. Python, Figma), or post title..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary absolute right-1.5 px-4 py-1.5 text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {queryParam && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cw-border pb-3">
          <div className="text-sm text-cw-text-2">
            Showing results for <span className="font-semibold text-cw-text-1">"{queryParam}"</span>
            {!loading && (
              <span className="ml-2 text-xs text-cw-text-3">
                ({totalResults} {totalResults === 1 ? 'match' : 'matches'})
              </span>
            )}
          </div>

          {/* Navigation Tabs */}
          {!loading && totalResults > 0 && (
            <div className="flex items-center gap-1.5 bg-cw-bg-alt/70 p-1 rounded-lg border border-cw-border/50 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-cw-accent text-white shadow-sm'
                    : 'text-cw-text-2 hover:text-cw-text-1'
                }`}
              >
                All ({totalResults})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === 'users'
                    ? 'bg-cw-accent text-white shadow-sm'
                    : 'text-cw-text-2 hover:text-cw-text-1'
                }`}
              >
                Students ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  activeTab === 'posts'
                    ? 'bg-cw-accent text-white shadow-sm'
                    : 'text-cw-text-2 hover:text-cw-text-1'
                }`}
              >
                Posts & Tasks ({listings.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content States */}
      {loading ? (
        <div className="card text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cw-accent border-r-transparent mb-3" />
          <p className="text-sm font-medium text-cw-text-2">Searching campus profiles and posts...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-12 border-red-200 bg-red-50 dark:bg-red-950/20">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      ) : !queryParam.trim() ? (
        <div className="card text-center py-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cw-accent/10 text-cw-accent mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-cw-text-1">Type in a keyword to get started</h2>
          <p className="text-sm text-cw-text-3 max-w-md mx-auto mt-1">
            Even if you mistype a word (like "pyhton", "desgn", or "hckathon"), our smart search will find relevant students and posts!
          </p>
        </div>
      ) : totalResults === 0 ? (
        <div className="card text-center py-14 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-cw-text-1">No matches found for "{queryParam}"</h2>
          <p className="text-sm text-cw-text-3 max-w-md mx-auto">
            We couldn't find any students or posts matching your query. Try searching by general skill, subject, or browse all listings.
          </p>
          <div className="pt-2">
            <Link to="/browse" className="btn-secondary text-sm">
              Browse all open listings
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* USERS SECTION (Shown in 'all' or 'users' tab) */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-cw-text-1 flex items-center gap-2">
                  <span>Students & Mentors</span>
                  <span className="text-xs font-normal text-cw-text-3 bg-cw-bg-alt px-2 py-0.5 rounded-full border border-cw-border">
                    {users.length}
                  </span>
                </h2>
                {activeTab === 'all' && users.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-semibold text-cw-accent hover:underline"
                  >
                    View all {users.length} students →
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(activeTab === 'all' ? users.slice(0, 4) : users).map((u) => {
                  const initials = (u.full_name || '?')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <Link
                      key={u.id}
                      to={`/users/${u.id}`}
                      className="card hover:border-cw-accent hover:shadow-md transition block"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="avatar-md flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name || 'Student'} />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-cw-text-1 truncate">
                            {u.full_name || 'Student'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-amber-500 text-sm">★</span>
                            <span className="text-xs font-medium text-cw-text-2">
                              {Number(u.rating_average || 0).toFixed(1)}
                              <span className="text-cw-text-3 ml-1">({u.rating_count || 0})</span>
                            </span>
                          </div>
                          {u.bio && (
                            <p className="text-xs text-cw-text-3 truncate mt-1">{u.bio}</p>
                          )}
                        </div>
                      </div>

                      {((u.skills_offered?.length > 0) || (u.skills_wanted?.length > 0)) && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-cw-border/60 pt-2.5">
                          {u.skills_offered?.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-freelance/10 px-2 py-0.5 text-[10px] font-medium text-freelance truncate max-w-[120px]"
                            >
                              Can Teach: {s}
                            </span>
                          ))}
                          {u.skills_wanted?.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-exchange/10 px-2 py-0.5 text-[10px] font-medium text-exchange truncate max-w-[120px]"
                            >
                              Wants to learn: {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* LISTINGS / POSTS SECTION (Shown in 'all' or 'posts' tab) */}
          {(activeTab === 'all' || activeTab === 'posts') && listings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-cw-text-1 flex items-center gap-2">
                  <span>Posts, Tasks & Swaps</span>
                  <span className="text-xs font-normal text-cw-text-3 bg-cw-bg-alt px-2 py-0.5 rounded-full border border-cw-border">
                    {listings.length}
                  </span>
                </h2>
                {activeTab === 'all' && listings.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('posts')}
                    className="text-xs font-semibold text-cw-accent hover:underline"
                  >
                    View all {listings.length} posts →
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(activeTab === 'all' ? listings.slice(0, 6) : listings).map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}

          {/* If the active tab has 0 items but the other tab does */}
          {activeTab === 'users' && users.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-cw-text-2">No students matched "{queryParam}".</p>
              <button
                type="button"
                onClick={() => setActiveTab('posts')}
                className="btn-secondary text-xs mt-3"
              >
                Switch to Posts ({listings.length})
              </button>
            </div>
          )}

          {activeTab === 'posts' && listings.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-sm text-cw-text-2">No posts matched "{queryParam}".</p>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className="btn-secondary text-xs mt-3"
              >
                Switch to Students ({users.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
