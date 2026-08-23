-- Korusa profile page: executable proof.
--
-- Companion to supabase/migrations/20260823_profile_page.sql. That migration moved the
-- profile's counts, follow lists and handle checks from unbounded client queries into
-- three security definer functions, which trades "the page dies on a large account" for
-- "a definer function answers the wrong question" - and the second failure is silent.
-- So the assertions here are arithmetic on a fixture whose answers are known by
-- construction, plus four negatives that no amount of correct arithmetic would catch.
--
-- The negatives are the point:
--   Block 3: get_profile_overview and get_follow_list are viewer-scoped. Block 3 calls
--     them as two different accounts against the SAME target and checks the answers
--     differ. A definer function that ignored auth.uid() would publish one member's
--     relationships to everybody while every count in blocks 1-2 still passed.
--   Block 4: a block in EITHER direction removes a row from get_follow_list. Testing
--     only "I blocked them" passes even if the function forgot is_blocked_between and
--     hand-rolled a one-way check.
--   Block 5: keyset pagination neither duplicates nor drops a row at the page boundary.
--     The fixture gives several follows the same created_at on purpose, because that is
--     the case a followed_at-only ordering gets wrong.
--   Block 9: all three functions are SECURITY DEFINER with a pinned search_path and are
--     not executable by anon. A definer function with a mutable search_path is a
--     privilege escalation, and it looks identical to a correct one from the client.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that ends in
-- ROLLBACK, so no user, profile, post, follow, block, mute or conversation survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   The pre-run linter will warn about DELETE being destructive; it does not read the
--   ROLLBACK at the end. "Run without RLS" is the correct choice - this script's own
--   fixture writes must not be filtered by policies, and the checks that are about a
--   grant read the catalog directly and say so in their label.
--   Or: psql "$DATABASE_URL" -f supabase/tests/profile_page_test.sql
--
-- Reading the outcome:
--   The run ends with one table. Row 0 is the verdict - PASSED, FAILED, or PASSED WITH
--   SKIPS - followed by every check in execution order. Any FAIL row is a real defect in
--   the migration. A SKIP is not a pass. If the script stops with an ERROR instead,
--   setup broke before the checks ran and the message says where.
--
-- Separate uuid prefix from stories_audience_test.sql (0d5f0000), story_interactions
-- (0d5f0001), notifications (0d5f0002) and analytics (0d5f0003), so all five can run in
-- the same session in any order without colliding.

begin;

-- Fail fast and legibly if a migration is missing.
do $$
begin
  if to_regprocedure('public.get_profile_overview(uuid)') is null
     or to_regprocedure('public.get_follow_list(uuid, text, text, timestamptz, uuid, integer)') is null
     or to_regprocedure('public.is_username_available(text)') is null then
    raise exception 'Apply supabase/migrations/20260823_profile_page.sql first';
  end if;

  -- get_follow_list calls this, and a missing one would surface as a puzzling failure
  -- inside block 4 rather than here.
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null
     or to_regclass('public.user_blocks') is null
     or to_regclass('public.user_mutes') is null then
    raise exception 'Apply supabase/migrations/20260726_profile_social_controls.sql first';
  end if;

  if to_regclass('public.conversations') is null then
    raise exception 'Apply supabase/migrations/20260725_messaging.sql first';
  end if;

  if to_regclass('public.posts') is null or to_regclass('public.follows') is null
     or to_regclass('public.profiles') is null then
    raise exception 'The base tables (profiles, posts, follows) are missing from this database';
  end if;
end $$;

create temporary table profile_results (
  seq serial primary key,
  label text not null,
  expected text,
  actual text,
  status text
) on commit drop;

-- Records one assertion. Deliberately never raises, so the first failure does not hide
-- the rest of the matrix - one run gives the whole picture.
create or replace function pg_temp.expect(p_label text, p_actual anyelement, p_expected anyelement)
returns void language plpgsql as $$
begin
  insert into profile_results (label, expected, actual, status)
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
  insert into profile_results (label, status) values (p_label, 'SKIP');
end $$;

-- Impersonate a user. auth.uid() reads these GUCs; both spellings are set because
-- different Supabase versions read different ones.
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
-- A is the profile being looked at, and owns 2 posts.
-- B is the viewer throughout. B follows A. A does NOT follow B, so you_follow and
--   follows_you can never be confused for one another.
-- C follows A, and B follows C - which makes C the one mutual follower B should see.
-- D follows A too, but B blocks D in block 4, so D must vanish from B's list while A's
--   follower count stays put.
-- E follows A and blocks B (the other direction), and must vanish just the same.
-- P1..P4 are extra followers of A that exist only to page over in block 5.

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
  ('0d5f0004-0000-4000-8000-00000000000a'::uuid, 'proffx-a@example.invalid', 'proffx_a', 'Profile Fx Ada'),
  ('0d5f0004-0000-4000-8000-00000000000b'::uuid, 'proffx-b@example.invalid', 'proffx_b', 'Profile Fx Ben'),
  ('0d5f0004-0000-4000-8000-00000000000c'::uuid, 'proffx-c@example.invalid', 'proffx_c', 'Profile Fx Cleo'),
  ('0d5f0004-0000-4000-8000-00000000000d'::uuid, 'proffx-d@example.invalid', 'proffx_d', 'Profile Fx Dara'),
  ('0d5f0004-0000-4000-8000-00000000000e'::uuid, 'proffx-e@example.invalid', 'proffx_e', 'Profile Fx Emeka'),
  ('0d5f0004-0000-4000-8000-000000000101'::uuid, 'proffx-p1@example.invalid', 'proffx_p1', 'Profile Fx Pager One'),
  ('0d5f0004-0000-4000-8000-000000000102'::uuid, 'proffx-p2@example.invalid', 'proffx_p2', 'Profile Fx Pager Two'),
  ('0d5f0004-0000-4000-8000-000000000103'::uuid, 'proffx-p3@example.invalid', 'proffx_p3', 'Profile Fx Pager Three'),
  ('0d5f0004-0000-4000-8000-000000000104'::uuid, 'proffx-p4@example.invalid', 'proffx_p4', 'Profile Fx Pager Four')
) as v(id, email, username, full_name);

-- The base schema is not in this repo, so a trigger on auth.users may already have
-- created these profiles. Fill in only what is missing, then force the columns this
-- file asserts on - a trigger that derives a different username would otherwise make
-- block 5's search assertions fail for a reason that is not a defect here.
do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0004-0000-4000-8000-00000000000a'::uuid, 'proffx_a', 'Profile Fx Ada'),
    ('0d5f0004-0000-4000-8000-00000000000b'::uuid, 'proffx_b', 'Profile Fx Ben'),
    ('0d5f0004-0000-4000-8000-00000000000c'::uuid, 'proffx_c', 'Profile Fx Cleo'),
    ('0d5f0004-0000-4000-8000-00000000000d'::uuid, 'proffx_d', 'Profile Fx Dara'),
    ('0d5f0004-0000-4000-8000-00000000000e'::uuid, 'proffx_e', 'Profile Fx Emeka'),
    ('0d5f0004-0000-4000-8000-000000000101'::uuid, 'proffx_p1', 'Profile Fx Pager One'),
    ('0d5f0004-0000-4000-8000-000000000102'::uuid, 'proffx_p2', 'Profile Fx Pager Two'),
    ('0d5f0004-0000-4000-8000-000000000103'::uuid, 'proffx_p3', 'Profile Fx Pager Three'),
    ('0d5f0004-0000-4000-8000-000000000104'::uuid, 'proffx_p4', 'Profile Fx Pager Four')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);

  update public.profiles p
  set username = v.username, full_name = v.full_name
  from (values
    ('0d5f0004-0000-4000-8000-00000000000a'::uuid, 'proffx_a', 'Profile Fx Ada'),
    ('0d5f0004-0000-4000-8000-00000000000b'::uuid, 'proffx_b', 'Profile Fx Ben'),
    ('0d5f0004-0000-4000-8000-00000000000c'::uuid, 'proffx_c', 'Profile Fx Cleo'),
    ('0d5f0004-0000-4000-8000-00000000000d'::uuid, 'proffx_d', 'Profile Fx Dara'),
    ('0d5f0004-0000-4000-8000-00000000000e'::uuid, 'proffx_e', 'Profile Fx Emeka'),
    ('0d5f0004-0000-4000-8000-000000000101'::uuid, 'proffx_p1', 'Profile Fx Pager One'),
    ('0d5f0004-0000-4000-8000-000000000102'::uuid, 'proffx_p2', 'Profile Fx Pager Two'),
    ('0d5f0004-0000-4000-8000-000000000103'::uuid, 'proffx_p3', 'Profile Fx Pager Three'),
    ('0d5f0004-0000-4000-8000-000000000104'::uuid, 'proffx_p4', 'Profile Fx Pager Four')
  ) as v(id, username, full_name)
  where p.id = v.id;
exception when others then
  perform pg_temp.skip('setup: could not create test profiles (' || sqlerrm || ')');
end $$;

-- A owns 2 posts, so posts_total has a known answer that is not 0 or 1.
insert into public.posts (id, user_id, content, created_at)
values
  ('0d5f0004-0000-4000-8000-000000000201', '0d5f0004-0000-4000-8000-00000000000a',
   'Profile fixture post one', now() - interval '3 days'),
  ('0d5f0004-0000-4000-8000-000000000202', '0d5f0004-0000-4000-8000-00000000000a',
   'Profile fixture post two #korusa', now() - interval '1 day');

-- Follow graph. created_at is explicit: block 5 pages over these, and P2/P3 deliberately
-- share a timestamp to the microsecond so the (followed_at, id) tie-break is exercised
-- rather than assumed.
insert into public.follows (follower_id, following_id, created_at)
values
  -- B, C, D, E all follow A.
  ('0d5f0004-0000-4000-8000-00000000000b', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '10 hours'),
  ('0d5f0004-0000-4000-8000-00000000000c', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '9 hours'),
  ('0d5f0004-0000-4000-8000-00000000000d', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '8 hours'),
  ('0d5f0004-0000-4000-8000-00000000000e', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '7 hours'),
  -- B follows C, which is what makes C a mutual follower of A from B's point of view.
  ('0d5f0004-0000-4000-8000-00000000000b', '0d5f0004-0000-4000-8000-00000000000c', now() - interval '6 hours'),
  -- A follows C only. A does NOT follow B.
  ('0d5f0004-0000-4000-8000-00000000000a', '0d5f0004-0000-4000-8000-00000000000c', now() - interval '5 hours'),
  -- Four more followers of A to page over. P2 and P3 share a created_at.
  ('0d5f0004-0000-4000-8000-000000000101', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '4 hours'),
  ('0d5f0004-0000-4000-8000-000000000102', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '3 hours'),
  ('0d5f0004-0000-4000-8000-000000000103', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '3 hours'),
  ('0d5f0004-0000-4000-8000-000000000104', '0d5f0004-0000-4000-8000-00000000000a', now() - interval '2 hours');

-- ---------------------------------------------------------------------------
-- Block 1: get_profile_overview counts
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  row_out record;
begin
  perform pg_temp.act_as(b);
  select * into row_out from public.get_profile_overview(a);

  perform pg_temp.expect('overview: posts_total counts only the target''s posts',
    row_out.posts_total, 2::bigint);
  -- 8 followers: B, C, D, E, P1..P4. Raw, not filtered by the viewer - see the note in
  -- the migration about why the count and the list are allowed to disagree.
  perform pg_temp.expect('overview: followers_total counts every follow row',
    row_out.followers_total, 8::bigint);
  perform pg_temp.expect('overview: following_total counts who the target follows',
    row_out.following_total, 1::bigint);
end $$;

-- ---------------------------------------------------------------------------
-- Block 2: the viewer-relationship fields
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  row_out record;
begin
  perform pg_temp.act_as(b);
  select * into row_out from public.get_profile_overview(a);

  -- B follows A but A does not follow B. Asserting both directions separately is what
  -- catches the two being swapped, which no count assertion can see.
  perform pg_temp.expect('overview: you_follow is true when the viewer follows the target',
    row_out.you_follow, true);
  perform pg_temp.expect('overview: follows_you is false when the target does not follow back',
    row_out.follows_you, false);

  -- C follows A, and B follows C. B itself follows A but must not be counted.
  perform pg_temp.expect('overview: mutual_total counts followers of the target that the viewer follows',
    row_out.mutual_total, 1::bigint);

  perform pg_temp.expect('overview: is_blocked_by_me is false with no block',
    row_out.is_blocked_by_me, false);
  perform pg_temp.expect('overview: is_muted_by_me is false with no mute',
    row_out.is_muted_by_me, false);

  -- Own profile: mutual followers of yourself is just your friend count wearing the
  -- wrong label, and there is no conversation with yourself.
  perform pg_temp.act_as(a);
  select * into row_out from public.get_profile_overview(a);
  perform pg_temp.expect('overview: mutual_total is 0 on your own profile',
    row_out.mutual_total, 0::bigint);
  perform pg_temp.expect('overview: existing_conversation_id is null on your own profile',
    row_out.existing_conversation_id, null::uuid);
  perform pg_temp.expect('overview: you_follow is false on your own profile',
    row_out.you_follow, false);
end $$;

-- ---------------------------------------------------------------------------
-- Block 3: the same target, two viewers, different answers
-- ---------------------------------------------------------------------------
-- The negative that matters most. A definer function that ignored auth.uid() would
-- return an identical row here and pass every other check in this file.
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  c uuid := '0d5f0004-0000-4000-8000-00000000000c';
  as_b record;
  as_c record;
begin
  perform pg_temp.act_as(b);
  select * into as_b from public.get_profile_overview(a);
  perform pg_temp.act_as(c);
  select * into as_c from public.get_profile_overview(a);

  -- B does not get followed back by A; C does.
  perform pg_temp.expect('scoping: follows_you differs between two viewers of one profile',
    as_b.follows_you || '/' || as_c.follows_you, 'false/true');
  -- B follows C who follows A, so B has a mutual. C has none of its own.
  perform pg_temp.expect('scoping: mutual_total differs between two viewers of one profile',
    as_b.mutual_total || '/' || as_c.mutual_total, '1/0');
  -- The target's own totals are viewer-independent and must NOT drift.
  perform pg_temp.expect('scoping: followers_total is the same for both viewers',
    as_b.followers_total = as_c.followers_total, true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 4: a block in either direction removes the row
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  d uuid := '0d5f0004-0000-4000-8000-00000000000d';
  e uuid := '0d5f0004-0000-4000-8000-00000000000e';
  n bigint;
  row_out record;
begin
  -- B blocks D, and E blocks B: two rows, two directions, one expected outcome.
  --
  -- Inserted straight into public.user_blocks rather than through set_user_block, because
  -- that function also deletes the follow rows in both directions - and the assertion
  -- below is specifically that a block does NOT reduce the target's follower count.
  insert into public.user_blocks (blocker_id, blocked_id) values (b, d);
  insert into public.user_blocks (blocker_id, blocked_id) values (e, b);

  perform pg_temp.act_as(b);

  select count(*) into n from public.get_follow_list(a, 'followers', null, null, null, 50)
  where id = d;
  perform pg_temp.expect('blocks: someone the viewer blocked is absent from the follow list',
    n, 0::bigint);

  select count(*) into n from public.get_follow_list(a, 'followers', null, null, null, 50)
  where id = e;
  perform pg_temp.expect('blocks: someone who blocked the viewer is absent from the follow list',
    n, 0::bigint);

  -- The remaining 6 of A's 8 followers are still there. A count-only assertion would
  -- pass if the function dropped everybody.
  select count(*) into n from public.get_follow_list(a, 'followers', null, null, null, 50);
  perform pg_temp.expect('blocks: the other followers survive the exclusion',
    n, 6::bigint);

  -- ...while the header count is untouched. This is the documented asymmetry.
  select * into row_out from public.get_profile_overview(a);
  perform pg_temp.expect('blocks: followers_total is not reduced by the viewer''s blocks',
    row_out.followers_total, 8::bigint);

  -- And the block shows up on the blocked member's own profile.
  select * into row_out from public.get_profile_overview(d);
  perform pg_temp.expect('blocks: is_blocked_by_me is true on a profile the viewer blocked',
    row_out.is_blocked_by_me, true);
  perform pg_temp.expect('blocks: blocked_between is true on a profile the viewer blocked',
    row_out.blocked_between, true);

  select * into row_out from public.get_profile_overview(e);
  perform pg_temp.expect('blocks: blocked_between is true when the block runs the other way',
    row_out.blocked_between, true);
  perform pg_temp.expect('blocks: is_blocked_by_me is false when they blocked the viewer',
    row_out.is_blocked_by_me, false);

  delete from public.user_blocks where blocker_id = b and blocked_id = d;
  delete from public.user_blocks where blocker_id = e and blocked_id = b;
end $$;

-- ---------------------------------------------------------------------------
-- Block 5: keyset pagination, search, direction
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  page record;
  seen uuid[] := '{}';
  cursor_at timestamptz := null;
  cursor_row uuid := null;
  last_at timestamptz;
  last_id uuid;
  page_rows integer;
  pages integer := 0;
  n bigint;
begin
  perform pg_temp.act_as(b);

  -- Page through all 8 followers, 3 at a time, following the cursor exactly as the
  -- client does. P2 and P3 share a created_at, so a followed_at-only cursor loses one
  -- of them here.
  loop
    pages := pages + 1;
    page_rows := 0;

    for page in
      select id, followed_at
      from public.get_follow_list(a, 'followers', null, cursor_at, cursor_row, 3)
      order by followed_at desc, id desc
    loop
      seen := seen || page.id;
      last_at := page.followed_at;
      last_id := page.id;
      page_rows := page_rows + 1;
    end loop;

    exit when page_rows = 0;

    cursor_at := last_at;
    cursor_row := last_id;

    exit when pages > 10;  -- runaway guard; 8 rows at 3 a page is 3 full pages
  end loop;

  perform pg_temp.expect('paging: every follower is returned across the pages',
    coalesce(array_length(seen, 1), 0), 8);
  perform pg_temp.expect('paging: no row is duplicated across the pages',
    (select count(distinct u) from unnest(seen) as u), 8::bigint);
  perform pg_temp.expect('paging: it terminates in the expected number of pages',
    pages, 4);  -- 3 + 3 + 2 rows, then one empty page ends the loop

  -- result_limit is clamped, not trusted.
  select count(*) into n from public.get_follow_list(a, 'followers', null, null, null, 9999);
  perform pg_temp.expect('paging: an oversized result_limit is clamped, not honoured blindly',
    n <= 50, true);

  -- Search matches either column, case-insensitively.
  select count(*) into n from public.get_follow_list(a, 'followers', 'PROFFX_C', null, null, 50);
  perform pg_temp.expect('search: matches username case-insensitively', n, 1::bigint);
  select count(*) into n from public.get_follow_list(a, 'followers', 'pager', null, null, 50);
  perform pg_temp.expect('search: matches full_name case-insensitively', n, 4::bigint);
  select count(*) into n from public.get_follow_list(a, 'followers', '   ', null, null, 50);
  perform pg_temp.expect('search: a blank query is not treated as a filter', n, 8::bigint);

  -- LIKE metacharacters are escaped, not honoured. Handles are full of underscores, so
  -- an unescaped `_` would make proffx_a match a search for `proffx-a`, and an
  -- unescaped `%` would make every search for a percent sign return everybody.
  select count(*) into n from public.get_follow_list(a, 'followers', 'proffx%', null, null, 50);
  perform pg_temp.expect('search: a percent sign is a literal, not a wildcard', n, 0::bigint);
  select count(*) into n from public.get_follow_list(a, 'followers', 'proffxZa', null, null, 50);
  perform pg_temp.expect('search: an underscore in a handle is not matched by another character',
    n, 0::bigint);

  -- direction picks the other end of the edge. A follows exactly one person (C), while
  -- 8 people follow A - so a function that ignored direction cannot pass both.
  select count(*) into n from public.get_follow_list(a, 'following', null, null, null, 50);
  perform pg_temp.expect('direction: following returns who the target follows', n, 1::bigint);
  select count(*) into n from public.get_follow_list(a, 'following', null, null, null, 50)
  where id = '0d5f0004-0000-4000-8000-00000000000c';
  perform pg_temp.expect('direction: following returns the right person', n, 1::bigint);
end $$;

-- ---------------------------------------------------------------------------
-- Block 6: the per-row flags the Follow button renders from
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  c uuid := '0d5f0004-0000-4000-8000-00000000000c';
  row_out record;
begin
  perform pg_temp.act_as(b);

  -- B follows C, and C follows B? No: C never follows B. So the row for C must read
  -- you_follow true, follows_you false - the same asymmetry as block 2, one level down.
  select * into row_out from public.get_follow_list(a, 'followers', 'proffx_c', null, null, 50);
  perform pg_temp.expect('row flags: you_follow is true for someone the viewer follows',
    row_out.you_follow, true);
  perform pg_temp.expect('row flags: follows_you is false for someone who does not follow the viewer',
    row_out.follows_you, false);

  select * into row_out from public.get_follow_list(a, 'followers', 'proffx_p1', null, null, 50);
  perform pg_temp.expect('row flags: you_follow is false for a stranger',
    row_out.you_follow, false);
end $$;

-- ---------------------------------------------------------------------------
-- Block 7: existing_conversation_id
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0004-0000-4000-8000-00000000000a';
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
  c uuid := '0d5f0004-0000-4000-8000-00000000000c';
  thread uuid := '0d5f0004-0000-4000-8000-000000000301';
  row_out record;
  setup_error text;
begin
  perform pg_temp.act_as(b);

  -- No thread yet.
  select * into row_out from public.get_profile_overview(a);
  perform pg_temp.expect('conversation: null when the pair has no thread',
    row_out.existing_conversation_id, null::uuid);

  -- direct_key is built the same way get_or_create_direct_conversation builds it. If
  -- that construction ever changes, this insert stops matching and this check fails -
  -- which is the point.
  begin
    insert into public.conversations (id, kind, direct_key, created_by)
    values (thread, 'direct',
      least(a::text, b::text) || ':' || greatest(a::text, b::text), b);
    insert into public.conversation_members (conversation_id, user_id)
    values (thread, a), (thread, b);
  exception when others then
    setup_error := sqlerrm;
  end;

  if setup_error is not null then
    perform pg_temp.skip('conversation: could not create the fixture thread (' || setup_error || ')');
  else
    select * into row_out from public.get_profile_overview(a);
    perform pg_temp.expect('conversation: the existing thread is returned',
      row_out.existing_conversation_id, thread);

    -- Viewer-scoped: C is not in that thread and must not be handed its id.
    perform pg_temp.act_as(c);
    select * into row_out from public.get_profile_overview(a);
    perform pg_temp.expect('conversation: a third party is not handed the thread id',
      row_out.existing_conversation_id, null::uuid);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Block 8: is_username_available
-- ---------------------------------------------------------------------------
do $$
declare
  b uuid := '0d5f0004-0000-4000-8000-00000000000b';
begin
  perform pg_temp.act_as(b);

  perform pg_temp.expect('handle: a taken handle is unavailable',
    public.is_username_available('proffx_a'), false);
  -- The whole reason the function exists rather than a client-side select.
  perform pg_temp.expect('handle: a case variant of a taken handle is unavailable',
    public.is_username_available('PROFFX_A'), false);
  perform pg_temp.expect('handle: surrounding whitespace does not smuggle a taken handle through',
    public.is_username_available('  proffx_a  '), false);
  perform pg_temp.expect('handle: an unused handle is available',
    public.is_username_available('proffx_nobody_has_this'), true);
  -- Otherwise saving your profile without changing your handle reports a collision
  -- with yourself.
  perform pg_temp.expect('handle: your own current handle is available to you',
    public.is_username_available('proffx_b'), true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 9: grants and definer hygiene
-- ---------------------------------------------------------------------------
-- Read from the catalog, not by calling anything. A definer function with a mutable
-- search_path is a privilege escalation that behaves identically to a correct one from
-- the client, so nothing except this check would notice.
do $$
declare
  fn text;
  signature text;
  fns text[] := array[
    'public.get_profile_overview(uuid)',
    'public.get_follow_list(uuid, text, text, timestamptz, uuid, integer)',
    'public.is_username_available(text)'
  ];
  is_definer boolean;
  config text[];
  -- Checked up front rather than caught. An exception handler here would roll back every
  -- assertion this block had already recorded, losing the definer and search_path checks
  -- - the two most valuable ones - on any database without Supabase's roles.
  has_supabase_roles boolean := exists (select 1 from pg_roles where rolname = 'anon')
    and exists (select 1 from pg_roles where rolname = 'authenticated');
begin
  foreach signature in array fns loop
    fn := split_part(signature, '(', 1);

    select p.prosecdef, p.proconfig into is_definer, config
    from pg_proc p
    where p.oid = signature::regprocedure;

    perform pg_temp.expect('grants: ' || fn || ' is security definer', is_definer, true);
    perform pg_temp.expect('grants: ' || fn || ' pins search_path',
      coalesce(config, '{}'::text[]) @> array['search_path=public'], true);

    if has_supabase_roles then
      perform pg_temp.expect('grants: ' || fn || ' is not executable by anon',
        has_function_privilege('anon', signature::regprocedure, 'EXECUTE'), false);
      perform pg_temp.expect('grants: ' || fn || ' is executable by authenticated',
        has_function_privilege('authenticated', signature::regprocedure, 'EXECUTE'), true);
    end if;
  end loop;

  if not has_supabase_roles then
    -- A database without these roles is a local Postgres rather than a Supabase project.
    -- Not a defect in the migration.
    perform pg_temp.skip('grants: anon/authenticated roles are absent, so the grant checks did not run');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Block 10: the case-insensitive handle index
-- ---------------------------------------------------------------------------
do $$
declare
  has_index boolean;
begin
  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'profiles_username_lower_unique_idx'
  ) into has_index;

  if has_index then
    perform pg_temp.expect('index: the case-insensitive handle index exists', has_index, true);
  else
    -- The migration creates this inside a guarded block: if the live table already held
    -- two handles differing only in case, it raised a notice and moved on. That is a
    -- fact about the data, not a defect in the migration.
    perform pg_temp.skip(
      'index: profiles_username_lower_unique_idx is absent - check the migration''s '
      'notice about pre-existing case-duplicate handles');
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
from profile_results
union all
select seq, status, label, expected, actual
from profile_results
order by seq;

rollback;
