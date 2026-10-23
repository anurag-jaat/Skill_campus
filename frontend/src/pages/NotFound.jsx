import { Link } from 'react-router-dom';

/**
 * React page component for NotFound view.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-cw-text-2">
        That link does not lead anywhere on SkillBridge.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to browse
      </Link>
    </div>
  );
}
