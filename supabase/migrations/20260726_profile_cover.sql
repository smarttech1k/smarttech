-- Adds an optional visual cover and short cover story to Korusa profiles.
alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists cover_description text;

alter table public.profiles
  drop constraint if exists profiles_cover_description_length;

alter table public.profiles
  add constraint profiles_cover_description_length
  check (
    cover_description is null
    or char_length(cover_description) <= 240
  );
