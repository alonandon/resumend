-- Save an experience and its bullets in one transaction, so a failure can never
-- leave an experience without its bullets. Safe to re-run.
--
-- These run as the calling user (security invoker), so the RLS policies from
-- 20261030000000_enable_rls.sql still apply. Apply that migration first.
--
-- ids are compared as text so this works whether experiences.id is uuid or integer.

-- Turns "" into null so empty form fields don't fail date casts
create or replace function public._blank_to_null(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(key, case when value = '""'::jsonb then 'null'::jsonb else value end),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(p_data, '{}'::jsonb))
$$;

-- p_experience: { company, job_title, start_date, end_date, is_current }
-- p_responsibilities: ["bullet", ...]
create or replace function public.create_experience(p_experience jsonb, p_responsibilities jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.experiences;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.experiences (user_id, company, job_title, start_date, end_date, is_current)
  select auth.uid(), r.company, r.job_title, r.start_date, r.end_date, coalesce(r.is_current, false)
  from jsonb_populate_record(null::public.experiences, public._blank_to_null(p_experience)) r
  returning * into v_row;

  insert into public.responsibilities (experience_id, description)
  select v_row.id, trim(item.value)
  from jsonb_array_elements_text(coalesce(p_responsibilities, '[]'::jsonb)) with ordinality as item(value, position)
  where trim(item.value) <> ''
  order by item.position;

  return to_jsonb(v_row);
end;
$$;

-- Updates the experience and replaces all of its bullets, or changes nothing.
create or replace function public.update_experience(p_experience_id text, p_experience jsonb, p_responsibilities jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.experiences;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  update public.experiences e
  set company = r.company,
      job_title = r.job_title,
      start_date = r.start_date,
      end_date = r.end_date,
      is_current = coalesce(r.is_current, false)
  from jsonb_populate_record(null::public.experiences, public._blank_to_null(p_experience)) r
  where e.id::text = p_experience_id
    and e.user_id::text = auth.uid()::text
  returning e.* into v_row;

  if not found then
    raise exception 'Experience not found' using errcode = 'P0002';
  end if;

  delete from public.responsibilities where experience_id = v_row.id;

  insert into public.responsibilities (experience_id, description)
  select v_row.id, trim(item.value)
  from jsonb_array_elements_text(coalesce(p_responsibilities, '[]'::jsonb)) with ordinality as item(value, position)
  where trim(item.value) <> ''
  order by item.position;

  return to_jsonb(v_row);
end;
$$;

-- Imports parsed resume experiences all-or-nothing. Skips any experience the user
-- already has (same company, title, and start date), so re-importing doesn't duplicate.
-- p_experiences: [{ company, job_title, start_date, end_date, is_current, responsibilities: [...] }]
create or replace function public.import_experiences(p_experiences jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_new public.experiences;
  v_imported int := 0;
  v_skipped int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_experiences, '[]'::jsonb)) loop
    select * into v_new
    from jsonb_populate_record(null::public.experiences, public._blank_to_null(v_item - 'responsibilities'));

    if exists (
      select 1 from public.experiences e
      where e.user_id::text = auth.uid()::text
        and lower(trim(e.company)) = lower(trim(v_new.company))
        and lower(trim(e.job_title)) = lower(trim(v_new.job_title))
        and e.start_date is not distinct from v_new.start_date
    ) then
      v_skipped := v_skipped + 1;
    else
      perform public.create_experience(v_item - 'responsibilities', coalesce(v_item -> 'responsibilities', '[]'::jsonb));
      v_imported := v_imported + 1;
    end if;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped);
end;
$$;

revoke execute on function public._blank_to_null(jsonb) from public, anon;
revoke execute on function public.create_experience(jsonb, jsonb) from public, anon;
revoke execute on function public.update_experience(text, jsonb, jsonb) from public, anon;
revoke execute on function public.import_experiences(jsonb) from public, anon;

grant execute on function public._blank_to_null(jsonb) to authenticated;
grant execute on function public.create_experience(jsonb, jsonb) to authenticated;
grant execute on function public.update_experience(text, jsonb, jsonb) to authenticated;
grant execute on function public.import_experiences(jsonb) to authenticated;
