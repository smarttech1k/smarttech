-- Real notifications.
--
-- The Activity page was mock data end to end, so nothing collected the events that
-- already happen - likes, comments, follows, story reactions - into something the
-- recipient could look at. This adds the table those events land in, the triggers
-- that write it, and the read paths the UI needs.
--
-- The security property this file is built around: `authenticated` has NO insert
-- privilege and there is NO insert policy on public.notifications. Rows appear only
-- through the `security definer` trigger functions below, which run as the table
-- owner. That is what makes it impossible to fabricate a notification in somebody
-- else's list - there is no client-reachable write path to forge one through.
--
-- posts / likes / comments / follows predate this migrations directory, so their
-- column names here come from client usage (src/lib/feed.ts, src/lib/social.ts) and
-- from get_recent_comments in 20260815_stories.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who is being told.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Who did the thing.
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'story_reaction')),
  -- Every target cascades, so a deleted post or an expired story cannot leave a
  -- notification pointing at nothing. The comment_id cascade is also what removes a
  -- comment notification when the comment itself is deleted - no trigger needed.
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  -- The content that makes the row readable on its own: a comment's text, a
  -- reaction's emoji. Sized like stories.caption.
  preview text check (preview is null or char_length(preview) <= 280),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- The app never reports your own actions back to you.
  check (user_id <> actor_id)
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
-- Drives the unread badge, which is read on every realtime event.
create index if not exists notifications_unread_idx
  on public.notifications(user_id) where read_at is null;

-- Dedup for the events that can repeat. Like/unlike/like again bumps one row to the
-- top instead of stacking three. Comments deliberately have no unique index: each
-- comment is a distinct thing somebody said.
create unique index if not exists notifications_like_uniq
  on public.notifications(user_id, actor_id, post_id) where type = 'like';
create unique index if not exists notifications_follow_uniq
  on public.notifications(user_id, actor_id) where type = 'follow';
create unique index if not exists notifications_story_reaction_uniq
  on public.notifications(user_id, actor_id, story_id) where type = 'story_reaction';

alter table public.notifications enable row level security;

drop policy if exists "Users view their notifications" on public.notifications;
create policy "Users view their notifications" on public.notifications
for select to authenticated
using (user_id = auth.uid());

-- with check repeats the using expression so a row cannot be handed to someone else.
drop policy if exists "Users mark their notifications read" on public.notifications;
create policy "Users mark their notifications read" on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users dismiss their notifications" on public.notifications;
create policy "Users dismiss their notifications" on public.notifications
for delete to authenticated
using (user_id = auth.uid());

-- No insert policy. See the header.

-- The revoke is not ceremonial: Supabase ships `alter default privileges in schema
-- public grant all on tables to anon, authenticated`, so a new table arrives with
-- insert already granted. Without this line the no-insert property above would be
-- quietly false. Update is granted per column, which is the difference between "I
-- can mark this read" and "I can rewrite what this notification says".
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- The single write path -------------------------------------------------------
-- Called only by the trigger functions below, which execute as the table owner, so
-- this needs no grant to authenticated - and gets none.
create or replace function public.push_notification(
  recipient uuid,
  actor uuid,
  kind text,
  target_post uuid default null,
  target_comment uuid default null,
  target_story uuid default null,
  preview_text text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if recipient is null or actor is null or recipient = actor then
    return;
  end if;

  -- Blocks and mutes are applied at write time, not read time. That is what makes
  -- mute mean mute: unmuting later does not deliver a backlog of what was missed.
  -- Same two exclusions get_feed_excluded_user_ids applies to the home feed, so
  -- Activity and Home agree on who is hidden.
  if public.is_blocked_between(recipient, actor) then
    return;
  end if;
  if exists (
    select 1 from public.user_mutes
    where muter_id = recipient and muted_id = actor
  ) then
    return;
  end if;

  -- The conflict target differs per type, so this is a branch rather than one
  -- statement. Repeating each index predicate in the on conflict clause is what
  -- lets Postgres infer the partial unique index.
  if kind = 'like' then
    insert into public.notifications (user_id, actor_id, type, post_id, preview)
    values (recipient, actor, 'like', target_post, preview_text)
    on conflict (user_id, actor_id, post_id) where type = 'like'
    do update set created_at = now(), read_at = null, preview = excluded.preview;

  elsif kind = 'follow' then
    insert into public.notifications (user_id, actor_id, type)
    values (recipient, actor, 'follow')
    on conflict (user_id, actor_id) where type = 'follow'
    do update set created_at = now(), read_at = null;

  elsif kind = 'story_reaction' then
    insert into public.notifications (user_id, actor_id, type, story_id, preview)
    values (recipient, actor, 'story_reaction', target_story, preview_text)
    on conflict (user_id, actor_id, story_id) where type = 'story_reaction'
    do update set created_at = now(), read_at = null, preview = excluded.preview;

  elsif kind = 'comment' then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id, preview)
    values (recipient, actor, 'comment', target_post, target_comment, preview_text);

  else
    raise exception 'Unknown notification type: %', kind;
  end if;
end;
$$;
revoke all on function public.push_notification(uuid, uuid, text, uuid, uuid, uuid, text) from public;

-- Triggers --------------------------------------------------------------------
-- drop trigger if exists before each create, for the same reason the policies do
-- it: these base tables predate the migrations directory and may already carry
-- triggers of their own.

create or replace function public.notify_on_like()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
begin
  select p.user_id into author from public.posts p where p.id = new.post_id;
  perform public.push_notification(author, new.user_id, 'like', target_post => new.post_id);
  return null;
end;
$$;

create or replace function public.remove_like_notification()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- (actor, post) is unique for a like, so the recipient does not need naming.
  delete from public.notifications
  where type = 'like' and actor_id = old.user_id and post_id = old.post_id;
  return null;
end;
$$;

drop trigger if exists notify_on_like on public.likes;
create trigger notify_on_like
after insert on public.likes
for each row execute function public.notify_on_like();

-- "Alex liked your post" stops being true the moment Alex un-likes it.
drop trigger if exists remove_like_notification on public.likes;
create trigger remove_like_notification
after delete on public.likes
for each row execute function public.remove_like_notification();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
begin
  select p.user_id into author from public.posts p where p.id = new.post_id;
  perform public.push_notification(
    author, new.user_id, 'comment',
    target_post => new.post_id,
    target_comment => new.id,
    preview_text => left(new.content, 200)
  );
  return null;
end;
$$;

drop trigger if exists notify_on_comment on public.comments;
create trigger notify_on_comment
after insert on public.comments
for each row execute function public.notify_on_comment();
-- No delete trigger: notifications.comment_id cascades from public.comments.

create or replace function public.notify_on_follow()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.push_notification(new.following_id, new.follower_id, 'follow');
  return null;
end;
$$;

create or replace function public.remove_follow_notification()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'follow' and user_id = old.following_id and actor_id = old.follower_id;
  return null;
end;
$$;

drop trigger if exists notify_on_follow on public.follows;
create trigger notify_on_follow
after insert on public.follows
for each row execute function public.notify_on_follow();

drop trigger if exists remove_follow_notification on public.follows;
create trigger remove_follow_notification
after delete on public.follows
for each row execute function public.remove_follow_notification();

create or replace function public.notify_on_story_reaction()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
begin
  select s.user_id into author from public.stories s where s.id = new.story_id;
  perform public.push_notification(
    author, new.user_id, 'story_reaction',
    target_story => new.story_id,
    preview_text => new.emoji
  );
  return null;
end;
$$;

create or replace function public.remove_story_reaction_notification()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'story_reaction' and actor_id = old.user_id and story_id = old.story_id;
  return null;
end;
$$;

drop trigger if exists notify_on_story_reaction on public.story_reactions;
create trigger notify_on_story_reaction
after insert on public.story_reactions
for each row execute function public.notify_on_story_reaction();

-- Separate from the insert trigger rather than `after insert or update`, because a
-- WHEN clause cannot reference OLD on an insert. set_story_reaction changes an
-- existing row's emoji through on conflict do update, so without this branch
-- swapping a reaction would go unreported.
drop trigger if exists notify_on_story_reaction_change on public.story_reactions;
create trigger notify_on_story_reaction_change
after update on public.story_reactions
for each row when (old.emoji is distinct from new.emoji)
execute function public.notify_on_story_reaction();

-- Clearing a reaction is a delete, and takes its notification with it.
drop trigger if exists remove_story_reaction_notification on public.story_reactions;
create trigger remove_story_reaction_notification
after delete on public.story_reactions
for each row execute function public.remove_story_reaction_notification();

-- Blocking wipes the history both ways, which is why none of the read paths below
-- carry a block filter. Doing it here also leaves set_user_block untouched - worth
-- avoiding, since get_or_create_direct_conversation has two competing definitions
-- in this directory and editing that file invites the same class of confusion.
create or replace function public.clear_notifications_on_block()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.notifications
  where (user_id = new.blocker_id and actor_id = new.blocked_id)
     or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return null;
end;
$$;

drop trigger if exists clear_notifications_on_block on public.user_blocks;
create trigger clear_notifications_on_block
after insert on public.user_blocks
for each row execute function public.clear_notifications_on_block();

-- Read paths ------------------------------------------------------------------

-- The actor's profile and the post's thumbnail are joined at read time rather than
-- copied into the row, so an edited post shows its current media. posts.media_url
-- is a plain public URL (src/lib/feed.ts uses it directly as an img src), so unlike
-- story and message media there is nothing to sign here.
--
-- type_filter exists so the page's chips filter the whole history rather than the
-- page held in memory: filtering client-side would show an empty "comments" tab
-- whenever the newest page happened to be all likes.
create or replace function public.get_notifications(
  before_cursor timestamptz default null,
  page_size integer default 30,
  type_filter text[] default null
)
returns table (
  id uuid,
  type text,
  actor_id uuid,
  actor_username text,
  actor_full_name text,
  actor_avatar_url text,
  post_id uuid,
  comment_id uuid,
  story_id uuid,
  preview text,
  post_media_url text,
  post_excerpt text,
  read_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select n.id, n.type, n.actor_id,
         a.username, a.full_name, a.avatar_url,
         n.post_id, n.comment_id, n.story_id, n.preview,
         p.media_url, left(p.content, 140),
         n.read_at, n.created_at
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.posts p on p.id = n.post_id
  where n.user_id = auth.uid()
    and (before_cursor is null or n.created_at < before_cursor)
    and (type_filter is null or n.type = any(type_filter))
  order by n.created_at desc, n.id desc
  limit greatest(least(page_size, 100), 1);
$$;
revoke all on function public.get_notifications(timestamptz, integer, text[]) from public;
grant execute on function public.get_notifications(timestamptz, integer, text[]) to authenticated;

create or replace function public.get_unread_notification_count()
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*) from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;
revoke all on function public.get_unread_notification_count() from public;
grant execute on function public.get_unread_notification_count() to authenticated;

-- One function for both callers: no argument marks everything ("Mark all as read"),
-- an array marks the rows that were tapped. Returns the count so the client can set
-- the badge from the server's answer instead of guessing.
create or replace function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (
      notification_ids is null
      or cardinality(notification_ids) = 0
      or id = any(notification_ids)
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Realtime --------------------------------------------------------------------
-- replica identity full matters specifically because rows are DELETED here when a
-- like or follow is undone. Without it the DELETE payload carries no user_id, the
-- `user_id=eq.<me>` subscription filter never matches, and the badge would climb
-- but never fall. Same reasoning as 20260810_messaging_finalization.sql.
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
