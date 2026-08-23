-- Korusa friend suggestions: executable proof.
--
-- Companion to supabase/migrations/20260823_friend_suggestions_fix.sql. The bug that
-- migration fixes is worth a regression test because it was invisible from the database
-- side: get_friend_suggestions returned a correct-looking row set, every column in it was
-- right, and the only thing wrong was WHO was in it. A count assertion would have passed.
--
-- The central claim is negative and is check 1: somebody you already follow one-way must
-- not be suggested. The old filter used are_friends, which is mutual, so a one-way follow
-- survived it and the home sidebar offered a Follow button for somebody already on the
-- viewer's following list.
--
-- Check 6 is the invariant that makes the fix self-enforcing: no row the function returns
-- may carry you_follow = true. That holds however the filter is later rewritten.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that ends in
-- ROLLBACK, so no user, profile or follow row survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run, "Run without RLS".
--   Or: psql "$DATABASE_URL" -f supabase/tests/friend_suggestions_test.sql
--
-- Reading the outcome: row 0 is the verdict. A SKIP is not a pass.
--
-- Separate uuid prefix (0d5f0005) from the four earlier test files and from
-- profile_page_test.sql (0d5f0004), so all six can run in any order in one session.

begin;

do $$
begin
  if to_regprocedure('public.get_friend_suggestions(integer)') is null then
    raise exception 'public.get_friend_suggestions is missing from this database';
  end if;
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null then
    raise exception 'Apply supabase/migrations/20260726_profile_social_controls.sql first';
  end if;
  if to_regclass('public.follows') is null or to_regclass('public.profiles') is null then
    raise exception 'The base tables (profiles, follows) are missing from this database';
  end if;
end $$;

create temporary table suggestion_results (
  seq serial primary key,
  label text not null,
  expected text,
  actual text,
  status text
) on commit drop;

create or replace function pg_temp.expect(p_label text, p_actual anyelement, p_expected anyelement)
returns void language plpgsql as $$
begin
  insert into suggestion_results (label, expected, actual, status)
  values (
    p_label,
    coalesce(p_expected::text, '<null>'),
    coalesce(p_actual::text, '<null>'),
    case when p_actual is distinct from p_expected then 'FAIL' else 'PASS' end
  );
end $$;

create or replace function pg_temp.skip(p_label text)
returns void language plpgsql as $$
begin
  insert into suggestion_results (label, status) values (p_label, 'SKIP');
end $$;

create or replace function pg_temp.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- V is the viewer. One account for each relationship the filter has to tell apart:
--   ONEWAY  - V follows them, they do not follow back. THE BUG: must not be suggested.
--   MUTUAL  - V follows them and they follow V. Must not be suggested.
--   INBOUND - they follow V, V does not follow back. Must be suggested, and sort first.
--   STRANGER- no edge either way. Must be suggested.
--   BLOCKED - V blocked them. Must not be suggested.
--   BLOCKER - they blocked V. Must not be suggested.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', v.id,
  'authenticated', 'authenticated', v.email, now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  json_build_object('username', v.username, 'full_name', v.full_name)::jsonb
from (values
  ('0d5f0005-0000-4000-8000-000000000001'::uuid, 'sugfx-v@example.invalid', 'sugfx_viewer', 'Sug Fx Viewer'),
  ('0d5f0005-0000-4000-8000-000000000002'::uuid, 'sugfx-oneway@example.invalid', 'sugfx_oneway', 'Sug Fx Oneway'),
  ('0d5f0005-0000-4000-8000-000000000003'::uuid, 'sugfx-mutual@example.invalid', 'sugfx_mutual', 'Sug Fx Mutual'),
  ('0d5f0005-0000-4000-8000-000000000004'::uuid, 'sugfx-inbound@example.invalid', 'sugfx_inbound', 'Sug Fx Inbound'),
  ('0d5f0005-0000-4000-8000-000000000005'::uuid, 'sugfx-stranger@example.invalid', 'sugfx_stranger', 'Sug Fx Stranger'),
  ('0d5f0005-0000-4000-8000-000000000006'::uuid, 'sugfx-blocked@example.invalid', 'sugfx_blocked', 'Sug Fx Blocked'),
  ('0d5f0005-0000-4000-8000-000000000007'::uuid, 'sugfx-blocker@example.invalid', 'sugfx_blocker', 'Sug Fx Blocker')
) as v(id, email, username, full_name);

do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0005-0000-4000-8000-000000000001'::uuid, 'sugfx_viewer', 'Sug Fx Viewer'),
    ('0d5f0005-0000-4000-8000-000000000002'::uuid, 'sugfx_oneway', 'Sug Fx Oneway'),
    ('0d5f0005-0000-4000-8000-000000000003'::uuid, 'sugfx_mutual', 'Sug Fx Mutual'),
    ('0d5f0005-0000-4000-8000-000000000004'::uuid, 'sugfx_inbound', 'Sug Fx Inbound'),
    ('0d5f0005-0000-4000-8000-000000000005'::uuid, 'sugfx_stranger', 'Sug Fx Stranger'),
    ('0d5f0005-0000-4000-8000-000000000006'::uuid, 'sugfx_blocked', 'Sug Fx Blocked'),
    ('0d5f0005-0000-4000-8000-000000000007'::uuid, 'sugfx_blocker', 'Sug Fx Blocker')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);
exception when others then
  perform pg_temp.skip('setup: could not create test profiles (' || sqlerrm || ')');
end $$;

insert into public.follows (follower_id, following_id) values
  -- V follows ONEWAY. No row back.
  ('0d5f0005-0000-4000-8000-000000000001', '0d5f0005-0000-4000-8000-000000000002'),
  -- V and MUTUAL follow each other.
  ('0d5f0005-0000-4000-8000-000000000001', '0d5f0005-0000-4000-8000-000000000003'),
  ('0d5f0005-0000-4000-8000-000000000003', '0d5f0005-0000-4000-8000-000000000001'),
  -- INBOUND follows V. No row back.
  ('0d5f0005-0000-4000-8000-000000000004', '0d5f0005-0000-4000-8000-000000000001');

insert into public.user_blocks (blocker_id, blocked_id) values
  ('0d5f0005-0000-4000-8000-000000000001', '0d5f0005-0000-4000-8000-000000000006'),
  ('0d5f0005-0000-4000-8000-000000000007', '0d5f0005-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Who is suggested
-- ---------------------------------------------------------------------------
do $$
declare
  v uuid := '0d5f0005-0000-4000-8000-000000000001';
  oneway uuid := '0d5f0005-0000-4000-8000-000000000002';
  mutual uuid := '0d5f0005-0000-4000-8000-000000000003';
  inbound uuid := '0d5f0005-0000-4000-8000-000000000004';
  stranger uuid := '0d5f0005-0000-4000-8000-000000000005';
  blocked uuid := '0d5f0005-0000-4000-8000-000000000006';
  blocker uuid := '0d5f0005-0000-4000-8000-000000000007';
  n bigint;
  first_id uuid;
begin
  perform pg_temp.act_as(v);

  -- Every assertion below filters the function's OWN 20-row window, which the function
  -- caps at. On a project with more than 20 members that window has to contain the
  -- fixtures for these checks to mean anything - it does, because the ordering is
  -- (follows_you desc, created_at desc) and every fixture profile was created moments ago,
  -- so they sort to the front. A wall of unexplained failures here means that assumption
  -- broke, not that the filter did.

  -- THE REGRESSION. Before the fix this returned 1: are_friends is mutual, so a one-way
  -- follow was never excluded, and the sidebar showed a Follow button for somebody the
  -- viewer's own following list already listed.
  select count(*) into n from public.get_friend_suggestions(20) where id = oneway;
  perform pg_temp.expect('a member the viewer already follows one-way is not suggested',
    n, 0::bigint);

  select count(*) into n from public.get_friend_suggestions(20) where id = mutual;
  perform pg_temp.expect('a mutual friend is not suggested', n, 0::bigint);

  -- Still suggested. These are the best rows in the set, and dropping them would be the
  -- obvious over-correction.
  select count(*) into n from public.get_friend_suggestions(20) where id = inbound;
  perform pg_temp.expect('a member who follows the viewer without a follow back is suggested',
    n, 1::bigint);

  select count(*) into n from public.get_friend_suggestions(20) where id = stranger;
  perform pg_temp.expect('a member with no edge either way is suggested', n, 1::bigint);

  select count(*) into n from public.get_friend_suggestions(20) where id = blocked;
  perform pg_temp.expect('a member the viewer blocked is not suggested', n, 0::bigint);

  select count(*) into n from public.get_friend_suggestions(20) where id = blocker;
  perform pg_temp.expect('a member who blocked the viewer is not suggested', n, 0::bigint);

  perform pg_temp.expect('the viewer is never suggested to itself',
    (select count(*) from public.get_friend_suggestions(20) where id = v), 0::bigint);

  -- The invariant that keeps the fix honest whatever the filter is later rewritten to.
  select count(*) into n from public.get_friend_suggestions(20) where you_follow;
  perform pg_temp.expect('no suggested row carries you_follow = true', n, 0::bigint);

  -- follows_you must still be reported, or the client cannot label "Follow back".
  perform pg_temp.expect('follows_you is true for the inbound follower',
    (select follows_you from public.get_friend_suggestions(20) where id = inbound), true);
  perform pg_temp.expect('follows_you is false for the stranger',
    (select follows_you from public.get_friend_suggestions(20) where id = stranger), false);

  -- Someone who already follows you outranks a stranger.
  select id into first_id from public.get_friend_suggestions(20) limit 1;
  perform pg_temp.expect('an inbound follower sorts ahead of a stranger', first_id, inbound);

  perform pg_temp.expect('an oversized result_limit is clamped',
    (select count(*) <= 20 from public.get_friend_suggestions(9999)), true);
end $$;

-- ---------------------------------------------------------------------------
-- Viewer scoping and grants
-- ---------------------------------------------------------------------------
do $$
declare
  v uuid := '0d5f0005-0000-4000-8000-000000000001';
  stranger uuid := '0d5f0005-0000-4000-8000-000000000005';
  oneway uuid := '0d5f0005-0000-4000-8000-000000000002';
  is_definer boolean;
  config text[];
  has_supabase_roles boolean := exists (select 1 from pg_roles where rolname = 'anon')
    and exists (select 1 from pg_roles where rolname = 'authenticated');
begin
  -- The same person the viewer must not see IS a valid suggestion for somebody else, so
  -- the exclusion is about auth.uid() rather than about that account.
  perform pg_temp.act_as(stranger);
  perform pg_temp.expect('the exclusion is per viewer, not a property of the account',
    (select count(*) from public.get_friend_suggestions(20) where id = oneway), 1::bigint);
  perform pg_temp.expect('a second viewer is not offered itself',
    (select count(*) from public.get_friend_suggestions(20) where id = stranger), 0::bigint);

  select p.prosecdef, p.proconfig into is_definer, config
  from pg_proc p where p.oid = 'public.get_friend_suggestions(integer)'::regprocedure;

  perform pg_temp.expect('get_friend_suggestions is security definer', is_definer, true);
  perform pg_temp.expect('get_friend_suggestions pins search_path',
    coalesce(config, '{}'::text[]) @> array['search_path=public'], true);

  if has_supabase_roles then
    perform pg_temp.expect('get_friend_suggestions is not executable by anon',
      has_function_privilege('anon', 'public.get_friend_suggestions(integer)'::regprocedure, 'EXECUTE'),
      false);
    perform pg_temp.expect('get_friend_suggestions is executable by authenticated',
      has_function_privilege('authenticated', 'public.get_friend_suggestions(integer)'::regprocedure, 'EXECUTE'),
      true);
  else
    perform pg_temp.skip('grants: anon/authenticated roles are absent, so the grant checks did not run');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verdict
-- ---------------------------------------------------------------------------
select 0 as seq,
       case
         when count(*) filter (where status = 'FAIL') > 0 then 'FAILED'
         when count(*) filter (where status = 'SKIP') > 0 then 'PASSED WITH SKIPS'
         else 'PASSED'
       end as status,
       count(*) filter (where status = 'FAIL') || ' failed, ' ||
       count(*) filter (where status = 'SKIP') || ' skipped, out of ' ||
       count(*) || ' checks' as label,
       null::text as expected,
       null::text as actual
from suggestion_results
union all
select seq, status, label, expected, actual
from suggestion_results
order by seq;

rollback;
