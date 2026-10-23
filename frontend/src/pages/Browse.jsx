import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import ModeToggle from '../components/ModeToggle';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { scoreFuzzyMatch } from '../utils/fuzzySearch';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

/**
 * React page component for Browse view.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

export default function Browse() {
  const { user } = useAuth();
  const [mode, setMode] = useState('freelance');
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadListings = useCallback(() => {
    api.listings
      .list(mode)
      .then((data) => {
        setListings(data.listings);
        setError('');
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mode]);

  useEffect(() => {
    setLoading(true);
    loadListings();
  }, [loadListings]);

  // Refreshes when window regains focus or after storage updates
  useLiveRefresh(loadListings, { intervalMs: 12000 });

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const scored = [];
    for (const listing of listings) {
      const combinedText = [
        listing.title || '',
        listing.description || '',
        Array.isArray(listing.tags) ? listing.tags.join(' ') : '',
        listing.skill_offered || '',
        listing.skill_wanted || '',
        listing.owner?.full_name || '',
      ].join(' ');
      const score = scoreFuzzyMatch(searchQuery, combinedText);
      if (score >= 0.55) {
        scored.push({ listing, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.listing);
  }, [listings, searchQuery]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold">
            {mode === 'freelance' ? 'Open tasks' : mode === 'team' ? 'Find a Team' : 'Skill swaps'}
          </h1>
          <p className="text-sm text-cw-text-2">
            {mode === 'freelance'
              ? 'Paid work posted by students on campus.'
              : mode === 'team'
              ? 'Join a team for a hackathon or project.'
              : 'Teach what you know, learn what you want. No money involved.'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {user && (
        <Link to="/new" className="btn-primary mb-6">
          Post a listing
        </Link>
      )}

      {/* Search Bar for Posts */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-cw-text-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="field pl-10 w-full"
          placeholder="Search posts by title, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-cw-text-3">Loading listings…</p>}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="card text-center">
          <p className="text-sm text-cw-text-2">
            Nothing here yet. {user ? 'Be the first to post one.' : 'Sign in to post the first one.'}
          </p>
        </div>
      )}

      {!loading && !error && listings.length > 0 && filteredListings.length === 0 && (
        <div className="card text-center">
          <p className="text-sm text-cw-text-2">
            No posts match your search for "{searchQuery}".
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
