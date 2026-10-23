-- ---------------------------------------------------------------------------
-- SkillBridge schema  (slide 7: users, listings, bids, exchanges, reviews)
--
-- Run this once in the Supabase dashboard:
--   Project -> SQL Editor -> New query -> paste -> Run
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- colleges
-- ---------------------------------------------------------------------------
create table if not exists public.colleges (
  id         uuid primary key default gen_random_uuid(),
  domain     text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Seed initial college
insert into public.colleges (domain, name) 
values ('apollouniversity.edu.in', 'Apollo University') 
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  email          text        not null unique,
  full_name      text        not null default '',
  bio            text        not null default '',
  avatar_url     text        not null default '',
  password_hash  text        not null default '',
  skills_offered text[]      not null default '{}',
  skills_wanted  text[]      not null default '{}',
  rating_average numeric(3,2) not null default 0,
  rating_count   integer     not null default 0,
  warnings_count integer     not null default 0,
  is_blocked     boolean     not null default false,
  upi_id         text        default '',
  upi_qr_url     text        default '',
  college_id     uuid        references public.colleges(id) on delete set null,
  last_read_at   timestamptz not null default now(),
  last_login_at  timestamptz default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists users_college_idx on public.users (college_id);

-- ---------------------------------------------------------------------------
-- listings  -  one table serves both modes (slide 9)
--   freelance : budget + deadline are set, receives bids
--   exchange  : skill_offered + skill_wanted are set, receives exchanges
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.users(id) on delete cascade,
  mode            text not null check (mode in ('freelance', 'exchange', 'team')),
  title           text not null,
  description     text not null,
  tags            text[] not null default '{}',
  college_id      uuid references public.colleges(id) on delete cascade,

  -- freelance only
  budget          integer,
  deadline        timestamptz,
  accepted_bid_id uuid,

  -- exchange only
  skill_offered   text,
  skill_wanted    text,

  -- team only
  people_required integer,

  -- optional attachment (base64 data-url)
  image_url       text not null default '',

  status          text not null default 'open'
                    check (status in ('open', 'in_progress', 'completed', 'cancelled', 'closed')),
  worker_status   text not null default 'todo'
                    check (worker_status in ('todo', 'in_progress', 'review')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Each mode must carry its own fields and nothing else.
  constraint listings_mode_fields check (
    (mode = 'freelance'
      and budget is not null and deadline is not null
      and skill_offered is null and skill_wanted is null
      and people_required is null)
    or
    (mode = 'exchange'
      and skill_offered is not null and skill_wanted is not null
      and budget is null and deadline is null
      and people_required is null)
    or
    (mode = 'team'
      and people_required is not null
      and skill_offered is null and skill_wanted is null
      and budget is null and deadline is null)
  )
);

create index if not exists listings_mode_status_idx on public.listings (mode, status);
create index if not exists listings_owner_idx       on public.listings (owner_id);
create index if not exists listings_college_idx     on public.listings (college_id);

-- ---------------------------------------------------------------------------
-- bids  -  freelance mode
-- ---------------------------------------------------------------------------
create table if not exists public.bids (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  bidder_id  uuid not null references public.users(id)    on delete cascade,
  amount     integer not null check (amount > 0),
  message      text not null default '',
  is_anonymous boolean not null default false,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One bid per student per listing.
  unique (listing_id, bidder_id)
);

create index if not exists bids_listing_idx on public.bids (listing_id);

alter table public.listings
  drop constraint if exists listings_accepted_bid_fk;
alter table public.listings
  add constraint listings_accepted_bid_fk
  foreign key (accepted_bid_id) references public.bids(id) on delete set null;

-- ---------------------------------------------------------------------------
-- exchanges  -  skill-swap mode
-- ---------------------------------------------------------------------------
create table if not exists public.exchanges (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  owner_id    uuid not null references public.users(id)    on delete cascade,
  proposer_id uuid not null references public.users(id)    on delete cascade,
  message     text not null default '',
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint exchanges_not_self check (owner_id <> proposer_id),
  unique (listing_id, proposer_id)
);

create index if not exists exchanges_owner_idx    on public.exchanges (owner_id);
create index if not exists exchanges_proposer_idx on public.exchanges (proposer_id);

-- ---------------------------------------------------------------------------
-- reviews  -  every completed job leaves a rating on both profiles (slide 9)
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.users(id)    on delete cascade,
  reviewee_id uuid not null references public.users(id)    on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text not null default '',
  created_at  timestamptz not null default now(),

  constraint reviews_not_self check (reviewer_id <> reviewee_id),
  -- One review per person per listing.
  unique (listing_id, reviewer_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

-- ---------------------------------------------------------------------------
-- messages  -  workspace chat
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  sender_id   uuid not null references public.users(id)    on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists messages_listing_idx on public.messages (listing_id);

-- ---------------------------------------------------------------------------
-- team_applications  -  team finder applications
-- ---------------------------------------------------------------------------
create table if not exists public.team_applications (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  applicant_id uuid not null references public.users(id)    on delete cascade,
  message      text not null default '',
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected', 'removed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One application per student per listing.
  unique (listing_id, applicant_id)
);

create index if not exists team_applications_listing_idx on public.team_applications (listing_id);
create index if not exists team_applications_applicant_idx on public.team_applications (applicant_id);

-- ---------------------------------------------------------------------------
-- admin_actions  -  audit log of warnings, blocks, and unblocks
-- ---------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  action     text not null check (action in ('warn', 'block', 'unblock')),
  message    text not null default '',
  image_url  text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_user_idx on public.admin_actions (user_id);

-- ---------------------------------------------------------------------------
-- reports  -  dispute resolution and safety
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid not null references public.users(id) on delete cascade,
  listing_id       uuid references public.listings(id) on delete set null,
  reason           text not null check (reason in ('harassment', 'scam', 'inappropriate_content', 'non_delivery', 'other')),
  description      text not null,
  status           text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint reports_not_self check (reporter_id <> reported_user_id)
);

create index if not exists reports_reported_user_idx on public.reports (reported_user_id);

-- ---------------------------------------------------------------------------
-- support_tickets & support_messages  -  helpdesk and support chat system
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  category    text not null default 'general',
  subject     text not null,
  description text not null,
  proof_url   text,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

create table if not exists public.support_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.support_tickets(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  is_admin        boolean not null default false,
  content         text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The Express API is the only client and it uses the service-role key, which
-- bypasses RLS. We still enable RLS with no permissive policies so that a
-- leaked anon key cannot read the tables directly.
-- ---------------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.listings          enable row level security;
alter table public.bids              enable row level security;
alter table public.exchanges         enable row level security;
alter table public.reviews           enable row level security;
alter table public.messages          enable row level security;
alter table public.team_applications enable row level security;
alter table public.admin_actions     enable row level security;
alter table public.reports           enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.support_messages  enable row level security;

-- ---------------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['users', 'listings', 'bids', 'exchanges', 'team_applications', 'reports', 'support_tickets'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

