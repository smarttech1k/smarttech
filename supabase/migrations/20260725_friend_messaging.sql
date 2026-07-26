-- Mutual follows are Korusa friendships. This migration restricts DMs to friends.

create or replace function public.are_friends(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    first_user_id is not null
    and second_user_id is not null
    and exists (
      select 1 from public.follows
      where follower_id = first_user_id and following_id = second_user_id
    )
    and exists (
      select 1 from public.follows
      where follower_id = second_user_id and following_id = first_user_id
    );
$$;
revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create or replace function public.can_message_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members mine
    join public.conversation_members other_member
      on other_member.conversation_id = mine.conversation_id
     and other_member.user_id <> mine.user_id
    where mine.conversation_id = target_conversation_id
      and mine.user_id = auth.uid()
      and (
        public.are_friends(mine.user_id, other_member.user_id)
        or coalesce(
          (
            select latest_message.sender_id <> auth.uid()
            from public.messages latest_message
            where latest_message.conversation_id = target_conversation_id
            order by latest_message.created_at desc
            limit 1
          ),
          true
        )
      )
  );
$$;
revoke all on function public.can_message_conversation(uuid) from public;
grant execute on function public.can_message_conversation(uuid) to authenticated;

drop policy if exists "Members can send messages" on public.messages;
drop policy if exists "Friends can send messages" on public.messages;
drop policy if exists "Conversation turn messaging" on public.messages;
create policy "Conversation turn messaging"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_message_conversation(conversation_id)
);

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  key_value text;
  conversation_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if other_user_id is null or other_user_id = current_user_id then
    raise exception 'Choose another Korusa member';
  end if;
  if not public.are_friends(current_user_id, other_user_id) then
    raise exception 'You can only message Korusa friends';
  end if;

  key_value := least(current_user_id::text, other_user_id::text)
    || ':' || greatest(current_user_id::text, other_user_id::text);
  insert into public.conversations (kind, direct_key, created_by)
  values ('direct', key_value, current_user_id)
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into conversation_id;
  insert into public.conversation_members (conversation_id, user_id)
  values (conversation_id, current_user_id), (conversation_id, other_user_id)
  on conflict do nothing;
  return conversation_id;
end;
$$;
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

drop function if exists public.get_my_conversations();
create function public.get_my_conversations()
returns table (
  conversation_id uuid, other_user_id uuid, other_username text,
  other_full_name text, other_avatar_url text, last_message text,
  last_message_at timestamptz, unread_count bigint,
  is_friend boolean, can_send boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, other_member.user_id, p.username, p.full_name, p.avatar_url,
    latest.body, latest.created_at, count(unread.id),
    public.are_friends(mine.user_id, other_member.user_id),
    (
      public.are_friends(mine.user_id, other_member.user_id)
      or coalesce(latest.sender_id <> mine.user_id, true)
    )
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  join public.conversation_members other_member
    on other_member.conversation_id = c.id and other_member.user_id <> mine.user_id
  join public.profiles p on p.id = other_member.user_id
  left join lateral (
    select m.body, m.created_at, m.sender_id from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) latest on true
  left join public.messages unread
    on unread.conversation_id = c.id and unread.sender_id <> mine.user_id
    and unread.created_at > mine.last_read_at
  where mine.user_id = auth.uid()
  group by c.id, c.updated_at, other_member.user_id, p.username,
    p.full_name, p.avatar_url, latest.body, latest.created_at, latest.sender_id,
    mine.user_id
  order by coalesce(latest.created_at, c.updated_at) desc;
$$;
revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

create or replace function public.get_my_friends(search_query text default null)
returns table (
  id uuid, username text, full_name text, avatar_url text, bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, p.bio
  from public.profiles p
  where p.id <> auth.uid()
    and public.are_friends(auth.uid(), p.id)
    and (
      nullif(btrim(search_query), '') is null
      or coalesce(p.username, '') ilike '%' || btrim(search_query) || '%'
      or coalesce(p.full_name, '') ilike '%' || btrim(search_query) || '%'
    )
  order by coalesce(p.full_name, p.username, '') asc
  limit 30;
$$;
revoke all on function public.get_my_friends(text) from public;
grant execute on function public.get_my_friends(text) to authenticated;

create or replace function public.get_friend_suggestions(result_limit integer default 8)
returns table (
  id uuid, username text, full_name text, avatar_url text, bio text,
  follows_you boolean, you_follow boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.username, p.full_name, p.avatar_url, p.bio,
    exists (
      select 1 from public.follows incoming
      where incoming.follower_id = p.id and incoming.following_id = auth.uid()
    ) as follows_you,
    exists (
      select 1 from public.follows outgoing
      where outgoing.follower_id = auth.uid() and outgoing.following_id = p.id
    ) as you_follow
  from public.profiles p
  where p.id <> auth.uid()
    and not public.are_friends(auth.uid(), p.id)
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
