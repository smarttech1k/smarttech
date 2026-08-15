-- Korusa stories: 24h image/video stories with an audience rule wider than friendship.
--
-- Visibility: a viewer can watch your stories if they follow you, OR if the two of
-- you have a conversation in which BOTH have sent at least one message ("messaged
-- and got a reply"). Mutual friends satisfy the follow branch automatically.
--
-- Run after 20260726_profile_social_controls.sql (is_blocked_between,
-- get_feed_excluded_user_ids) and the 20260725 messaging migrations
-- (conversation_members, messages).
--
-- The audience rule below is asserted by supabase/tests/stories_audience_test.sql.
-- Run that after applying this file; it proves the rule against three real
-- accounts inside a transaction it rolls back.

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- A private storage path, never a URL. Same discipline as messages.media_url:
  -- the client signs it on read so the object stays audience-scoped.
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text check (caption is null or char_length(caption) <= 280),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 120000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index if not exists stories_user_created_idx on public.stories(user_id, created_at desc);
create index if not exists stories_expires_idx on public.stories(expires_at);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_story_idx on public.story_views(story_id);

-- The audience rule. Used by the stories RLS policy, the storage read policy and
-- every RPC below, so there is exactly one definition of who can see a story.
create or replace function public.can_view_user_stories(author_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      author_id = auth.uid()
      or (
        not public.is_blocked_between(auth.uid(), author_id)
        and (
          -- The viewer follows the author.
          exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = author_id
          )
          -- Or the two have an answered conversation: a shared thread in which
          -- each side has sent at least one message. A one-sided outbound
          -- message does NOT grant access.
          --
          -- Both branches ignore soft-deleted messages (deleted_at) and 'system'
          -- rows. A retracted message is not a reply, and this gates private
          -- media: without the filter, sending one message and deleting it would
          -- buy permanent access to someone's stories.
          or exists (
            select 1
            from public.conversation_members mine
            join public.conversation_members theirs
              on theirs.conversation_id = mine.conversation_id
             and theirs.user_id = author_id
            where mine.user_id = auth.uid()
              and exists (
                select 1 from public.messages m
                where m.conversation_id = mine.conversation_id
                  and m.sender_id = auth.uid()
                  and m.deleted_at is null
                  and m.message_type <> 'system'
              )
              and exists (
                select 1 from public.messages m
                where m.conversation_id = mine.conversation_id
                  and m.sender_id = author_id
                  and m.deleted_at is null
                  and m.message_type <> 'system'
              )
          )
        )
      )
    );
$$;
revoke all on function public.can_view_user_stories(uuid) from public;
grant execute on function public.can_view_user_stories(uuid) to authenticated;

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "Audience can view stories" on public.stories;
create policy "Audience can view stories" on public.stories for select to authenticated
using (public.can_view_user_stories(user_id));

drop policy if exists "Users post their own stories" on public.stories;
create policy "Users post their own stories" on public.stories for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users delete their own stories" on public.stories;
create policy "Users delete their own stories" on public.stories for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Viewers record their own views" on public.story_views;
create policy "Viewers record their own views" on public.story_views for insert to authenticated
with check (
  viewer_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s.id = story_id and public.can_view_user_stories(s.user_id)
  )
);

drop policy if exists "Authors and viewers read story views" on public.story_views;
create policy "Authors and viewers read story views" on public.story_views for select to authenticated
using (
  viewer_id = auth.uid()
  or exists (
    select 1 from public.stories s
    where s.id = story_id and s.user_id = auth.uid()
  )
);

grant select, insert, delete on public.stories to authenticated;
grant select, insert on public.story_views to authenticated;

-- One row per live story the caller is allowed to see, with the author's profile
-- and whether the caller has already watched it. Ordered so the client can group
-- by author in a single pass.
create or replace function public.get_story_feed()
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
  view_count bigint
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
    end as view_count
  from public.stories s
  join public.profiles p on p.id = s.user_id
  where s.expires_at > now()
    and public.can_view_user_stories(s.user_id)
  order by s.user_id, s.created_at asc;
$$;
revoke all on function public.get_story_feed() from public;
grant execute on function public.get_story_feed() to authenticated;

create or replace function public.mark_story_viewed(target_story_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare author uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select user_id into author from public.stories
  where id = target_story_id and expires_at > now();

  if author is null or not public.can_view_user_stories(author) then
    raise exception 'Story not found';
  end if;

  -- Authors do not appear in their own viewer list.
  if author = auth.uid() then return; end if;

  insert into public.story_views (story_id, viewer_id)
  values (target_story_id, auth.uid())
  on conflict do nothing;
end;
$$;
revoke all on function public.mark_story_viewed(uuid) from public;
grant execute on function public.mark_story_viewed(uuid) to authenticated;

create or replace function public.get_story_viewers(target_story_id uuid)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  viewed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, v.viewed_at
  from public.story_views v
  join public.profiles p on p.id = v.viewer_id
  where v.story_id = target_story_id
    and exists (
      select 1 from public.stories s
      where s.id = target_story_id and s.user_id = auth.uid()
    )
  order by v.viewed_at desc;
$$;
revoke all on function public.get_story_viewers(uuid) from public;
grant execute on function public.get_story_viewers(uuid) to authenticated;

-- Real hashtags counted from real post bodies. Returns a count and nothing else:
-- there is deliberately no trend percentage, because there is no honest way to
-- compute one from a single window. An empty result means the UI renders no panel.
create or replace function public.get_trending_hashtags(
  result_limit integer default 6,
  since_hours integer default 168
)
returns table (tag text, post_count bigint)
language sql stable security definer set search_path = public
as $$
  select lower(match[1]) as tag, count(distinct p.id) as post_count
  from public.posts p
  cross join lateral regexp_matches(p.content, '#([A-Za-z0-9_]{2,30})', 'g') as match
  where p.created_at > now() - make_interval(hours => greatest(since_hours, 1))
    and p.user_id not in (select user_id from public.get_feed_excluded_user_ids())
  group by 1
  order by post_count desc, tag asc
  limit greatest(least(result_limit, 20), 1);
$$;
revoke all on function public.get_trending_hashtags(integer, integer) from public;
grant execute on function public.get_trending_hashtags(integer, integer) to authenticated;

-- The newest `per_post` comments for each of the given posts. The feed needs a
-- bounded preview per post, which a plain `in (...)` + global limit cannot express:
-- one chatty post would consume the whole allowance and starve the others.
create or replace function public.get_recent_comments(
  post_ids uuid[],
  per_post integer default 3
)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  content text,
  created_at timestamptz,
  author_username text,
  author_full_name text,
  author_avatar_url text
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.post_id, c.user_id, c.content, c.created_at,
         p.username, p.full_name, p.avatar_url
  from unnest(post_ids) as target(post_id)
  cross join lateral (
    select c.*
    from public.comments c
    where c.post_id = target.post_id
    order by c.created_at desc
    limit greatest(least(per_post, 20), 1)
  ) c
  left join public.profiles p on p.id = c.user_id
  order by c.post_id, c.created_at asc;
$$;
revoke all on function public.get_recent_comments(uuid[], integer) from public;
grant execute on function public.get_recent_comments(uuid[], integer) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.stories;
exception when duplicate_object then null;
end $$;

-- Private bucket: story media is audience-scoped, so a public URL would leak it to
-- anyone holding the link. createSignedUrls runs with the caller's JWT and the read
-- policy below refuses to mint a URL for an object the caller cannot see.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media',
  'story-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

-- Paths are `{user_id}/{filename}`, so the owner is foldername[1].
drop policy if exists "Story audience reads story media" on storage.objects;
create policy "Story audience reads story media" on storage.objects for select to authenticated
using (
  bucket_id = 'story-media'
  and public.can_view_user_stories(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Users upload their story media" on storage.objects;
create policy "Users upload their story media" on storage.objects for insert to authenticated
with check (
  bucket_id = 'story-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete their story media" on storage.objects;
create policy "Users delete their story media" on storage.objects for delete to authenticated
using (
  bucket_id = 'story-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Expiry is enforced by `expires_at > now()` on every read path, so correctness does
-- not depend on a scheduler. Expired rows and their storage objects DO accumulate.
-- To reclaim them, enable pg_cron and schedule a sweep, e.g.:
--
--   select cron.schedule('purge-expired-stories', '0 * * * *', $sweep$
--     delete from public.stories where expires_at < now() - interval '7 days';
--   $sweep$);
--
-- Storage objects need a separate sweep (the delete above does not touch the
-- bucket); a scheduled edge function listing `story-media` against surviving
-- media_path values is the straightforward way to do it.
