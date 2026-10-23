import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import EditListingModal from '../components/EditListingModal';
import ConfirmModal from '../components/ConfirmModal';
import ImageModal from '../components/ImageModal';
import { compressImage } from '../utils/imageCompressor';

/**
 * React page component for Profile view with responsive sidebar navigation.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const toText = (list) => (list ?? []).join(', ');
const toList = (text) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const Stars = ({ rating }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= rating ? 'star' : 'star-empty'}>★</span>
    ))}
  </span>
);

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // Active tab in navigation: 'profile' | 'listings' | 'reviews' | 'account'
  const activeTab = searchParams.get('tab') || 'profile';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    bio: user?.bio ?? '',
    skills_offered: toText(user?.skills_offered),
    skills_wanted: toText(user?.skills_wanted),
    upi_id: user?.upi_id || (user?.id ? localStorage.getItem(`skillbridge_upi_${user.id}`) : '') || '',
  });

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'open' | 'completed'
  const [editingListing, setEditingListing] = useState(null);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Sync form when user updates
  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name ?? '',
        bio: user.bio ?? '',
        skills_offered: toText(user.skills_offered),
        skills_wanted: toText(user.skills_wanted),
        upi_id: user.upi_id || localStorage.getItem(`skillbridge_upi_${user.id}`) || '',
      });
    }
  }, [user]);

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Load reviews and listings
  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [reviewData, listingsData] = await Promise.all([
        api.reviews.forUser(user.id).catch(() => ({ reviews: [] })),
        api.listings.forOwner(user.id).catch(() => ({ listings: [] })),
      ]);
      setReviews(reviewData.reviews || []);
      setMyListings(listingsData.listings || []);
    } catch (_) {
      // silently ignore
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setError('');
    try {
      const compressedDataUrl = await compressImage(file, 100);
      const { user: updated } = await api.users.updateAvatar(compressedDataUrl);
      setUser(updated);
      setStatus('Avatar updated successfully.');
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);

    try {
      if (form.upi_id) {
        localStorage.setItem(`skillbridge_upi_${user.id}`, form.upi_id.trim());
      }
      const patch = {
        full_name: form.full_name.trim(),
        bio: form.bio.trim(),
        skills_offered: toList(form.skills_offered),
        skills_wanted: toList(form.skills_wanted),
      };
      if (form.upi_id) {
        patch.upi_id = form.upi_id.trim();
      }
      const { user: updated } = await api.users.updateMe(patch);
      setUser(updated);
      setStatus('Profile updated successfully.');
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    try {
      await api.listings.delete(listingToDelete.id);
      setMyListings((prev) => prev.filter((l) => l.id !== listingToDelete.id));
      setListingToDelete(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredListings = myListings.filter((l) => {
    if (listingFilter === 'open') return l.status === 'open';
    if (listingFilter === 'completed') return l.status === 'completed';
    return true; // 'all'
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cw-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-cw-text-1">Settings &amp; Profile</h1>
          <p className="text-sm text-cw-text-3 mt-0.5">
            Manage your personal profile, active gigs, peer reviews, and security credentials.
          </p>
        </div>
        <Link
          to={`/users/${user?.id}`}
          className="btn-ghost text-xs py-2 px-3 border border-cw-border rounded-xl flex items-center gap-1.5 text-cw-text-2 hover:text-cw-text-1 w-fit"
          title="See how other students see your profile"
        >
          <span>👁️</span>
          <span>View Public Profile ↗</span>
        </Link>
      </div>

      {/* Main Grid: Left Sidebar Navigation + Right Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="md:col-span-1 space-y-3">
          {/* User Glance Card */}
          <div className="card p-4 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="avatar-xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                title="Change photo"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {avatarUploading ? (
                  <span className="text-[10px]">Uploading…</span>
                ) : (
                  <span className="text-xs font-medium">📷 Edit</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <h3 className="font-bold text-cw-text-1 text-base mt-2 truncate max-w-full">
              {user?.full_name || 'Student'}
            </h3>
            <p className="text-xs text-cw-text-3 truncate max-w-full">{user?.email}</p>

            <div className="mt-3 pt-3 border-t border-cw-border/70 flex items-center justify-center gap-4 w-full text-xs">
              <div>
                <span className="font-bold text-cw-text-1 text-sm block">
                  ★ {Number(user?.rating_average ?? 0).toFixed(1)}
                </span>
                <span className="text-[11px] text-cw-text-3">Trust Score</span>
              </div>
              <div className="w-px h-6 bg-cw-border/70" />
              <div>
                <span className="font-bold text-cw-text-1 text-sm block">{reviews.length}</span>
                <span className="text-[11px] text-cw-text-3">Reviews</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="card p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-cw-accent text-white shadow-sm font-semibold'
                  : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">👤</span>
                <span>Profile</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('listings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'listings'
                  ? 'bg-cw-accent text-white shadow-sm font-semibold'
                  : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">📝</span>
                <span>My Listings</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'listings' ? 'bg-white/20 text-white' : 'bg-cw-bg-alt text-cw-text-3'
                }`}
              >
                {myListings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'reviews'
                  ? 'bg-cw-accent text-white shadow-sm font-semibold'
                  : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">⭐</span>
                <span>Reviews</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-cw-bg-alt text-cw-text-3'
                }`}
              >
                {reviews.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'account'
                  ? 'bg-cw-accent text-white shadow-sm font-semibold'
                  : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">⚙️</span>
                <span>Account &amp; Security</span>
              </span>
            </button>
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="md:col-span-3 space-y-6">
          {/* TAB 1: PROFILE EDIT */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <form onSubmit={handleSaveProfile} className="card space-y-5 p-6">
                <div className="flex items-center justify-between pb-3 border-b border-cw-border">
                  <div>
                    <h2 className="text-lg font-bold text-cw-text-1">Personal Profile</h2>
                    <p className="text-xs text-cw-text-3">This information is shown to campus peers.</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="full_name" className="label font-semibold text-cw-text-1">
                    Full Name
                  </label>
                  <input
                    id="full_name"
                    required
                    minLength={2}
                    value={form.full_name}
                    onChange={update('full_name')}
                    placeholder="Your legal or preferred student name"
                    className="field text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="label font-semibold text-cw-text-1">
                    About You (Bio)
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={form.bio}
                    onChange={update('bio')}
                    placeholder="Tell other students about yourself, your department, major, or hobbies..."
                    className="field text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="skills_offered" className="label font-semibold text-cw-text-1">
                      Skills You Can Teach <span className="font-normal text-cw-text-3">(comma separated)</span>
                    </label>
                    <input
                      id="skills_offered"
                      value={form.skills_offered}
                      onChange={update('skills_offered')}
                      placeholder="Python, UI Design, Calculus"
                      className="field text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="skills_wanted" className="label font-semibold text-cw-text-1">
                      Skills You Want to Learn <span className="font-normal text-cw-text-3">(comma separated)</span>
                    </label>
                    <input
                      id="skills_wanted"
                      value={form.skills_wanted}
                      onChange={update('skills_wanted')}
                      placeholder="Figma, Guitar, Public Speaking"
                      className="field text-sm"
                    />
                  </div>
                </div>

                {/* Campus Payment Details (UPI) */}
                <div className="rounded-xl border border-cw-border/80 bg-cw-bg-alt/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    <div>
                      <label htmlFor="upi_id" className="label !mb-0 font-bold text-cw-text-1">
                        Campus UPI ID <span className="font-normal text-cw-text-3">(PhonePe / GPay / Paytm)</span>
                      </label>
                      <p className="text-[11px] text-cw-text-3 mt-0.5">
                        Used to receive direct freelance task settlements from students who hire you.
                      </p>
                    </div>
                  </div>
                  <input
                    id="upi_id"
                    value={form.upi_id || ''}
                    onChange={update('upi_id')}
                    placeholder="e.g. username@okhdfcbank, 9876543210@paytm"
                    className="field text-sm bg-cw-surface"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 p-3 text-xs">
                    {error}
                  </p>
                )}
                {status && (
                  <p className="rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 p-3 text-xs">
                    {status}
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={saving} className="btn-primary py-2 px-6 text-sm font-semibold">
                    {saving ? 'Saving changes…' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MY LISTINGS */}
          {activeTab === 'listings' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cw-border">
                <div>
                  <h2 className="text-lg font-bold text-cw-text-1">My Listings ({myListings.length})</h2>
                  <p className="text-xs text-cw-text-3">Manage all tasks, freelance gigs, and skill swaps you posted.</p>
                </div>
                <Link to="/new" className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 w-fit">
                  <span>＋</span>
                  <span>Create New Post</span>
                </Link>
              </div>

              {/* Status Filter Pills */}
              <div className="flex gap-2 text-xs">
                {[
                  { key: 'all', label: 'All Posts', count: myListings.length },
                  { key: 'open', label: 'Open Gigs', count: myListings.filter((l) => l.status === 'open').length },
                  { key: 'completed', label: 'Completed', count: myListings.filter((l) => l.status === 'completed').length },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setListingFilter(item.key)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      listingFilter === item.key
                        ? 'bg-cw-accent text-white shadow-sm'
                        : 'bg-cw-surface border border-cw-border text-cw-text-2 hover:text-cw-text-1'
                    }`}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              {filteredListings.length === 0 ? (
                <div className="card text-center py-12 space-y-3">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm font-medium text-cw-text-2">
                    {listingFilter === 'all'
                      ? "You haven't posted any listings yet."
                      : `No ${listingFilter} listings found.`}
                  </p>
                  <Link to="/new" className="btn-secondary text-xs py-1.5 px-4 inline-block">
                    Post your first listing
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3.5">
                  {filteredListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border hover:border-cw-accent/40 transition-all"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              listing.mode === 'freelance'
                                ? 'bg-freelance/10 text-freelance'
                                : listing.mode === 'team'
                                ? 'bg-indigo-500/10 text-indigo-500'
                                : 'bg-exchange/10 text-exchange'
                            }`}
                          >
                            {listing.mode}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              listing.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : listing.status === 'open'
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                : 'bg-cw-bg-alt text-cw-text-3 border border-cw-border'
                            }`}
                          >
                            {listing.status.replace('_', ' ')}
                          </span>
                          {listing.mode === 'freelance' && (
                            <span className="text-xs font-bold text-cw-text-1">₹{listing.budget}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-cw-text-1 truncate">{listing.title}</h3>
                        <p className="text-xs text-cw-text-3 line-clamp-1">{listing.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-cw-border/60">
                        <Link
                          to={`/listings/${listing.id}`}
                          className="btn-ghost text-xs py-1.5 px-3 border border-cw-border rounded-lg text-cw-text-1 hover:bg-cw-bg-alt"
                        >
                          View
                        </Link>
                        {listing.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => setEditingListing(listing)}
                            className="btn-ghost text-xs py-1.5 px-3 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setListingToDelete(listing)}
                          className="btn-ghost text-xs py-1.5 px-3 border border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEWS & REPUTATION */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-cw-border">
                <div>
                  <h2 className="text-lg font-bold text-cw-text-1">Peer Reviews &amp; Trust Score</h2>
                  <p className="text-xs text-cw-text-3">Reviews left by other campus students after completing tasks.</p>
                </div>
              </div>

              {/* Big Trust Score Banner */}
              <div className="card p-6 bg-gradient-to-br from-cw-surface to-cw-bg-alt/50 border flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-3xl font-bold flex-shrink-0">
                    ★
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-cw-text-1">
                        {Number(user?.rating_average ?? 0).toFixed(1)}
                      </span>
                      <span className="text-sm text-cw-text-3 font-medium">/ 5.0</span>
                    </div>
                    <div className="mt-1">
                      <Stars rating={Math.round(user?.rating_average ?? 0)} />
                    </div>
                  </div>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l border-cw-border pt-4 sm:pt-0 sm:pl-8 text-center sm:text-left w-full sm:w-auto">
                  <p className="text-2xl font-bold text-cw-text-1">{reviews.length}</p>
                  <p className="text-xs text-cw-text-3">Total Verified Reviews</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    100% Campus Authenticated
                  </p>
                </div>
              </div>

              {/* Reviews Stream */}
              {reviews.length === 0 ? (
                <div className="card text-center py-12 space-y-2">
                  <span className="text-3xl">🌟</span>
                  <p className="text-sm font-semibold text-cw-text-2">No reviews yet.</p>
                  <p className="text-xs text-cw-text-3 max-w-sm mx-auto">
                    Complete freelance gigs or skill swaps with other students to start earning peer reviews and building your campus reputation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="card p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Stars rating={review.rating} />
                          <span className="text-xs font-bold text-cw-text-1">{review.rating} / 5</span>
                        </div>
                        <span className="text-xs text-cw-text-3">{formatDate(review.created_at)}</span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-cw-text-1 whitespace-pre-line leading-relaxed">
                          "{review.comment}"
                        </p>
                      )}

                      {review.image_url && (
                        <div className="pt-1">
                          <img
                            src={review.image_url}
                            alt="Review attachment"
                            className="max-h-36 rounded-xl border border-cw-border object-cover cursor-zoom-in hover:opacity-90 transition"
                            onClick={() => setFullscreenImage(review.image_url)}
                          />
                        </div>
                      )}

                      {review.listing_id && (
                        <div className="pt-2 border-t border-cw-border/60">
                          <Link
                            to={`/listings/${review.listing_id}`}
                            className="text-xs font-semibold text-cw-accent hover:underline inline-flex items-center gap-1"
                          >
                            <span>View Task Details</span>
                            <span>→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACCOUNT & SECURITY */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fade-in">
              <AccountSecuritySection user={user} />
            </div>
          )}
        </main>
      </div>

      {/* Edit Listing Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onUpdated={() => {
            setEditingListing(null);
            loadProfileData();
          }}
        />
      )}

      {/* Delete Listing Confirmation */}
      {listingToDelete && (
        <ConfirmModal
          title="Delete Listing"
          message={`Are you sure you want to permanently delete "${listingToDelete.title}"? This cannot be undone.`}
          confirmText="Delete Post"
          isDestructive={true}
          onConfirm={handleDeleteListing}
          onClose={() => setListingToDelete(null)}
        />
      )}

      {/* Fullscreen Image Preview */}
      {fullscreenImage && (
        <ImageModal src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      )}
    </div>
  );
}

/**
 * Account & Security section: Email, account info, change password with email OTP.
 */
function AccountSecuritySection({ user }) {
  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState('');
  const [otpPassword, setOtpPassword] = useState('');
  const [otpConfirm, setOtpConfirm] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setOtpError('');
    setOtpStatus('');
    try {
      await api.auth.requestOtp(user.email);
      setOtpSent(true);
      setCountdown(60);
      setOtpStatus(`A 6-digit verification code has been sent to ${user.email}.`);
    } catch (err) {
      setOtpError(err.message || 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpStatus('');

    if (otpPassword !== otpConfirm) {
      setOtpError('New passwords do not match.');
      return;
    }
    if (otpPassword.length < 6) {
      setOtpError('Password must be at least 6 characters.');
      return;
    }

    setSubmittingOtp(true);
    try {
      await api.auth.resetPassword(user.email, code.trim(), otpPassword);
      setOtpStatus('Password changed successfully! Your account is now secured with the new password.');
      setCode('');
      setOtpPassword('');
      setOtpConfirm('');
      setOtpSent(false);
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Information Card */}
      <div className="card p-6 space-y-4">
        <div className="pb-3 border-b border-cw-border">
          <h2 className="text-lg font-bold text-cw-text-1">Account Information</h2>
          <p className="text-xs text-cw-text-3">Your verified student account details.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-cw-bg-alt/50 border border-cw-border space-y-1">
            <span className="text-cw-text-3 font-semibold uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-semibold text-cw-text-1 text-sm truncate">{user?.email}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Verified
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cw-bg-alt/50 border border-cw-border space-y-1">
            <span className="text-cw-text-3 font-semibold uppercase tracking-wider text-[10px]">
              Roll / Student ID
            </span>
            <p className="font-mono font-semibold text-cw-text-1 text-sm pt-0.5">
              {user?.roll_number || 'Not provided'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-cw-bg-alt/50 border border-cw-border space-y-1">
            <span className="text-cw-text-3 font-semibold uppercase tracking-wider text-[10px]">
              Campus Domain
            </span>
            <p className="font-semibold text-cw-text-1 text-sm pt-0.5">
              @{user?.email?.split('@')?.[1] || 'campus'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-cw-bg-alt/50 border border-cw-border space-y-1">
            <span className="text-cw-text-3 font-semibold uppercase tracking-wider text-[10px]">
              Account Created
            </span>
            <p className="font-semibold text-cw-text-1 text-sm pt-0.5">
              {formatDate(user?.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Card with OTP */}
      <div className="card p-6 space-y-5">
        <div className="pb-3 border-b border-cw-border">
          <h2 className="text-lg font-bold text-cw-text-1">Security &amp; Password</h2>
          <p className="text-xs text-cw-text-3">
            To protect your student account, changing your password requires email OTP verification.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2.5">
            <span className="text-base">🔐</span>
            <div>
              <p className="font-semibold">Email OTP Verification Required</p>
              <p className="mt-0.5">
                We will send a one-time 6-digit confirmation code to <span className="font-bold underline">{user?.email}</span> to verify your identity.
              </p>
            </div>
          </div>

          {!otpSent ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="btn-primary py-2.5 px-5 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <span>✉️</span>
                <span>{sendingOtp ? 'Sending code…' : 'Send Verification OTP to Email'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordWithOtp} className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="otp-code" className="label font-semibold text-cw-text-1 !mb-0">
                    Enter 6-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    disabled={countdown > 0 || sendingOtp}
                    onClick={handleSendOtp}
                    className="text-xs font-semibold text-cw-accent hover:underline disabled:text-cw-text-3"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
                <input
                  id="otp-code"
                  required
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code from email"
                  className="field text-sm font-mono tracking-widest"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="otp-new-password" className="label font-semibold text-cw-text-1">
                    New Password
                  </label>
                  <PasswordInput
                    id="otp-new-password"
                    required
                    minLength={6}
                    value={otpPassword}
                    onChange={(e) => setOtpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="otp-confirm-password" className="label font-semibold text-cw-text-1">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="otp-confirm-password"
                    required
                    minLength={6}
                    value={otpConfirm}
                    onChange={(e) => setOtpConfirm(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              {otpError && (
                <p role="alert" className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 p-3 text-xs">
                  {otpError}
                </p>
              )}
              {otpStatus && (
                <p className="rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 p-3 text-xs">
                  {otpStatus}
                </p>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingOtp}
                  className="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl"
                >
                  {submittingOtp ? 'Updating password…' : 'Verify OTP & Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setCode('');
                    setOtpError('');
                  }}
                  className="btn-ghost text-xs py-2 px-3 text-cw-text-3 hover:text-cw-text-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {otpError && !otpSent && (
            <p role="alert" className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 p-3 text-xs mt-2">
              {otpError}
            </p>
          )}
          {otpStatus && !otpSent && (
            <p className="rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 p-3 text-xs mt-2">
              {otpStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
