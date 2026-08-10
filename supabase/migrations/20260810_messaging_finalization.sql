-- Korusa messaging finalization.
-- Run after 20260726_rich_messaging.sql.

-- Realtime UPDATE/DELETE payloads need the full old row so that filtered
-- subscriptions (conversation_id=eq.x) match on edits, deletes and pins.
alter table public.messages replica identity full;
alter table public.conversation_members replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;

-- Delivery receipts -----------------------------------------------------------
-- The recipient has to advance the sender's message rows, which the sender-only
-- UPDATE policy forbids. These definer functions are the sanctioned path, and
-- both are scoped to messages the caller did not write in a conversation the
-- caller belongs to.

create or replace function public.mark_messages_delivered(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_conversation_member(target_conversation_id) then
    raise exception 'Conversation not found';
  end if;
  update public.messages
  set delivery_state = 'delivered'
  where conversation_id = target_conversation_id
    and sender_id <> auth.uid()
    and delivery_state = 'sent';
end;
$$;

create or replace function public.mark_messages_seen(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_conversation_member(target_conversation_id) then
    raise exception 'Conversation not found';
  end if;
  update public.messages
  set delivery_state = 'seen'
  where conversation_id = target_conversation_id
    and sender_id <> auth.uid()
    and delivery_state in ('sent', 'delivered');
end;
$$;

revoke all on function public.mark_messages_delivered(uuid) from public;
revoke all on function public.mark_messages_seen(uuid) from public;
grant execute on function public.mark_messages_delivered(uuid) to authenticated;
grant execute on function public.mark_messages_seen(uuid) to authenticated;

-- Deleted conversations must not permanently silence a member ------------------
-- hidden_at removes a thread from the inbox. A new inbound message clears it so
-- the conversation returns instead of being lost. archived_at is deliberately
-- left alone: archiving is a durable "keep this out of my main list" choice.

create or replace function public.unhide_conversation_after_message()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.conversation_members
  set hidden_at = null
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id
    and hidden_at is not null;
  return new;
end;
$$;

drop trigger if exists unhide_conversation_on_message on public.messages;
create trigger unhide_conversation_on_message after insert on public.messages
for each row execute function public.unhide_conversation_after_message();

-- Inbox ordering ---------------------------------------------------------------
-- Pinned conversations sort above the rest. get_my_conversations now joins the
-- caller's own membership row so pinned_at can drive the order server-side.

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
    where m.conversation_id = c.id
      and (mine.cleared_at is null or m.created_at > mine.cleared_at)
    order by m.created_at desc limit 1
  ) latest on true
  left join public.messages unread
    on unread.conversation_id = c.id and unread.sender_id <> mine.user_id
    and unread.created_at > mine.last_read_at
  where mine.user_id = auth.uid()
    and mine.hidden_at is null
    and not public.is_blocked_between(mine.user_id, other_member.user_id)
  group by c.id, c.updated_at, other_member.user_id, p.username,
    p.full_name, p.avatar_url, latest.body, latest.created_at, latest.sender_id,
    mine.user_id, mine.pinned_at
  order by mine.pinned_at desc nulls last,
    coalesce(latest.created_at, c.updated_at) desc;
$$;
revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

-- Reporting from a conversation ------------------------------------------------
-- The chat drawer reports with a conversation-specific reason, which the original
-- CHECK constraint rejected outright.
alter table public.user_reports drop constraint if exists user_reports_reason_check;
alter table public.user_reports add constraint user_reports_reason_check check (
  reason in ('spam', 'harassment', 'impersonation', 'unsafe', 'conversation_safety', 'other')
);
