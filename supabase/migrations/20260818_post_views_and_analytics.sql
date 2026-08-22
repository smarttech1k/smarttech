-- Real analytics (Insights).
--
-- The Insights page was mock data end to end: a hand-written literal in
-- src/components/features/analytics/mockData.ts supplied every number on it,
-- including a "LIVE REACH" chart whose data never changed. This file supplies the
-- real answers, and adds the one thing the schema was missing to make "reach" a
-- fact rather than a claim.
--
-- Two halves:
--   1. public.post_views - the impressions table. Nothing in this app has ever
--      recorded that a post was seen, so reach necessarily starts at zero today.
--      The UI states the date tracking began instead of back-filling a curve.
--   2. Six read RPCs, every one scoped to auth.uid() with no target-user
--      parameter. There is no honest way to show somebody else's analytics under
--      RLS, and no UI asks for it.
--
-- Reach means UNIQUE VIEWERS: post_views is keyed (post_id, viewer_id), exactly as
-- story_views is in 20260815_stories.sql. One row per person per post. A raw
-- impression counter would grow without limit and would measure scrolling rather
-- than audience.
--
-- Blocked and muted people still count in these totals. clear_notifications_on_block
-- (20260817_notifications.sql) wipes notifications on a block, but the underlying
-- likes row survives and the post's own like count in the feed still includes it.
-- Analytics that disagreed with the number printed on the post would be a bug.
--
-- Days are UTC days throughout: every bucket is (x at time zone 'utc')::date and
-- every window boundary is derived from the same expression, so the metric cards
-- and the chart always sum to each other. A late-night post landing on "tomorrow"
-- is that boundary, not a defect.
--
-- posts / likes / comments / follows predate this migrations directory, so their
-- column names here come from client usage (src/lib/feed.ts, src/lib/social.ts) and
-- from get_recent_comments in 20260815_stories.sql.
--
-- Asserted by supabase/tests/analytics_test.sql. Run that after applying this file.

-- 1. Timestamps on the pre-migration tables ------------------------------------
-- comments.created_at and posts.created_at are known to exist. likes and follows
-- were never read with a timestamp by any client, so this was written not knowing
-- whether they had one.
--
-- They do. Both are already `timestamptz not null default now()` and fully
-- populated, so all four statements below are no-ops on this schema and every like
-- and follow can be placed on a real day. No undercount, and the daily series and
-- the lifetime totals agree.
--
-- They stay because `if not exists` makes them free, and on a schema that never had
-- the columns they are what adds them. Note the asymmetry in that case: a freshly
-- added column is nullable and the whole backlog reads null, which is the honest
-- outcome - `not null default now()` would stamp every pre-existing row with this
-- migration's timestamp and put a large fake spike on day one of every chart. Null
-- means "this happened, at a time nobody recorded": absent from the daily series,
-- still counted in the lifetime totals.
--
-- Every window predicate below is `>= start_ts`, which excludes null either way, so
-- the arithmetic is correct on both schemas. What differs is only whether a null can
-- exist at all - which is why the matching block in the test file asks the catalog
-- instead of assuming.
alter table public.likes add column if not exists created_at timestamptz;
alter table public.likes alter column created_at set default now();

alter table public.follows add column if not exists created_at timestamptz;
alter table public.follows alter column created_at set default now();

create index if not exists likes_created_idx on public.likes(created_at);
create index if not exists follows_created_idx on public.follows(created_at);

-- 2. post_views ----------------------------------------------------------------
create table if not exists public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  -- One row per person per post. This is the whole reason the number can be called
  -- reach: re-reading a post does not inflate it.
  primary key (post_id, viewer_id)
);

-- No separate post_id index: the primary key already leads with post_id, so the
-- author-side lookups below use it. Only the time dimension needs its own.
create index if not exists post_views_viewed_idx on public.post_views(viewed_at);

alter table public.post_views enable row level security;

-- Authors read their own rows. Nobody can enumerate what anyone else has read.
drop policy if exists "Authors view their post views" on public.post_views;
create policy "Authors view their post views" on public.post_views
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = auth.uid()
  )
);

-- No insert policy, and the revoke below removes the insert grant Supabase's
-- default privileges hand to every new table. The single write path is
-- mark_posts_viewed, which is what makes the self-view and block rules
-- unavoidable rather than advisory - a client cannot route around them because
-- there is no client-reachable insert.
revoke all on public.post_views from anon, authenticated;
grant select on public.post_views to authenticated;

-- 3. The single write path -----------------------------------------------------
-- Batched: a scroll reveals several posts at once, and one round trip per post
-- would be a request storm on a fast flick through the feed.
create or replace function public.mark_posts_viewed(post_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  inserted integer;
begin
  if auth.uid() is null or post_ids is null or array_length(post_ids, 1) is null then
    return 0;
  end if;

  -- A cap rather than an error: this is fire-and-forget telemetry, and a client bug
  -- that sends 10k ids should cost nothing instead of surfacing a failure.
  if array_length(post_ids, 1) > 100 then
    return 0;
  end if;

  -- Selecting from public.posts rather than trusting the array is what makes a
  -- fabricated uuid a silent no-op instead of a foreign key violation.
  insert into public.post_views (post_id, viewer_id)
  select p.id, auth.uid()
  from public.posts p
  where p.id = any(post_ids)
    -- Re-reading your own post is not reach.
    and p.user_id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), p.user_id)
  on conflict (post_id, viewer_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function public.mark_posts_viewed(uuid[]) from public;
grant execute on function public.mark_posts_viewed(uuid[]) to authenticated;

-- 4. Read RPCs -----------------------------------------------------------------
-- Every one of these clamps range_days and scopes on auth.uid(). Column names
-- carry _count / _current / _previous suffixes so nothing in a RETURNS TABLE list
-- shadows a table name in the body.

-- One row of headline numbers, current window against the equal-length window
-- before it, so the UI can show a true delta with a real direction instead of the
-- hardcoded green arrow the mock page used.
--
-- One statement with scalar subqueries rather than seven round trips: five metric
-- cards arriving at five different moments is worse than one larger query.
create or replace function public.get_creator_overview(range_days integer default 30)
returns table (
  followers_total bigint,
  posts_total bigint,
  views_total bigint,
  followers_current bigint,
  followers_previous bigint,
  views_current bigint,
  views_previous bigint,
  likes_current bigint,
  likes_previous bigint,
  comments_current bigint,
  comments_previous bigint,
  story_reactions_current bigint,
  story_reactions_previous bigint,
  story_views_current bigint,
  story_views_previous bigint,
  posts_current bigint,
  posts_previous bigint
)
language sql stable security definer set search_path = public
as $$
  with b as (
    select
      auth.uid() as me,
      -- Same UTC calendar-day boundaries get_engagement_timeseries uses, so the
      -- cards and the chart always agree.
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1))::timestamp at time zone 'utc') as cur_start,
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) * 2 - 1))::timestamp at time zone 'utc') as prev_start
  )
  select
    (select count(*) from public.follows f where f.following_id = b.me),
    (select count(*) from public.posts p where p.user_id = b.me),
    (select count(*) from public.post_views pv
       join public.posts p on p.id = pv.post_id
      where p.user_id = b.me),

    (select count(*) from public.follows f
      where f.following_id = b.me and f.created_at >= b.cur_start),
    (select count(*) from public.follows f
      where f.following_id = b.me
        and f.created_at >= b.prev_start and f.created_at < b.cur_start),

    (select count(*) from public.post_views pv
       join public.posts p on p.id = pv.post_id
      where p.user_id = b.me and pv.viewed_at >= b.cur_start),
    (select count(*) from public.post_views pv
       join public.posts p on p.id = pv.post_id
      where p.user_id = b.me
        and pv.viewed_at >= b.prev_start and pv.viewed_at < b.cur_start),

    (select count(*) from public.likes lk
       join public.posts p on p.id = lk.post_id
      where p.user_id = b.me and lk.created_at >= b.cur_start),
    (select count(*) from public.likes lk
       join public.posts p on p.id = lk.post_id
      where p.user_id = b.me
        and lk.created_at >= b.prev_start and lk.created_at < b.cur_start),

    (select count(*) from public.comments cm
       join public.posts p on p.id = cm.post_id
      where p.user_id = b.me and cm.created_at >= b.cur_start),
    (select count(*) from public.comments cm
       join public.posts p on p.id = cm.post_id
      where p.user_id = b.me
        and cm.created_at >= b.prev_start and cm.created_at < b.cur_start),

    (select count(*) from public.story_reactions sr
       join public.stories st on st.id = sr.story_id
      where st.user_id = b.me and sr.created_at >= b.cur_start),
    (select count(*) from public.story_reactions sr
       join public.stories st on st.id = sr.story_id
      where st.user_id = b.me
        and sr.created_at >= b.prev_start and sr.created_at < b.cur_start),

    (select count(*) from public.story_views sv
       join public.stories st on st.id = sv.story_id
      where st.user_id = b.me and sv.viewed_at >= b.cur_start),
    (select count(*) from public.story_views sv
       join public.stories st on st.id = sv.story_id
      where st.user_id = b.me
        and sv.viewed_at >= b.prev_start and sv.viewed_at < b.cur_start),

    (select count(*) from public.posts p
      where p.user_id = b.me and p.created_at >= b.cur_start),
    (select count(*) from public.posts p
      where p.user_id = b.me
        and p.created_at >= b.prev_start and p.created_at < b.cur_start)
  from b;
$$;
revoke all on function public.get_creator_overview(integer) from public;
grant execute on function public.get_creator_overview(integer) to authenticated;

-- One row per day in the window, INCLUDING days with no activity. The zero-fill is
-- the point: a left join off generate_series is what stops recharts drawing one
-- straight line across a silent week as though the week did not happen.
create or replace function public.get_engagement_timeseries(range_days integer default 30)
returns table (
  day date,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  story_view_count bigint,
  post_count bigint
)
language sql stable security definer set search_path = public
as $$
  with b as (
    select
      auth.uid() as me,
      ((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1)) as start_day,
      (now() at time zone 'utc')::date as end_day,
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1))::timestamp at time zone 'utc') as start_ts
  ),
  days as (
    select g::date as day
    from b, generate_series(b.start_day, b.end_day, interval '1 day') as g
  ),
  v as (
    select (pv.viewed_at at time zone 'utc')::date as day, count(*)::bigint as n
    from public.post_views pv
    join public.posts p on p.id = pv.post_id
    cross join b
    where p.user_id = b.me and pv.viewed_at >= b.start_ts
    group by 1
  ),
  l as (
    select (lk.created_at at time zone 'utc')::date as day, count(*)::bigint as n
    from public.likes lk
    join public.posts p on p.id = lk.post_id
    cross join b
    -- Every like on this schema carries a timestamp (see section 1), so nothing is
    -- lost here. Where created_at was newly added the backlog reads null and this
    -- predicate drops it: absent from the series, still counted in the totals.
    where p.user_id = b.me and lk.created_at >= b.start_ts
    group by 1
  ),
  c as (
    select (cm.created_at at time zone 'utc')::date as day, count(*)::bigint as n
    from public.comments cm
    join public.posts p on p.id = cm.post_id
    cross join b
    where p.user_id = b.me and cm.created_at >= b.start_ts
    group by 1
  ),
  sv as (
    select (svw.viewed_at at time zone 'utc')::date as day, count(*)::bigint as n
    from public.story_views svw
    join public.stories st on st.id = svw.story_id
    cross join b
    where st.user_id = b.me and svw.viewed_at >= b.start_ts
    group by 1
  ),
  po as (
    select (p.created_at at time zone 'utc')::date as day, count(*)::bigint as n
    from public.posts p
    cross join b
    where p.user_id = b.me and p.created_at >= b.start_ts
    group by 1
  )
  select
    d.day,
    coalesce(v.n, 0),
    coalesce(l.n, 0),
    coalesce(c.n, 0),
    coalesce(sv.n, 0),
    coalesce(po.n, 0)
  from days d
  left join v on v.day = d.day
  left join l on l.day = d.day
  left join c on c.day = d.day
  left join sv on sv.day = d.day
  left join po on po.day = d.day
  order by d.day;
$$;
revoke all on function public.get_engagement_timeseries(integer) from public;
grant execute on function public.get_engagement_timeseries(integer) to authenticated;

-- The caller's own posts published in the window, ranked by the engagement they
-- earned. Counts are lifetime for each post, which is what "how did this post do"
-- means; the window selects which posts are listed, not which likes are counted.
--
-- A post with no engagement at all is still returned with zeroes rather than
-- dropped, so a quiet week reads as quiet instead of as missing data.
create or replace function public.get_top_posts(
  range_days integer default 30,
  result_limit integer default 5
)
returns table (
  id uuid,
  content text,
  media_url text,
  created_at timestamptz,
  view_count bigint,
  like_count bigint,
  comment_count bigint
)
language sql stable security definer set search_path = public
as $$
  with b as (
    select
      auth.uid() as me,
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1))::timestamp at time zone 'utc') as start_ts
  ),
  ranked as (
    select
      p.id, p.content, p.media_url, p.created_at,
      (select count(*) from public.post_views pv where pv.post_id = p.id) as view_count,
      (select count(*) from public.likes lk where lk.post_id = p.id) as like_count,
      (select count(*) from public.comments cm where cm.post_id = p.id) as comment_count
    from public.posts p
    cross join b
    where p.user_id = b.me and p.created_at >= b.start_ts
  )
  select r.id, r.content, r.media_url, r.created_at,
         r.view_count, r.like_count, r.comment_count
  from ranked r
  order by r.like_count + r.comment_count desc, r.view_count desc, r.created_at desc
  limit greatest(least(coalesce(result_limit, 5), 25), 1);
$$;
revoke all on function public.get_top_posts(integer, integer) from public;
grant execute on function public.get_top_posts(integer, integer) to authenticated;

-- A snapshot of the relationships around the caller, not a window: "who follows me"
-- has no useful last-30-days reading that followers_gained does not already give.
-- A mutual follow is counted once, in `mutual`, and not again in either side.
create or replace function public.get_audience_breakdown()
returns table (
  mutual bigint,
  followers_only bigint,
  following_only bigint
)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from public.follows f
      where f.following_id = auth.uid()
        and exists (
          select 1 from public.follows g
          where g.follower_id = auth.uid() and g.following_id = f.follower_id
        )),
    (select count(*) from public.follows f
      where f.following_id = auth.uid()
        and not exists (
          select 1 from public.follows g
          where g.follower_id = auth.uid() and g.following_id = f.follower_id
        )),
    (select count(*) from public.follows f
      where f.follower_id = auth.uid()
        and not exists (
          select 1 from public.follows g
          where g.following_id = auth.uid() and g.follower_id = f.following_id
        ));
$$;
revoke all on function public.get_audience_breakdown() from public;
grant execute on function public.get_audience_breakdown() to authenticated;

-- The same regexp technique get_trending_hashtags uses (20260815_stories.sql), with
-- the caller's own posts in place of the visibility exclusion. An empty result means
-- the UI renders no panel, exactly as the trending version documents.
create or replace function public.get_my_top_hashtags(
  range_days integer default 30,
  result_limit integer default 6
)
returns table (tag text, post_count bigint)
language sql stable security definer set search_path = public
as $$
  with b as (
    select
      auth.uid() as me,
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1))::timestamp at time zone 'utc') as start_ts
  )
  select lower(match[1]) as tag, count(distinct p.id) as post_count
  from public.posts p
  cross join b
  cross join lateral regexp_matches(p.content, '#([A-Za-z0-9_]{2,30})', 'g') as match
  where p.user_id = b.me and p.created_at >= b.start_ts
  group by 1
  order by post_count desc, tag asc
  limit greatest(least(coalesce(result_limit, 6), 20), 1);
$$;
revoke all on function public.get_my_top_hashtags(integer, integer) from public;
grant execute on function public.get_my_top_hashtags(integer, integer) to authenticated;

-- Stories are not deleted when they expire - only get_story_feed filters on
-- expires_at - so this has real history rather than a 24 hour horizon.
create or replace function public.get_story_performance(
  range_days integer default 30,
  result_limit integer default 5
)
returns table (
  id uuid,
  created_at timestamptz,
  media_type text,
  caption text,
  view_count bigint,
  reaction_count bigint
)
language sql stable security definer set search_path = public
as $$
  with b as (
    select
      auth.uid() as me,
      (((now() at time zone 'utc')::date - (greatest(least(coalesce(range_days, 30), 365), 1) - 1))::timestamp at time zone 'utc') as start_ts
  ),
  mine as (
    select
      s.id, s.created_at, s.media_type, s.caption,
      (select count(*) from public.story_views sv where sv.story_id = s.id) as view_count,
      (select count(*) from public.story_reactions sr where sr.story_id = s.id) as reaction_count
    from public.stories s
    cross join b
    where s.user_id = b.me and s.created_at >= b.start_ts
  )
  select m.id, m.created_at, m.media_type, m.caption, m.view_count, m.reaction_count
  from mine m
  order by m.created_at desc
  limit greatest(least(coalesce(result_limit, 5), 25), 1);
$$;
revoke all on function public.get_story_performance(integer, integer) from public;
grant execute on function public.get_story_performance(integer, integer) to authenticated;

-- No realtime publication entry for post_views. Stats are a page you open, not a
-- stream, and a socket that fired on every impression across the app would cost
-- far more than the reload it replaces.
