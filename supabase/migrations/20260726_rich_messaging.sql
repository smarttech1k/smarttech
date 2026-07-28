-- Korusa rich messaging and conversation preferences.
-- Run after the 20260725 messaging migrations.

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_name text,
  add column if not exists media_size bigint,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists forwarded_from_id uuid references public.messages(id) on delete set null,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null,
  add column if not exists delivery_state text not null default 'sent',
  add column if not exists deleted_at timestamptz;

alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check (
  message_type in (
    'text', 'image', 'video', 'voice', 'file', 'location', 'post', 'course',
    'gif', 'sticker', 'poll', 'event', 'announcement', 'system',
    'study_session', 'study_room', 'whiteboard', 'consultation', 'progress',
    'quiz', 'mentor_booking', 'voice_room', 'tip'
  )
);
alter table public.messages drop constraint if exists messages_delivery_state_check;
alter table public.messages add constraint messages_delivery_state_check check (
  delivery_state in ('sending', 'sent', 'delivered', 'seen', 'failed')
);

alter table public.conversation_members
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists muted_until timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists favorite boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists cleared_at timestamptz,
  add column if not exists hidden_at timestamptz;

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx on public.message_reactions(message_id);
create index if not exists messages_pinned_idx on public.messages(conversation_id, pinned_at desc) where pinned_at is not null;

alter table public.message_reactions enable row level security;

drop policy if exists "Members can view message reactions" on public.message_reactions;
create policy "Members can view message reactions" on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_conversation_member(m.conversation_id)
  )
);
drop policy if exists "Members can add reactions" on public.message_reactions;
create policy "Members can add reactions" on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_conversation_member(m.conversation_id)
  )
);
drop policy if exists "Members can remove their reactions" on public.message_reactions;
create policy "Members can remove their reactions" on public.message_reactions for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Senders can update messages" on public.messages;
create policy "Senders can update messages" on public.messages for update to authenticated
using (sender_id = auth.uid()) with check (sender_id = auth.uid());

grant select, insert, delete on public.message_reactions to authenticated;
grant update on public.messages to authenticated;

create or replace function public.set_message_pin(target_message_id uuid, should_pin boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare target_conversation uuid;
begin
  select conversation_id into target_conversation from public.messages where id = target_message_id;
  if target_conversation is null or not public.is_conversation_member(target_conversation) then
    raise exception 'Message not found';
  end if;
  update public.messages set
    pinned_at = case when should_pin then now() else null end,
    pinned_by = case when should_pin then auth.uid() else null end
  where id = target_message_id;
end;
$$;

create or replace function public.toggle_message_reaction(target_message_id uuid, reaction_emoji text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.message_reactions
    where message_id = target_message_id and user_id = auth.uid() and emoji = reaction_emoji
  ) then
    delete from public.message_reactions
    where message_id = target_message_id and user_id = auth.uid() and emoji = reaction_emoji;
    return false;
  end if;
  insert into public.message_reactions(message_id, user_id, emoji)
  values (target_message_id, auth.uid(), reaction_emoji);
  return true;
end;
$$;

revoke all on function public.set_message_pin(uuid, boolean) from public;
revoke all on function public.toggle_message_reaction(uuid, text) from public;
grant execute on function public.set_message_pin(uuid, boolean) to authenticated;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm','application/pdf','text/plain']
)
on conflict (id) do nothing;

drop policy if exists "Conversation members read message media" on storage.objects;
create policy "Conversation members read message media" on storage.objects for select to authenticated
using (
  bucket_id = 'message-media'
  and public.is_conversation_member(((storage.foldername(name))[2])::uuid)
);
drop policy if exists "Conversation members upload message media" on storage.objects;
create policy "Conversation members upload message media" on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_conversation_member(((storage.foldername(name))[2])::uuid)
);
