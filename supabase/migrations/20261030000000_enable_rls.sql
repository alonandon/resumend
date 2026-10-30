-- Row Level Security for every ResuMend table.
-- Each user can only read and write their own rows. Safe to re-run.
--
-- Before applying, check what is currently enabled (Supabase SQL editor):
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--     and tablename in ('profiles','education','experiences','responsibilities','skills','usage_logs');
--
--   select tablename, policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'public';
--
-- Policies are permissive (OR'd together), so any existing looser policy
-- (for example "using (true)") still grants access. Drop those after applying this.
--
-- user_id is compared as text so this works whether the column is uuid or text.

-- profiles, education, experiences, skills: owner-only access via user_id
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'education', 'experiences', 'skills'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Owner can read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Owner can insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Owner can update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "Owner can delete %1$s" on public.%1$I', t);

    execute format($p$create policy "Owner can read %1$s" on public.%1$I
      for select to authenticated
      using (user_id::text = (select auth.uid())::text)$p$, t);

    execute format($p$create policy "Owner can insert %1$s" on public.%1$I
      for insert to authenticated
      with check (user_id::text = (select auth.uid())::text)$p$, t);

    execute format($p$create policy "Owner can update %1$s" on public.%1$I
      for update to authenticated
      using (user_id::text = (select auth.uid())::text)
      with check (user_id::text = (select auth.uid())::text)$p$, t);

    execute format($p$create policy "Owner can delete %1$s" on public.%1$I
      for delete to authenticated
      using (user_id::text = (select auth.uid())::text)$p$, t);
  end loop;
end
$$;

-- responsibilities has no user_id; ownership comes from its parent experience
alter table public.responsibilities enable row level security;

drop policy if exists "Owner can read responsibilities" on public.responsibilities;
drop policy if exists "Owner can insert responsibilities" on public.responsibilities;
drop policy if exists "Owner can update responsibilities" on public.responsibilities;
drop policy if exists "Owner can delete responsibilities" on public.responsibilities;

create policy "Owner can read responsibilities" on public.responsibilities
  for select to authenticated
  using (exists (
    select 1 from public.experiences e
    where e.id = responsibilities.experience_id
      and e.user_id::text = (select auth.uid())::text
  ));

create policy "Owner can insert responsibilities" on public.responsibilities
  for insert to authenticated
  with check (exists (
    select 1 from public.experiences e
    where e.id = responsibilities.experience_id
      and e.user_id::text = (select auth.uid())::text
  ));

create policy "Owner can update responsibilities" on public.responsibilities
  for update to authenticated
  using (exists (
    select 1 from public.experiences e
    where e.id = responsibilities.experience_id
      and e.user_id::text = (select auth.uid())::text
  ))
  with check (exists (
    select 1 from public.experiences e
    where e.id = responsibilities.experience_id
      and e.user_id::text = (select auth.uid())::text
  ));

create policy "Owner can delete responsibilities" on public.responsibilities
  for delete to authenticated
  using (exists (
    select 1 from public.experiences e
    where e.id = responsibilities.experience_id
      and e.user_id::text = (select auth.uid())::text
  ));

-- usage_logs: write-only from the app. Signed-in users log as themselves,
-- guests log as 'guest'. Nobody can read logs through the public API.
alter table public.usage_logs enable row level security;

drop policy if exists "Users and guests can insert own usage" on public.usage_logs;

create policy "Users and guests can insert own usage" on public.usage_logs
  for insert to anon, authenticated
  with check (user_id::text = coalesce((select auth.uid())::text, 'guest'));
