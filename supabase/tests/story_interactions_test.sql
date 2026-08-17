-- Korusa story reactions and replies: executable proof.
--
-- Companion to stories_audience_test.sql, which proves who can *see* a story.
-- This one proves what they can do to it: react, have that reaction counted for
-- the author alone, and send the author a private reply without escaping the
-- block list or the one-message-until-reply rule.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that
-- ends in ROLLBACK, so no user, story, reaction, conversation or message
-- survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   The pre-run linter will warn about DELETE/UPDATE being destructive; it does
--   not read the ROLLBACK at the end. "Run without RLS" is the correct choice -
--   this script's own fixture writes must not be filtered by policies, and the
--   policy checks below set the authenticated role explicitly where they mean to.
--   Or: psql "$DATABASE_URL" -f supabase/tests/story_interactions_test.sql
--
-- Reading the outcome:
--   The run ends with one table. Row 0 is the verdict - PASSED, FAILED, or
--   PASSED WITH SKIPS - followed by every check in execution order.
--   Any FAIL row is a real defect in the migration. A SKIP is not a pass.
--   If the script stops with an ERROR instead, setup broke before the checks ran
--   and the message says where.
--
-- Emoji are written as chr(<code point>) rather than literals so this file stays
-- pure ASCII and cannot be mangled by an editor or a paste through a console
-- with the wrong code page. chr(128293) is a fire, chr(127881) a party popper,
-- chr(128077) a thumbs up.

begin;

-- Fail fast and legibly if either migration is missing.
do $$
begin
  if to_regprocedure('public.can_view_user_stories(uuid)') is null then
    raise exception 'Apply supabase/migrations/20260815_stories.sql first';
  end if;
  if to_regclass('public.story_reactions') is null
     or to_regprocedure('public.set_story_reaction(uuid, text)') is null
     or to_regprocedure('public.get_story_insights(uuid)') is null
     or to_regprocedure('public.send_story_reply(uuid, text)') is null then
    raise exception 'Apply supabase/migrations/20260816_story_reactions_replies.sql first';
  end if;
  -- send_story_reply delegates the turn rule to this, and plpgsql resolves called
  -- functions at run time, so a missing one would surface as a puzzling failure
  -- halfway through block 4 rather than here.
  if to_regprocedure('public.can_message_conversation(uuid)') is null then
    raise exception 'Apply supabase/migrations/20260726_profile_social_controls.sql first';
  end if;
  -- get_story_feed is dropped and recreated by that migration; if the old
  -- two-count version is still live, every count assertion below would be
  -- meaningless rather than failing honestly.
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_story_feed'
      and 'my_reaction' = any(p.proargnames)
  ) then
    raise exception 'get_story_feed is the pre-reaction version; re-apply 20260816_story_reactions_replies.sql';
  end if;
end $$;

create temporary table story_fx_results (
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
  insert into story_fx_results (label, expected, actual, status)
  values (
    p_label,
    p_expected,
    p_actual,
    case when p_actual is distinct from p_expected then 'FAIL' else 'PASS' end
  );
end $$;

create or replace function pg_temp.skip(p_label text)
returns void language plpgsql as $$
begin
  insert into story_fx_results (label, status) values (p_label, 'SKIP');
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
-- A authors the stories. B follows A, so B is in the audience with no
-- conversation history at all - which is what makes the reply block below a real
-- test of the turn rule rather than a test between friends.
-- C is the stranger who must be refused everywhere.
-- D follows A and reacts but never watches, which is the only way to exercise
-- the reaction half of the get_story_viewers union.
--
-- A separate uuid prefix from stories_audience_test.sql, so the two files can be
-- run in either order in the same session without colliding.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '0d5f0001-0000-4000-8000-00000000000a',
   'authenticated', 'authenticated', 'storyfx-a@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storyfx_a","full_name":"Story Fx A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0001-0000-4000-8000-00000000000b',
   'authenticated', 'authenticated', 'storyfx-b@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storyfx_b","full_name":"Story Fx B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0001-0000-4000-8000-00000000000c',
   'authenticated', 'authenticated', 'storyfx-c@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storyfx_c","full_name":"Story Fx C"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0001-0000-4000-8000-00000000000d',
   'authenticated', 'authenticated', 'storyfx-d@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"storyfx_d","full_name":"Story Fx D"}'::jsonb);

-- The base schema is not in this repo, so a trigger on auth.users may already
-- have created these profiles. Fill in only what is missing; get_story_feed and
-- get_story_viewers both inner-join profiles, so the rows have to exist.
do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0001-0000-4000-8000-00000000000a'::uuid, 'storyfx_a', 'Story Fx A'),
    ('0d5f0001-0000-4000-8000-00000000000b'::uuid, 'storyfx_b', 'Story Fx B'),
    ('0d5f0001-0000-4000-8000-00000000000c'::uuid, 'storyfx_c', 'Story Fx C'),
    ('0d5f0001-0000-4000-8000-00000000000d'::uuid, 'storyfx_d', 'Story Fx D')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);
exception when others then
  perform pg_temp.skip('setup: could not create test profiles (' || sqlerrm || ')');
end $$;

insert into public.stories (id, user_id, media_path, media_type, caption, created_at, expires_at)
values
  ('0d5f0001-0000-4000-8000-0000000000f1', '0d5f0001-0000-4000-8000-00000000000a',
   '0d5f0001-0000-4000-8000-00000000000a/live.jpg', 'image', 'live story',
   now(), now() + interval '23 hours'),
  ('0d5f0001-0000-4000-8000-0000000000f2', '0d5f0001-0000-4000-8000-00000000000a',
   '0d5f0001-0000-4000-8000-00000000000a/expired.jpg', 'image', 'expired story',
   now() - interval '25 hours', now() - interval '1 hour');

-- B and D follow A. C follows nobody.
insert into public.follows (follower_id, following_id) values
  ('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a'),
  ('0d5f0001-0000-4000-8000-00000000000d', '0d5f0001-0000-4000-8000-00000000000a');

-- ---------------------------------------------------------------------------
-- Block 1: the RLS policies on story_reactions, reached as the app reaches them
-- ---------------------------------------------------------------------------
-- This is the PostgREST path: a client can hit the table directly, without going
-- anywhere near set_story_reaction. A correct RPC sitting on top of a permissive
-- policy still lets a stranger react, so the policy is tested on its own.
do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
  c uuid := '0d5f0001-0000-4000-8000-00000000000c';
  story_live uuid := '0d5f0001-0000-4000-8000-0000000000f1';
  refused boolean := false;
  accepted boolean := false;
  other_error text;
  b_reads_own boolean;
  c_reads_bs boolean;
  a_reads_bs boolean;
begin
  -- A stranger's direct insert must be refused by the with-check.
  begin
    perform pg_temp.act_as(c);
    set local role authenticated;
    insert into public.story_reactions (story_id, user_id, emoji)
    values (story_live, c, chr(128293));
    reset role;
  exception
    when insufficient_privilege then refused := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('RLS: stranger cannot insert a reaction directly', refused, true);
  if other_error is not null then
    perform pg_temp.skip('stranger insert raised something other than RLS: ' || other_error);
  end if;

  -- And an audience member's must be accepted - otherwise the check above would
  -- pass just as well against a policy that refuses everybody.
  other_error := null;
  begin
    perform pg_temp.act_as(b);
    set local role authenticated;
    insert into public.story_reactions (story_id, user_id, emoji)
    values (story_live, b, chr(128293));
    reset role;
    accepted := true;
  exception when others then
    other_error := sqlerrm;
  end;
  perform pg_temp.expect('RLS: audience member can insert a reaction directly', accepted, true);
  if not accepted then
    perform pg_temp.skip('audience insert was refused: ' || coalesce(other_error, 'unknown'));
  end if;

  -- Reads: your own row, and the author's view of everyone's. Nobody else.
  -- This is the whole of "author only sees counts" - there is no other gate.
  perform pg_temp.act_as(b);
  set local role authenticated;
  select exists (select 1 from public.story_reactions where story_id = story_live and user_id = b)
    into b_reads_own;
  reset role;

  perform pg_temp.act_as(c);
  set local role authenticated;
  select exists (select 1 from public.story_reactions where story_id = story_live)
    into c_reads_bs;
  reset role;

  perform pg_temp.act_as(a);
  set local role authenticated;
  select exists (select 1 from public.story_reactions where story_id = story_live and user_id = b)
    into a_reads_bs;
  reset role;

  perform pg_temp.expect('RLS: reactor reads their own reaction', b_reads_own, true);
  perform pg_temp.expect('RLS: a third party reads no reactions at all', c_reads_bs, false);
  perform pg_temp.expect('RLS: author reads reactions on their own story', a_reads_bs, true);
end $$;

-- Reset to a clean slate so block 2 starts from no reactions. Runs as the
-- session role, so RLS is not involved.
delete from public.story_reactions
where story_id = '0d5f0001-0000-4000-8000-0000000000f1';

-- ---------------------------------------------------------------------------
-- Block 2: set_story_reaction - one row per person, replaceable, clearable
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
  c uuid := '0d5f0001-0000-4000-8000-00000000000c';
  story_live uuid := '0d5f0001-0000-4000-8000-0000000000f1';
  story_expired uuid := '0d5f0001-0000-4000-8000-0000000000f2';
  fire text := chr(128293);
  thumb text := chr(128077);
  answer text;
  rows_now bigint;
  emoji_now text;
  raised boolean;
begin
  -- The stranger, through the RPC this time.
  raised := false;
  begin
    perform pg_temp.act_as(c);
    answer := public.set_story_reaction(story_live, fire);
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('RPC: stranger cannot react', raised, true);
  select count(*) into rows_now from public.story_reactions where story_id = story_live;
  perform pg_temp.expect('refused reaction left no row behind', rows_now = 0, true);

  -- An audience member sets one.
  perform pg_temp.act_as(b);
  answer := public.set_story_reaction(story_live, fire);
  select count(*), max(emoji) into rows_now, emoji_now
  from public.story_reactions where story_id = story_live;
  perform pg_temp.expect('audience member can react', answer = fire, true);
  perform pg_temp.expect('reacting creates exactly one row', rows_now = 1, true);
  perform pg_temp.expect('the stored emoji is the one sent', emoji_now = fire, true);

  -- A different emoji replaces it. This is the deliberate difference from
  -- message_reactions, whose key is (message, user, emoji) and accumulates: with
  -- author-visible totals, one person contributing two emoji would push the
  -- reaction count past the view count and read as broken.
  answer := public.set_story_reaction(story_live, thumb);
  select count(*), max(emoji) into rows_now, emoji_now
  from public.story_reactions where story_id = story_live;
  perform pg_temp.expect('a second emoji replaces rather than adds', rows_now = 1, true);
  perform pg_temp.expect('the replacement is the emoji now stored', emoji_now = thumb, true);
  perform pg_temp.expect('the RPC returns the emoji now in effect', answer = thumb, true);

  -- Tapping the emoji already in effect clears it, and the RPC says so.
  answer := public.set_story_reaction(story_live, thumb);
  select count(*) into rows_now from public.story_reactions where story_id = story_live;
  perform pg_temp.expect('re-tapping the same emoji clears the reaction', rows_now = 0, true);
  perform pg_temp.expect('clearing returns null', answer is null, true);

  -- And it can be set again afterwards.
  answer := public.set_story_reaction(story_live, fire);
  select count(*) into rows_now from public.story_reactions where story_id = story_live;
  perform pg_temp.expect('reacting again after clearing works', rows_now = 1 and answer = fire, true);

  -- The author is excluded, so the totals they read never include themselves.
  raised := false;
  begin
    perform pg_temp.act_as(a);
    answer := public.set_story_reaction(story_live, fire);
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('author cannot react to their own story', raised, true);

  -- Expiry is enforced here as it is on every other read path.
  raised := false;
  begin
    perform pg_temp.act_as(b);
    answer := public.set_story_reaction(story_expired, fire);
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('nobody can react to an expired story', raised, true);

  -- An empty or whitespace-only emoji is not a reaction.
  raised := false;
  begin
    answer := public.set_story_reaction(story_live, '   ');
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('blank emoji is refused', raised, true);
end $$;

-- State: B holds one fire reaction on A's live story.

-- ---------------------------------------------------------------------------
-- Block 3: whose numbers are they - counts, insights and the viewer list
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
  d uuid := '0d5f0001-0000-4000-8000-00000000000d';
  story_live uuid := '0d5f0001-0000-4000-8000-0000000000f1';
  party text := chr(127881);
  fire text := chr(128293);
  author_views bigint;
  author_reactions bigint;
  viewer_views bigint;
  viewer_reactions bigint;
  viewer_own text;
  author_own text;
  insight_views bigint;
  insight_reactions bigint;
  d_reaction text;
  d_viewed_at timestamptz;
  d_in_list boolean;
begin
  -- One recorded view, from B. D reacts without ever watching, which is the case
  -- the get_story_viewers union exists for.
  perform pg_temp.act_as(b);
  perform public.mark_story_viewed(story_live);

  perform pg_temp.act_as(d);
  perform public.set_story_reaction(story_live, party);

  -- The feed: the author sees both real totals.
  perform pg_temp.act_as(a);
  select view_count, reaction_count, my_reaction
    into author_views, author_reactions, author_own
  from public.get_story_feed() where id = story_live;
  perform pg_temp.expect('author sees the real view count', author_views = 1, true);
  perform pg_temp.expect('author sees the real reaction count', author_reactions = 2, true);
  perform pg_temp.expect('author has no reaction of their own', author_own is null, true);

  -- A viewer sees neither, but does see their own reaction lit.
  perform pg_temp.act_as(b);
  select view_count, reaction_count, my_reaction
    into viewer_views, viewer_reactions, viewer_own
  from public.get_story_feed() where id = story_live;
  perform pg_temp.expect('CRITICAL: a viewer sees no reaction count', viewer_reactions = 0, true);
  perform pg_temp.expect('a viewer sees no view count', viewer_views = 0, true);
  perform pg_temp.expect('a viewer sees their own reaction', viewer_own = fire, true);

  -- get_story_insights is the author-only refresh the footer uses per slide.
  perform pg_temp.act_as(a);
  select view_count, reaction_count into insight_views, insight_reactions
  from public.get_story_insights(story_live);
  perform pg_temp.expect('insights give the author both live totals',
    insight_views = 1 and insight_reactions = 2, true);

  perform pg_temp.act_as(b);
  perform pg_temp.expect('CRITICAL: insights return no row for a non-author',
    exists (select 1 from public.get_story_insights(story_live)), false);

  -- The viewer list carries each person's reaction, and includes D even though D
  -- has no view row - a reaction must never be dropped from the author's list.
  perform pg_temp.act_as(a);
  select true, reaction, viewed_at into d_in_list, d_reaction, d_viewed_at
  from public.get_story_viewers(story_live) where id = d;
  perform pg_temp.expect('a reactor who never watched still appears in the list',
    coalesce(d_in_list, false), true);
  perform pg_temp.expect('their reaction is reported', d_reaction = party, true);
  perform pg_temp.expect('their view time is null, not fabricated', d_viewed_at is null, true);

  perform pg_temp.expect('a watcher''s reaction is reported beside their view',
    exists (select 1 from public.get_story_viewers(story_live)
            where id = b and reaction = fire and viewed_at is not null), true);

  perform pg_temp.act_as(b);
  perform pg_temp.expect('a non-author still gets an empty viewer list',
    exists (select 1 from public.get_story_viewers(story_live)), false);
end $$;

-- D reacted while following. If reactions had been stored as messages, that tap
-- would have started earning D story access - which is exactly why they are not.
-- Unfollowing must take the access away and leave the reaction behind.
delete from public.follows
where follower_id = '0d5f0001-0000-4000-8000-00000000000d'
  and following_id = '0d5f0001-0000-4000-8000-00000000000a';

do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  d uuid := '0d5f0001-0000-4000-8000-00000000000d';
begin
  perform pg_temp.act_as(d);
  perform pg_temp.expect('CRITICAL: having reacted does not by itself grant story access',
    public.can_view_user_stories(a), false);
end $$;

-- ---------------------------------------------------------------------------
-- Block 4: send_story_reply
-- ---------------------------------------------------------------------------
-- B is a follower with no conversation history and is not A's friend, so the
-- turn rule applies in full - the state the app will actually be in the first
-- time somebody answers a story.
do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
  c uuid := '0d5f0001-0000-4000-8000-00000000000c';
  story_live uuid := '0d5f0001-0000-4000-8000-0000000000f1';
  story_expired uuid := '0d5f0001-0000-4000-8000-0000000000f2';
  key_ab text := least('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a')
                 || ':' ||
                 greatest('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a');
  key_ac text := least('0d5f0001-0000-4000-8000-00000000000c', '0d5f0001-0000-4000-8000-00000000000a')
                 || ':' ||
                 greatest('0d5f0001-0000-4000-8000-00000000000c', '0d5f0001-0000-4000-8000-00000000000a');
  conv_ab uuid;
  message_id uuid;
  row_type text;
  row_meta jsonb;
  reply_count bigint;
  member_count bigint;
  raised boolean;
  message_text text;
begin
  -- The stranger. The interesting part is the second assertion: the raise has to
  -- roll back the conversation the function created a few lines earlier, or a
  -- refused reply would leave an empty thread in both inboxes.
  raised := false;
  begin
    perform pg_temp.act_as(c);
    message_id := public.send_story_reply(story_live, 'let me in');
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('stranger cannot reply to a story', raised, true);
  perform pg_temp.expect('a refused reply leaves no orphan conversation',
    exists (select 1 from public.conversations where direct_key = key_ac), false);

  raised := false;
  begin
    perform pg_temp.act_as(b);
    message_id := public.send_story_reply(story_expired, 'too late');
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('nobody can reply to an expired story', raised, true);

  raised := false;
  begin
    perform pg_temp.act_as(a);
    message_id := public.send_story_reply(story_live, 'talking to myself');
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('author cannot reply to their own story', raised, true);

  raised := false;
  begin
    perform pg_temp.act_as(b);
    message_id := public.send_story_reply(story_live, '    ');
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('an empty reply is refused', raised, true);

  -- The real thing.
  perform pg_temp.act_as(b);
  message_id := public.send_story_reply(story_live, 'this is great');

  select id into conv_ab from public.conversations where direct_key = key_ab;
  select count(*) into member_count from public.conversation_members where conversation_id = conv_ab;
  select message_type, metadata, body into row_type, row_meta, message_text
  from public.messages where id = message_id;

  perform pg_temp.expect('a reply creates the direct conversation', conv_ab is not null, true);
  perform pg_temp.expect('both people are members of it', member_count = 2, true);
  perform pg_temp.expect('the reply is a real message with the story_reply type',
    row_type = 'story_reply', true);
  perform pg_temp.expect('the body is the text that was sent', message_text = 'this is great', true);
  perform pg_temp.expect('the metadata points back at the story',
    row_meta->>'story_id' = story_live::text, true);
  -- A path, never a URL: the thread signs it on read, so the object stays
  -- audience-scoped for as long as it exists.
  perform pg_temp.expect('the metadata carries the media path, not a url',
    row_meta->>'story_media_path' = '0d5f0001-0000-4000-8000-00000000000a/live.jpg', true);
  perform pg_temp.expect('the metadata carries the caption for the reference card',
    row_meta->>'story_caption' = 'live story', true);

  -- The turn rule. get_my_conversations already computes this as can_send and the
  -- UI honours it, but nothing enforced it until now; a story reply that ignored
  -- it would be a way around a limit the inbox advertises.
  raised := false;
  begin
    message_id := public.send_story_reply(story_live, 'and another thing');
  exception when others then
    raised := true;
    message_text := sqlerrm;
  end;
  perform pg_temp.expect('a second unanswered reply is refused', raised, true);
  perform pg_temp.expect('and refused with the waiting-for-reply message, not a generic error',
    message_text ilike '%waiting for a reply%', true);
  select count(*) into reply_count
  from public.messages where conversation_id = conv_ab and message_type = 'story_reply';
  perform pg_temp.expect('the refused reply was not written', reply_count = 1, true);

  -- A answers, and B may reply again.
  insert into public.messages (conversation_id, sender_id, body)
  values (conv_ab, a, 'thanks!');

  perform pg_temp.act_as(b);
  message_id := public.send_story_reply(story_live, 'glad you liked it');
  select count(*) into reply_count
  from public.messages where conversation_id = conv_ab and message_type = 'story_reply';
  perform pg_temp.expect('once answered, a further reply is allowed', reply_count = 2, true);
end $$;

-- A consequence worth pinning rather than discovering later: can_view_user_stories
-- counts any message that is not a tombstone or a system notice, and a story_reply
-- is a real message. So an exchange that began with a story reply keeps granting
-- story access after the follow is gone. That is coherent - they are conversing -
-- but it is a decision, so it is asserted.
delete from public.follows
where follower_id = '0d5f0001-0000-4000-8000-00000000000b'
  and following_id = '0d5f0001-0000-4000-8000-00000000000a';

do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
begin
  perform pg_temp.act_as(b);
  perform pg_temp.expect('an answered story-reply exchange keeps story access after unfollowing',
    public.can_view_user_stories(a), true);
end $$;

insert into public.follows (follower_id, following_id)
values ('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a');

-- ---------------------------------------------------------------------------
-- Block 5: blocking
-- ---------------------------------------------------------------------------
-- The messages insert policy in 20260725_messaging.sql checks only
-- "sender_id = auth.uid() and is_conversation_member(...)" - it does not consult
-- the block list. send_story_reply is security definer, so it bypasses that
-- policy entirely and its own can_view_user_stories call is the only thing
-- standing between a block and a delivered message. This block is the proof.
--
-- A message from A goes in first so the turn rule is permissive: without it, a
-- refusal here would prove nothing, because the previous reply was B's.
do $$
declare
  a uuid := '0d5f0001-0000-4000-8000-00000000000a';
  b uuid := '0d5f0001-0000-4000-8000-00000000000b';
  story_live uuid := '0d5f0001-0000-4000-8000-0000000000f1';
  key_ab text := least('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a')
                 || ':' ||
                 greatest('0d5f0001-0000-4000-8000-00000000000b', '0d5f0001-0000-4000-8000-00000000000a');
  conv_ab uuid;
  reply_count_before bigint;
  reply_count_after bigint;
  raised boolean;
  message_text text;
  ignored text;
begin
  select id into conv_ab from public.conversations where direct_key = key_ab;
  insert into public.messages (conversation_id, sender_id, body)
  values (conv_ab, a, 'go ahead');

  select count(*) into reply_count_before
  from public.messages where conversation_id = conv_ab and message_type = 'story_reply';

  -- Sanity: it is B's turn, so a reply would succeed right now. Asserted through
  -- the same function the app calls, so the block result below is unambiguous.
  perform pg_temp.act_as(b);
  perform pg_temp.expect('B may send at this point in the thread',
    public.can_message_conversation(conv_ab), true);

  insert into public.user_blocks (blocker_id, blocked_id) values (a, b);

  raised := false;
  begin
    perform pg_temp.act_as(b);
    ignored := public.set_story_reaction(story_live, chr(128293));
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('a blocked follower cannot react', raised, true);

  raised := false;
  begin
    ignored := public.send_story_reply(story_live, 'you cannot ignore me')::text;
  exception when others then
    raised := true;
    message_text := sqlerrm;
  end;
  perform pg_temp.expect('CRITICAL: a blocked follower cannot reply', raised, true);
  -- Which check fired matters. The audience gate must be what refuses, not the
  -- turn rule - it is B's turn, and only the audience gate consults the blocks.
  perform pg_temp.expect('and it is the audience gate that refuses, not the turn rule',
    message_text ilike '%story not found%', true);

  select count(*) into reply_count_after
  from public.messages where conversation_id = conv_ab and message_type = 'story_reply';
  perform pg_temp.expect('no message was written for the blocked attempt',
    reply_count_after = reply_count_before, true);

  -- Lifting the block restores both.
  delete from public.user_blocks where blocker_id = a and blocked_id = b;

  perform pg_temp.act_as(b);
  raised := false;
  begin
    ignored := public.set_story_reaction(story_live, chr(128293));
  exception when others then
    raised := true;
  end;
  perform pg_temp.expect('unblocking restores reacting', raised, false);

  raised := false;
  begin
    ignored := public.send_story_reply(story_live, 'thanks for unblocking')::text;
  exception when others then
    raised := true;
    message_text := sqlerrm;
  end;
  perform pg_temp.expect('unblocking restores replying', raised, false);
  if raised then
    perform pg_temp.skip('reply after unblock failed with: ' || coalesce(message_text, 'unknown'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------
-- One result set, ending the run, because the Supabase SQL editor displays only
-- the last statement that returns rows. Row 0 is the verdict, so a failure is
-- visible without reading the whole table; the rest is in execution order.
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
from story_fx_results
union all
select seq, status, label, expected, actual
from story_fx_results
order by seq;

-- Nothing is kept. Change this to COMMIT only if you deliberately want the
-- fixtures to survive.
rollback;
