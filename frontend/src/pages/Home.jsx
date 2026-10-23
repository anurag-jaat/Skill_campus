import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * React page component for Home view.
 * @author = kruthinraj
 * @date = 2026-08-27
 */

const FEATURES = [
  {
    icon: '💼',
    title: 'Freelance Tasks',
    desc: 'Post paid tasks with budgets and deadlines. Students bid, you pick the best fit.',
    color: 'from-freelance/10 to-freelance/5 border-freelance/20',
    accent: 'text-freelance',
    link: '/browse?mode=freelance',
  },
  {
    icon: '🔄',
    title: 'Skill Exchange',
    desc: 'Teach what you know, learn what you need. No money involved — just mutual growth.',
    color: 'from-exchange/10 to-exchange/5 border-exchange/20',
    accent: 'text-exchange',
    link: '/browse?mode=exchange',
  },
  {
    // Team finder feature card
    icon: '👥',
    title: 'Team Finder',
    desc: 'Form teams for projects, hackathons, or startups. Find the right talent on campus.',
    color: 'from-team/10 to-team/5 border-team/20',
    accent: 'text-team',
    link: '/browse?mode=team',
  },
  {
    icon: '⭐',
    title: 'Trust & Reviews',
    desc: 'Every completed job builds your campus reputation. Ratings and reviews drive quality.',
    color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    accent: 'text-amber-500',
    link: '/browse',
  },
];

const STEPS = [
  { num: '01', title: 'Sign in with your college email', desc: 'Verified students only. Quick OTP-based login.' },
  { num: '02', title: 'Browse or post', desc: 'Find tasks to work on or post your own. Toggle between freelance and skill exchange.' },
  { num: '03', title: 'Bid or match', desc: 'Place bids on freelance tasks or get matched with skill swap partners.' },
  { num: '04', title: 'Deliver & get reviewed', desc: 'Complete the work, earn ratings, and build your campus profile.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="-mt-8 -mx-4">
      {/* Hero */}
      <section className="hero-gradient px-4 py-20 text-center text-white relative z-10">
        <div className="mx-auto max-w-3xl animate-slide-up">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl font-serif">
            Your Campus,{' '}
            <span className="text-cw-bg font-serif">
              Your Marketplace
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
            Freelance for pay or exchange skills for free — all within your verified student community.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/browse" className="btn rounded-full bg-cw-text-1 px-8 py-3 text-sm font-semibold text-cw-bg hover:opacity-90 shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Browse Listings
            </Link>
            {!user && (
              <Link to="/login" className="btn rounded-full border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Sign In
              </Link>
            )}
            {user && (
              <Link to="/new" className="btn rounded-full border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Post a Task
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 relative z-10">
        <h2 className="text-center text-3xl font-bold text-cw-text-1 font-serif">Three modes, one platform</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-cw-text-2">
          Whether you want to earn money, trade knowledge, or build a team, SkillBridge has you covered.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link
              to={f.link}
              key={f.title}
              className={`animate-fade-in rounded-2xl border bg-gradient-to-b p-6 ${f.color} transition hover:shadow-md block bg-cw-surface/50 overflow-hidden`}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className={`mt-3 text-lg font-semibold ${f.accent} font-serif`}>{f.title}</h3>
              <p className="mt-2 text-sm text-cw-text-2 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cw-accent/10 bg-cw-surface px-4 py-16 relative z-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-cw-text-1 font-serif">How it works</h2>
          <div className="mt-10 space-y-8">
            {STEPS.map((s) => (
              <div key={s.num} className="flex gap-5 animate-fade-in">
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-cw-accent text-sm font-bold text-white">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-semibold text-cw-text-1 text-lg">{s.title}</h3>
                  <p className="mt-1 text-sm text-cw-text-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center relative z-10">
        <div className="mx-auto max-w-md">
          <h2 className="text-3xl font-bold text-cw-text-1 font-serif">Ready to get started?</h2>
          <p className="mt-2 text-sm text-cw-text-2">
            Join your campus community and start collaborating today.
          </p>
          <Link
            to={user ? '/browse' : '/login'}
            className="btn-primary mt-6 inline-flex rounded-full px-8 py-3"
          >
            {user ? 'Browse Listings' : 'Sign In Now'}
          </Link>
        </div>
      </section>
    </div>
  );
}
