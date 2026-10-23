import { useEffect } from 'react';

/**
 * React component for ImageModal.
 * @author = kruthinraj
 * @date = 2026-09-03
 */

export default function ImageModal({ src, alt, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-full flex items-center justify-center">
        <button
          className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
          onClick={onClose}
          title="Close"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          src={src} 
          alt={alt || "Enlarged view"} 
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
        />
      </div>
    </div>
  );
}
