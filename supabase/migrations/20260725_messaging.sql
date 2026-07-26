-- Korusa direct messaging foundation. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind = 'direct'),
  direct_key text unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists conversation_members_user_id_idx on public.conversation_members(user_id, conversation_id);
create index if not exists messages_conversation_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation_id and user_id = auth.uid()
  );
$$;
revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists "Members can view conversations" on public.conversations;
create policy "Members can view conversations" on public.conversations for select to authenticated
using (public.is_conversation_member(id));
drop policy if exists "Members can view memberships" on public.conversation_members;
create policy "Members can view memberships" on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));
drop policy if exists "Members can update their read state" on public.conversation_members;
create policy "Members can update their read state" on public.conversation_members for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages" on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));
drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages" on public.messages for insert to authenticated
with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

grant select on public.conversations to authenticated;
grant select, update on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;

create or replace function public.touch_conversation_after_message()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists touch_conversation_on_message on public.messages;
create trigger touch_conversation_on_message after insert on public.messages
for each row execute function public.touch_conversation_after_message();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  key_value text;
  conversation_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if other_user_id is null or other_user_id = current_user_id then raise exception 'Choose another Korusa member'; end if;
  if not exists (select 1 from public.profiles where id = other_user_id) then raise exception 'Profile not found'; end if;
  key_value := least(current_user_id::text, other_user_id::text) || ':' || greatest(current_user_id::text, other_user_id::text);
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

create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid, other_user_id uuid, other_username text,
  other_full_name text, other_avatar_url text, last_message text,
  last_message_at timestamptz, unread_count bigint
)
language sql stable security definer set search_path = public
as $$
  select c.id, other_member.user_id, p.username, p.full_name, p.avatar_url,
    latest.body, latest.created_at, count(unread.id)
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  join public.conversation_members other_member
    on other_member.conversation_id = c.id and other_member.user_id <> mine.user_id
  join public.profiles p on p.id = other_member.user_id
  left join lateral (
    select m.body, m.created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) latest on true
  left join public.messages unread
    on unread.conversation_id = c.id and unread.sender_id <> mine.user_id
    and unread.created_at > mine.last_read_at
  where mine.user_id = auth.uid()
  group by c.id, c.updated_at, other_member.user_id, p.username,
    p.full_name, p.avatar_url, latest.body, latest.created_at
  order by coalesce(latest.created_at, c.updated_at) desc;
$$;
revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
