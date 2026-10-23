import { Link } from 'react-router-dom';

/**
 * React page component for Privacy Policy view.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

export default function PrivacyPolicy() {
  const HIGHLIGHTS = [
    {
      icon: '🎓',
      title: 'Verified Campus Perimeter',
      desc: 'All marketplace activity is restricted to authenticated college students. Your profile is never indexed for external web crawlers or public ad networks.',
      color: 'border-l-cw-accent',
    },
    {
      icon: '🚫',
      title: 'Zero Data Commercialization',
      desc: 'We do not sell, rent, or monetize student data, resumes, or contact details to third-party advertisers, recruiters, or data brokers.',
      color: 'border-l-freelance',
    },
    {
      icon: '🔒',
      title: 'Enterprise Encryption & RLS',
      desc: 'Passwords are irreversibly salted and hashed with bcrypt. All database tables utilize Row-Level Security (RLS) and encrypted SSL/TLS data transit.',
      color: 'border-l-indigo-500',
    },
    {
      icon: '⚡',
      title: 'Full Student Ownership',
      desc: 'You have full autonomy over your skills, listings, and profile data. You may request complete account and data removal at any time.',
      color: 'border-l-amber-500',
    },
  ];

  const SECTIONS = [
    {
      id: 'collection',
      title: '1. Information We Collect',
      content: [
        'When you register and interact with SkillBridge, we collect the minimum necessary data to provide a trusted campus marketplace:',
        '• Institutional Identity: College email address (used for OTP verification and campus domain scoping), student roll number, and full name.',
        '• Profile & Skill Attributes: Biography, avatar image, skills you offer to teach or freelance, skills you want to learn, and peer trust ratings.',
        '• Marketplace Interactions: Tasks posted (freelance, exchange, team finder), proposed bids, team member applications, and workspace status updates.',
        '• Communications: In-app workspace messages sent within active gigs, as well as support inquiries and dispute reports submitted to the campus moderation desk.',
        '• Technical & Session Preferences: JSON Web Tokens (JWT) stored in your local browser storage for authentication, and your selected visual theme preference (dark/light mode). We do not use third-party tracking cookies or advertising pixels.',
      ],
    },
    {
      id: 'usage',
      title: '2. How We Use Your Information',
      content: [
        'Your information is strictly utilized to operate the campus platform:',
        '• Verifying that every user is an actively enrolled student belonging to an authorized collegiate institution.',
        '• Powering smart typo-tolerant search and matching algorithms to connect you with peers for tasks, tutoring, and hackathon teams.',
        '• Streaming real-time notification alerts (via Server-Sent Events) regarding bids, proposals, and application status changes.',
        '• Preventing academic fraud, spam, harassment, and enforcing campus community guidelines through our student moderation desk.',
      ],
    },
    {
      id: 'sharing',
      title: '3. Data Sharing & Privacy Scoping',
      content: [
        'SkillBridge is built on strict data minimization and campus isolation:',
        '• Campus Scoping: Your public profile, offered skills, and active listings are visible only to verified peers within your college community.',
        '• Private Credentials: Your hashed password, student roll number, and administrative audit logs are never displayed publicly to other students.',
        '• Project Workspaces: When a freelance bid or skill swap is mutually accepted, direct workspace messaging is enabled strictly between the participating students.',
        '• No Third-Party Selling: We never sell or license student data to external marketers, analytics companies, or ad platforms.',
      ],
    },
    {
      id: 'retention',
      title: '4. Data Retention & Your Rights',
      content: [
        'You retain full control over your academic digital presence:',
        '• Editing & Updates: You can update your bio, offered skills, wanted skills, and avatar at any time directly through your Profile page.',
        '• Listing Management: You can close or delete any listings you created from your dashboard or listing page.',
        '• Account & Data Deletion: If you graduate, transfer, or wish to delete your SkillBridge account, you can submit an account removal request via our Support Desk. Your personal information, listings, and messages will be permanently purged from active databases.',
      ],
    },
    {
      id: 'security',
      title: '5. Security Architecture',
      content: [
        'We enforce multi-layered engineering safeguards to protect student data:',
        '• Transport Encryption: All network traffic between your device and our servers is encrypted in transit using industry-standard HTTPS/TLS protocols.',
        '• Database Row Level Security (RLS): Supabase PostgreSQL database tables are locked with Row-Level Security, preventing unauthorized or direct database access.',
        '• Credential Protection: Passwords are protected using salted bcrypt hashes, and session authentication utilizes time-limited cryptographic JWT tokens.',
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="card border-cw-accent/20 bg-gradient-to-r from-cw-surface to-cw-bg-alt p-8 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-cw-accent/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cw-accent/10 px-3 py-1 text-xs font-semibold text-cw-accent border border-cw-accent/20">
              Campus Privacy Policy
            </span>
            <span className="text-xs text-cw-text-3">
              Last updated: October 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-cw-text-1 tracking-tight font-serif">
            Privacy & Data Commitment
          </h1>

          <p className="text-sm sm:text-base text-cw-text-2 max-w-2xl leading-relaxed">
            SkillBridge was built for students, by students. We believe peer collaboration requires uncompromising trust, verified privacy, and zero data exploitation.
          </p>
        </div>
      </div>

      {/* Core Privacy Highlights */}
      <div className="grid gap-4 sm:grid-cols-2">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.title}
            className={`card border-l-4 ${item.color} p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-3.5">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div>
                <h2 className="text-base font-bold text-cw-text-1">{item.title}</h2>
                <p className="mt-1 text-xs sm:text-sm text-cw-text-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Policy Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.id} className="card p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-bold text-cw-text-1 border-b border-cw-border pb-3">
              {section.title}
            </h2>
            <div className="space-y-2.5 text-sm text-cw-text-2 leading-relaxed">
              {section.content.map((paragraph, idx) => (
                <p
                  key={idx}
                  className={paragraph.startsWith('•') ? 'pl-4 text-cw-text-1 font-normal' : ''}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Support / Contact CTA */}
      <div className="card bg-cw-bg-alt/70 border-cw-border p-6 sm:p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cw-accent/10 text-cw-accent">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 0A9 9 0 013 12a9 9 0 0115.364-6.364zm-3.536 3.536L12 12m0 0l-3.536 3.536M12 12l3.536 3.536M12 12L8.464 8.464" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-cw-text-1">Questions or Data Privacy Inquiries?</h2>
        <p className="text-xs sm:text-sm text-cw-text-2 max-w-lg mx-auto">
          Need clarification on how your student data is protected or want to request account deletion? Our campus support team is here to assist.
        </p>
        <div className="pt-2">
          <Link to="/support" className="btn-primary text-sm px-6 py-2">
            Open Support Desk
          </Link>
        </div>
      </div>
    </div>
  );
}
