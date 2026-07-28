-- Social cover positioning and persistent profile moderation.
alter table public.profiles
  add column if not exists cover_position_x numeric not null default 50,
  add column if not exists cover_position_y numeric not null default 50,
  add column if not exists cover_zoom numeric not null default 1;

alter table public.profiles
  drop constraint if exists profiles_cover_position_x_range,
  drop constraint if exists profiles_cover_position_y_range,
  drop constraint if exists profiles_cover_zoom_range;
alter table public.profiles
  add constraint profiles_cover_position_x_range check (cover_position_x between 0 and 100),
  add constraint profiles_cover_position_y_range check (cover_position_y between 0 and 100),
  add constraint profiles_cover_zoom_range check (cover_zoom between 1 and 3);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'impersonation', 'unsafe', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists "Users manage their blocks" on public.user_blocks;
create policy "Users manage their blocks" on public.user_blocks
for all to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());

drop policy if exists "Users manage their mutes" on public.user_mutes;
create policy "Users manage their mutes" on public.user_mutes
for all to authenticated
using (muter_id = auth.uid())
with check (muter_id = auth.uid());

drop policy if exists "Users create reports" on public.user_reports;
create policy "Users create reports" on public.user_reports
for insert to authenticated
with check (reporter_id = auth.uid());
drop policy if exists "Users view their reports" on public.user_reports;
create policy "Users view their reports" on public.user_reports
for select to authenticated
using (reporter_id = auth.uid());

grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert, delete on public.user_mutes to authenticated;
grant select, insert on public.user_reports to authenticated;

create or replace function public.is_blocked_between(first_user_id uuid, second_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = first_user_id and blocked_id = second_user_id)
       or (blocker_id = second_user_id and blocked_id = first_user_id)
  );
$$;
revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create or replace function public.set_user_block(target_user_id uuid, should_block boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_user_id = auth.uid() then raise exception 'You cannot block yourself'; end if;
  if should_block then
    insert into public.user_blocks (blocker_id, blocked_id)
    values (auth.uid(), target_user_id) on conflict do nothing;
    delete from public.follows
    where (follower_id = auth.uid() and following_id = target_user_id)
       or (follower_id = target_user_id and following_id = auth.uid());
  else
    delete from public.user_blocks
    where blocker_id = auth.uid() and blocked_id = target_user_id;
  end if;
end;
$$;
revoke all on function public.set_user_block(uuid, boolean) from public;
grant execute on function public.set_user_block(uuid, boolean) to authenticated;

create or replace function public.get_feed_excluded_user_ids()
returns table (user_id uuid)
language sql stable security definer set search_path = public
as $$
  select muted_id from public.user_mutes where muter_id = auth.uid()
  union
  select blocked_id from public.user_blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.user_blocks where blocked_id = auth.uid();
$$;
revoke all on function public.get_feed_excluded_user_ids() from public;
grant execute on function public.get_feed_excluded_user_ids() to authenticated;

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
    exists (
      select 1 from public.follows outgoing
      where outgoing.follower_id = auth.uid() and outgoing.following_id = p.id
    )
  from public.profiles p
  where p.id <> auth.uid()
    and not public.are_friends(auth.uid(), p.id)
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

create or replace function public.can_message_conversation(target_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members mine
    join public.conversation_members other_member
      on other_member.conversation_id = mine.conversation_id
     and other_member.user_id <> mine.user_id
    where mine.conversation_id = target_conversation_id
      and mine.user_id = auth.uid()
      and not public.is_blocked_between(mine.user_id, other_member.user_id)
      and (
        public.are_friends(mine.user_id, other_member.user_id)
        or coalesce(
          (
            select latest.sender_id <> auth.uid()
            from public.messages latest
            where latest.conversation_id = target_conversation_id
            order by latest.created_at desc limit 1
          ),
          true
        )
      )
  );
$$;
revoke all on function public.can_message_conversation(uuid) from public;
grant execute on function public.can_message_conversation(uuid) to authenticated;
