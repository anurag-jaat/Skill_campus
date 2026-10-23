/**
 * React component for ModeToggle.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * The single toggle from slide 4 that switches the marketplace between
 * paid freelancing and free skill exchange.
 */
const MODES = [
  { value: 'freelance', label: 'Freelance', hint: 'Paid tasks with bids' },
  { value: 'exchange', label: 'Skill Exchange', hint: 'Swap skills, no money' },
  { value: 'team', label: 'Team Finder', hint: 'Find teammates for a project' },
];

export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-cw-border bg-cw-surface p-1 shadow-sm">
      {MODES.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.hint}
            aria-pressed={active}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              active
                ? `text-white ${option.value === 'freelance' ? 'bg-freelance' : option.value === 'team' ? 'bg-indigo-500' : 'bg-exchange'}`
                : 'text-cw-text-2 hover:bg-cw-bg-alt hover:text-cw-text-1'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
