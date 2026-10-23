import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * MobileBottomNav component.
 * Provides a sleek, fixed horizontal navigation dock/tab bar on mobile devices (md:hidden)
 * allowing users to switch directly between Home, Browse, Post, Matches, and Dashboard tabs
 * with one tap without opening the top 3-dots/hamburger overflow menu.
 * @author = kruthinraj
 * @date = 2026-10-16
 */
export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  const isBrowseActive =
    location.pathname === '/browse' ||
    (location.pathname.startsWith('/listings/') && !location.pathname.startsWith('/new'));

  const navItemClass = (isActive) =>
    `flex flex-col items-center justify-center flex-1 py-1 px-1 relative transition-all duration-200 select-none group active:scale-95 ${
      isActive
        ? 'text-cw-accent font-semibold'
        : 'text-cw-text-3 hover:text-cw-text-1'
    }`;

  return (
    <nav
      aria-label="Mobile Bottom Navigation Bar"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-cw-surface/95 dark:bg-cw-surface/95 backdrop-blur-md border-t border-cw-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto h-14 px-2">
        {/* 1. HOME TAB */}
        <NavLink to="/" end className={({ isActive }) => navItemClass(isActive)}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cw-accent shadow-sm" />
              )}
              <div className="relative mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-cw-accent' : 'group-hover:scale-105'
                  }`}
                  fill={isActive ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={isActive ? '1.5' : '2'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-[11px] leading-tight mt-1 tracking-tight">Home</span>
            </>
          )}
        </NavLink>

        {/* 2. BROWSE TAB */}
        <NavLink
          to="/browse"
          className={() => navItemClass(isBrowseActive)}
        >
          {() => (
            <>
              {isBrowseActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cw-accent shadow-sm" />
              )}
              <div className="relative mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isBrowseActive ? 'scale-110 text-cw-accent' : 'group-hover:scale-105'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" strokeWidth="1.5" />
                  <line x1="8" y1="11" x2="14" y2="11" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="text-[11px] leading-tight mt-1 tracking-tight">Browse</span>
            </>
          )}
        </NavLink>

        {/* 3. POST / CREATE (+ Center highlighted button) */}
        <NavLink
          to={user ? '/new' : '/login'}
          className="flex flex-col items-center justify-center flex-1 py-0.5 px-1 relative transition-all duration-200 select-none group -mt-4 active:scale-95"
          title="Create New Post / Task"
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border-2 border-cw-surface ${
                  isActive
                    ? 'bg-cw-accent text-white ring-4 ring-cw-accent/20 shadow-cw-accent/40'
                    : 'bg-gradient-to-tr from-cw-accent to-cw-accent-light text-white shadow-cw-accent/25 hover:shadow-cw-accent/40 hover:scale-105'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-[11px] leading-tight mt-1 font-semibold text-cw-accent tracking-tight">
                Post
              </span>
            </>
          )}
        </NavLink>

        {/* 4. MATCHES / EXCHANGES TAB */}
        <NavLink
          to={user ? '/exchanges' : '/login'}
          className={({ isActive }) => navItemClass(isActive)}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cw-accent shadow-sm" />
              )}
              <div className="relative mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-cw-accent' : 'group-hover:scale-105'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 3h5v5" />
                  <path d="M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6" />
                  <path d="M4 4l5 5" />
                </svg>
              </div>
              <span className="text-[11px] leading-tight mt-1 tracking-tight">Matches</span>
            </>
          )}
        </NavLink>

        {/* 5. DASHBOARD / MY WORK TAB */}
        <NavLink
          to={user ? '/dashboard' : '/login'}
          className={({ isActive }) => navItemClass(isActive)}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cw-accent shadow-sm" />
              )}
              <div className="relative mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-cw-accent' : 'group-hover:scale-105'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
              </div>
              <span className="text-[11px] leading-tight mt-1 tracking-tight">
                {user ? 'My Work' : 'Sign In'}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
