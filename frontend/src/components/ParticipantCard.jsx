import { useState } from 'react';
import ReportModal from './ReportModal';
import { useAuth } from '../context/AuthContext';

/**
 * React component for ParticipantCard.
 * @author = kruthinraj
 * @date = 2026-08-29
 */

export default function ParticipantCard({ user, role, listingId }) {
  const { user: currentUser } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-cw-bg-alt overflow-hidden flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-cw-text-3 font-semibold">{user.full_name?.charAt(0) || '?'}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-cw-text-1">{user.full_name}</p>
            <p className="text-xs text-cw-text-2 capitalize">{role.replace('_', ' ')}</p>
          </div>
        </div>
        
        {currentUser && currentUser.id !== user.id && (
          <button 
            onClick={() => setReportOpen(true)}
            className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            Report Issue
          </button>
        )}
      </div>

      {reportOpen && (
        <ReportModal 
          reportedUser={user}
          listingId={listingId}
          onClose={() => setReportOpen(false)} 
        />
      )}
    </>
  );
}
