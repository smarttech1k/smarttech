-- Korusa profile page: bounded counts, paginated follow lists, handle checks.
--
-- Replaces three unbounded client queries. src/components/features/profile/Profile.tsx
-- used to read every post row, every follower row and every following row of whoever
-- you were looking at, then hydrate both lists through `.in('id', [...])` - a URL that
-- exceeds the server limit somewhere in the low thousands, which is a page that works
-- for small accounts and fails outright for the accounts most worth visiting.
--
-- Everything here is security definer for one reason: the viewer-relationship fields
-- (you_follow, follows_you, mutual_total) are questions about auth.uid(), and a
-- non-definer read would have to expose enough of public.follows to answer them
-- client-side. None of these functions takes a viewer argument, so there is no version
-- of a modified client that asks them about somebody else's relationships.

-- Handles are identity, so they should collide case-insensitively: `ada` and `Ada`
-- must not be two members. Guarded, because public.profiles predates this directory
-- and may already hold such a pair - a migration that reports that is easier to act on
-- than one that aborts mid-file and leaves the functions below unapplied.
do $$
begin
  create unique index if not exists profiles_username_lower_unique_idx
    on public.profiles (lower(username))
    where username is not null;
exception
  when unique_violation then
    raise notice
      'profiles.username already holds handles differing only in case, so the '
      'case-insensitive unique index was not created. Resolve the duplicates '
      '(select lower(username), count(*) from public.profiles where username is '
      'not null group by 1 having count(*) > 1) then re-run this block. Until '
      'then is_username_available still rejects a case-variant handle, but only '
      'advisorily - two clients racing can both win.';
end $$;

-- Keyset pagination for get_follow_list reads follows(following_id, created_at) and
-- follows(follower_id, created_at). Without these it is a sort of the whole table per
-- page.
create index if not exists follows_following_created_idx
  on public.follows (following_id, created_at desc);
create index if not exists follows_follower_created_idx
  on public.follows (follower_id, created_at desc);

-- Everything the profile header needs, in one round trip.
--
-- followers_total and following_total are raw counts, deliberately NOT filtered by who
-- is asking, while get_follow_list below does exclude anyone blocked either way. So a
-- viewer who has blocked one of the target's followers sees a count one higher than the
-- rows they can scroll. That asymmetry is intentional and matches how every large
-- platform behaves: the count is a fact about the target, the list is a view for you.
-- Filtering the count per viewer instead would mean no two people ever see the same
-- follower number, and would cost a join against user_blocks on every profile open.
--
-- existing_conversation_id is here rather than in a second call because of what the
-- Message button has to decide: an existing thread opens regardless of who follows
-- whom, while a new thread requires mutual follow. The client used to answer that by
-- listing every conversation it had and searching client-side. Calling
-- get_or_create_direct_conversation instead is not an option - it raises for a
-- non-mutual pair, so it cannot tell "no thread yet" apart from "not allowed".
--
-- direct_key matches the construction in get_or_create_direct_conversation
-- (supabase/migrations/20260725_friend_messaging.sql). If that ever changes, this
-- changes with it.
create or replace function public.get_profile_overview(target_user_id uuid)
returns table (
  posts_total bigint,
  followers_total bigint,
  following_total bigint,
  mutual_total bigint,
  you_follow boolean,
  follows_you boolean,
  is_blocked_by_me boolean,
  is_muted_by_me boolean,
  blocked_between boolean,
  existing_conversation_id uuid
)
language sql stable security definer set search_path = public
as $$
  with b as (
    select auth.uid() as me, target_user_id as target
  )
  select
    (select count(*) from public.posts p where p.user_id = b.target),
    (select count(*) from public.follows f where f.following_id = b.target),
    (select count(*) from public.follows f where f.follower_id = b.target),

    -- People who follow the target and are also followed back by the target, counted
    -- only when you are looking at somebody else: on your own profile "mutual
    -- followers" is just your friend count, which the number would silently become.
    -- Both branches cast explicitly so the CASE cannot resolve to integer.
    case when b.me = b.target then 0::bigint else (
      select count(*)
      from public.follows theirs
      join public.follows mine
        on mine.following_id = theirs.follower_id and mine.follower_id = b.me
      where theirs.following_id = b.target
        and theirs.follower_id <> b.me
    ) end,

    exists (
      select 1 from public.follows f
      where f.follower_id = b.me and f.following_id = b.target
    ),
    exists (
      select 1 from public.follows f
      where f.follower_id = b.target and f.following_id = b.me
    ),
    exists (
      select 1 from public.user_blocks ub
      where ub.blocker_id = b.me and ub.blocked_id = b.target
    ),
    exists (
      select 1 from public.user_mutes um
      where um.muter_id = b.me and um.muted_id = b.target
    ),
    public.is_blocked_between(b.me, b.target),

    case when b.me = b.target then null::uuid else (
      select c.id from public.conversations c
      where c.direct_key =
        least(b.me::text, b.target::text) || ':' || greatest(b.me::text, b.target::text)
      limit 1
    ) end
  from b;
$$;
revoke all on function public.get_profile_overview(uuid) from public;
grant execute on function public.get_profile_overview(uuid) to authenticated;

-- One page of followers or following, hydrated, with the two flags the row needs to
-- render its own Follow button. Same shape as get_friend_suggestions
-- (supabase/migrations/20260726_profile_social_controls.sql) so the client can reuse
-- the row treatment from PeopleToFollow.
--
-- Keyset, not offset: a follow arriving mid-scroll shifts every offset after it, which
-- shows a duplicate row or skips one. cursor_followed_at is the last row's followed_at
-- from the previous page; null starts at the top.
--
-- The (followed_at, id) tie-break is load-bearing. Two follows inserted in the same
-- statement share a created_at to the microsecond, and ordering by followed_at alone
-- makes their relative order arbitrary between two queries - which is how a keyset
-- page loses a row at the boundary.
--
-- search_query has its LIKE metacharacters escaped before it reaches ilike, for the
-- same reason src/lib/feed.ts escapes the underscore in a hashtag: handles are full of
-- underscores, and an unescaped `_` is a single-character wildcard. Searching `ada_b`
-- would otherwise also match `adaXb`.
create or replace function public.get_follow_list(
  target_user_id uuid,
  direction text default 'followers',
  search_query text default null,
  cursor_followed_at timestamptz default null,
  cursor_id uuid default null,
  result_limit integer default 20
)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  follows_you boolean,
  you_follow boolean,
  followed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  with params as (
    select case
      when nullif(btrim(coalesce(search_query, '')), '') is null then null
      else '%' || replace(replace(replace(
        btrim(search_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    end as like_pattern
  ),
  edges as (
    select
      case when direction = 'following' then f.following_id else f.follower_id end as person_id,
      f.created_at as followed_at
    from public.follows f
    where case
      when direction = 'following' then f.follower_id = target_user_id
      else f.following_id = target_user_id
    end
  )
  select
    p.id, p.username, p.full_name, p.avatar_url, p.bio,
    exists (
      select 1 from public.follows incoming
      where incoming.follower_id = p.id and incoming.following_id = auth.uid()
    ),
    exists (
      select 1 from public.follows outgoing
      where outgoing.follower_id = auth.uid() and outgoing.following_id = p.id
    ),
    e.followed_at
  from edges e
  join public.profiles p on p.id = e.person_id
  cross join params pr
  where not public.is_blocked_between(auth.uid(), p.id)
    and (
      pr.like_pattern is null
      or p.username ilike pr.like_pattern
      or p.full_name ilike pr.like_pattern
    )
    and (
      cursor_followed_at is null
      or (e.followed_at, p.id) < (cursor_followed_at, coalesce(cursor_id, p.id))
    )
  order by e.followed_at desc, p.id desc
  limit greatest(1, least(coalesce(result_limit, 20), 50));
$$;
revoke all on function public.get_follow_list(uuid, text, text, timestamptz, uuid, integer) from public;
grant execute on function public.get_follow_list(uuid, text, text, timestamptz, uuid, integer) to authenticated;

-- Whether the caller can take this handle. Definer so the editor can answer the
-- question without the answer depending on how broadly public.profiles happens to be
-- readable - a client that could not see the row holding a handle would otherwise be
-- told it was free, and find out on save.
--
-- Advisory only. The unique index is what actually decides, and the client still
-- treats a 23505 on save as the real answer: between this check and that save,
-- somebody else can take the name.
create or replace function public.is_username_available(candidate text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.profiles p
    where lower(p.username) = lower(btrim(candidate))
      and p.id <> auth.uid()
  );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to authenticated;
