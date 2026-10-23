import { useCallback, useEffect, useState } from 'react';
import ListingCard from '../components/ListingCard';
import { api } from '../lib/api';

/**
 * React page component for Exchanges view.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

export default function Exchanges() {
  const [matches, setMatches] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [matchData, exchangeData] = await Promise.all([
        api.exchanges.matches(),
        api.exchanges.mine(),
      ]);
      setMatches(matchData.matches);
      setHint(matchData.hint || '');
      setExchanges(exchangeData.exchanges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accept = async (id) => {
    setError('');
    try {
      await api.exchanges.accept(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-sm text-cw-text-3">Finding matches…</p>;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Your matches</h1>
        <p className="mt-1 text-sm text-cw-text-2">
          Students whose skills line up with yours. A two-way match means you can teach each
          other directly.
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {hint && <p className="card mt-4 text-sm text-cw-text-2">{hint}</p>}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {matches.map(({ listing, score }) => (
            <div key={listing.id} className="relative">
              <span
                className={`absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  score === 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-cw-bg-alt text-cw-text-2 border border-cw-border'
                }`}
              >
                {score === 2 ? 'Two-way match' : 'Partial match'}
              </span>
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>

        {!hint && matches.length === 0 && (
          <p className="card mt-4 text-sm text-cw-text-2">
            No matches right now. Try adding more skills to your profile.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">Swap requests</h2>

        <ul className="mt-4 space-y-3">
          {exchanges.map((exchange) => (
            <li key={exchange.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="mr-auto min-w-0">
                <p className="text-sm text-cw-text-1 break-words">{exchange.message}</p>
                <p className="mt-1 text-xs text-cw-text-3">Listing {exchange.listing_id}</p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="chip capitalize">{exchange.status}</span>
                {exchange.status === 'pending' && (
                  <button type="button" onClick={() => accept(exchange.id)} className="btn-primary py-1 px-3 text-xs">
                    Accept
                  </button>
                )}
              </div>
            </li>
          ))}
          {exchanges.length === 0 && (
            <li className="card text-sm text-cw-text-2">No swap requests yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
