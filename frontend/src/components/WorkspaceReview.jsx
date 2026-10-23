import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { compressImage } from '../utils/imageCompressor';

/**
 * React component for WorkspaceReview.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

export default function WorkspaceReview({ listingId, reviewee, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const compressedDataUrl = await compressImage(file);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.reviews.create({
        listing_id: listingId,
        reviewee_id: reviewee.id,
        rating,
        comment,
        image_url: imageUrl,
      });
      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card text-center bg-emerald-50 border-emerald-100">
        <p className="text-emerald-700 font-medium">Review submitted successfully!</p>
        <p className="text-sm text-emerald-600 mt-1">Thank you for your feedback.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-cw-text-1 mb-3 border-b border-cw-border pb-2">
        Review {reviewee.full_name}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        
        <div>
          <label className="label">Rating</label>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl focus:outline-none transition-colors ${
                  star <= rating ? 'text-amber-400' : 'text-cw-border hover:text-amber-200'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Review Comment (Optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Share your experience working with this user..."
            className="field"
          />
        </div>

        <div>
          <label className="label">Photo (Optional)</label>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-ghost text-xs py-1.5 px-3 rounded-lg border border-cw-border"
            >
              {uploading ? 'Processing...' : 'Upload Image'}
            </button>
            {imageUrl && <span className="text-xs font-medium text-emerald-600">Image attached ✓</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
