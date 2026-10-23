/**
 * React component for SkillBridge Logo and Brand Mark.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

export default function Logo({ size = 'sm', showText = false, className = '' }) {
  const sizeMap = {
    xs: { box: 20, icon: 'w-5 h-5', text: 'text-sm' },
    sm: { box: 32, icon: 'w-8 h-8', text: 'text-xl' },
    md: { box: 40, icon: 'w-10 h-10', text: 'text-2xl' },
    lg: { box: 52, icon: 'w-[52px] h-[52px]', text: 'text-3xl' },
    xl: { box: 64, icon: 'w-16 h-16', text: 'text-4xl' },
  };

  const current = sizeMap[size] || sizeMap.sm;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Brand Icon Mark */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${current.icon} shrink-0 rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105`}
      >
        <defs>
          <linearGradient id="sb-react-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="55%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="sb-react-arch" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#99f6e4" />
          </linearGradient>
          <linearGradient id="sb-react-deck" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <filter id="sb-react-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base Squircle */}
        <rect width="64" height="64" rx="18" fill="url(#sb-react-bg)" />
        <rect
          x="1"
          y="1"
          width="62"
          height="62"
          rx="17"
          stroke="#ffffff"
          strokeOpacity="0.25"
          strokeWidth="2"
        />

        {/* Arch Span */}
        <path
          d="M14 42 C 20 22, 44 22, 50 42"
          stroke="url(#sb-react-arch)"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#sb-react-glow)"
        />

        {/* Deck */}
        <path
          d="M12 42 H 52"
          stroke="url(#sb-react-deck)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Vertical Suspension Cables */}
        <path
          d="M22 42 V 30"
          stroke="#ffffff"
          strokeOpacity="0.8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M32 42 V 25"
          stroke="#ffffff"
          strokeOpacity="0.95"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M42 42 V 30"
          stroke="#ffffff"
          strokeOpacity="0.8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Synergy Spark Node */}
        <circle cx="32" cy="18" r="3.5" fill="#ffffff" filter="url(#sb-react-glow)" />
        <circle cx="32" cy="18" r="1.5" fill="#0f766e" />
      </svg>

      {/* Optional Brand Typography */}
      {showText && (
        <span
          className={`font-serif font-bold tracking-tight text-cw-text-1 ${current.text}`}
        >
          Skill<span className="text-cw-accent italic">Bridge</span>
        </span>
      )}
    </div>
  );
}
