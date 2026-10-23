import { Link } from 'react-router-dom';

/**
 * React component for ListingCard.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

export default function ListingCard({ listing }) {
  const isFreelance = listing.mode === 'freelance';
  const isTeam = listing.mode === 'team';
  const isCompleted = listing.status === 'completed';
  const hasImage = Boolean(listing.image_url);

  const isExpired = isFreelance && listing.deadline && new Date(listing.deadline) < new Date();

  return (
    <Link to={`/listings/${listing.id}`} className={`card block overflow-hidden transition hover:shadow-md ${isExpired || isCompleted ? 'opacity-85' : ''}`}>
      {hasImage && (
        <div className="-mx-5 -mt-5 mb-4">
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-36 object-cover"
          />
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
            isCompleted
              ? 'bg-emerald-600'
              : isExpired
              ? 'bg-cw-border'
              : isFreelance
              ? 'bg-freelance'
              : isTeam
              ? 'bg-indigo-500'
              : 'bg-exchange'
          }`}
        >
          {isCompleted
            ? 'Completed'
            : isExpired
            ? 'Expired'
            : isFreelance
            ? 'Freelance'
            : isTeam
            ? 'Team'
            : 'Exchange'}
        </span>
        {isFreelance ? (
          <span className="text-sm font-semibold text-cw-text-1">₹{listing.budget}</span>
        ) : isTeam ? (
          <span className="text-sm font-semibold text-cw-text-1">
            Looking for {listing.people_required} {listing.people_required === 1 ? 'person' : 'people'}
          </span>
        ) : (
          <span className="text-sm text-cw-text-2">
            {listing.skill_offered} → {listing.skill_wanted}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-cw-text-1">{listing.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-cw-text-2">{listing.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(listing.tags ?? []).map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
        {isFreelance && listing.deadline && (
          <span className="ml-auto text-xs text-cw-text-3">
            {isExpired ? 'Expired on ' : 'Due '}{formatDate(listing.deadline)}
          </span>
        )}
      </div>
    </Link>
  );
}
