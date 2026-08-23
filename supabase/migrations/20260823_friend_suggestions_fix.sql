-- Stop suggesting people you already follow.
--
-- get_friend_suggestions filtered on `not are_friends(auth.uid(), p.id)`, and are_friends
-- requires the follow to run in BOTH directions
-- (supabase/migrations/20260725_friend_messaging.sql). So it only ever excluded mutual
-- pairs: anybody you followed who had not followed you back stayed in the suggestions
-- forever, and the home sidebar offered you a Follow button for somebody already on your
-- following list.
--
-- The correct test is one-directional - "do I already follow this person" - which also
-- subsumes the old one, since a mutual pair is a subset of the people you follow.
--
-- People who follow YOU but whom you do not follow back are deliberately still suggested,
-- and still sort first. Those are the best suggestions in the set, and the client labels
-- them "Follow back".
create or replace function public.get_friend_suggestions(result_limit integer default 8)
returns table (
  id uuid, username text, full_name text, avatar_url text, bio text,
  follows_you boolean, you_follow boolean
)
language sql stable security definer set search_path = public
as $$
  select
    p.id, p.username, p.full_name, p.avatar_url, p.bio,
    exists (
      select 1 from public.follows incoming
      where incoming.follower_id = p.id and incoming.following_id = auth.uid()
    ),
    -- Kept in the result set even though the filter below now guarantees it is false.
    -- The column is part of this function's contract and two clients read it; removing it
    -- would break them, and a client that re-checks is not wrong to.
    exists (
      select 1 from public.follows outgoing
      where outgoing.follower_id = auth.uid() and outgoing.following_id = p.id
    )
  from public.profiles p
  where p.id <> auth.uid()
    and not exists (
      select 1 from public.follows already
      where already.follower_id = auth.uid() and already.following_id = p.id
    )
    and not public.is_blocked_between(auth.uid(), p.id)
  order by
    exists (
      select 1 from public.follows incoming
      where incoming.follower_id = p.id and incoming.following_id = auth.uid()
    ) desc,
    p.created_at desc
  limit greatest(1, least(result_limit, 20));
$$;
revoke all on function public.get_friend_suggestions(integer) from public;
grant execute on function public.get_friend_suggestions(integer) to authenticated;

-- The suggestion filter and the profile page's follow lists both probe
-- follows(follower_id, following_id) for a single pair. The primary key may already cover
-- it depending on column order in the base schema; this makes the lookup unconditional.
create index if not exists follows_follower_following_idx
  on public.follows (follower_id, following_id);
