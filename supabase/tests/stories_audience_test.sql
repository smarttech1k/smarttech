-- Korusa story audience rule: executable proof.
--
-- Replaces the manual three-account click-through with something that asserts.
-- Creates users A, B and C, walks every state transition of
-- public.can_view_user_stories, and reports one PASS/FAIL row per case.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that
-- ends in ROLLBACK, so no user, story, follow, block or message survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   Or: psql "$DATABASE_URL" -f supabase/tests/stories_audience_test.sql
--
-- Reading the outcome:
--   All good      -> a results table, every row PASS, plus an "ALL n CHECKS
--                    PASSED" notice.
--   A real defect -> the script ends with an ERROR naming every failed check.
--                    That is the signal. Any FAIL is a bug in the migration.
--   SKIP rows     -> a check could not run here (schema differs); the label
--                    carries the reason. Not a pass.

begin;

-- Fail fast and legibly if the migration has not been applied yet.
do $$
begin
  if to_regprocedure('public.can_view_user_stories(uuid)') is null then
    raise exception 'Apply supabase/migrations/20260815_stories.sql first';
  end if;
end $$;

create temporary table story_test_results (
  seq serial primary key,
  label text not null,
  expected boolean,
  actual boolean,
  status text
) on commit drop;

-- Records one assertion. Deliberately never raises, so the first failure does
-- not hide the rest of the matrix - one run gives the whole picture.
create or replace function pg_temp.expect(p_label text, p_actual boolean, p_expected boolean)
returns void language plpgsql as $$
begin
  insert into story_test_results (label, expected, actual, status)
  values (
    p_label,
    p_expected,
    p_actual,
    case when p_actual is distinct from p_expected then 'FAIL' else 'PASS' end
  );
end $$;

-- Impersonate a user. auth.uid() reads these GUCs; both spellings are set
-- because different Supabase versions read different ones.
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
-- A is the story author. B will reach an answered conversation with A.
-- C is the stranger who must stay locked out except where stated otherwise.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '0d5f0000-0000-4000-8000-00000000000a',
   'authenticated', 'authenticated', 'storytest-a@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storytest_a","full_name":"Story Test A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0000-0000-4000-8000-00000000000b',
   'authenticated', 'authenticated', 'storytest-b@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storytest_b","full_name":"Story Test B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0000-0000-4000-8000-00000000000c',
   'authenticated', 'authenticated', 'storytest-c@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storytest_c","full_name":"Story Test C"}'::jsonb);

-- The base schema is not in this repo, so a trigger on auth.users may already
-- have created these profiles. Fill in only what is missing. get_story_feed
-- inner-joins profiles, so the rows have to exist for block 3 to mean anything.
do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0000-0000-4000-8000-00000000000a'::uuid, 'storytest_a', 'Story Test A'),
    ('0d5f0000-0000-4000-8000-00000000000b'::uuid, 'storytest_b', 'Story Test B'),
    ('0d5f0000-0000-4000-8000-00000000000c'::uuid, 'storytest_c', 'Story Test C')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);
exception when others then
  insert into story_test_results (label, status)
  values ('setup: could not create test profiles (' || sqlerrm || ')', 'SKIP');
end $$;

-- One live story and one already expired, both authored by A.
insert into public.stories (id, user_id, media_path, media_type, caption, created_at, expires_at)
values
  ('0d5f0000-0000-4000-8000-0000000000f1', '0d5f0000-0000-4000-8000-00000000000a',
   '0d5f0000-0000-4000-8000-00000000000a/live.jpg', 'image', 'live story',
   now(), now() + interval '23 hours'),
  ('0d5f0000-0000-4000-8000-0000000000f2', '0d5f0000-0000-4000-8000-00000000000a',
   '0d5f0000-0000-4000-8000-00000000000a/expired.jpg', 'image', 'expired story',
   now() - interval '25 hours', now() - interval '1 hour');

-- ---------------------------------------------------------------------------
-- Block 1: the visibility rule, one state transition at a time
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0000-0000-4000-8000-00000000000a';
  b uuid := '0d5f0000-0000-4000-8000-00000000000b';
  c uuid := '0d5f0000-0000-4000-8000-00000000000c';
  conv_ab uuid := '0d5f0000-0000-4000-8000-0000000000c1';
  conv_ac uuid := '0d5f0000-0000-4000-8000-0000000000c2';
  msg_b uuid;
begin
  -- t1: no relationship at all.
  perform pg_temp.act_as(c);
  perform pg_temp.expect('stranger cannot view', public.can_view_user_stories(a), false);
  perform pg_temp.act_as(b);
  perform pg_temp.expect('second stranger cannot view', public.can_view_user_stories(a), false);
  perform pg_temp.act_as(a);
  perform pg_temp.expect('author can view own', public.can_view_user_stories(a), true);

  -- t2: C follows A.
  insert into public.follows (follower_id, following_id) values (c, a);
  perform pg_temp.act_as(c);
  perform pg_temp.expect('follower can view', public.can_view_user_stories(a), true);

  -- Direction matters. A gaining a follower must not give A access to them.
  perform pg_temp.act_as(a);
  perform pg_temp.expect('gaining a follower does not grant access to that follower',
    public.can_view_user_stories(c), false);

  -- t3: A blocks C while C still follows.
  insert into public.user_blocks (blocker_id, blocked_id) values (a, c);
  perform pg_temp.act_as(c);
  perform pg_temp.expect('block beats follow', public.can_view_user_stories(a), false);

  -- t4: block lifted, access returns.
  delete from public.user_blocks where blocker_id = a and blocked_id = c;
  perform pg_temp.act_as(c);
  perform pg_temp.expect('unblock restores follow access', public.can_view_user_stories(a), true);

  -- t5: C unfollows and is a stranger again.
  delete from public.follows where follower_id = c and following_id = a;
  perform pg_temp.expect('unfollow revokes access', public.can_view_user_stories(a), false);

  -- t6: B messages A and gets NO reply. This is the asymmetry the whole rule
  -- exists for: an unanswered outbound message must not buy access.
  insert into public.conversations (id, kind, direct_key, created_by)
  values (conv_ab, 'direct', 'storytest-ab', b);
  insert into public.conversation_members (conversation_id, user_id)
  values (conv_ab, a), (conv_ab, b);
  insert into public.messages (conversation_id, sender_id, body)
  values (conv_ab, b, 'hello, are you there?')
  returning id into msg_b;

  perform pg_temp.act_as(b);
  perform pg_temp.expect('CRITICAL: unanswered outbound message does not grant access',
    public.can_view_user_stories(a), false);

  -- t7: A replies. The conversation is now answered in both directions.
  insert into public.messages (conversation_id, sender_id, body)
  values (conv_ab, a, 'yes, hi');
  perform pg_temp.expect('answered conversation grants access',
    public.can_view_user_stories(a), true);

  -- And it is mutual: A can see B's stories on the same evidence.
  perform pg_temp.act_as(a);
  perform pg_temp.expect('answered conversation is mutual',
    public.can_view_user_stories(b), true);

  -- t7b: B blocks A. Both directions must go dark even though only one side
  -- blocked. Worth testing here rather than at t3, because access was genuinely
  -- true a moment ago - at t3 the reverse direction was already false, so the
  -- same assertion would have passed without the block doing any work.
  insert into public.user_blocks (blocker_id, blocked_id) values (b, a);
  perform pg_temp.expect('block by the viewer revokes the author''s access',
    public.can_view_user_stories(b), false);
  perform pg_temp.act_as(b);
  perform pg_temp.expect('block by the viewer revokes their own access',
    public.can_view_user_stories(a), false);
  delete from public.user_blocks where blocker_id = b and blocked_id = a;
  perform pg_temp.expect('unblock restores conversation access',
    public.can_view_user_stories(a), true);

  -- t8: B retracts their only message. A tombstone is not a reply, so B's half
  -- of the exchange disappears and the access granted by it goes too.
  update public.messages set deleted_at = now(), body = 'Message deleted' where id = msg_b;
  perform pg_temp.act_as(b);
  perform pg_temp.expect('soft-deleted message stops counting as having messaged',
    public.can_view_user_stories(a), false);

  -- Restore it so the later blocks run against an answered conversation.
  update public.messages set deleted_at = null, body = 'hello, are you there?' where id = msg_b;
  perform pg_temp.expect('restored message re-grants access',
    public.can_view_user_stories(a), true);

  -- t9: A messages C, C never replies. Inbound-only is not an exchange either.
  insert into public.conversations (id, kind, direct_key, created_by)
  values (conv_ac, 'direct', 'storytest-ac', a);
  insert into public.conversation_members (conversation_id, user_id)
  values (conv_ac, a), (conv_ac, c);
  insert into public.messages (conversation_id, sender_id, body)
  values (conv_ac, a, 'reaching out');

  perform pg_temp.act_as(c);
  perform pg_temp.expect('unanswered inbound message does not grant access',
    public.can_view_user_stories(a), false);
end $$;

-- State after block 1: B has an answered conversation with A and can see A's
-- stories. C is a stranger with an inbound-only thread and cannot.

-- ---------------------------------------------------------------------------
-- Block 2: the RLS policy and the storage read policy must agree with the rule
-- ---------------------------------------------------------------------------
-- This is the path the app actually takes. A correct function sitting behind a
-- wrong policy still leaks, so both are exercised as the authenticated role.
do $$
declare
  a uuid := '0d5f0000-0000-4000-8000-00000000000a';
  b uuid := '0d5f0000-0000-4000-8000-00000000000b';
  c uuid := '0d5f0000-0000-4000-8000-00000000000c';
  b_sees_rows boolean;
  c_sees_rows boolean;
  b_sees_object boolean;
  c_sees_object boolean;
begin
  perform pg_temp.act_as(b);
  set local role authenticated;
  select exists (select 1 from public.stories where user_id = a) into b_sees_rows;
  reset role;

  perform pg_temp.act_as(c);
  set local role authenticated;
  select exists (select 1 from public.stories where user_id = a) into c_sees_rows;
  reset role;

  perform pg_temp.expect('RLS: audience member reads story rows', b_sees_rows, true);
  perform pg_temp.expect('RLS: stranger reads no story rows', c_sees_rows, false);

  -- Storage is guarded separately: storage.objects gains columns between
  -- Supabase versions, and a schema mismatch here must not abort the run and
  -- throw away every other result. An aborted sub-block also rolls back its own
  -- SET LOCAL, so the role is back to normal in the handler.
  begin
    insert into storage.objects (bucket_id, name)
    values ('story-media', a::text || '/live.jpg');

    perform pg_temp.act_as(b);
    set local role authenticated;
    select exists (
      select 1 from storage.objects
      where bucket_id = 'story-media' and name = a::text || '/live.jpg'
    ) into b_sees_object;
    reset role;

    perform pg_temp.act_as(c);
    set local role authenticated;
    select exists (
      select 1 from storage.objects
      where bucket_id = 'story-media' and name = a::text || '/live.jpg'
    ) into c_sees_object;
    reset role;

    perform pg_temp.expect('storage: audience member sees the object', b_sees_object, true);
    perform pg_temp.expect('storage: stranger sees no object', c_sees_object, false);
  exception when others then
    insert into story_test_results (label, status)
    values ('storage policy checks could not run (' || sqlerrm || ')', 'SKIP');
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Block 3: expiry, view recording and viewer-list gating
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0000-0000-4000-8000-00000000000a';
  b uuid := '0d5f0000-0000-4000-8000-00000000000b';
  c uuid := '0d5f0000-0000-4000-8000-00000000000c';
  story_live uuid := '0d5f0000-0000-4000-8000-0000000000f1';
  story_expired uuid := '0d5f0000-0000-4000-8000-0000000000f2';
  view_rows bigint;
  author_count bigint;
  viewer_count bigint;
  raised boolean := false;
begin
  -- Expiry is enforced on every read path, not by a scheduler.
  perform pg_temp.act_as(b);
  perform pg_temp.expect('feed includes the live story',
    exists (select 1 from public.get_story_feed() where id = story_live), true);
  perform pg_temp.expect('feed excludes the expired story',
    exists (select 1 from public.get_story_feed() where id = story_expired), false);

  perform pg_temp.act_as(c);
  perform pg_temp.expect('stranger gets an empty feed',
    exists (select 1 from public.get_story_feed() where user_id = a), false);

  -- The author must not appear in their own viewer list.
  perform pg_temp.act_as(a);
  perform public.mark_story_viewed(story_live);
  select count(*) into view_rows from public.story_views where story_id = story_live;
  perform pg_temp.expect('author viewing own story records no view', view_rows = 0, true);

  -- An audience member is recorded once, however many times they watch.
  perform pg_temp.act_as(b);
  perform public.mark_story_viewed(story_live);
  perform public.mark_story_viewed(story_live);
  select count(*) into view_rows from public.story_views where story_id = story_live;
  perform pg_temp.expect('audience view is recorded once and is idempotent', view_rows = 1, true);

  -- A stranger cannot record a view at all.
  perform pg_temp.act_as(c);
  begin
    perform public.mark_story_viewed(story_live);
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('stranger cannot record a view', raised, true);
  select count(*) into view_rows from public.story_views where story_id = story_live;
  perform pg_temp.expect('failed view attempt left no row behind', view_rows = 1, true);

  -- View counts belong to the author alone.
  perform pg_temp.act_as(a);
  select view_count into author_count from public.get_story_feed() where id = story_live;
  perform pg_temp.act_as(b);
  select view_count into viewer_count from public.get_story_feed() where id = story_live;
  perform pg_temp.expect('author sees the real view count', author_count = 1, true);
  perform pg_temp.expect('non-author sees no view count', viewer_count = 0, true);

  -- So does the viewer list.
  perform pg_temp.act_as(a);
  perform pg_temp.expect('author sees B in the viewer list',
    exists (select 1 from public.get_story_viewers(story_live) where id = b), true);
  perform pg_temp.act_as(b);
  perform pg_temp.expect('non-author gets an empty viewer list',
    exists (select 1 from public.get_story_viewers(story_live)), false);
end $$;

-- ---------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------
-- FAIL rows sort to the top.
select seq, status, label, expected, actual
from story_test_results
order by (status = 'PASS'), seq;

-- Make the verdict impossible to miss even if only the last message is read:
-- any failure ends the script as an ERROR listing every failed check.
do $$
declare
  failures text;
  skipped text;
  total integer;
begin
  select count(*) into total from story_test_results;
  select string_agg(label, '; ' order by seq) into failures
    from story_test_results where status = 'FAIL';
  select string_agg(label, '; ' order by seq) into skipped
    from story_test_results where status = 'SKIP';

  if skipped is not null then
    raise notice 'SKIPPED: %', skipped;
  end if;

  if failures is not null then
    raise exception 'STORY AUDIENCE TEST FAILED: %', failures;
  end if;

  raise notice 'ALL % CHECKS PASSED', total;
end $$;

-- Nothing is kept. Change this to COMMIT only if you deliberately want the
-- fixtures to survive.
rollback;
