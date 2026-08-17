-- Korusa story reactions and replies.
--
-- Reactions live in their own table, deliberately NOT in messages: a reaction must
-- not count as "having messaged" in can_view_user_stories, or a single emoji tap
-- would start earning story access.
--
-- Replies are private direct messages to the author (the Instagram model), so they
-- reuse the existing conversations/messages stack and land in the real inbox with
-- real unread counts and realtime.
--
-- Run after 20260815_stories.sql. Asserted by supabase/tests/story_interactions_test.sql.

-- Reactions ---------------------------------------------------------------------
-- Primary key is (story_id, user_id), NOT (story_id, user_id, emoji) as
-- message_reactions uses. One reaction per person per story, replaceable: because
-- only the author sees the totals, letting one viewer contribute three emojis would
-- make the tally exceed the view count and read as broken.
create table if not exists public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists story_reactions_story_idx on public.story_reactions(story_id);

alter table public.story_reactions enable row level security;

-- The audience test belongs in the policy, not only in the RPC below: without it a
-- client could reach this table straight through PostgREST and react to a story it
-- was never allowed to see. Same shape as the story_views insert policy.
drop policy if exists "Audience reacts to stories" on public.story_reactions;
create policy "Audience reacts to stories" on public.story_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id and public.can_view_user_stories(s.user_id)
  )
);

drop policy if exists "Users change their own reaction" on public.story_reactions;
create policy "Users change their own reaction" on public.story_reactions for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id and public.can_view_user_stories(s.user_id)
  )
);

drop policy if exists "Users remove their own reaction" on public.story_reactions;
create policy "Users remove their own reaction" on public.story_reactions for delete to authenticated
using (user_id = auth.uid());

-- Mirrors the story_views select policy exactly, and this is what makes counts
-- author-only: you can read your own reaction, the author can read all of them,
-- nobody else can read any.
drop policy if exists "Authors and reactors read reactions" on public.story_reactions;
create policy "Authors and reactors read reactions" on public.story_reactions for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.stories s
    where s.id = story_id and s.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.story_reactions to authenticated;

-- Set, replace or clear the caller's reaction. Returns the emoji now in effect, or
-- null once cleared, so the client renders the server's answer instead of guessing
-- and a rejected write cannot leave the picker lit.
create or replace function public.set_story_reaction(
  target_story_id uuid,
  reaction_emoji text
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
  trimmed text := btrim(coalesce(reaction_emoji, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if trimmed = '' or char_length(trimmed) > 16 then
    raise exception 'Choose a reaction';
  end if;

  select user_id into author from public.stories
  where id = target_story_id and expires_at > now();

  if author is null or not public.can_view_user_stories(author) then
    raise exception 'Story not found';
  end if;

  -- Your own story shows you the totals; reacting to it would count you in them.
  if author = auth.uid() then
    raise exception 'You cannot react to your own story';
  end if;

  -- Tapping the emoji already in effect clears it.
  if exists (
    select 1 from public.story_reactions
    where story_id = target_story_id and user_id = auth.uid() and emoji = trimmed
  ) then
    delete from public.story_reactions
    where story_id = target_story_id and user_id = auth.uid();
    return null;
  end if;

  insert into public.story_reactions (story_id, user_id, emoji)
  values (target_story_id, auth.uid(), trimmed)
  on conflict (story_id, user_id)
    do update set emoji = excluded.emoji, created_at = now();

  return trimmed;
end;
$$;
revoke all on function public.set_story_reaction(uuid, text) from public;
grant execute on function public.set_story_reaction(uuid, text) to authenticated;

-- The author's live totals for one story. get_story_feed's counts are a snapshot
-- taken when the rail loaded, so they still read 0 for a story watched a moment
-- later. Returns NO ROW for anyone but the author, which is the privacy boundary.
create or replace function public.get_story_insights(target_story_id uuid)
returns table (
  view_count bigint,
  reaction_count bigint
)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from public.story_views v where v.story_id = target_story_id),
    (select count(*) from public.story_reactions r where r.story_id = target_story_id)
  where exists (
    select 1 from public.stories s
    where s.id = target_story_id and s.user_id = auth.uid()
  );
$$;
revoke all on function public.get_story_insights(uuid) from public;
grant execute on function public.get_story_insights(uuid) to authenticated;

-- Story feed, now carrying the caller's own reaction and the author-only total.
-- Dropped rather than replaced: create or replace cannot change a function's OUT
-- columns. Same approach 20260810_messaging_finalization.sql takes for
-- get_my_conversations.
drop function if exists public.get_story_feed();
create function public.get_story_feed()
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  media_path text,
  media_type text,
  caption text,
  duration_ms integer,
  created_at timestamptz,
  expires_at timestamptz,
  viewed_by_me boolean,
  view_count bigint,
  my_reaction text,
  reaction_count bigint
)
language sql stable security definer set search_path = public
as $$
  select
    s.id,
    s.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    s.media_path,
    s.media_type,
    s.caption,
    s.duration_ms,
    s.created_at,
    s.expires_at,
    exists (
      select 1 from public.story_views v
      where v.story_id = s.id and v.viewer_id = auth.uid()
    ) as viewed_by_me,
    -- Only the author gets a real view count; everyone else sees 0.
    case
      when s.user_id = auth.uid()
        then (select count(*) from public.story_views v where v.story_id = s.id)
      else 0::bigint
    end as view_count,
    -- Always the caller's own, so it needs no gating.
    (
      select r.emoji from public.story_reactions r
      where r.story_id = s.id and r.user_id = auth.uid()
    ) as my_reaction,
    -- Gated exactly like view_count: a viewer never learns how popular someone
    -- else's story is.
    case
      when s.user_id = auth.uid()
        then (select count(*) from public.story_reactions r where r.story_id = s.id)
      else 0::bigint
    end as reaction_count
  from public.stories s
  join public.profiles p on p.id = s.user_id
  where s.expires_at > now()
    and public.can_view_user_stories(s.user_id)
  order by s.user_id, s.created_at asc;
$$;
revoke all on function public.get_story_feed() from public;
grant execute on function public.get_story_feed() to authenticated;

-- Viewer list, now with each person's reaction beside their view. Built from the
-- union of both tables rather than story_views alone, so a reaction can never be
-- silently dropped from the list if its view row is somehow missing.
drop function if exists public.get_story_viewers(uuid);
create function public.get_story_viewers(target_story_id uuid)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  viewed_at timestamptz,
  reaction text
)
language sql stable security definer set search_path = public
as $$
  with people as (
    select v.viewer_id as person_id from public.story_views v where v.story_id = target_story_id
    union
    select r.user_id as person_id from public.story_reactions r where r.story_id = target_story_id
  )
  select p.id, p.username, p.full_name, p.avatar_url, v.viewed_at, r.emoji
  from people
  join public.profiles p on p.id = people.person_id
  left join public.story_views v
    on v.story_id = target_story_id and v.viewer_id = people.person_id
  left join public.story_reactions r
    on r.story_id = target_story_id and r.user_id = people.person_id
  where exists (
    select 1 from public.stories s
    where s.id = target_story_id and s.user_id = auth.uid()
  )
  -- People who reacted first, then the rest newest-first.
  order by (r.emoji is null), v.viewed_at desc nulls last;
$$;
revoke all on function public.get_story_viewers(uuid) from public;
grant execute on function public.get_story_viewers(uuid) to authenticated;

-- Replies ----------------------------------------------------------------------
-- A story reply is a real direct message, so the whole messaging stack (inbox,
-- unread counts, realtime, read receipts) carries it for free. The list below is
-- the one from 20260726_rich_messaging.sql with 'story_reply' added.
--
-- Consequence worth stating: can_view_user_stories counts any message with
-- deleted_at is null and message_type <> 'system', so a story reply IS a real
-- message for audience purposes. If B replies to A's story and A answers, the two
-- now have an answered conversation and B keeps story access even after
-- unfollowing. That is coherent - they are conversing - but it is a decision, not
-- an accident.
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check (
  message_type in (
    'text', 'image', 'video', 'voice', 'file', 'location', 'post', 'course',
    'gif', 'sticker', 'poll', 'event', 'announcement', 'system',
    'study_session', 'study_room', 'whiteboard', 'consultation', 'progress',
    'quiz', 'mentor_booking', 'voice_room', 'tip', 'story_reply'
  )
);

-- Sends a story reply as a direct message and returns the new message id.
create or replace function public.send_story_reply(
  target_story_id uuid,
  reply_body text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
  story public.stories;
  conversation uuid;
  key_value text;
  message_id uuid;
  content text := btrim(coalesce(reply_body, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if content = '' then raise exception 'Reply cannot be empty'; end if;
  if char_length(content) > 4000 then raise exception 'Reply is too long'; end if;

  select * into story from public.stories
  where id = target_story_id and expires_at > now();

  if story.id is null then raise exception 'Story not found'; end if;
  author := story.user_id;

  -- The story audience gate, which is what brings is_blocked_between into this
  -- path. The messages insert policy is the permissive
  -- "sender_id = auth.uid() and is_conversation_member(...)" in
  -- 20260725_messaging.sql, and this function is security definer, so without this
  -- check a story reply would be a way to message someone who blocked you.
  if not public.can_view_user_stories(author) then
    raise exception 'Story not found';
  end if;

  if author = auth.uid() then
    raise exception 'You cannot reply to your own story';
  end if;

  -- The conversation is resolved here rather than through
  -- get_or_create_direct_conversation because that function has two competing
  -- definitions in this repo - 20260725_friend_messaging.sql refuses non-friends,
  -- 20260725_messaging.sql does not - and which one is live depends on the order
  -- they were applied in. A story reply has to work for a follower who is
  -- legitimately in the audience but is not yet a friend, so this does the same
  -- idempotent upsert without betting on which variant won.
  key_value := least(auth.uid()::text, author::text) || ':' || greatest(auth.uid()::text, author::text);

  insert into public.conversations (kind, direct_key, created_by)
  values ('direct', key_value, auth.uid())
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into conversation;

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation, auth.uid()), (conversation, author)
  on conflict do nothing;

  -- The app's own turn rule, defined once in 20260726_profile_social_controls.sql:
  -- friends may always send, everyone else may send only when the last message was
  -- not theirs. Enforced here so stories cannot become a way around a limit the
  -- inbox already shows users. Checked after the membership insert because the
  -- function requires the caller to be a member. Raising rolls back the
  -- conversation created above along with everything else in this transaction.
  if not public.can_message_conversation(conversation) then
    raise exception 'Waiting for a reply';
  end if;

  insert into public.messages (conversation_id, sender_id, body, message_type, metadata)
  values (
    conversation,
    auth.uid(),
    content,
    'story_reply',
    -- The media PATH, never a URL: the thread signs it on read so the object stays
    -- audience-scoped, the same discipline stories.media_path and messages.media_url
    -- already follow.
    jsonb_build_object(
      'story_id', story.id,
      'story_media_path', story.media_path,
      'story_media_type', story.media_type,
      'story_caption', story.caption
    )
  )
  returning id into message_id;

  return message_id;
end;
$$;
revoke all on function public.send_story_reply(uuid, text) from public;
grant execute on function public.send_story_reply(uuid, text) to authenticated;

-- story_reactions is deliberately NOT enrolled in supabase_realtime. Replies
-- already arrive live because they are rows in public.messages, which is enrolled.
-- Reaction totals refresh per slide and on opening the viewer panel; a live
-- counter would need a subscription plus dedup logic in the viewer for the narrow
-- case of an author watching their own story at the moment someone reacts.
