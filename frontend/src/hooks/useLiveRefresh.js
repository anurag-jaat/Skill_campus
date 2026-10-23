import { useEffect, useRef } from 'react';

/**
 * Lightweight hook for automatic real-time sync across pages without stressing the server.
 * - Refetches immediately when the window or tab regains focus (e.g. returning from PhonePe/GPay).
 * - Refetches on tab visibility change.
 * - Refetches on cross-tab storage changes and custom app refresh events.
 * - Gentle interval poll (default 8-10s) ONLY while the user is actively viewing the tab.
 * 
 * @author = kruthinraj
 * @date = 2026-10-16
 */
export function useLiveRefresh(callback, { intervalMs = 8000, enabled = true } = {}) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    let lastRun = 0;
    const minDebounceMs = 1500; // Prevent spamming server if multiple focus/visibility events trigger together

    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastRun < minDebounceMs) return;
      lastRun = now;
      if (isMounted && typeof savedCallback.current === 'function') {
        savedCallback.current();
      }
    };

    // 1. Window focus (user clicks into the browser tab)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    // 2. Visibility change (user switches back from PhonePe, GPay, or another app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    // 3. In-app custom event bus (instant sync within the same page/session)
    const handleCustomEvent = () => {
      triggerRefresh();
    };

    // 4. Cross-tab synchronization (if user has two tabs or windows open)
    const handleStorageEvent = (e) => {
      if (e.key?.startsWith('skillbridge_')) {
        triggerRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('skillbridge:refresh', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    // 5. Gentle background poll ONLY if tab is active and visible
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        triggerRefresh();
      }
    }, intervalMs);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('skillbridge:refresh', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}

/** Helper to dispatch live refresh across tabs and components */
export function triggerAppRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('skillbridge:refresh'));
    try {
      localStorage.setItem('skillbridge_last_sync', Date.now().toString());
    } catch (_) {}
  }
}
