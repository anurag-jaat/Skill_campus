import { Link } from 'react-router-dom';

/**
 * React page component for About view.
 * @author = kruthinraj
 * @date = 2026-09-03
 */

export default function About() {
  const PILLARS = [
    {
      icon: '💼',
      title: 'Campus Freelancing',
      tag: 'Earn & Build Portfolio',
      borderColor: 'border-t-freelance',
      badgeBg: 'bg-freelance/10 text-freelance',
      description:
        'Monetize your coding, UI/UX design, video editing, tutoring, or technical writing skills. Take on tasks posted by classmates with clear milestones and get paid directly with zero platform cut.',
    },
    {
      icon: '🔄',
      title: 'Skill Barter & Swapping',
      tag: 'Trade Talents, No Money Needed',
      borderColor: 'border-t-exchange',
      badgeBg: 'bg-exchange/10 text-exchange',
      description:
        'Have a valuable skill but low on budget? Exchange your expertise in Python for design lessons in Figma, or calculus mentoring for guitar coaching in a mutually beneficial peer partnership.',
    },
    {
      icon: '🚀',
      title: 'Team Project Finder',
      tag: 'Assemble Dream Teams',
      borderColor: 'border-t-team',
      badgeBg: 'bg-team/10 text-team',
      description:
        'Finding skilled collaborators for hackathons, final-year capstone projects, research publications, or campus startups is now effortless. Discover teammates by their verified skillset.',
    },
    {
      icon: '🛡️',
      title: 'Campus Trust Engine',
      tag: 'Safety & Accountability',
      borderColor: 'border-t-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-500',
      description:
        'Every profile features verified collegiate email domain verification, public trust ratings, authentic peer reviews, and an active student moderation desk to ensure safe interactions.',
    },
  ];

  const STATS = [
    {
      value: '100%',
      label: 'Student Verified',
      sub: 'Only valid .edu / institutional domains',
    },
    {
      value: '0%',
      label: 'Platform Commission',
      sub: 'Keep 100% of all freelance earnings',
    },
    {
      value: '3-in-1',
      label: 'Collaboration Modes',
      sub: 'Freelance, Skill Swap & Team Finder',
    },
    {
      value: 'Direct',
      label: 'Peer-to-Peer Workspaces',
      sub: 'Integrated milestones & private chat',
    },
  ];

  const STEPS = [
    {
      step: '01',
      title: 'Verify Your Institutional Email',
      description:
        'Sign up using your college email address (@university.edu, @college.ac.in). Gated campus verification ensures everyone you work with is a verified student.',
    },
    {
      step: '02',
      title: 'Showcase Skills or Post an Opportunity',
      description:
        'List what you can teach, services you offer, or project listings you need help on—whether paid freelance tasks, skill exchanges, or hackathon team openings.',
    },
    {
      step: '03',
      title: 'Collaborate & Elevate Your Trust Score',
      description:
        'Work together inside dedicated task workspaces with milestone tracking and private chat. Deliver great work and build a trusted reputation on campus.',
    },
  ];

  const VALUES = [
    {
      title: 'Student-First Accessibility',
      desc: 'Designed around academic schedules, semester breaks, and real student budgets so practical experience is accessible to everyone.',
    },
    {
      title: 'Radical Transparency',
      desc: 'No hidden deductions, no pay-to-win profile boosts, and no agency middlemen taking a slice of student earnings.',
    },
    {
      title: 'Collaborative Growth',
      desc: 'Bridging the gap between theoretical classroom learning and hands-on portfolio-building through peer mentorship and teamwork.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-16 animate-fade-in py-8">
      {/* Hero Section */}
      <div className="text-center space-y-5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cw-accent/10 text-cw-accent border border-cw-accent/20">
          <span className="w-2 h-2 rounded-full bg-cw-accent" />
          The Verified Campus Collaboration Network
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold font-serif tracking-tight text-cw-text-1 leading-tight">
          Where Student Skills Become <span className="text-cw-accent italic">Real Opportunities</span>
        </h1>

        <p className="text-lg text-cw-text-2 leading-relaxed">
          SkillBridge is an exclusive platform built for students to exchange skills, freelance their talents, and assemble collaborative teams—with zero platform fees and verified collegiate security.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Link to="/browse" className="btn-primary py-2.5 px-6 text-sm font-semibold">
            Explore Opportunities
          </Link>
          <Link to="/support" className="btn-ghost py-2.5 px-6 text-sm font-semibold border border-cw-border">
            Visit Support Desk
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="card p-5 text-center border border-cw-border/80 hover:border-cw-accent/40 transition-colors"
          >
            <div className="text-3xl font-extrabold text-cw-accent font-mono mb-1">
              {stat.value}
            </div>
            <div className="text-sm font-bold text-cw-text-1">{stat.label}</div>
            <div className="text-xs text-cw-text-3 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* The Story & Mission */}
      <div className="card p-8 sm:p-10 border border-cw-border space-y-4 bg-gradient-to-br from-cw-surface to-cw-bg-alt/40">
        <div className="inline-block text-xs uppercase tracking-widest font-bold text-cw-accent">
          Why SkillBridge Exists
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-cw-text-1">
          Bridging the Gap Between Classroom Theory & Real Experience
        </h2>
        <p className="text-cw-text-2 leading-relaxed text-base">
          Commercial freelance platforms are crowded by seasoned agencies, charge steep 20% platform commission cuts, and make it virtually impossible for students to land their first gig. Meanwhile, informal campus WhatsApp and Discord groups are disorganized, prone to unpaid work, and lack accountability.
        </p>
        <p className="text-cw-text-2 leading-relaxed text-base">
          SkillBridge was engineered specifically to solve this. By restricting platform membership to verified university and institutional email addresses, we create a trusted micro-economy where classmates trade abilities, earn fair money, and assemble high-impact project teams safely.
        </p>
      </div>

      {/* Four Core Pillars */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-cw-text-1 font-serif">
            Four Ways to Elevate Your Campus Journey
          </h2>
          <p className="text-sm text-cw-text-2">
            Whether you want to earn money, learn a new craft, or build the next big thing, SkillBridge has you covered.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {PILLARS.map((pillar, index) => (
            <div
              key={index}
              className={`card p-6 border-t-4 ${pillar.borderColor} border border-cw-border space-y-3 hover:shadow-lg transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{pillar.icon}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pillar.badgeBg}`}>
                  {pillar.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-cw-text-1">{pillar.title}</h3>
              <p className="text-sm text-cw-text-2 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="card p-8 sm:p-10 border border-cw-border space-y-8 bg-cw-surface">
        <div className="text-center space-y-2">
          <div className="text-xs uppercase tracking-widest font-bold text-cw-accent">
            Simple & Transparent Process
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-cw-text-1 font-serif">
            How SkillBridge Works
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, idx) => (
            <div key={idx} className="space-y-3 relative">
              <div className="text-4xl font-extrabold text-cw-accent/20 font-mono">
                {step.step}
              </div>
              <h3 className="text-base font-bold text-cw-text-1">{step.title}</h3>
              <p className="text-sm text-cw-text-2 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-cw-text-1 font-serif">
            Our Guiding Principles
          </h2>
          <p className="text-sm text-cw-text-2">
            Built on mutual respect, academic integrity, and collective empowerment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {VALUES.map((val, i) => (
            <div key={i} className="card p-6 border border-cw-border space-y-2">
              <h3 className="text-base font-bold text-cw-text-1">{val.title}</h3>
              <p className="text-sm text-cw-text-2 leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Box */}
      <div className="card p-8 sm:p-12 text-center border border-cw-accent/30 bg-gradient-to-r from-cw-accent/5 via-cw-surface to-cw-accent/5 space-y-5 rounded-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold font-serif text-cw-text-1">
          Ready to Connect With Fellow Campus Builders?
        </h2>
        <p className="text-sm sm:text-base text-cw-text-2 max-w-lg mx-auto">
          Join your college network today. Start trading skills, taking on paid student gigs, and building lasting portfolios.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary py-2.5 px-8 text-sm font-semibold">
            Join SkillBridge
          </Link>
          <Link to="/browse" className="btn-ghost py-2.5 px-8 text-sm font-semibold border border-cw-border">
            Browse Tasks & Swaps
          </Link>
        </div>
      </div>
    </div>
  );
}
