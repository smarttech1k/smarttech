-- Korusa notifications: executable proof.
--
-- Companion to supabase/migrations/20260817_notifications.sql. That migration's
-- central claim is a negative one - "there is no client-reachable way to write a
-- notification row" - and a negative claim is the kind that reads fine in review and
-- is false in production. Block 6 is the one that matters most: the trigger path
-- working proves nothing at all about whether the client path is closed.
--
-- SAFE TO RUN ON A REAL PROJECT: everything happens inside a transaction that ends
-- in ROLLBACK, so no user, post, comment, like, follow, reaction or notification
-- survives it.
--
-- How to run:
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   The pre-run linter will warn about DELETE/UPDATE being destructive; it does not
--   read the ROLLBACK at the end. "Run without RLS" is the correct choice - this
--   script's own fixture writes must not be filtered by policies, and the checks
--   that are about a policy or a grant set role authenticated explicitly and say so
--   in their label.
--   Or: psql "$DATABASE_URL" -f supabase/tests/notifications_test.sql
--
-- Reading the outcome:
--   The run ends with one table. Row 0 is the verdict - PASSED, FAILED, or PASSED
--   WITH SKIPS - followed by every check in execution order. Any FAIL row is a real
--   defect in the migration. A SKIP is not a pass. If the script stops with an ERROR
--   instead, setup broke before the checks ran and the message says where.
--
-- The script runs as the table owner, so RLS does not apply to its own writes and it
-- can clear public.notifications between blocks to give each block a known starting
-- state. That is deliberate: a block that inherits eleven rows from the block above
-- fails for reasons that have nothing to do with what it was written to prove.
--
-- posts, likes, comments and follows predate supabase/migrations, so the fixtures
-- below insert the columns the client uses (src/lib/feed.ts, src/lib/social.ts) and
-- the ones get_recent_comments reads. If your schema carries an extra NOT NULL column
-- on one of them, the run stops on that insert with a message naming the column - add
-- it to the fixture rather than working around the assertions.
--
-- Emoji are written as chr(<code point>) rather than literals so this file stays pure
-- ASCII and cannot be mangled by an editor or a paste through a console with the
-- wrong code page. chr(128293) is a fire, chr(127881) a party popper.
--
-- Separate uuid prefix from stories_audience_test.sql (0d5f0000) and
-- story_interactions_test.sql (0d5f0001), so all three can run in the same session
-- in any order without colliding.

begin;

-- Fail fast and legibly if a migration is missing.
do $$
begin
  if to_regclass('public.notifications') is null
     or to_regprocedure('public.push_notification(uuid, uuid, text, uuid, uuid, uuid, text)') is null
     or to_regprocedure('public.get_notifications(timestamptz, integer, text[])') is null
     or to_regprocedure('public.get_unread_notification_count()') is null
     or to_regprocedure('public.mark_notifications_read(uuid[])') is null then
    raise exception 'Apply supabase/migrations/20260817_notifications.sql first';
  end if;

  -- push_notification calls these, and plpgsql resolves called functions at run
  -- time: a missing one would surface as a puzzling failure inside block 8 rather
  -- than here.
  if to_regprocedure('public.is_blocked_between(uuid, uuid)') is null
     or to_regclass('public.user_mutes') is null
     or to_regclass('public.user_blocks') is null then
    raise exception 'Apply supabase/migrations/20260726_profile_social_controls.sql first';
  end if;

  if to_regclass('public.stories') is null or to_regclass('public.story_reactions') is null then
    raise exception 'Apply supabase/migrations/20260815_stories.sql and 20260816_story_reactions_replies.sql first';
  end if;

  if to_regclass('public.posts') is null or to_regclass('public.likes') is null
     or to_regclass('public.comments') is null or to_regclass('public.follows') is null then
    raise exception 'The base tables (posts, likes, comments, follows) are missing from this database';
  end if;

  -- The triggers are the entire write path. If one is absent every assertion about
  -- it would fail one by one; better to say so once, up front.
  if not exists (
    select 1 from pg_trigger
    where not tgisinternal and tgname = 'notify_on_like' and tgrelid = 'public.likes'::regclass
  ) then
    raise exception 'The notify_on_like trigger is missing; re-apply 20260817_notifications.sql';
  end if;
  -- Called out separately because it is the one that is easy to lose: a WHEN clause
  -- cannot reference OLD on an insert, so it has to be its own trigger.
  if not exists (
    select 1 from pg_trigger
    where not tgisinternal and tgname = 'notify_on_story_reaction_change'
      and tgrelid = 'public.story_reactions'::regclass
  ) then
    raise exception 'The notify_on_story_reaction_change trigger is missing; re-apply 20260817_notifications.sql';
  end if;
end $$;

create temporary table notif_results (
  seq serial primary key,
  label text not null,
  expected boolean,
  actual boolean,
  status text
) on commit drop;

-- Records one assertion. Deliberately never raises, so the first failure does not
-- hide the rest of the matrix - one run gives the whole picture.
create or replace function pg_temp.expect(p_label text, p_actual boolean, p_expected boolean)
returns void language plpgsql as $$
begin
  insert into notif_results (label, expected, actual, status)
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
  insert into notif_results (label, status) values (p_label, 'SKIP');
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
-- A is the recipient throughout: A owns the post, the story and the second post that
-- block 10 destroys. B is the actor who likes, comments, follows and reacts. C is
-- the third party who must never see or touch any of it.

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '0d5f0002-0000-4000-8000-00000000000a',
   'authenticated', 'authenticated', 'notiffx-a@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"notiffx_a","full_name":"Notif Fx A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0002-0000-4000-8000-00000000000b',
   'authenticated', 'authenticated', 'notiffx-b@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"notiffx_b","full_name":"Notif Fx B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '0d5f0002-0000-4000-8000-00000000000c',
   'authenticated', 'authenticated', 'notiffx-c@example.invalid', now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"username":"notiffx_c","full_name":"Notif Fx C"}'::jsonb);

-- The base schema is not in this repo, so a trigger on auth.users may already have
-- created these profiles. Fill in only what is missing; get_notifications joins
-- profiles for the actor's name and avatar.
do $$
begin
  insert into public.profiles (id, username, full_name)
  select v.id, v.username, v.full_name
  from (values
    ('0d5f0002-0000-4000-8000-00000000000a'::uuid, 'notiffx_a', 'Notif Fx A'),
    ('0d5f0002-0000-4000-8000-00000000000b'::uuid, 'notiffx_b', 'Notif Fx B'),
    ('0d5f0002-0000-4000-8000-00000000000c'::uuid, 'notiffx_c', 'Notif Fx C')
  ) as v(id, username, full_name)
  where not exists (select 1 from public.profiles p where p.id = v.id);
exception when others then
  perform pg_temp.skip('setup: could not create test profiles (' || sqlerrm || ')');
end $$;

insert into public.posts (id, user_id, content, media_url, created_at)
values
  ('0d5f0002-0000-4000-8000-0000000000f1', '0d5f0002-0000-4000-8000-00000000000a',
   'A post by A that other people react to', 'https://example.invalid/notiffx-a.jpg', now()),
  ('0d5f0002-0000-4000-8000-0000000000f2', '0d5f0002-0000-4000-8000-00000000000b',
   'A post by B, so notifications can be checked in both directions',
   'https://example.invalid/notiffx-b.jpg', now()),
  ('0d5f0002-0000-4000-8000-0000000000f3', '0d5f0002-0000-4000-8000-00000000000a',
   'The post block 10 deletes', 'https://example.invalid/notiffx-doomed.jpg', now());

insert into public.stories (id, user_id, media_path, media_type, caption, created_at, expires_at)
values
  ('0d5f0002-0000-4000-8000-0000000000e1', '0d5f0002-0000-4000-8000-00000000000a',
   '0d5f0002-0000-4000-8000-00000000000a/live.jpg', 'image', 'a story of A''s',
   now(), now() + interval '23 hours');

-- ---------------------------------------------------------------------------
-- Block 1: likes
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  post_a uuid := '0d5f0002-0000-4000-8000-0000000000f1';
  n integer;
  row_ok boolean;
  unread boolean;
begin
  insert into public.likes (post_id, user_id) values (post_a, b);

  select count(*) into n from public.notifications
  where user_id = a and actor_id = b and type = 'like';
  perform pg_temp.expect('likes: a like notifies the post author (rows ' || n || ')', n = 1, true);

  select exists (
    select 1 from public.notifications
    where user_id = a and actor_id = b and type = 'like' and post_id = post_a
      and comment_id is null and story_id is null and read_at is null
  ) into row_ok;
  perform pg_temp.expect('likes: the row names the post and arrives unread', row_ok, true);

  -- "B liked your post" stops being a true statement the moment B un-likes it.
  delete from public.likes where post_id = post_a and user_id = b;
  select count(*) into n from public.notifications where user_id = a and type = 'like';
  perform pg_temp.expect('likes: un-liking removes the notification (rows ' || n || ')', n = 0, true);

  insert into public.likes (post_id, user_id) values (post_a, b);
  delete from public.likes where post_id = post_a and user_id = b;
  insert into public.likes (post_id, user_id) values (post_a, b);
  select count(*) into n from public.notifications where user_id = a and type = 'like';
  perform pg_temp.expect('likes: like/unlike/like leaves one row, not three (rows ' || n || ')', n = 1, true);

  -- The on-conflict-do-update branch. The likes table's own key prevents a second
  -- insert there, so this reaches push_notification the way the trigger does. Worth
  -- proving on its own: inferring a *partial* unique index requires repeating the
  -- index predicate in the on conflict clause, and getting that wrong is a run-time
  -- error, not a compile-time one.
  update public.notifications set read_at = now() where user_id = a and type = 'like';
  perform public.push_notification(a, b, 'like', target_post => post_a);

  select count(*) into n from public.notifications where user_id = a and type = 'like';
  perform pg_temp.expect('likes: a repeat bumps the existing row (rows ' || n || ')', n = 1, true);

  select read_at is null into unread from public.notifications where user_id = a and type = 'like';
  perform pg_temp.expect('likes: a repeat marks the row unread again', unread, true);
end $$;

delete from public.likes where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 2: comments
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  post_a uuid := '0d5f0002-0000-4000-8000-0000000000f1';
  c1 uuid := '0d5f0002-0000-4000-8000-0000000000c1';
  c2 uuid := '0d5f0002-0000-4000-8000-0000000000c2';
  n integer;
  row_ok boolean;
  preview_length integer;
begin
  insert into public.comments (id, post_id, user_id, content, created_at)
  values
    (c1, post_a, b, 'first thing said', now()),
    (c2, post_a, b, repeat('x', 250), now());

  -- No unique index on comments, deliberately: each comment is a distinct thing
  -- somebody said and deserves its own row.
  select count(*) into n from public.notifications where user_id = a and type = 'comment';
  perform pg_temp.expect('comments: one row per comment, not per commenter (rows ' || n || ')', n = 2, true);

  select exists (
    select 1 from public.notifications
    where user_id = a and actor_id = b and type = 'comment'
      and comment_id = c1 and post_id = post_a and preview = 'first thing said'
  ) into row_ok;
  perform pg_temp.expect('comments: the row carries its own comment id and text', row_ok, true);

  -- The Activity row reads the comment out loud, so the preview has to be bounded
  -- somewhere. The trigger cuts at 200; the column check would refuse over 280.
  select char_length(preview) into preview_length
  from public.notifications where comment_id = c2;
  perform pg_temp.expect(
    'comments: a long comment is truncated to 200 chars (got ' || coalesce(preview_length::text, 'null') || ')',
    preview_length = 200, true);
end $$;

delete from public.comments where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 3: follows
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  n integer;
  row_ok boolean;
begin
  insert into public.follows (follower_id, following_id) values (b, a);

  select count(*) into n from public.notifications
  where user_id = a and actor_id = b and type = 'follow';
  perform pg_temp.expect('follows: a follow notifies the person followed (rows ' || n || ')', n = 1, true);

  select exists (
    select 1 from public.notifications
    where user_id = a and actor_id = b and type = 'follow'
      and post_id is null and comment_id is null and story_id is null
  ) into row_ok;
  perform pg_temp.expect('follows: the row points at no post, comment or story', row_ok, true);

  delete from public.follows where follower_id = b and following_id = a;
  select count(*) into n from public.notifications where user_id = a and type = 'follow';
  perform pg_temp.expect('follows: unfollowing removes the notification (rows ' || n || ')', n = 0, true);
end $$;

delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 4: story reactions
-- ---------------------------------------------------------------------------
-- The only event here whose row is genuinely updated in place: set_story_reaction
-- swaps an existing reaction's emoji through on conflict do update rather than
-- inserting a second one, so the update trigger is the real dedup path.
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  story_a uuid := '0d5f0002-0000-4000-8000-0000000000e1';
  fire text := chr(128293);
  party text := chr(127881);
  n integer;
  row_ok boolean;
  still_read boolean;
  unread boolean;
  current_preview text;
begin
  insert into public.story_reactions (story_id, user_id, emoji) values (story_a, b, fire);

  select count(*) into n from public.notifications
  where user_id = a and actor_id = b and type = 'story_reaction';
  perform pg_temp.expect('stories: a reaction notifies the story author (rows ' || n || ')', n = 1, true);

  select exists (
    select 1 from public.notifications
    where user_id = a and type = 'story_reaction' and story_id = story_a
      and preview = fire and post_id is null
  ) into row_ok;
  perform pg_temp.expect('stories: the row carries the story and the emoji', row_ok, true);

  update public.notifications set read_at = now() where user_id = a;

  -- An update that leaves the emoji alone must not resurface the notification. That
  -- is what `when (old.emoji is distinct from new.emoji)` is for, and without it
  -- every touch of the row would re-alert the author.
  update public.story_reactions set created_at = created_at
  where story_id = story_a and user_id = b;
  select read_at is not null into still_read from public.notifications where user_id = a;
  perform pg_temp.expect('stories: an update that does not change the emoji does not re-alert', still_read, true);

  update public.story_reactions set emoji = party where story_id = story_a and user_id = b;

  select count(*) into n from public.notifications where user_id = a and type = 'story_reaction';
  perform pg_temp.expect('stories: swapping the emoji updates one row (rows ' || n || ')', n = 1, true);

  select preview, read_at is null into current_preview, unread
  from public.notifications where user_id = a and type = 'story_reaction';
  perform pg_temp.expect('stories: the swapped emoji replaces the old preview', current_preview = party, true);
  perform pg_temp.expect('stories: the swap marks the row unread again', unread, true);

  delete from public.story_reactions where story_id = story_a and user_id = b;
  select count(*) into n from public.notifications where user_id = a and type = 'story_reaction';
  perform pg_temp.expect('stories: clearing the reaction removes the notification (rows ' || n || ')', n = 0, true);
end $$;

delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 5: nobody is told about their own actions
-- ---------------------------------------------------------------------------
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  post_a uuid := '0d5f0002-0000-4000-8000-0000000000f1';
  c_self uuid := '0d5f0002-0000-4000-8000-0000000000c9';
  n integer;
  refused boolean := false;
  refused_long boolean := false;
  other_error text;
begin
  insert into public.likes (post_id, user_id) values (post_a, a);
  insert into public.comments (id, post_id, user_id, content, created_at)
  values (c_self, post_a, a, 'talking to myself', now());

  select count(*) into n from public.notifications where user_id = a;
  perform pg_temp.expect('self: liking and commenting on your own post tells you nothing (rows ' || n || ')', n = 0, true);

  -- The function gate above is the one the app hits. The table constraint is the
  -- backstop for anything that ever reaches the table another way.
  begin
    insert into public.notifications (user_id, actor_id, type) values (a, a, 'follow');
  exception
    when check_violation then refused := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('self: the table itself refuses a self-notification', refused, true);
  if other_error is not null then
    perform pg_temp.skip('self-notification raised something other than a check violation: ' || other_error);
  end if;

  -- preview is what the UI prints into the row; the column check bounds it.
  other_error := null;
  begin
    insert into public.notifications (user_id, actor_id, type, preview)
    values (a, '0d5f0002-0000-4000-8000-00000000000b', 'comment', repeat('y', 300));
  exception
    when check_violation then refused_long := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('self: a preview over 280 chars is refused', refused_long, true);
  if other_error is not null then
    perform pg_temp.skip('oversized preview raised something other than a check violation: ' || other_error);
  end if;
end $$;

delete from public.likes where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.comments where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.follows where follower_id = '0d5f0002-0000-4000-8000-00000000000a';
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 6: THE central assertion - there is no client write path
-- ---------------------------------------------------------------------------
-- Everything above proves the triggers write correct rows. None of it says anything
-- about whether a client can write its own. A working trigger sitting on top of the
-- INSERT privilege Supabase grants new public tables by default would pass every
-- check in blocks 1 to 5 and still let anyone fabricate "247 people liked your post"
-- in a stranger's Activity feed.
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  c uuid := '0d5f0002-0000-4000-8000-00000000000c';
  refused_own boolean := false;
  refused_forged boolean := false;
  refused_third boolean := false;
  other_error text;
  rls_on boolean;
  has_insert boolean;
  insert_policies integer;
  can_update_read_at boolean;
  can_update_preview boolean;
  can_update_user_id boolean;
begin
  -- Inserting a notification into your own feed.
  begin
    perform pg_temp.act_as(b);
    set local role authenticated;
    insert into public.notifications (user_id, actor_id, type) values (b, a, 'follow');
    reset role;
  exception
    when insufficient_privilege then refused_own := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('GRANTS: a client cannot insert a notification for itself', refused_own, true);
  if other_error is not null then
    perform pg_temp.skip('self-insert raised something other than a privilege error: ' || other_error);
  end if;

  -- Forging one into somebody else's feed - the attack the design is built against.
  other_error := null;
  begin
    perform pg_temp.act_as(b);
    set local role authenticated;
    insert into public.notifications (user_id, actor_id, type) values (a, b, 'follow');
    reset role;
  exception
    when insufficient_privilege then refused_forged := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('GRANTS: a client cannot forge a notification into another feed', refused_forged, true);
  if other_error is not null then
    perform pg_temp.skip('forged insert raised something other than a privilege error: ' || other_error);
  end if;

  -- And an uninvolved third party fares no better.
  other_error := null;
  begin
    perform pg_temp.act_as(c);
    set local role authenticated;
    insert into public.notifications (user_id, actor_id, type) values (a, c, 'like');
    reset role;
  exception
    when insufficient_privilege then refused_third := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('GRANTS: an uninvolved user cannot insert either', refused_third, true);
  if other_error is not null then
    perform pg_temp.skip('third-party insert raised something other than a privilege error: ' || other_error);
  end if;

  -- The same property read straight out of the catalog. Behaviour and catalog can
  -- disagree - a future grant plus a permissive policy would flip these first, and
  -- this is where that shows up as a named failure instead of a subtle one.
  select relrowsecurity into rls_on from pg_class where oid = 'public.notifications'::regclass;
  perform pg_temp.expect('CATALOG: row level security is enabled on notifications', rls_on, true);

  select has_table_privilege('authenticated', 'public.notifications', 'INSERT') into has_insert;
  perform pg_temp.expect('CATALOG: authenticated has no INSERT privilege', has_insert, false);

  select count(*) into insert_policies
  from pg_policies where schemaname = 'public' and tablename = 'notifications' and cmd = 'INSERT';
  perform pg_temp.expect('CATALOG: there is no INSERT policy at all (found ' || insert_policies || ')',
    insert_policies = 0, true);

  -- Column-level update is the difference between "I can mark this read" and "I can
  -- rewrite what this notification says".
  select has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE')
    into can_update_read_at;
  perform pg_temp.expect('CATALOG: authenticated may update read_at', can_update_read_at, true);

  select has_column_privilege('authenticated', 'public.notifications', 'preview', 'UPDATE')
    into can_update_preview;
  perform pg_temp.expect('CATALOG: authenticated may not update preview', can_update_preview, false);

  select has_column_privilege('authenticated', 'public.notifications', 'user_id', 'UPDATE')
    into can_update_user_id;
  perform pg_temp.expect('CATALOG: authenticated may not update user_id', can_update_user_id, false);
end $$;

-- anon gets nothing whatsoever. Signed-out readers of the app never touch this table.
do $$
declare
  reachable boolean;
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    perform pg_temp.skip('CATALOG: no anon role in this database, skipping its privilege check');
    return;
  end if;
  select has_table_privilege('anon', 'public.notifications', 'SELECT')
      or has_table_privilege('anon', 'public.notifications', 'INSERT')
      or has_table_privilege('anon', 'public.notifications', 'UPDATE')
      or has_table_privilege('anon', 'public.notifications', 'DELETE')
    into reachable;
  perform pg_temp.expect('CATALOG: anon has no privilege on notifications at all', reachable, false);
end $$;

delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 7: what a client can and cannot do to a row it can see
-- ---------------------------------------------------------------------------
insert into public.likes (post_id, user_id)
values ('0d5f0002-0000-4000-8000-0000000000f1', '0d5f0002-0000-4000-8000-00000000000b');

do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  target uuid;
  affected integer;
  marked boolean := false;
  refused_preview boolean := false;
  refused_owner boolean := false;
  other_error text;
  b_sees integer;
begin
  select id into target from public.notifications where user_id = a limit 1;
  if target is null then
    perform pg_temp.skip('RLS: no notification to test against - block 7 could not run');
    return;
  end if;

  -- The recipient marking their own row read: the one write a client is allowed.
  begin
    perform pg_temp.act_as(a);
    set local role authenticated;
    update public.notifications set read_at = now() where id = target;
    get diagnostics affected = row_count;
    reset role;
    marked := affected = 1;
  exception when others then
    other_error := sqlerrm;
  end;
  perform pg_temp.expect('RLS: the recipient can mark its own notification read', marked, true);
  if other_error is not null then
    perform pg_temp.skip('marking read was refused: ' || other_error);
  end if;

  -- Rewriting what the row says is a different thing, and is refused by the grant
  -- rather than by the policy.
  other_error := null;
  begin
    perform pg_temp.act_as(a);
    set local role authenticated;
    update public.notifications set preview = 'something I made up' where id = target;
    reset role;
  exception
    when insufficient_privilege then refused_preview := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('RLS: even the recipient cannot rewrite preview', refused_preview, true);
  if other_error is not null then
    perform pg_temp.skip('preview update raised something other than a privilege error: ' || other_error);
  end if;

  other_error := null;
  begin
    perform pg_temp.act_as(a);
    set local role authenticated;
    update public.notifications set user_id = b where id = target;
    reset role;
  exception
    when insufficient_privilege then refused_owner := true;
    when others then other_error := sqlerrm;
  end;
  perform pg_temp.expect('RLS: a notification cannot be handed to another user', refused_owner, true);
  if other_error is not null then
    perform pg_temp.skip('user_id update raised something other than a privilege error: ' || other_error);
  end if;

  -- B is the actor. B is not the recipient, so as far as B is concerned this row
  -- does not exist - not to read, not to mark read, not to delete.
  perform pg_temp.act_as(b);
  set local role authenticated;
  select count(*) into b_sees from public.notifications;
  reset role;
  perform pg_temp.expect('RLS: the actor cannot see the notification it caused (rows ' || b_sees || ')',
    b_sees = 0, true);

  perform pg_temp.act_as(b);
  set local role authenticated;
  update public.notifications set read_at = now() where id = target;
  get diagnostics affected = row_count;
  reset role;
  perform pg_temp.expect('RLS: a stranger marking your notification read affects nothing (rows ' || affected || ')',
    affected = 0, true);

  perform pg_temp.act_as(b);
  set local role authenticated;
  delete from public.notifications where id = target;
  get diagnostics affected = row_count;
  reset role;
  perform pg_temp.expect('RLS: a stranger cannot dismiss your notification (rows ' || affected || ')',
    affected = 0, true);

  -- Dismiss, which is what the X on the Activity row does.
  perform pg_temp.act_as(a);
  set local role authenticated;
  delete from public.notifications where id = target;
  get diagnostics affected = row_count;
  reset role;
  perform pg_temp.expect('RLS: the recipient can dismiss its own notification (rows ' || affected || ')',
    affected = 1, true);
end $$;

delete from public.likes where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 8: mutes and blocks are applied when the row is written
-- ---------------------------------------------------------------------------
-- Suppressing at write time rather than read time is what makes mute mean mute:
-- unmuting later does not deliver a backlog of everything that was missed.
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  post_a uuid := '0d5f0002-0000-4000-8000-0000000000f1';
  post_b uuid := '0d5f0002-0000-4000-8000-0000000000f2';
  n integer;
begin
  insert into public.user_mutes (muter_id, muted_id) values (a, b);
  insert into public.likes (post_id, user_id) values (post_a, b);

  select count(*) into n from public.notifications where user_id = a;
  perform pg_temp.expect('mute: a muted actor writes no notification (rows ' || n || ')', n = 0, true);

  delete from public.likes where post_id = post_a and user_id = b;
  delete from public.user_mutes where muter_id = a and muted_id = b;

  -- Two rows, one in each direction, so the block cleanup has something to do on
  -- both sides rather than only the obvious one.
  insert into public.likes (post_id, user_id) values (post_a, b);
  insert into public.likes (post_id, user_id) values (post_b, a);
  select count(*) into n from public.notifications
  where (user_id = a and actor_id = b) or (user_id = b and actor_id = a);
  perform pg_temp.expect('block: two rows exist before the block (rows ' || n || ')', n = 2, true);

  insert into public.user_blocks (blocker_id, blocked_id) values (a, b);
  select count(*) into n from public.notifications
  where (user_id = a and actor_id = b) or (user_id = b and actor_id = a);
  perform pg_temp.expect('block: blocking wipes the history both ways (rows ' || n || ')', n = 0, true);

  -- And nothing new arrives while the block stands.
  delete from public.likes where post_id = post_a and user_id = b;
  insert into public.likes (post_id, user_id) values (post_a, b);
  select count(*) into n from public.notifications where user_id = a and actor_id = b;
  perform pg_temp.expect('block: a blocked actor writes no notification (rows ' || n || ')', n = 0, true);

  delete from public.user_blocks where blocker_id = a and blocked_id = b;

  -- is_blocked_between is symmetric, and the name is the only thing saying so.
  delete from public.likes where post_id = post_a and user_id = b;
  insert into public.user_blocks (blocker_id, blocked_id) values (b, a);
  insert into public.likes (post_id, user_id) values (post_a, b);
  select count(*) into n from public.notifications where user_id = a and actor_id = b;
  perform pg_temp.expect('block: being blocked BY the actor suppresses it too (rows ' || n || ')', n = 0, true);

  delete from public.user_blocks where blocker_id = b and blocked_id = a;
end $$;

delete from public.likes where post_id in (
  '0d5f0002-0000-4000-8000-0000000000f1', '0d5f0002-0000-4000-8000-0000000000f2');
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 9: the read paths
-- ---------------------------------------------------------------------------
-- A mixed history for A: a like and a comment from B, a follow from B, a follow
-- from C. Four rows, three types, two actors.
insert into public.likes (post_id, user_id)
values ('0d5f0002-0000-4000-8000-0000000000f1', '0d5f0002-0000-4000-8000-00000000000b');
insert into public.comments (id, post_id, user_id, content, created_at)
values ('0d5f0002-0000-4000-8000-0000000000c1', '0d5f0002-0000-4000-8000-0000000000f1',
        '0d5f0002-0000-4000-8000-00000000000b', 'a comment to page through', now());
insert into public.follows (follower_id, following_id)
values ('0d5f0002-0000-4000-8000-00000000000b', '0d5f0002-0000-4000-8000-00000000000a'),
       ('0d5f0002-0000-4000-8000-00000000000c', '0d5f0002-0000-4000-8000-00000000000a');

-- now() is fixed for the whole transaction, so every row the triggers just wrote
-- shares a created_at and the cursor would have nothing to cut on. Spread them by
-- hand, as the owner, before testing pagination.
update public.notifications n
set created_at = now() - (interval '1 minute' * s.rn)
from (
  select id, row_number() over (order by type, actor_id) as rn
  from public.notifications
  where user_id = '0d5f0002-0000-4000-8000-00000000000a'
) s
where n.id = s.id;

do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  post_a uuid := '0d5f0002-0000-4000-8000-0000000000f1';
  total integer;
  b_total integer;
  comments_only integer;
  wrong_type integer;
  first_page integer;
  after_cursor integer;
  newest timestamptz;
  first_created timestamptz;
  joined_ok boolean;
  unread_a bigint;
  unread_b bigint;
  marked integer;
  one_id uuid;
begin
  perform pg_temp.act_as(a);

  select count(*) into total from public.get_notifications() g;
  perform pg_temp.expect('get_notifications: returns the whole history (rows ' || total || ')', total = 4, true);

  -- The RPC is security definer, so the filter inside it is the only thing keeping
  -- one user out of another's feed.
  perform pg_temp.act_as(b);
  select count(*) into b_total from public.get_notifications() g;
  perform pg_temp.expect('get_notifications: another user sees none of it (rows ' || b_total || ')',
    b_total = 0, true);

  perform pg_temp.act_as(a);

  -- The chips filter in the database. Filtering the loaded page client-side would
  -- show an empty "comments" tab whenever the newest page happened to be all likes.
  select count(*) into comments_only
  from public.get_notifications(type_filter => array['comment']) g;
  perform pg_temp.expect('get_notifications: type_filter narrows to one type (rows ' || comments_only || ')',
    comments_only = 1, true);

  select count(*) into wrong_type
  from public.get_notifications(type_filter => array['comment']) g
  where g.type <> 'comment';
  perform pg_temp.expect('get_notifications: type_filter lets nothing else through', wrong_type = 0, true);

  select count(*) into first_page from public.get_notifications(page_size => 1) g;
  perform pg_temp.expect('get_notifications: page_size is honoured (rows ' || first_page || ')',
    first_page = 1, true);

  select max(g.created_at) into newest from public.get_notifications() g;
  select count(*) into after_cursor from public.get_notifications(before_cursor => newest) g;
  perform pg_temp.expect('get_notifications: the cursor excludes the row it points at (rows ' || after_cursor || ')',
    after_cursor = 3, true);

  -- Newest first. Asserted through page_size rather than by walking the result set,
  -- because "the first page holds the newest row" is the property the Activity list
  -- actually depends on.
  select g.created_at into first_created from public.get_notifications(page_size => 1) g;
  perform pg_temp.expect('get_notifications: the first page starts with the newest row',
    first_created = newest, true);

  -- The joins the Activity row is built out of: the actor's profile, and the post's
  -- own media and text.
  select exists (
    select 1 from public.get_notifications() g
    where g.type = 'like' and g.actor_id = b
      and g.actor_username = 'notiffx_b'
      and g.actor_full_name = 'Notif Fx B'
      and g.post_media_url = 'https://example.invalid/notiffx-a.jpg'
      and g.post_excerpt = 'A post by A that other people react to'
  ) into joined_ok;
  perform pg_temp.expect('get_notifications: the row carries the actor and the post it is about',
    joined_ok, true);

  -- The badge.
  select public.get_unread_notification_count() into unread_a;
  perform pg_temp.expect('unread count: everything starts unread (got ' || unread_a || ')',
    unread_a = 4, true);

  perform pg_temp.act_as(b);
  select public.get_unread_notification_count() into unread_b;
  perform pg_temp.expect('unread count: zero for someone with no notifications (got ' || unread_b || ')',
    unread_b = 0, true);

  -- Mark-all from the wrong account must not clear somebody else's badge.
  select public.mark_notifications_read() into marked;
  perform pg_temp.expect('mark read: marks nothing for a user with no rows (got ' || marked || ')',
    marked = 0, true);

  perform pg_temp.act_as(a);
  select public.get_unread_notification_count() into unread_a;
  perform pg_temp.expect('mark read: another user''s mark-all left this feed alone (got ' || unread_a || ')',
    unread_a = 4, true);

  -- One row, which is what tapping a single Activity row does.
  select g.id into one_id from public.get_notifications(type_filter => array['comment']) g limit 1;
  select public.mark_notifications_read(array[one_id]) into marked;
  perform pg_temp.expect('mark read: an id list marks exactly one (got ' || marked || ')', marked = 1, true);
  select public.get_unread_notification_count() into unread_a;
  perform pg_temp.expect('mark read: the badge drops by one (got ' || unread_a || ')', unread_a = 3, true);

  select public.mark_notifications_read() into marked;
  perform pg_temp.expect('mark read: no argument marks the rest (got ' || marked || ')', marked = 3, true);
  select public.get_unread_notification_count() into unread_a;
  perform pg_temp.expect('mark read: the badge is clear (got ' || unread_a || ')', unread_a = 0, true);

  -- Mark all as read is a button a reader can press twice.
  select public.mark_notifications_read() into marked;
  perform pg_temp.expect('mark read: a second mark-all is a no-op (got ' || marked || ')', marked = 0, true);
end $$;

delete from public.likes where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.comments where post_id = '0d5f0002-0000-4000-8000-0000000000f1';
delete from public.follows where following_id = '0d5f0002-0000-4000-8000-00000000000a';
delete from public.notifications;

-- ---------------------------------------------------------------------------
-- Block 10: nothing outlives what it points at
-- ---------------------------------------------------------------------------
-- A notification whose post or comment is gone is a row the Activity page cannot
-- render and cannot open. Every target column cascades for that reason.
do $$
declare
  a uuid := '0d5f0002-0000-4000-8000-00000000000a';
  b uuid := '0d5f0002-0000-4000-8000-00000000000b';
  post_x uuid := '0d5f0002-0000-4000-8000-0000000000f3';
  c4 uuid := '0d5f0002-0000-4000-8000-0000000000c4';
  n integer;
  delete_error text;
begin
  insert into public.likes (post_id, user_id) values (post_x, b);
  insert into public.comments (id, post_id, user_id, content, created_at)
  values (c4, post_x, b, 'a comment on the doomed post', now());

  select count(*) into n from public.notifications where user_id = a and post_id = post_x;
  perform pg_temp.expect('cascade: two notifications exist to begin with (rows ' || n || ')', n = 2, true);

  -- There is no delete trigger on comments: notifications.comment_id cascades, and
  -- this is the assertion that says so out loud.
  delete from public.comments where id = c4;
  select count(*) into n from public.notifications where comment_id = c4;
  perform pg_temp.expect('cascade: deleting the comment removes its notification (rows ' || n || ')',
    n = 0, true);

  -- The base tables predate this migrations directory, so whether posts cascade to
  -- likes and comments is not something this repo defines. If the delete is refused,
  -- that is a fact about the base schema, not a defect here - hence a skip rather
  -- than a failure, and the assertion still runs on whatever did happen.
  begin
    delete from public.posts where id = post_x;
  exception when others then
    delete_error := sqlerrm;
  end;

  if delete_error is not null then
    perform pg_temp.skip('cascade: the fixture post could not be deleted (' || delete_error || ')');
  else
    select count(*) into n from public.notifications where post_id = post_x;
    perform pg_temp.expect('cascade: deleting the post takes its notifications with it (rows ' || n || ')',
      n = 0, true);
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
       null::boolean as expected,
       null::boolean as actual
from notif_results
union all
select seq, status, label, expected, actual
from notif_results
order by seq;

rollback;
