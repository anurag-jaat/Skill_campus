import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../lib/api';
import Logo from './Logo';

/**
 * React component for Navbar.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition relative z-10 ${isActive ? 'bg-cw-accent text-white shadow-sm' : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
  }`;

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const initials = user
    ? (user.full_name || user.email || '?')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : '';

  // Live unread notification count via Server-Sent Events (SSE)
  useEffect(() => {
    if (!user) return;

    // We pass the token in the query string since EventSource does not support custom headers natively.
    const token = localStorage.getItem('skillbridge.token');
    const source = new EventSource(`${BASE_URL}/api/notifications/stream?token=${token}`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.unread_count === 'number') {
          setUnread(data.unread_count);
        }
      } catch (err) {
        // Ignore parse errors
      }
    };

    source.onerror = () => {
      // It will auto-reconnect, but we can log or handle if necessary.
    };

    return () => {
      source.close();
    };
  }, [user]);

  // Live user presence heartbeat while tab is open
  useEffect(() => {
    if (!user) return;
    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        api.auth.me().catch(() => {});
      }
    };
    const interval = setInterval(sendHeartbeat, 120000); // Every 2 minutes
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    setDropdownOpen(false);
    signOut();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setMobileMenuOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-cw-accent/10 bg-cw-surface/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 flex-wrap md:flex-nowrap gap-y-3">
        {/* Left: Avatar (if signed in) + Logo */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            {user && (
              <div ref={dropdownRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="avatar-sm focus:ring-2 focus:ring-cw-accent focus:ring-offset-2 transition"
                  title="Profile menu"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" />
                  ) : (
                    initials
                  )}
                </button>

                {dropdownOpen && (
                  <div className="dropdown animate-fade-in !left-0 !right-auto">
                    <div className="px-4 py-2 border-b border-cw-accent/10 bg-cw-bg-alt rounded-t-xl">
                      <p className="text-sm font-semibold text-cw-text-1 truncate">
                        {user.full_name || 'Student'}
                      </p>
                      <p className="text-xs text-cw-text-2 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="dropdown-item text-cw-text-1 hover:bg-cw-bg hover:text-cw-accent"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="dropdown-item text-cw-text-1 hover:bg-cw-bg hover:text-cw-accent font-semibold"
                    >
                      📊 My Posts &amp; Dashboard
                    </Link>
                    <button type="button" onClick={handleSignOut} className="dropdown-item text-red-600 hover:bg-red-500/10 hover:text-red-600 w-full text-left rounded-b-xl">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <Logo size="sm" />
              <span className="text-xl font-bold tracking-tight font-serif text-cw-text-1">
                Skill<span className="text-cw-accent italic">Bridge</span>
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {user && (
              <Link
                to="/notifications"
                className="relative inline-flex items-center justify-center rounded-lg p-2 mr-1 text-cw-text-2 transition hover:bg-cw-bg-alt hover:text-cw-accent z-10"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-cw-text-2 hover:text-cw-text-1 focus:outline-none p-1.5 rounded-lg hover:bg-cw-bg-alt transition"
              title="Menu"
              aria-label="Toggle mobile navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Center: Search (Mobile full width, Desktop max-w) */}
        <div className={`w-full md:w-auto md:flex-1 md:max-w-md md:mx-4 ${mobileMenuOpen ? 'block' : 'hidden md:block'} order-3 md:order-none`}>
          <form onSubmit={handleSearch} className="relative group w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-cw-text-3 group-focus-within:text-cw-accent">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full rounded-full border border-cw-border bg-cw-bg-alt/50 pl-10 pr-4 py-2 md:py-1.5 text-sm text-cw-text-1 focus:border-cw-accent focus:bg-cw-surface focus:outline-none focus:ring-1 focus:ring-cw-accent transition"
              placeholder="Search users, posts, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Nav Links */}
        <div className={`w-full md:w-auto flex flex-col md:flex-row items-center gap-2 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'} order-4 md:order-none pb-2 md:pb-0`}>
          <NavLink to="/" onClick={closeMobileMenu} className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/browse" onClick={closeMobileMenu} className={linkClass}>
            Browse
          </NavLink>

          {user ? (
            <>
              <NavLink to="/exchanges" onClick={closeMobileMenu} className={linkClass}>
                Matches
              </NavLink>
              <NavLink to="/new" onClick={closeMobileMenu} className={linkClass}>
                Post
              </NavLink>
              <NavLink to="/dashboard" onClick={closeMobileMenu} className={linkClass}>
                My Work &amp; Posts
              </NavLink>

              {/* Notification bell (Desktop only) */}
              <div className="hidden md:block">
                <Link
                  to="/notifications"
                  className="relative inline-flex items-center justify-center rounded-lg p-2 text-cw-text-2 transition hover:bg-cw-bg-alt hover:text-cw-accent z-10"
                  title="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
                </Link>
              </div>
            </>
          ) : (
            <Link to="/login" onClick={closeMobileMenu} className="btn-primary w-full md:w-auto flex items-center justify-center gap-2 mt-2 md:mt-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
