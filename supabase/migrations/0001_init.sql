-- ===========================================================================
-- Laras — Supabase migration (mirror of prisma/schema.prisma)
-- Run this in the Supabase SQL Editor once DDL access is available.
-- After running, swap the app's data layer from Prisma+SQLite to Supabase
-- (PostgREST via @supabase/supabase-js). Auth can move to Supabase Auth
-- (auth.users) — the `account_id` columns below reference auth.users(id).
-- ===========================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- user_profiles — single source of truth (Brief Section 4)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references auth.users(id) on delete cascade unique,
  full_name         text,
  headline          text,
  summary           text,
  email             text,
  phone             text,
  location          text,
  photo_url         text,
  links             jsonb,                                     -- {linkedin, portfolio, github, website, other}
  ui_locale         text not null default 'id',
  doc_locale        text not null default 'id',
  target_region     text not null default 'domestic',
  opportunity_types jsonb,                                     -- ["work","org","scholarship","volunteer"]
  preferred_tone    text,
  urgency           text,
  target_exam_score text,
  onboarding_complete boolean not null default false,
  onboarding_step   int  not null default 0,
  profile_completion int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- experiences — context_notes is the anti-generic foundation (Section 5)
-- ---------------------------------------------------------------------------
create table if not exists public.experiences (
  id            uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type          text not null default 'work',
  title         text not null,
  organization  text not null,
  start_date    text,
  end_date      text,
  current       boolean not null default false,
  location      text,
  description   text,
  achievements  jsonb,        -- string[]
  context_notes text,
  "order"       int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_experiences_profile on public.experiences(user_profile_id);

-- ---------------------------------------------------------------------------
-- education / skills / certifications / languages
-- ---------------------------------------------------------------------------
create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  institution text not null, degree text, field text,
  start_date text, end_date text, current boolean not null default false,
  gpa text, description text, "order" int not null default 0
);
create index if not exists idx_educations_profile on public.educations(user_profile_id);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null, category text, proficiency text, context text,
  "order" int not null default 0
);
create index if not exists idx_skills_profile on public.skills(user_profile_id);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null, issuer text, issue_date text, expiry_date text,
  credential_id text, url text, "order" int not null default 0
);
create index if not exists idx_certs_profile on public.certifications(user_profile_id);

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  language text not null, level text, "order" int not null default 0
);
create index if not exists idx_languages_profile on public.languages(user_profile_id);

-- ---------------------------------------------------------------------------
-- Vertical 2.2 — Application Ops
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null default 'work',
  position text not null, organization text,
  status text not null default 'saved',
  deadline text, location text, url text,
  job_description text, summary text, notes text,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_apps_profile on public.applications(user_profile_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null, title text not null,
  content jsonb, config jsonb, file_url text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_documents_profile on public.documents(user_profile_id);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  document_id    uuid not null references public.documents(id) on delete cascade,
  sent_at timestamptz, note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vertical 2.3 — Interview Prep
-- ---------------------------------------------------------------------------
create table if not exists public.interview_sets (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null, role text, context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_interviewsets_profile on public.interview_sets(user_profile_id);

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_set_id uuid not null references public.interview_sets(id) on delete cascade,
  question text not null, category text,
  suggested_answer text, user_answer text, feedback jsonb,
  "order" int not null default 0
);
create index if not exists idx_iq_set on public.interview_questions(interview_set_id);

-- ---------------------------------------------------------------------------
-- Vertical 2.5 — Opportunity Essays
-- ---------------------------------------------------------------------------
create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null, title text not null,
  prompt text, target_org text, word_limit int,
  draft text, probing_qa jsonb, concreteness_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_essays_profile on public.essays(user_profile_id);

-- ---------------------------------------------------------------------------
-- Vertical 2.4 — English Readiness (Reading/Structure on-the-go; Listening audio)
-- ---------------------------------------------------------------------------
create table if not exists public.english_sessions (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  module text not null,            -- reading | structure | listening
  passage text, questions jsonb, audio_url text,
  user_answers jsonb, score int,
  created_at timestamptz not null default now()
);
create index if not exists idx_english_profile on public.english_sessions(user_profile_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is owner-scoped via account_id / profile
-- ---------------------------------------------------------------------------
alter table public.user_profiles         enable row level security;
alter table public.experiences           enable row level security;
alter table public.educations            enable row level security;
alter table public.skills                enable row level security;
alter table public.certifications        enable row level security;
alter table public.languages             enable row level security;
alter table public.applications          enable row level security;
alter table public.documents             enable row level security;
alter table public.application_documents enable row level security;
alter table public.interview_sets        enable row level security;
alter table public.interview_questions   enable row level security;
alter table public.essays                enable row level security;
alter table public.english_sessions      enable row level security;

-- user_profiles: owner = auth.uid()
create policy "profiles owner all"  on public.user_profiles
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());

-- Helper: a profile belongs to the current user if its account_id = auth.uid()
-- Child tables reference user_profiles(id); policy checks via subquery.
create or replace function public.profile_belongs_to_user(pid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.user_profiles where id = pid and account_id = auth.uid());
$$;

-- Generic policies for child tables (using the helper)
do $$
declare t text;
begin
  foreach t in array array[
    'experiences','educations','skills','certifications','languages',
    'applications','documents','interview_sets','essays','english_sessions'
  ]
  loop
    execute format('create policy "%1$s owner all" on public.%1$s for all using (public.profile_belongs_to_user(user_profile_id)) with check (public.profile_belongs_to_user(user_profile_id));', t);
  end loop;
end$$;

-- application_documents: owner via the application's profile
create policy "appdocs owner all" on public.application_documents for all
  using (exists (
    select 1 from public.applications a
    join public.documents d on d.id = application_documents.document_id
    where a.id = application_documents.application_id
      and public.profile_belongs_to_user(a.user_profile_id)
  )) with check (exists (
    select 1 from public.applications a
    where a.id = application_documents.application_id
      and public.profile_belongs_to_user(a.user_profile_id)
  ));

-- interview_questions: owner via the set's profile
create policy "iq owner all" on public.interview_questions for all
  using (exists (
    select 1 from public.interview_sets s
    where s.id = interview_questions.interview_set_id
      and public.profile_belongs_to_user(s.user_profile_id)
  )) with check (exists (
    select 1 from public.interview_sets s
    where s.id = interview_questions.interview_set_id
      and public.profile_belongs_to_user(s.user_profile_id)
  ));

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','experiences','applications','documents',
    'interview_sets','essays'
  ] loop
    execute format('drop trigger if exists trg_%1$s_touch on public.%1$s;', t);
    execute format('create trigger trg_%1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for listening audio (Brief Section 10.3 / 12.1)
-- Create via dashboard or run once with service_role from the app:
--   supabase.storage.createBucket('listening', { public: true })
-- ---------------------------------------------------------------------------
