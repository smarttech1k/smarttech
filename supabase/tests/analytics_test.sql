-- Korusa insights: executable proof.
--
-- Companion to supabase/migrations/20260818_post_views_and_analytics.sql. That
-- migration replaced a page of mock data with real numbers, which moves the risk from
-- "the numbers are fake" to "the numbers are wrong" - and a wrong analytics figure is
-- the kind of defect that looks plausible forever. So the assertions here are mostly
-- arithmetic on a fixture whose answer is known by construction.
--
-- Two claims matter more than the rest, and both are negative:
--   Block 2: there is NO client-reachable insert on public.post_views. Every rule in
--     mark_posts_viewed - no self-views, nothing across a block - is worthless if a
--     client can write the table directly, and block 1 passing proves nothing at all
--     about whether that door is shut.
--   Block 3: none of the six read RPCs takes a target user. Block 3 calls them as a
--     second account and checks the answers change, because a security definer
--     function that ignored auth.uid() would publish everyone's private numbers while
--     every other check on this page still passed.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that ends in
-- ROLLBACK, so no user, post, like, comment, follow, story, view or block survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   The pre-run linter will warn about DELETE being destructive; it does not read the
--   ROLLBACK at the end. "Run without RLS" is the correct choice - this script's own
--   fixture writes must not be filtered by policies, and the checks that are about a
--   policy or a grant set role authenticated explicitly and say so in their label.
--   Or: psql "$DATABASE_URL" -f supabase/tests/analytics_test.sql
--
-- Reading the outcome:
--   The run ends with one table. Row 0 is the verdict - PASSED, FAILED, or PASSED WITH
--   SKIPS - followed by every check in execution order. Any FAIL row is a real defect
--   in the migration. A SKIP is not a pass. If the script stops with an ERROR instead,
--   setup broke before the checks ran and the message says where.
--
-- Fixture timestamps are placed with days of slack (t-2d for "this window", t-9d for
-- "the one before") and every window assertion uses range_days = 7. The RPCs bucket on
-- UTC calendar days, so a fixture written one hour either side of a boundary would make
-- this file fail at some times of day and pass at others. Slack is what keeps a red row
-- meaning a defect rather than meaning midnight.
--
-- posts, likes, comments and follows predate supabase/migrations, so the fixtures below
-- insert the columns the client uses (src/lib/feed.ts, src/lib/social.ts). If your
-- schema carries an extra NOT NULL column on one of them, the run stops on that insert
-- with a message naming the column - add it to the fixture rather than working around
-- the assertions.
--
-- Blocks are inserted straight into public.user_blocks rather than through
-- set_user_block, because that function also deletes the follow rows in both
-- directions and block 9 is specifically about what a block does NOT erase.
--
-- Separate uuid prefix from stories_audience_test.sql (0d5f0000),
-- story_interactions_test.sql (0d5f0001) and notifications_test.sql (0d5f0002), so all
-- four can run in the same session in any order without colliding.

begin;

-- Fail fast and legibly if a migration is missing.
do $$
begin
  if to_regclass('public.post_views') is null
     or to_regprocedure('public.mark_posts_viewed(uuid[])') is null
     or to_regprocedure('public.get_creator_overview(integer)') is null
     or to_regprocedure('public.get_engagement_timeseries(integer)') is null
     or to_regprocedure('public.get_top_posts(integer, integer)') is null
     or to_regprocedure('public.get_audience_breakdown()') is null
     or to_regprocedure('public.get_my_top_hashtags(integer, integer)') is null
     or to_regprocedure('public.get_story_performance(integer, integer)') is null then
    raise exception 'Apply supabase/migrations/20260818_post_views_and_analytics.sql first';
  end if;

  -- mark_posts_viewed calls this, and plpgsql resolves called functions at run time: a
  -- missing one would surface as a puzzling failure inside block 1 rather than here.
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null
     or to_regclass('public.user_blocks') is null then
    raise exception 'Apply supabase/migrations/20260726_profile_social_controls.sql first';
  end if;

  if to_regclass('public.stories') is null or to_regclass('public.story_views') is null
     or to_regclass('public.story_reactions') is null then
    raise exception 'Apply 20260815_stories.sql and 20260816_story_reactions_replies.sql first';
  end if;

  if to_regclass('public.posts') is null or to_regclass('public.likes') is null
     or to_regclass('public.comments') is null or to_regclass('public.follows') is null then
    raise exception 'The base tables (posts, likes, comments, follows) are missing from this database';
  end if;

  -- The fixtures set these explicitly to place rows in a window, so their absence would
  -- abort the run on an insert rather than here. They are also the migration's own
  -- additions, which makes a missing one a sign it was only partly applied.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'likes' and column_name = 'created_at'
  ) then
    raise exception 'public.likes.created_at is missing; re-apply 20260818_post_views_and_analytics.sql';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'follows' and column_name = 'created_at'
  ) then
    raise exception 'public.follows.created_at is missing; re-apply 20260818_post_views_and_analytics.sql';
  end if;
end $$;

create temporary table analytics_results (
  seq serial primary key,
  label text not null,
  expected boolean,
  actual boolean,
  status text
) on commit drop;

-- Records one assertion. Deliberately never raises, so the first failure does not hide
-- the rest of the matrix - one run gives the whole picture.
--
-- The labels below interpolate the value they observed, and `'x is ' || null` is null in
-- SQL, not 'x is '. So a check whose value came back null would arrive here with no label
-- at all and abort the run on the not-null constraint - turning one honest FAIL into a
-- lost result set. Coalescing here fixes every call site at once, and the substitute text
-- says what happened, because a null value is itself the finding.
create or replace function pg_temp.expect(p_label text, p_actual boolean, p_expected boolean)
returns void language plpgsql as $$
begin
  insert into analytics_results (label, expected, actual, status)
  values (
    coalesce(p_label, '(a value interpolated into this label was null - see actual)'),
    p_expected,
    p_actual,
    case when p_actual is distinct from p_expected then 'FAIL' else 'PASS' end
  );
end $$;

create or replace function pg_temp.skip(p_label text)
returns void language plpgsql as $$
begin
  insert into analytics_results (label, status)
  values (coalesce(p_label, '(a value interpolated into this label was null)'), 'SKIP');
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

-- Record views exactly as the app does: as the authenticated role, through the RPC.
-- Wrapped in a helper because the alternative is a SET LOCAL / RESET pair around every
-- one of block 1's calls, and one forgotten RESET would silently run the rest of the
-- block - including its counting queries - under RLS.
create or replace function pg_temp.view_as(p_user uuid, p_ids uuid[])
returns integer language plpgsql as $$
declare
  inserted integer;
begin
  perform pg_temp.act_as(p_user);
  set local role authenticated;
  inserted := public.mark_posts_viewed(p_ids);
  reset role;
  return inserted;
end $$;

-- How many post_views rows p_user can actually read, policies applied. Returns null
-- rather than propagating if the read itself is refused - losing the SELECT grant is a
-- defect worth one FAIL row and a reason, not an aborted run that discards every other
-- result in this block.
create or replace function pg_temp.views_visible_to(p_user uuid)
returns bigint language plpgsql as $$
declare
  n bigint;
begin
  perform pg_temp.act_as(p_user);
  set local role authenticated;
  select count(*) into n from public.post_views;
  reset role;
  return n;
exception when others then
  perform pg_temp.skip('reading post_views as authenticated was refused (' || sqlerrm || ')');
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures, part 1: accounts and content
-- ---------------------------------------------------------------------------
-- A is the creator whose insights are under test - every number this file asserts is
-- A's. B is the engaged audience member, and the second caller block 3 uses to prove
-- scoping. C engages a week earlier, which puts C's rows in the previous window, and is
-- the one A blocks. D exists only so A has somebody to follow who does not follow back.
-- E arrives in block 10 with rows that carry no timestamp - on a schema that permits one.
-- Where likes.created_at and follows.created_at are NOT NULL, E stays unused and that
-- block skips rather than inserts.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '0d5f0003-0000-4000-8000-00000000000a',
   'authenticated', 'authenticated', 'insightfx-a@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"insightfx_a","full_name":"Insight Fx A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0003-0000-4000-8000-00000000000b',
   'authenticated', 'authenticated', 'insightfx-b@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"insightfx_b","full_name":"Insight Fx B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0003-0000-4000-8000-00000000000c',
   'authenticated', 'authenticated', 'insightfx-c@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"insightfx_c","full_name":"Insight Fx C"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0003-0000-4000-8000-00000000000d',
   'authenticated', 'authenticated', 'insightfx-d@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"insightfx_d","full_name":"Insight Fx D"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0003-0000-4000-8000-00000000000e',
   'authenticated', 'authenticated', 'insightfx-e@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"insightfx_e","full_name":"Insight Fx E"}'::jsonb);

-- The base schema is not in this repo, so a trigger on auth.users may already have
-- created these profiles. Fill in only what is missing.
do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0003-0000-4000-8000-00000000000a'::uuid, 'insightfx_a', 'Insight Fx A'),
    ('0d5f0003-0000-4000-8000-00000000000b'::uuid, 'insightfx_b', 'Insight Fx B'),
    ('0d5f0003-0000-4000-8000-00000000000c'::uuid, 'insightfx_c', 'Insight Fx C'),
    ('0d5f0003-0000-4000-8000-00000000000d'::uuid, 'insightfx_d', 'Insight Fx D'),
    ('0d5f0003-0000-4000-8000-00000000000e'::uuid, 'insightfx_e', 'Insight Fx E')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);
exception when others then
  perform pg_temp.skip('setup: could not create test profiles (' || sqlerrm || ')');
end $$;

-- p1 carries all of A's engagement. p2 sits in the previous window and exists to make
-- "posts published" have a non-zero previous value - and to carry a #korusa that must
-- stay out of the 7 day hashtag count. p3 is deliberately untouched, because a post with
-- no engagement still has to appear in Your top posts. pb belongs to B and must never
-- appear in any of A's answers.
insert into public.posts (id, user_id, content, media_url, created_at)
values
  ('0d5f0003-0000-4000-8000-0000000000f1', '0d5f0003-0000-4000-8000-00000000000a',
   'Analytics fixture post #Korusa and #korusa twice over', 'https://example.invalid/insightfx-1.jpg',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000f2', '0d5f0003-0000-4000-8000-00000000000a',
   'A post from the previous window, also tagged #korusa', null,
   now() - interval '9 days'),
  ('0d5f0003-0000-4000-8000-0000000000f3', '0d5f0003-0000-4000-8000-00000000000a',
   'A quiet post with #insights and nothing else', null,
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000f4', '0d5f0003-0000-4000-8000-00000000000b',
   'B posts about #korusa too', null,
   now() - interval '1 day');

-- s2 is expired. Stories are never deleted on expiry - only get_story_feed filters on
-- expires_at - so story performance has real history and s2 has to be in it.
insert into public.stories (id, user_id, media_path, media_type, caption, created_at, expires_at)
values
  ('0d5f0003-0000-4000-8000-0000000000e1', '0d5f0003-0000-4000-8000-00000000000a',
   '0d5f0003-0000-4000-8000-00000000000a/live.jpg', 'image', 'a live story of A''s',
   now() - interval '2 days', now() + interval '22 hours'),
  ('0d5f0003-0000-4000-8000-0000000000e2', '0d5f0003-0000-4000-8000-00000000000a',
   '0d5f0003-0000-4000-8000-00000000000a/gone.jpg', 'video', 'an expired story of A''s',
   now() - interval '9 days', now() - interval '8 days'),
  ('0d5f0003-0000-4000-8000-0000000000e3', '0d5f0003-0000-4000-8000-00000000000b',
   '0d5f0003-0000-4000-8000-00000000000b/live.jpg', 'image', 'B''s story',
   now() - interval '1 day', now() + interval '23 hours');

-- ---------------------------------------------------------------------------
-- Block 1: mark_posts_viewed is the write path, and it enforces its own rules
-- ---------------------------------------------------------------------------
-- Reach means unique viewers. Every assertion here is about something that would
-- inflate that number if it were missing.
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  c uuid := '0d5f0003-0000-4000-8000-00000000000c';
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  p3 uuid := '0d5f0003-0000-4000-8000-0000000000f3';
  n integer;
  rows_now bigint;
  padded uuid[];
begin
  -- The grant is real: this is the app's own path, taken as the authenticated role.
  n := pg_temp.view_as(b, array[p1]);
  perform pg_temp.expect('write: an audience member records one view (returned ' || n || ')', n = 1, true);
  select count(*) into rows_now from public.post_views where post_id = p1;
  perform pg_temp.expect('write: one row landed (rows ' || rows_now || ')', rows_now = 1, true);

  -- Idempotent, which is the whole reason the number can be called reach: re-reading a
  -- post must not add to it.
  n := pg_temp.view_as(b, array[p1]);
  perform pg_temp.expect('write: a repeat view inserts nothing (returned ' || n || ')', n = 0, true);
  n := pg_temp.view_as(b, array[p1, p1, p1]);
  perform pg_temp.expect('write: the same id three times in one call inserts nothing (returned ' || n || ')',
    n = 0, true);
  select count(*) into rows_now from public.post_views where post_id = p1;
  perform pg_temp.expect('write: still one row after repeats (rows ' || rows_now || ')', rows_now = 1, true);

  -- Reading your own post is not reach.
  n := pg_temp.view_as(a, array[p1]);
  perform pg_temp.expect('CRITICAL: the author viewing their own post records nothing (returned ' || n || ')',
    n = 0, true);
  select count(*) into rows_now from public.post_views where post_id = p1 and viewer_id = a;
  perform pg_temp.expect('write: no self-view row exists (rows ' || rows_now || ')', rows_now = 0, true);

  -- Nor is a view from across a block.
  insert into public.user_blocks (blocker_id, blocked_id) values (a, c);
  n := pg_temp.view_as(c, array[p1]);
  perform pg_temp.expect('CRITICAL: a view across a block records nothing (returned ' || n || ')',
    n = 0, true);

  -- Symmetric: is_blocked_between does not care who blocked whom, so the reverse
  -- direction must be refused on the same evidence. Checked because a rule written as
  -- "the author blocked them" instead would pass the assertion above and still leak.
  delete from public.user_blocks where blocker_id = a and blocked_id = c;
  insert into public.user_blocks (blocker_id, blocked_id) values (c, a);
  n := pg_temp.view_as(c, array[p1]);
  perform pg_temp.expect('CRITICAL: a view is refused when the VIEWER blocked the author (returned ' || n || ')',
    n = 0, true);
  delete from public.user_blocks where blocker_id = c and blocked_id = a;

  -- Now the block is gone, so the same call has to succeed. Without this the two checks
  -- above would also pass against a function that refused every view from C forever.
  n := pg_temp.view_as(c, array[p1]);
  perform pg_temp.expect('write: unblocking restores the view (returned ' || n || ')', n = 1, true);

  -- A fabricated id is a silent no-op, not a foreign key violation, because the
  -- function selects from public.posts rather than trusting the array.
  n := pg_temp.view_as(b, array['0d5f0003-0000-4000-8000-0000ffffffff'::uuid]);
  perform pg_temp.expect('write: an unknown post id is ignored without error (returned ' || n || ')',
    n = 0, true);

  -- Over the cap the whole call is dropped. p3 rides along as element 1: if the cap were
  -- removed, p3 would gain a row and this check would notice.
  select array_prepend(p3, array_agg(('0d5f0003-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid))
  into padded
  from generate_series(1, 100) as g;
  perform pg_temp.expect('setup: the oversized array really is 101 long', array_length(padded, 1) = 101, true);
  n := pg_temp.view_as(b, padded);
  perform pg_temp.expect('write: an array over the cap records nothing (returned ' || n || ')', n = 0, true);
  select count(*) into rows_now from public.post_views where post_id = p3;
  perform pg_temp.expect('write: the capped call left no row behind (rows ' || rows_now || ')',
    rows_now = 0, true);

  -- Empty and null are answers, not errors: this is fire-and-forget telemetry.
  n := pg_temp.view_as(b, array[]::uuid[]);
  perform pg_temp.expect('write: an empty array returns 0 (returned ' || n || ')', n = 0, true);
  n := pg_temp.view_as(b, null::uuid[]);
  perform pg_temp.expect('write: a null array returns 0 (returned ' || n || ')', n = 0, true);
end $$;

-- A signed-out caller cannot record anything. auth.uid() is null once the claims are
-- cleared, which is the state an expired session arrives in.
--
-- Its own DO block, not the tail of the one above: clearing the claims depends on how
-- this project's auth.uid() reads them, and a raise here inside block 1 would roll back
-- every result block 1 just recorded along with it. Isolated, the worst case is one SKIP.
do $$
declare
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  n integer;
  rows_now bigint;
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  n := public.mark_posts_viewed(array[p1]);
  perform pg_temp.expect('write: an unauthenticated call records nothing (returned ' || n || ')',
    n = 0, true);
  select count(*) into rows_now from public.post_views where post_id = p1;
  perform pg_temp.expect('write: and left no row behind (rows ' || rows_now || ')', rows_now = 2, true);
exception when others then
  perform pg_temp.skip('the unauthenticated check could not run (' || sqlerrm || ')');
end $$;

-- ---------------------------------------------------------------------------
-- Block 2: CRITICAL - there is no other way in, and no way to read someone else's
-- ---------------------------------------------------------------------------
-- Every rule block 1 just proved is advisory unless this block passes. The migration
-- shuts the door twice: it revokes the insert grant Supabase's default privileges hand to
-- every new table, AND writes no insert policy.
--
-- Both layers refuse with SQLSTATE 42501, because "new row violates row-level security
-- policy" shares a code with "permission denied for table". So the behavioural checks
-- below prove an insert is refused but cannot say which layer refused it - drop the
-- revoke and RLS still catches it, leaving them green. The catalog checks come first for
-- exactly that reason: has_table_privilege reads the grant itself, so a lost revoke fails
-- here rather than passing quietly on the strength of the other layer.
do $$
begin
  perform pg_temp.expect('CRITICAL: authenticated has no INSERT grant on post_views',
    has_table_privilege('authenticated', 'public.post_views', 'INSERT'), false);
  perform pg_temp.expect('CRITICAL: authenticated has no UPDATE grant on post_views',
    has_table_privilege('authenticated', 'public.post_views', 'UPDATE'), false);
  perform pg_temp.expect('CRITICAL: authenticated has no DELETE grant on post_views',
    has_table_privilege('authenticated', 'public.post_views', 'DELETE'), false);
  perform pg_temp.expect('grants: authenticated keeps SELECT, so the author can read',
    has_table_privilege('authenticated', 'public.post_views', 'SELECT'), true);
  perform pg_temp.expect('grants: anon gets nothing at all',
    has_table_privilege('anon', 'public.post_views', 'SELECT'), false);

  -- RLS is the second layer, and its absence would not show up in any grant.
  perform pg_temp.expect('CRITICAL: row level security is enabled on post_views',
    (select relrowsecurity from pg_class where oid = 'public.post_views'::regclass), true);
  perform pg_temp.expect('CRITICAL: no insert policy exists on post_views',
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'post_views' and cmd in ('INSERT', 'ALL')
    ), false);
exception when others then
  perform pg_temp.skip('the catalog grant checks could not run (' || sqlerrm || ')');
end $$;

do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  d uuid := '0d5f0003-0000-4000-8000-00000000000d';
  e uuid := '0d5f0003-0000-4000-8000-00000000000e';
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  refused_insert boolean := false;
  refused_self_insert boolean := false;
  other_error text;
  affected bigint;
  a_sees bigint;
  b_sees bigint;
  rows_now bigint;
begin
  -- B fabricating reach for A's post, which is the attack the revoke exists to stop.
  -- D and E stand in as the fabricated viewers because neither has a row yet: naming a
  -- viewer who already has one would let a unique violation impersonate the privilege
  -- error, and the check would pass for the wrong reason.
  begin
    perform pg_temp.act_as(b);
    set local role authenticated;
    insert into public.post_views (post_id, viewer_id) values (p1, d);
    reset role;
  exception
    when insufficient_privilege then refused_insert := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('CRITICAL: a client cannot insert a post view directly', refused_insert, true);
  if other_error is not null then
    perform pg_temp.skip('direct insert raised something other than a privilege error: ' || other_error);
  end if;

  -- And the author cannot manufacture their own reach either. Worth its own check: a
  -- policy written to let authors write their own post's rows would pass the check above
  -- and turn the headline number into a self-report.
  other_error := null;
  begin
    perform pg_temp.act_as(a);
    set local role authenticated;
    insert into public.post_views (post_id, viewer_id) values (p1, e);
    reset role;
  exception
    when insufficient_privilege then refused_self_insert := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('CRITICAL: the author cannot insert views on their own post', refused_self_insert, true);
  if other_error is not null then
    perform pg_temp.skip('author insert raised something other than a privilege error: ' || other_error);
  end if;

  -- Deleting is not granted either, so nobody can quietly prune the record.
  perform pg_temp.act_as(a);
  set local role authenticated;
  begin
    delete from public.post_views where post_id = p1;
    get diagnostics affected = row_count;
    reset role;
    perform pg_temp.expect('grants: a delete by the author removes nothing (rows ' || affected || ')',
      affected = 0, true);
  exception when insufficient_privilege then
    reset role;
    perform pg_temp.expect('grants: a delete by the author is refused outright', true, true);
  end;
  select count(*) into rows_now from public.post_views where post_id = p1;
  perform pg_temp.expect('grants: the view rows survived the delete attempt (rows ' || rows_now || ')',
    rows_now = 2, true);

  -- Reads are author-scoped. B viewed A's post, so B is IN the table - and still must
  -- not be able to read it, because the policy grants the author and nobody else.
  a_sees := pg_temp.views_visible_to(a);
  b_sees := pg_temp.views_visible_to(b);
  perform pg_temp.expect('RLS: the author reads their own post views (rows ' || a_sees || ')',
    a_sees = 2, true);
  perform pg_temp.expect('CRITICAL: a viewer cannot read the record of their own view (rows ' || b_sees || ')',
    b_sees = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures, part 2: engagement placed in known windows
-- ---------------------------------------------------------------------------
-- Block 1 recorded views at now(), which is the right behaviour and the wrong timestamp
-- for testing a window split. Clear them and place every row deliberately: t-2d for the
-- current 7 day window, t-9d for the one before it. Inserted as the owner because
-- mark_posts_viewed always stamps now() - by design, and untestable through it.
--
-- Scoped to the fixture posts rather than a bare `delete from public.post_views`. The
-- ROLLBACK at the end would undo that too, but not before it had taken a row lock on
-- every impression in the table, which on a busy project means blocking real writers for
-- the length of this run.
delete from public.post_views
where post_id in (
  '0d5f0003-0000-4000-8000-0000000000f1',
  '0d5f0003-0000-4000-8000-0000000000f2',
  '0d5f0003-0000-4000-8000-0000000000f3',
  '0d5f0003-0000-4000-8000-0000000000f4'
);

insert into public.post_views (post_id, viewer_id, viewed_at)
values
  ('0d5f0003-0000-4000-8000-0000000000f1', '0d5f0003-0000-4000-8000-00000000000b',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000f1', '0d5f0003-0000-4000-8000-00000000000c',
   now() - interval '9 days');

insert into public.likes (post_id, user_id, created_at)
values
  ('0d5f0003-0000-4000-8000-0000000000f1', '0d5f0003-0000-4000-8000-00000000000b',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000f1', '0d5f0003-0000-4000-8000-00000000000c',
   now() - interval '9 days');

insert into public.comments (id, post_id, user_id, content, created_at)
values
  ('0d5f0003-0000-4000-8000-0000000000d1', '0d5f0003-0000-4000-8000-0000000000f1',
   '0d5f0003-0000-4000-8000-00000000000b', 'a comment inside the window',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000d2', '0d5f0003-0000-4000-8000-0000000000f1',
   '0d5f0003-0000-4000-8000-00000000000c', 'a comment from the window before',
   now() - interval '9 days');

insert into public.story_views (story_id, viewer_id, viewed_at)
values
  ('0d5f0003-0000-4000-8000-0000000000e1', '0d5f0003-0000-4000-8000-00000000000b',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000e2', '0d5f0003-0000-4000-8000-00000000000c',
   now() - interval '9 days');

insert into public.story_reactions (story_id, user_id, emoji, created_at)
values
  ('0d5f0003-0000-4000-8000-0000000000e1', '0d5f0003-0000-4000-8000-00000000000b',
   chr(128293), now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-0000000000e2', '0d5f0003-0000-4000-8000-00000000000c',
   chr(127881), now() - interval '9 days');

-- B and A follow each other (mutual). C follows A only. A follows D only. Those three
-- shapes are the whole of get_audience_breakdown.
insert into public.follows (follower_id, following_id, created_at)
values
  ('0d5f0003-0000-4000-8000-00000000000b', '0d5f0003-0000-4000-8000-00000000000a',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-00000000000c', '0d5f0003-0000-4000-8000-00000000000a',
   now() - interval '9 days'),
  ('0d5f0003-0000-4000-8000-00000000000a', '0d5f0003-0000-4000-8000-00000000000b',
   now() - interval '2 days'),
  ('0d5f0003-0000-4000-8000-00000000000a', '0d5f0003-0000-4000-8000-00000000000d',
   now() - interval '2 days');

-- ---------------------------------------------------------------------------
-- Block 3: get_creator_overview - the window split, and CRITICAL scoping
-- ---------------------------------------------------------------------------
-- By construction every metric is 1 in the current window and 1 in the previous one,
-- except posts, which is 2 and 1. A function that swapped the two windows, or dropped
-- the upper bound on the previous one, would land on 2 somewhere and be caught.
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  ov record;
begin
  perform pg_temp.act_as(a);
  select * into ov from public.get_creator_overview(7);

  perform pg_temp.expect('overview: exactly one row comes back', ov is not null, true);

  perform pg_temp.expect('overview: followers_total counts every follower (' || ov.followers_total || ')',
    ov.followers_total = 2, true);
  perform pg_temp.expect('overview: posts_total counts every post (' || ov.posts_total || ')',
    ov.posts_total = 3, true);
  perform pg_temp.expect('overview: views_total counts every unique viewer (' || ov.views_total || ')',
    ov.views_total = 2, true);

  perform pg_temp.expect('overview: followers_current is this window only (' || ov.followers_current || ')',
    ov.followers_current = 1, true);
  perform pg_temp.expect('overview: followers_previous excludes this window (' || ov.followers_previous || ')',
    ov.followers_previous = 1, true);
  perform pg_temp.expect('overview: views_current (' || ov.views_current || ')', ov.views_current = 1, true);
  perform pg_temp.expect('overview: views_previous (' || ov.views_previous || ')', ov.views_previous = 1, true);
  perform pg_temp.expect('overview: likes_current (' || ov.likes_current || ')', ov.likes_current = 1, true);
  perform pg_temp.expect('overview: likes_previous (' || ov.likes_previous || ')', ov.likes_previous = 1, true);
  perform pg_temp.expect('overview: comments_current (' || ov.comments_current || ')',
    ov.comments_current = 1, true);
  perform pg_temp.expect('overview: comments_previous (' || ov.comments_previous || ')',
    ov.comments_previous = 1, true);
  perform pg_temp.expect('overview: story_reactions_current (' || ov.story_reactions_current || ')',
    ov.story_reactions_current = 1, true);
  perform pg_temp.expect('overview: story_reactions_previous (' || ov.story_reactions_previous || ')',
    ov.story_reactions_previous = 1, true);
  perform pg_temp.expect('overview: story_views_current (' || ov.story_views_current || ')',
    ov.story_views_current = 1, true);
  perform pg_temp.expect('overview: story_views_previous (' || ov.story_views_previous || ')',
    ov.story_views_previous = 1, true);
  perform pg_temp.expect('overview: posts_current counts both of today''s posts (' || ov.posts_current || ')',
    ov.posts_current = 2, true);
  perform pg_temp.expect('overview: posts_previous (' || ov.posts_previous || ')', ov.posts_previous = 1, true);

  -- Widening the window has to absorb the previous one rather than double-count it:
  -- 30 days covers every fixture row, so current becomes the sum of both and previous
  -- empties out.
  select * into ov from public.get_creator_overview(30);
  perform pg_temp.expect('overview: a 30 day window absorbs both fixtures (views ' || ov.views_current || ')',
    ov.views_current = 2, true);
  perform pg_temp.expect('overview: and leaves the previous window empty (views ' || ov.views_previous || ')',
    ov.views_previous = 0, true);
  perform pg_temp.expect('overview: posts_current over 30 days (' || ov.posts_current || ')',
    ov.posts_current = 3, true);

  -- Out of range input is absorbed rather than raised. The clamp's ceiling cannot be
  -- observed from the results - 365 days and 100000 days both contain every fixture row -
  -- so this asserts only what is observable: the call answers instead of failing on
  -- interval arithmetic. get_engagement_timeseries(0) below is where the clamp itself is
  -- visible, because there the row count gives it away.
  select * into ov from public.get_creator_overview(100000);
  perform pg_temp.expect('overview: an absurd range is answered, not raised',
    ov.views_total = 2, true);
  -- Null is different: it is coalesced to 30. Without that, every boundary would be null,
  -- every window comparison would be null, and this would come back 0.
  select * into ov from public.get_creator_overview(null);
  perform pg_temp.expect('overview: a null range falls back to the 30 day default ('
    || ov.views_current || ')', ov.views_current = 2, true);

  -- The scoping claim. B has one post, is followed by A, and has no views at all. If the
  -- RPC leaked, B would see A's numbers here.
  perform pg_temp.act_as(b);
  select * into ov from public.get_creator_overview(7);
  perform pg_temp.expect('CRITICAL: a second caller gets their own posts_total (' || ov.posts_total || ')',
    ov.posts_total = 1, true);
  perform pg_temp.expect('CRITICAL: a second caller sees none of A''s views (' || ov.views_total || ')',
    ov.views_total = 0, true);
  perform pg_temp.expect('CRITICAL: a second caller sees none of A''s likes (' || ov.likes_current || ')',
    ov.likes_current = 0, true);
  perform pg_temp.expect('scoping: B''s own follower count is B''s (' || ov.followers_total || ')',
    ov.followers_total = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 4: get_engagement_timeseries - zero fill, and agreement with the cards
-- ---------------------------------------------------------------------------
-- The migration's claim is that the cards and the chart always sum to each other,
-- because both derive their boundaries from the same expression. That is exactly the
-- kind of claim that survives a refactor of one and not the other.
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  ov record;
  n_days bigint;
  s_views bigint;
  s_likes bigint;
  s_comments bigint;
  s_story_views bigint;
  s_posts bigint;
  first_day date;
  last_day date;
  distinct_days bigint;
begin
  perform pg_temp.act_as(a);

  -- Aliased and qualified throughout this block: `day` is a non-reserved keyword, and
  -- s.day inside an aggregate leaves nothing for the parser to guess at.
  select count(*), min(s.day), max(s.day), count(distinct s.day)
  into n_days, first_day, last_day, distinct_days
  from public.get_engagement_timeseries(7) as s;

  perform pg_temp.expect('series: a 7 day range returns 7 rows (' || n_days || ')', n_days = 7, true);
  perform pg_temp.expect('series: no day is repeated (' || distinct_days || ' distinct)',
    distinct_days = n_days, true);
  perform pg_temp.expect('series: the last row is today', last_day = (now() at time zone 'utc')::date, true);
  perform pg_temp.expect('series: the first row is six days back',
    first_day = (now() at time zone 'utc')::date - 6, true);

  -- The zero fill is the point: silent days must be present as zeroes so the chart does
  -- not draw one straight line across a quiet week as though it never happened.
  perform pg_temp.expect('series: quiet days are filled with zeroes, not omitted',
    exists (select 1 from public.get_engagement_timeseries(7) where view_count = 0), true);
  perform pg_temp.expect('series: exactly one day carries the view',
    (select count(*) from public.get_engagement_timeseries(7) where view_count > 0) = 1, true);

  select count(*), coalesce(sum(s.view_count), 0), coalesce(sum(s.like_count), 0),
         coalesce(sum(s.comment_count), 0), coalesce(sum(s.story_view_count), 0),
         coalesce(sum(s.post_count), 0)
  into n_days, s_views, s_likes, s_comments, s_story_views, s_posts
  from public.get_engagement_timeseries(7) as s;

  select * into ov from public.get_creator_overview(7);
  perform pg_temp.expect('CRITICAL: the chart''s views sum to the card (' || s_views || ' vs ' || ov.views_current || ')',
    s_views = ov.views_current, true);
  perform pg_temp.expect('CRITICAL: the chart''s likes sum to the card (' || s_likes || ' vs ' || ov.likes_current || ')',
    s_likes = ov.likes_current, true);
  perform pg_temp.expect('CRITICAL: the chart''s comments sum to the card (' || s_comments || ' vs ' || ov.comments_current || ')',
    s_comments = ov.comments_current, true);
  perform pg_temp.expect('CRITICAL: the chart''s story views sum to the card (' || s_story_views || ' vs ' || ov.story_views_current || ')',
    s_story_views = ov.story_views_current, true);
  perform pg_temp.expect('CRITICAL: the chart''s posts sum to the card (' || s_posts || ' vs ' || ov.posts_current || ')',
    s_posts = ov.posts_current, true);

  -- Row counts for the other two ranges the UI offers, and the clamp again.
  select count(*) into n_days from public.get_engagement_timeseries(30);
  perform pg_temp.expect('series: a 30 day range returns 30 rows (' || n_days || ')', n_days = 30, true);
  select count(*) into n_days from public.get_engagement_timeseries(90);
  perform pg_temp.expect('series: a 90 day range returns 90 rows (' || n_days || ')', n_days = 90, true);
  select count(*) into n_days from public.get_engagement_timeseries(0);
  perform pg_temp.expect('series: a zero range is clamped to a single day (' || n_days || ')', n_days = 1, true);

  -- Scoped like everything else. B's series is 7 days of nothing.
  perform pg_temp.act_as(b);
  select count(*), coalesce(sum(s.view_count), 0), coalesce(sum(s.like_count), 0)
  into n_days, s_views, s_likes
  from public.get_engagement_timeseries(7) as s;
  perform pg_temp.expect('series: a second caller still gets a full 7 rows (' || n_days || ')',
    n_days = 7, true);
  perform pg_temp.expect('CRITICAL: a second caller''s series carries none of A''s numbers',
    s_views = 0 and s_likes = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 5: get_top_posts - the window selects posts, the counts are lifetime
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  p2 uuid := '0d5f0003-0000-4000-8000-0000000000f2';
  p3 uuid := '0d5f0003-0000-4000-8000-0000000000f3';
  pb uuid := '0d5f0003-0000-4000-8000-0000000000f4';
  n bigint;
  best record;
  quiet record;
begin
  perform pg_temp.act_as(a);

  select count(*) into n from public.get_top_posts(7);
  perform pg_temp.expect('top posts: only the two posts from this window (' || n || ')', n = 2, true);
  perform pg_temp.expect('top posts: the previous window''s post is not listed',
    exists (select 1 from public.get_top_posts(7) where id = p2), false);
  perform pg_temp.expect('CRITICAL: another user''s post is never listed',
    exists (select 1 from public.get_top_posts(7) where id = pb), false);

  select * into best from public.get_top_posts(7) limit 1;
  perform pg_temp.expect('top posts: the engaged post ranks first', best.id = p1, true);

  -- Lifetime counts, not windowed ones. p1's second like and second comment are nine
  -- days old, so a function that filtered the counts by the window would report 1 here.
  perform pg_temp.expect('top posts: like_count is for the life of the post (' || best.like_count || ')',
    best.like_count = 2, true);
  perform pg_temp.expect('top posts: comment_count is for the life of the post (' || best.comment_count || ')',
    best.comment_count = 2, true);
  perform pg_temp.expect('top posts: view_count is for the life of the post (' || best.view_count || ')',
    best.view_count = 2, true);
  perform pg_temp.expect('top posts: content and timestamp come through',
    best.content is not null and best.created_at is not null, true);

  -- A post nobody touched is still listed, with zeroes. Dropping it would make a quiet
  -- week look like missing data.
  select * into quiet from public.get_top_posts(7) where id = p3;
  perform pg_temp.expect('top posts: an untouched post is still listed', quiet.id = p3, true);
  perform pg_temp.expect('top posts: and it reads as zero rather than absent',
    quiet.like_count = 0 and quiet.comment_count = 0 and quiet.view_count = 0, true);

  -- The limit is clamped at both ends rather than trusted.
  select count(*) into n from public.get_top_posts(30, 1);
  perform pg_temp.expect('top posts: result_limit is honoured (' || n || ')', n = 1, true);
  select count(*) into n from public.get_top_posts(30, 0);
  perform pg_temp.expect('top posts: a zero limit is clamped up to 1 (' || n || ')', n = 1, true);
  select count(*) into n from public.get_top_posts(30, 10000);
  perform pg_temp.expect('top posts: an absurd limit is clamped, not honoured (' || n || ')', n = 3, true);

  perform pg_temp.act_as(b);
  select count(*) into n from public.get_top_posts(7);
  perform pg_temp.expect('CRITICAL: a second caller gets only their own post (' || n || ')', n = 1, true);
  perform pg_temp.expect('CRITICAL: and A''s post is not in it',
    exists (select 1 from public.get_top_posts(7) where id = p1), false);
end $$;

-- ---------------------------------------------------------------------------
-- Block 6: get_audience_breakdown - a mutual follow is counted once
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  d uuid := '0d5f0003-0000-4000-8000-00000000000d';
  ab record;
  ov record;
begin
  perform pg_temp.act_as(a);
  select * into ab from public.get_audience_breakdown();

  perform pg_temp.expect('audience: one mutual follow (' || ab.mutual || ')', ab.mutual = 1, true);
  perform pg_temp.expect('audience: one follower who is not followed back (' || ab.followers_only || ')',
    ab.followers_only = 1, true);
  perform pg_temp.expect('audience: one account followed that does not follow back (' || ab.following_only || ')',
    ab.following_only = 1, true);

  -- The buckets have to partition, not overlap: mutual + followers_only is the follower
  -- count, and a mutual follow appearing in followers_only too would break that.
  select * into ov from public.get_creator_overview(7);
  perform pg_temp.expect('CRITICAL: mutual is not double-counted as a follower ('
    || ab.mutual || ' + ' || ab.followers_only || ' vs ' || ov.followers_total || ')',
    ab.mutual + ab.followers_only = ov.followers_total, true);

  -- Direction matters. Asked as D - who follows nobody and is followed by A - every
  -- bucket has to read the other way round.
  perform pg_temp.act_as(d);
  select * into ab from public.get_audience_breakdown();
  perform pg_temp.expect('audience: D is followed by A and follows nobody',
    ab.mutual = 0 and ab.followers_only = 1 and ab.following_only = 0, true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 7: get_my_top_hashtags
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  korusa bigint;
  n bigint;
begin
  perform pg_temp.act_as(a);

  select count(*) into n from public.get_my_top_hashtags(7);
  perform pg_temp.expect('hashtags: two tags in this window (' || n || ')', n = 2, true);

  -- p1 writes #Korusa and #korusa. Case-folded to one tag, and counted once because the
  -- count is of posts, not of mentions.
  select post_count into korusa from public.get_my_top_hashtags(7) where tag = 'korusa';
  perform pg_temp.expect('hashtags: two spellings in one post count as one post (' || korusa || ')',
    korusa = 1, true);
  perform pg_temp.expect('hashtags: tags come back lower-cased',
    exists (select 1 from public.get_my_top_hashtags(7) where tag = 'Korusa'), false);
  perform pg_temp.expect('hashtags: the quiet post''s tag is there too',
    exists (select 1 from public.get_my_top_hashtags(7) where tag = 'insights'), true);

  -- p2 also says #korusa and sits nine days back, so widening the window has to raise
  -- this to 2. A missing window filter would already have said 2 above.
  select post_count into korusa from public.get_my_top_hashtags(30) where tag = 'korusa';
  perform pg_temp.expect('hashtags: the older post joins in a wider window (' || korusa || ')',
    korusa = 2, true);

  -- B's post says #korusa as well and must not be in A's count at all - which the two
  -- assertions above already depend on, so this states it directly.
  perform pg_temp.act_as(b);
  select post_count into korusa from public.get_my_top_hashtags(30) where tag = 'korusa';
  perform pg_temp.expect('CRITICAL: a second caller counts only their own posts (' || korusa || ')',
    korusa = 1, true);
end $$;

-- ---------------------------------------------------------------------------
-- Block 8: get_story_performance - expiry is not deletion
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  b uuid := '0d5f0003-0000-4000-8000-00000000000b';
  s1 uuid := '0d5f0003-0000-4000-8000-0000000000e1';
  s2 uuid := '0d5f0003-0000-4000-8000-0000000000e2';
  sb uuid := '0d5f0003-0000-4000-8000-0000000000e3';
  n bigint;
  newest record;
  expired record;
begin
  perform pg_temp.act_as(a);

  select count(*) into n from public.get_story_performance(30);
  perform pg_temp.expect('stories: both of A''s stories are reported (' || n || ')', n = 2, true);

  select * into newest from public.get_story_performance(30) limit 1;
  perform pg_temp.expect('stories: newest first', newest.id = s1, true);
  perform pg_temp.expect('stories: the live story''s counts (' || newest.view_count || ' views, '
    || newest.reaction_count || ' reactions)',
    newest.view_count = 1 and newest.reaction_count = 1, true);

  -- The one that matters: an expired story still has history, because nothing deletes it.
  select * into expired from public.get_story_performance(30) where id = s2;
  perform pg_temp.expect('CRITICAL: an expired story is still reported', expired.id = s2, true);
  perform pg_temp.expect('stories: the expired story kept its counts ('
    || expired.view_count || ' views, ' || expired.reaction_count || ' reactions)',
    expired.view_count = 1 and expired.reaction_count = 1, true);
  perform pg_temp.expect('stories: media_type and caption come through',
    expired.media_type = 'video' and expired.caption is not null, true);

  -- The window still applies: over 7 days only the recent one qualifies.
  select count(*) into n from public.get_story_performance(7);
  perform pg_temp.expect('stories: the window selects which stories are listed (' || n || ')',
    n = 1, true);

  -- Split in two so a red row names which half broke: seeing your own story and not
  -- seeing someone else's are different defects with different causes.
  perform pg_temp.act_as(b);
  perform pg_temp.expect('stories: a second caller sees their own story',
    (select count(*) from public.get_story_performance(30) where id = sb) = 1, true);
  perform pg_temp.expect('CRITICAL: a second caller sees none of A''s stories',
    exists (select 1 from public.get_story_performance(30) where id in (s1, s2)), false);
end $$;

-- ---------------------------------------------------------------------------
-- Block 9: a block hides people, it does not rewrite history
-- ---------------------------------------------------------------------------
-- The post's own like count in the feed still includes a blocked person's like, so
-- insights that disagreed with the number printed on the post would be a bug. Block 1
-- proved a block stops NEW views; this proves it does not retract old ones.
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  c uuid := '0d5f0003-0000-4000-8000-00000000000c';
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  ov record;
  likes_after bigint;
begin
  insert into public.user_blocks (blocker_id, blocked_id) values (a, c);

  perform pg_temp.act_as(a);
  select * into ov from public.get_creator_overview(7);

  perform pg_temp.expect('block: a blocked person''s view still counts (' || ov.views_previous || ')',
    ov.views_previous = 1, true);
  perform pg_temp.expect('block: their like still counts (' || ov.likes_previous || ')',
    ov.likes_previous = 1, true);
  perform pg_temp.expect('block: their comment still counts (' || ov.comments_previous || ')',
    ov.comments_previous = 1, true);
  perform pg_temp.expect('block: their story view still counts (' || ov.story_views_previous || ')',
    ov.story_views_previous = 1, true);
  perform pg_temp.expect('block: their story reaction still counts (' || ov.story_reactions_previous || ')',
    ov.story_reactions_previous = 1, true);
  perform pg_temp.expect('block: lifetime views are unchanged (' || ov.views_total || ')',
    ov.views_total = 2, true);

  select like_count into likes_after from public.get_top_posts(7) where id = p1;
  perform pg_temp.expect('CRITICAL: insights agree with the like count printed on the post ('
    || likes_after || ')', likes_after = 2, true);

  delete from public.user_blocks where blocker_id = a and blocked_id = c;
end $$;

-- ---------------------------------------------------------------------------
-- Block 10: rows with no timestamp count in totals and not in windows
-- ---------------------------------------------------------------------------
-- Conditional, because whether this scenario can exist at all is a property of the base
-- schema and not of the migration. Where section 1 newly added likes.created_at /
-- follows.created_at the column is nullable and the backlog reads null: those rows belong
-- in the lifetime totals and cannot be placed on a day. Where the columns already existed
-- as NOT NULL - which is the case on this project - such a row cannot be inserted at all,
-- so the check is recorded as a SKIP naming the reason.
--
-- Asked of information_schema rather than assumed. An earlier version of this block
-- inserted created_at = null unconditionally and aborted the whole run on the not-null
-- constraint, losing every other result; the assumption was the defect, not the schema.
--
-- The last check runs either way. "The cards and the chart sum to each other" is the
-- property a reader actually depends on, and it holds under both schemas - trivially so
-- where no row can be untimestamped.
do $$
declare
  a uuid := '0d5f0003-0000-4000-8000-00000000000a';
  e uuid := '0d5f0003-0000-4000-8000-00000000000e';
  p1 uuid := '0d5f0003-0000-4000-8000-0000000000f1';
  follows_nullable boolean;
  likes_nullable boolean;
  before_total bigint;
  before_current bigint;
  before_likes bigint;
  before_series bigint;
  after_total bigint;
  after_current bigint;
  after_likes bigint;
  after_series bigint;
  ov record;
begin
  select is_nullable = 'YES' into follows_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'follows' and column_name = 'created_at';

  select is_nullable = 'YES' into likes_nullable
  from information_schema.columns
  where table_schema = 'public' and table_name = 'likes' and column_name = 'created_at';

  perform pg_temp.act_as(a);
  select * into ov from public.get_creator_overview(7);
  before_total := ov.followers_total;
  before_current := ov.followers_current;
  select like_count into before_likes from public.get_top_posts(7) where id = p1;
  select coalesce(sum(like_count), 0) into before_series from public.get_engagement_timeseries(7);

  -- A follow that happened at a time nobody recorded.
  if coalesce(follows_nullable, false) then
    insert into public.follows (follower_id, following_id, created_at) values (e, a, null);

    select * into ov from public.get_creator_overview(7);
    after_total := ov.followers_total;
    after_current := ov.followers_current;

    perform pg_temp.expect('no timestamp: the follow counts in followers_total ('
      || before_total || ' -> ' || after_total || ')', after_total = before_total + 1, true);
    perform pg_temp.expect('no timestamp: and cannot be placed in the window ('
      || before_current || ' -> ' || after_current || ')', after_current = before_current, true);
  else
    perform pg_temp.skip('no timestamp: follows.created_at is NOT NULL here, so an '
      || 'untimestamped follow cannot exist - followers gained never undercounts');
  end if;

  -- A like that happened at a time nobody recorded.
  if coalesce(likes_nullable, false) then
    insert into public.likes (post_id, user_id, created_at) values (p1, e, null);

    select like_count into after_likes from public.get_top_posts(7) where id = p1;
    select coalesce(sum(like_count), 0) into after_series from public.get_engagement_timeseries(7);

    perform pg_temp.expect('no timestamp: the like counts in the post''s lifetime total ('
      || before_likes || ' -> ' || after_likes || ')', after_likes = before_likes + 1, true);
    perform pg_temp.expect('no timestamp: and is absent from the daily series ('
      || before_series || ' -> ' || after_series || ')', after_series = before_series, true);
  else
    perform pg_temp.skip('no timestamp: likes.created_at is NOT NULL here, so an '
      || 'untimestamped like cannot exist - every like is placed on a real day');
  end if;

  -- Which means the cards and the chart still agree, because both skip it.
  select * into ov from public.get_creator_overview(7);
  select coalesce(sum(like_count), 0) into after_series from public.get_engagement_timeseries(7);
  perform pg_temp.expect('cards and chart sum to each other ('
    || after_series || ' vs ' || ov.likes_current || ')', after_series = ov.likes_current, true);
end $$;

-- ---------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------
-- One result set, ending the run, because the Supabase SQL editor displays only the last
-- statement that returns rows. Row 0 is the verdict, so a failure is visible without
-- reading the whole table; the rest is in execution order.
select 0 as seq,
       case
         when count(*) filter (where status = 'FAIL') > 0 then 'FAILED'
         when count(*) filter (where status = 'SKIP') > 0 then 'PASSED WITH SKIPS'
         else 'PASSED'
       end as status,
       count(*) filter (where status = 'FAIL') || ' failed, ' ||
       count(*) filter (where status = 'SKIP') || ' skipped, out of ' ||
       count(*) || ' checks' as label,
       null::boolean as expected,
       null::boolean as actual
from analytics_results
union all
select seq, status, label, expected, actual
from analytics_results
order by seq;

-- Nothing is kept. Change this to COMMIT only if you deliberately want the fixtures to
-- survive.
rollback;
